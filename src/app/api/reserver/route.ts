import { NextRequest, NextResponse } from 'next/server';
import {
  creerReservation, chercherDisponibilite, chargerCategories, estPrepaye, t,
  type Langue,
} from '@/lib/mewsBooking';
import { ajouterNote, noteDeControle } from '@/lib/mewsConnector';

// Taxe de séjour Toulon, 3 étoiles. Le même chiffre que l'écran — il entre dans
// la note de réception, qui décide d'un geste de caisse.
const TAXE_PAR_ADULTE_NUIT = 1.86;

/* Pose la note que la réception lira, APRÈS que la chambre soit acquise.
 *
 * Trois précautions, toutes délibérées :
 *
 *  1. Elle ne peut pas faire échouer la réservation. La nuit est vendue, la
 *     carte est engagée : refuser un 200 au client parce qu'une note n'est pas
 *     partie serait échanger un vrai problème contre un bien pire.
 *  2. Elle relit la catégorie et le groupe tarifaire CHEZ MEWS au lieu de
 *     croire le navigateur. La note décide si la réception réclame de l'argent
 *     au comptoir : elle ne se construit pas sur une valeur qu'un client
 *     pourrait poser.
 *  3. Elle s'ajoute, elle n'écrase rien — le mot du client est déjà posé par la
 *     Booking Engine en note `General`, et il doit le rester.
 */
async function poserNoteReception(
  { reservationIds, sejour, adultes, langue }:
  { reservationIds: string[]; sejour: NonNullable<Corps['sejour']>; adultes: number; langue: Langue },
): Promise<void> {
  if (!reservationIds.length) return;
  const [dispo, cats] = await Promise.all([
    chercherDisponibilite({
      arrivee: sejour.arrivee!, depart: sejour.depart!, adultes, langue: 'fr',
    }),
    chargerCategories('fr'),
  ]);
  const nuits = Math.max(
    1,
    Math.round((Date.parse(sejour.depart!) - Date.parse(sejour.arrivee!)) / 86_400_000),
  );
  const taxe = TAXE_PAR_ADULTE_NUIT * adultes * nuits;
  // Le montant vient de Mews, jamais du navigateur : c'est lui qui décide de
  // ce que la réception réclame au comptoir.
  const prixMews = dispo.offres
    .find((o) => o.categorieId === sejour.categorieId && o.pourPersonnes === adultes)
    ?.prix.find((p) => p.tarifId === sejour.tarifId)?.total ?? 0;
  const texte = noteDeControle({
    chambre: cats.get(sejour.categorieId!)?.nomFr || t(cats.get(sejour.categorieId!)?.nom, 'fr'),
    prepaye: estPrepaye(dispo.tarifs.find((r) => r.Id === sejour.tarifId), dispo.groupes),
    total: prixMews + taxe,
    taxe,
    langueClient: langue,
  });
  await Promise.all(reservationIds.map((id) => ajouterNote(id, texte)));
}

/* Écrit la réservation dans le PMS des Voiles.
 *
 * Pourquoi le serveur et pas le navigateur, alors que la Booking Engine API est
 * conçue pour être appelée depuis la page ? Parce que la création est le seul
 * appel qui ne soit pas rejouable : si l'onglet meurt entre la tokenisation et
 * l'écriture, le client a donné sa carte pour rien. Ici, la requête part une
 * fois, et c'est aussi le seul endroit où la table du rooftop pourra être
 * réservée dans la foulée sans envoyer un second courriel.
 *
 * ⚠️ CE QUI NE PASSE PAS PAR NOUS : les données de carte. Le navigateur les
 * remet directement à PciProxy, qui rend un `transactionId`. C'est ce jeton —
 * inutilisable ailleurs, valable trente minutes — qui arrive ici. Aucun PAN,
 * aucun CVV ne touche ce serveur ni nos journaux, et c'est la condition pour
 * rester hors du périmètre lourd de PCI-DSS.
 */

type Corps = {
  langue?: Langue;
  client?: { prenom?: string; nom?: string; email?: string; telephone?: string };
  sejour?: {
    categorieId?: string;
    tarifId?: string;
    arrivee?: string;
    depart?: string;
    adultes?: number;
    notes?: string;
  };
  carte?: { jeton?: string; expiration?: string; porteur?: string };
};

const estDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const estGuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
// Volontairement large : valider une adresse plus finement que « quelque chose,
// un @, quelque chose, un point » rejette des adresses valides, et c'est Mews
// qui tranche de toute façon.
const estEmail = (s: unknown): s is string => typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export async function POST(req: NextRequest) {
  let corps: Corps;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: 'requete illisible' }, { status: 400 });
  }

  const { client, sejour, carte } = corps;
  const langue: Langue = corps.langue === 'en' ? 'en' : 'fr';

  // On valide avant d'appeler Mews : un 400 renvoyé par eux au milieu d'un
  // tunnel de paiement est illisible pour le client, et le jeton de carte est
  // déjà consommé quand il arrive.
  if (!client?.prenom?.trim() || !client?.nom?.trim() || !estEmail(client?.email)) {
    return NextResponse.json({ erreur: 'coordonnees incompletes' }, { status: 400 });
  }
  if (!estGuid(sejour?.categorieId) || !estGuid(sejour?.tarifId)) {
    return NextResponse.json({ erreur: 'sejour invalide' }, { status: 400 });
  }
  if (!estDate(sejour?.arrivee) || !estDate(sejour?.depart) || sejour.depart <= sejour.arrivee) {
    return NextResponse.json({ erreur: 'dates invalides' }, { status: 400 });
  }
  const adultes = Number(sejour?.adultes);
  if (!Number.isInteger(adultes) || adultes < 1 || adultes > 4) {
    return NextResponse.json({ erreur: 'occupation invalide' }, { status: 400 });
  }
  // La carte est facultative pour Mews, mais pas pour nous : sans elle, les
  // règles d'encaissement des rate groups n'ont rien à saisir et la chambre
  // partirait sans garantie.
  if (!carte?.jeton || !/^\d{4}-\d{2}$/.test(carte?.expiration ?? '') || !carte?.porteur?.trim()) {
    return NextResponse.json({ erreur: 'carte manquante' }, { status: 400 });
  }

  try {
    const resa = await creerReservation({
      langue,
      client: {
        prenom: client.prenom, nom: client.nom,
        email: client.email, telephone: client.telephone,
      },
      lignes: [{
        categorieId: sejour.categorieId,
        tarifId: sejour.tarifId,
        arrivee: sejour.arrivee,
        depart: sejour.depart,
        adultes,
        notes: sejour.notes?.slice(0, 500) || undefined,
      }],
      carte: { jeton: carte.jeton, expiration: carte.expiration!, porteur: carte.porteur },
    });

    if (!resa.groupeId) {
      // Mews a répondu 200 sans identifiant : la réservation existe peut-être.
      // On ne rejoue SURTOUT pas — on renvoie le client vers le téléphone.
      console.error('Mews create sans ReservationGroupId', resa);
      return NextResponse.json({ erreur: 'reponse inattendue' }, { status: 502 });
    }
    // La note part APRÈS coup et sans bloquer la réponse au client : la chambre
    // est prise, c'est ce qui compte. Un échec ici se lit dans les journaux et
    // se rattrape au comptoir ; un échec renvoyé au client, non.
    try {
      await poserNoteReception({ reservationIds: resa.reservationIds, sejour, adultes, langue });
    } catch (e) {
      console.error('Mews note de reception', e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ groupeId: resa.groupeId, numeros: resa.numeros });
  } catch (e) {
    // Le message de Mews peut contenir les coordonnées du client : il va dans
    // les journaux du serveur, jamais dans la réponse.
    console.error('Mews reservationGroups/create', e instanceof Error ? e.message : e);
    return NextResponse.json({ erreur: 'refus' }, { status: 502 });
  }
}
