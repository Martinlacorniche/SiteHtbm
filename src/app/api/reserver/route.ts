import { NextRequest, NextResponse } from 'next/server';
import {
  creerReservation, chercherDisponibilite, reglementDe, type Langue,
} from '@/lib/mewsBooking';
import { creerDemandePaiement } from '@/lib/mewsConnector';

/* Pose l'option, et prépare son règlement.
 *
 * ⚠️ CETTE ROUTE NE VEND RIEN. Elle crée la réservation SANS moyen de paiement
 * — `reservationGroups/create` la sort en `State: Optional`, tenue vingt
 * minutes — puis ouvre une demande de paiement chez Mews. C'est le checkout
 * embarqué qui encaisse ensuite, dans la page, et `/api/reserver/confirmer`
 * qui ferme la vente une fois le paiement passé.
 *
 * Le client qui abandonne au paiement ne laisse donc rien derrière lui : on ne
 * confirme pas, et Mews relâche la chambre tout seul. Ce `ReleasedUtc` de vingt
 * minutes, qui nous a coûté une réservation le 26/08 faute de la confirmer,
 * fait ici exactement le travail d'une garde de panier.
 *
 * ⚠️ AUCUNE DONNÉE DE CARTE NE PASSE PAR ICI, ni même un jeton. Mews collecte
 * la carte dans son propre iframe et porte la certification PCI-DSS. Le
 * navigateur ne reçoit de nous qu'un identifiant de demande de paiement, et le
 * montant est fixé de ce côté-ci — il n'est pas modifiable à la console, ce qui
 * serait le cas si on laissait le checkout le lire dans sa configuration.
 */

const TAXE_PAR_ADULTE_NUIT = 1.86;

type Corps = {
  langue?: Langue;
  /* Diagnostic uniquement (`?diag=payment`). Force une demande de type
   * `Payment` a 1 € au lieu de la preautorisation calculee : c'est la derniere
   * hypothese non testee sur le checkout qui refuse de soumettre. Un euro
   * reellement debite, remboursable par `payments/refund`. */
  diagPayment?: boolean;
  client?: { prenom?: string; nom?: string; email?: string; telephone?: string };
  sejour?: {
    categorieId?: string;
    tarifId?: string;
    arrivee?: string;
    depart?: string;
    adultes?: number;
    notes?: string;
  };
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

  const { client, sejour } = corps;
  const langue: Langue = corps.langue === 'en' ? 'en' : 'fr';

  // On valide avant d'appeler Mews : un 400 renvoyé par eux au milieu d'un
  // tunnel est illisible pour le client.
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

  /* Le prix se relit CHEZ MEWS, jamais dans la requête.
   * C'est lui qui fixe le montant réellement demandé au client : le laisser
   * venir du navigateur reviendrait à laisser choisir combien on encaisse. */
  let dispo;
  try {
    dispo = await chercherDisponibilite({
      arrivee: sejour.arrivee, depart: sejour.depart, adultes, langue: 'fr',
    });
  } catch (e) {
    console.error('Mews getAvailability', e instanceof Error ? e.message : e);
    return NextResponse.json({ erreur: 'indisponible' }, { status: 502 });
  }

  const prixMews = dispo.offres
    .find((o) => o.categorieId === sejour.categorieId && o.pourPersonnes === adultes)
    ?.prix.find((p) => p.tarifId === sejour.tarifId)?.total;
  if (!prixMews) {
    // La chambre est partie, ou le tarif n'est plus offert sur ces dates.
    return NextResponse.json({ erreur: 'plus disponible' }, { status: 409 });
  }

  const nuits = Math.max(
    1, Math.round((Date.parse(sejour.depart) - Date.parse(sejour.arrivee)) / 86_400_000),
  );
  const taxe = TAXE_PAR_ADULTE_NUIT * adultes * nuits;
  const total = prixMews + taxe;

  const tarif = dispo.tarifs.find((r) => r.Id === sejour.tarifId);
  const reglement = reglementDe(tarif, dispo.groupes, total);
  if (!reglement) {
    console.error('Mews : regle de reglement introuvable pour', sejour.tarifId);
    return NextResponse.json({ erreur: 'reglement inconnu' }, { status: 502 });
  }

  let resa;
  try {
    resa = await creerReservation({
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
    });
  } catch (e) {
    console.error('Mews reservationGroups/create', e instanceof Error ? e.message : e);
    return NextResponse.json({ erreur: 'refus' }, { status: 502 });
  }

  if (!resa.groupeId || !resa.reservationIds.length || !resa.customerId) {
    console.error('Mews create : reponse incomplete', resa);
    return NextResponse.json({ erreur: 'reponse inattendue' }, { status: 502 });
  }

  /* La demande de paiement, que le checkout va consommer.
   * Elle expire en même temps que l'option — inutile de laisser vivre une
   * demande pour une chambre que Mews a déjà relâchée. */
  const expireUtc = new Date(Date.now() + 20 * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  let demandeId: string | null = null;
  try {
    demandeId = await creerDemandePaiement({
      customerId: resa.customerId,
      reservationId: resa.reservationIds[0],
      montant: corps.diagPayment ? 1 : reglement.montant,
      type: corps.diagPayment || reglement.debite ? 'Payment' : 'Preauthorization',
      // Lue par le client dans le checkout : elle doit lui parler, à lui.
      description: reglement.debite
        ? (langue === 'fr' ? 'Règlement de votre séjour' : 'Payment for your stay')
        : (langue === 'fr' ? 'Garantie de votre réservation' : 'Guarantee for your booking'),
      expireUtc,
    });
  } catch (e) {
    console.error('Mews paymentRequests/add', e instanceof Error ? e.message : e);
  }
  if (!demandeId) {
    // Sans demande, le checkout n'a rien à afficher. On ne confirme pas : Mews
    // relâchera l'option, et le client voit un message plutôt qu'un cadre vide.
    return NextResponse.json({ erreur: 'paiement indisponible' }, { status: 502 });
  }

  return NextResponse.json({
    groupeId: resa.groupeId,
    numeros: resa.numeros,
    reservationIds: resa.reservationIds,
    demandeId,
    // Ce que le client va régler, pour que l'écran l'annonce sans le recalculer.
    reglement: { debite: reglement.debite, montant: reglement.montant },
  });
}
