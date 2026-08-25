import { NextRequest, NextResponse } from 'next/server';
import { creerReservation, type Langue } from '@/lib/mewsBooking';

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
    return NextResponse.json({ groupeId: resa.groupeId, numeros: resa.numeros });
  } catch (e) {
    // Le message de Mews peut contenir les coordonnées du client : il va dans
    // les journaux du serveur, jamais dans la réponse.
    console.error('Mews reservationGroups/create', e instanceof Error ? e.message : e);
    return NextResponse.json({ erreur: 'refus' }, { status: 502 });
  }
}
