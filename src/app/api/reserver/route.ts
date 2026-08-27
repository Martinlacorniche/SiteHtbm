import { NextRequest, NextResponse } from 'next/server';
import {
  creerReservation, chercherDisponibilite, reglementDe, type Langue,
} from '@/lib/mewsBooking';
import { creerDemandePaiement } from '@/lib/mewsConnector';

/* Pose l'option, et la règle — par l'un des deux chemins.
 *
 * ⚠️ LES DEUX TARIFS NE SE RÈGLENT PLUS PAREIL, ET CE N'EST PAS UN CAPRICE.
 * Mews Payments Checkout ne sait pas conclure une préautorisation. Mesuré le
 * 27/08/2026 sur `paymentRequests/getAll` : des 28 demandes de type
 * `Preauthorization` créées par le tunnel le 26/08, AUCUNE n'est passée
 * `Completed` — toutes `Canceled` ou `Expired`. La seule demande de type
 * `Payment` de la journée (le mode `?diag=payment`, 1 €) est `Completed`, avec
 * son débit à 15:19:52 et son remboursement à 15:21:03. Le bouton du checkout
 * n'était pas mort : il ne savait pas quoi faire d'une préautorisation. Sa
 * documentation ne liste d'ailleurs que trois événements de succès, et pas un
 * pour la préautorisation.
 *
 *  · FLEXIBLE (`CreatePreauthorization` 1 %) — LA VENTE NE SE FERME PLUS ICI.
 *    La carte arrive tokenisée par PciProxy et on l'attache, mais elle est
 *    encore `Authorizable` : PciProxy tokenise sans authentifier. On rend donc
 *    son `PaymentCardId` au navigateur, qui joue le 3-D Secure, et la vente se
 *    ferme dans `/api/reserver/carte` une fois la carte `Authorized`.
 *    ⚠️ CONFIRMER AVANT L'AUTORISATION NE MARCHE PAS. On l'a fait le 27/08 sur
 *    la résa 29841 : elle est bien sortie `Confirmed` avec sa carte, et la
 *    préautomatisation de Mews n'a rien déclenché — la demande de 1,23 € est
 *    restée `Pending` jusqu'à expirer. Sous la DSP2, une carte non authentifiée
 *    ne se préautorise pas.
 *  · PRÉPAYÉ (`ChargeCreditCard` 100 %) — CETTE ROUTE NE VEND RIEN. Elle pose
 *    l'option et rend l'identifiant de la demande de paiement ; c'est le
 *    checkout qui encaisse, puis `/api/reserver/confirmer` qui ferme la vente.
 *
 * Le client qui abandonne au paiement ne laisse rien derrière lui dans les deux
 * cas : sans confirmation, Mews relâche la chambre au bout de vingt minutes.
 * Ce `ReleasedUtc`, qui nous a coûté une réservation le 26/08 faute de
 * l'appeler, fait exactement le travail d'une garde de panier.
 *
 * ⚠️ AUCUN NUMÉRO DE CARTE NE PASSE PAR ICI. Sur le chemin flexible on ne
 * reçoit qu'un `transactionId` PciProxy — un jeton inutilisable ailleurs,
 * valable trente minutes, produit dans deux iframes que ni cette page ni ce
 * serveur ne peuvent lire. Sur le chemin prépayé, même pas ça.
 */

const TAXE_PAR_ADULTE_NUIT = 1.86;

type Corps = {
  langue?: Langue;
  client?: { prenom?: string; nom?: string; email?: string; telephone?: string };
  /* Le jeton PciProxy, sur le seul chemin flexible. */
  carte?: { jeton?: string; expiration?: string; porteur?: string };
  sejour?: {
    /** Une ou PLUSIEURS chambres, toutes du même groupe tarifaire. */
    lignes?: { categorieId?: string; tarifId?: string; adultes?: number }[];
    arrivee?: string;
    depart?: string;
    notes?: string;
  };
};

/** Le tunnel ne compose pas des cars de tourisme. Au-delà, c'est un groupe et
 *  ça se traite au téléphone — et ça évite qu'une boucle de requêtes pose
 *  quarante options d'un coup. */
const CHAMBRES_MAX = 5;

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
  const brutes = sejour?.lignes ?? [];
  if (!brutes.length || brutes.length > CHAMBRES_MAX) {
    return NextResponse.json({ erreur: 'sejour invalide' }, { status: 400 });
  }
  /* On valide EN CONSTRUISANT : `estGuid` est un garde de type, donc chaque
   * ligne sort d'ici avec des champs sûrs, sans une seule assertion. */
  const lignes: { categorieId: string; tarifId: string; adultes: number }[] = [];
  for (const l of brutes) {
    const categorieId = l?.categorieId;
    const tarifId = l?.tarifId;
    const adultes = Number(l?.adultes);
    if (!estGuid(categorieId) || !estGuid(tarifId)) {
      return NextResponse.json({ erreur: 'sejour invalide' }, { status: 400 });
    }
    if (!Number.isInteger(adultes) || adultes < 1 || adultes > 4) {
      return NextResponse.json({ erreur: 'occupation invalide' }, { status: 400 });
    }
    lignes.push({ categorieId, tarifId, adultes });
  }
  if (!estDate(sejour?.arrivee) || !estDate(sejour?.depart) || sejour.depart <= sejour.arrivee) {
    return NextResponse.json({ erreur: 'dates invalides' }, { status: 400 });
  }
  // Sorties de `sejour` : TypeScript perd son affinage à l'entrée d'une
  // fermeture, et on en ouvre une pour composer les lignes.
  const arrivee = sejour.arrivee;
  const depart = sejour.depart;

  /* Le prix se relit CHEZ MEWS, jamais dans la requête.
   * C'est lui qui fixe le montant réellement demandé au client : le laisser
   * venir du navigateur reviendrait à laisser choisir combien on encaisse. */
  let dispo;
  try {
    dispo = await chercherDisponibilite({
      arrivee, depart, adultes: lignes[0].adultes, langue: 'fr',
    });
  } catch (e) {
    console.error('Mews getAvailability', e instanceof Error ? e.message : e);
    return NextResponse.json({ erreur: 'indisponible' }, { status: 502 });
  }

  const nuits = Math.max(
    1, Math.round((Date.parse(depart) - Date.parse(arrivee)) / 86_400_000),
  );

  /* Chaque chambre se chiffre chez Mews, puis on additionne.
   * Le total est ce qui fixe le montant réellement porté à la carte : le
   * laisser venir du navigateur reviendrait à laisser choisir combien on
   * encaisse. */
  let total = 0;
  for (const l of lignes) {
    const prixMews = dispo.offres
      .find((o) => o.categorieId === l.categorieId && o.pourPersonnes === l.adultes)
      ?.prix.find((p) => p.tarifId === l.tarifId)?.total;
    if (!prixMews) {
      // La chambre est partie, ou le tarif n'est plus offert sur ces dates.
      return NextResponse.json({ erreur: 'plus disponible' }, { status: 409 });
    }
    total += prixMews + TAXE_PAR_ADULTE_NUIT * l.adultes * nuits;
  }

  /* ⚠️ UN SEUL GROUPE TARIFAIRE PAR RÉSERVATION — revérifié ICI.
   *
   * L'écran éteint déjà les tarifs de l'autre groupe, mais cette route est
   * appelable directement. Deux règles d'encaissement dans un même groupe de
   * réservation, ce sont deux moteurs de paiement pour une carte : il n'y a
   * aucun comportement correct à ce moment-là, seulement des façons de se
   * tromper. On refuse. */
  const tarif = dispo.tarifs.find((r) => r.Id === lignes[0].tarifId);
  const groupeAttendu = tarif?.RateGroupId;
  const melange = lignes.some(
    (l) => dispo.tarifs.find((r) => r.Id === l.tarifId)?.RateGroupId !== groupeAttendu,
  );
  if (melange) {
    console.error('Refus : melange de groupes tarifaires', lignes.map((l) => l.tarifId).join(', '));
    return NextResponse.json({ erreur: 'tarifs incompatibles' }, { status: 400 });
  }

  const reglement = reglementDe(tarif, dispo.groupes, total);
  if (!reglement) {
    console.error('Mews : regle de reglement introuvable pour', lignes[0].tarifId);
    return NextResponse.json({ erreur: 'reglement inconnu' }, { status: 502 });
  }

  /* Le flexible attend sa carte ICI, et la refuse si elle manque : sans elle,
   * Mews n'a rien à préautoriser à la confirmation et relâche la réservation
   * vingt minutes plus tard, en silence. Autant le dire tout de suite. */
  const carte = corps.carte;
  if (!reglement.debite) {
    if (!carte?.jeton?.trim() || !carte?.porteur?.trim()
        || !/^\d{4}-\d{2}$/.test(carte?.expiration ?? '')) {
      return NextResponse.json({ erreur: 'carte incomplete' }, { status: 400 });
    }
  }

  let resa;
  try {
    resa = await creerReservation({
      langue,
      client: {
        prenom: client.prenom, nom: client.nom,
        email: client.email, telephone: client.telephone,
      },
      /* ⚠️ L'ORDRE COMPTE. Mews rend ses réservations dans l'ordre où on les
       * lui envoie, et c'est cet appariement par rang qui permettra de poser la
       * bonne note de réception sur chaque chambre. Ne pas trier ici.
       * Le mot du client va sur la PREMIÈRE seulement : le recopier sur les
       * trois ferait lire trois fois la même chose au comptoir. */
      lignes: lignes.map((l, rang) => ({
        categorieId: l.categorieId,
        tarifId: l.tarifId,
        arrivee,
        depart,
        adultes: l.adultes,
        notes: rang === 0 ? (sejour.notes?.slice(0, 500) || undefined) : undefined,
      })),
      // Le prépayé n'en donne pas : sa carte est collectée par le checkout.
      ...(reglement.debite ? {} : {
        carte: {
          jeton: carte!.jeton!.trim(),
          expiration: carte!.expiration!,
          porteur: carte!.porteur!.trim(),
        },
      }),
    });
  } catch (e) {
    console.error('Mews reservationGroups/create', e instanceof Error ? e.message : e);
    return NextResponse.json({ erreur: 'refus' }, { status: 502 });
  }

  if (!resa.groupeId || !resa.reservationIds.length || !resa.customerId) {
    console.error('Mews create : reponse incomplete', resa);
    return NextResponse.json({ erreur: 'reponse inattendue' }, { status: 502 });
  }

  /* ─── Chemin FLEXIBLE : la carte est posée, il reste à l'authentifier ──────
   *
   * On ne confirme PAS ici. La réservation reste `Optional`, tenue vingt
   * minutes, et c'est très bien : si le client abandonne devant le 3-D Secure,
   * Mews relâche la chambre sans qu'on ait rien à défaire. */
  if (!reglement.debite) {
    if (!resa.carteId) {
      // Mews a accepté la carte mais ne rend pas son identifiant : sans lui, on
      // ne peut ni l'authentifier ni donc la préautoriser. Mieux vaut le dire.
      console.error('Mews create : PaymentCardId absent malgre CreditCardData');
      return NextResponse.json({ erreur: 'carte non enregistree' }, { status: 502 });
    }
    return NextResponse.json({
      termine: false,
      aAutoriser: true,
      groupeId: resa.groupeId,
      numeros: resa.numeros,
      reservationIds: resa.reservationIds,
      carteId: resa.carteId,
      reglement: { debite: false, montant: reglement.montant },
    });
  }

  /* ─── Chemin PRÉPAYÉ : la demande de paiement que le checkout va consommer ──
   *
   * ⚠️ ON PREND CELLE DE MEWS, ON N'EN FABRIQUE PLUS UNE SECONDE.
   * `reservationGroups/create` la crée déjà, du type et du montant que dicte
   * la règle du groupe tarifaire. On en créait une deuxième par le Connector :
   * relevé le 27/08/2026, chaque réservation du 26/08 en portait deux, nées à
   * la même seconde. Le repli ci-dessous ne sert que si Mews n'en rend pas. */
  let demandeId: string | null = resa.demandeId || null;
  if (!demandeId) {
    const expireUtc = new Date(Date.now() + 20 * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    try {
      demandeId = await creerDemandePaiement({
        customerId: resa.customerId,
        reservationId: resa.reservationIds[0],
        montant: reglement.montant,
        type: 'Payment',
        // Lue par le client dans le checkout : elle doit lui parler, à lui.
        description: langue === 'fr' ? 'Règlement de votre séjour' : 'Payment for your stay',
        expireUtc,
      });
    } catch (e) {
      console.error('Mews paymentRequests/add', e instanceof Error ? e.message : e);
    }
  }
  if (!demandeId) {
    // Sans demande, le checkout n'a rien à afficher. On ne confirme pas : Mews
    // relâchera l'option, et le client voit un message plutôt qu'un cadre vide.
    return NextResponse.json({ erreur: 'paiement indisponible' }, { status: 502 });
  }

  return NextResponse.json({
    termine: false,
    groupeId: resa.groupeId,
    numeros: resa.numeros,
    reservationIds: resa.reservationIds,
    demandeId,
    // Ce que le client va régler, pour que l'écran l'annonce sans le recalculer.
    reglement: { debite: true, montant: reglement.montant },
  });
}
