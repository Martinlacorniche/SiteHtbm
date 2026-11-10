import { NextRequest, NextResponse } from 'next/server';
import type { Langue } from '@/lib/mewsBooking';
import { annulerDemandePaiement, etatDemandePaiement } from '@/lib/mewsConnector';
import { finaliserVente } from '@/lib/finaliserVente';
import { alerterArgentSansResa } from '@/lib/alerteArgentSansResa';

/* Ferme la vente du tarif PRÉPAYÉ, une fois le paiement encaissé.
 *
 * ⚠️ CETTE ROUTE NE SERT QUE LE PRÉPAYÉ. Le flexible ne passe jamais par ici :
 * sa carte est attachée à la réservation dès `/api/reserver`, qui confirme dans
 * la foulée. Voir l'en-tête de cette route pour le pourquoi des deux chemins.
 *
 * ⚠️ C'EST ICI QUE LA CHAMBRE EST VENDUE, et nulle part avant.
 * `reservationGroups/create` n'a posé qu'une option, relâchée par Mews au bout
 * de vingt minutes. Tant que cette route n'a pas tourné, le client n'a rien —
 * et c'est voulu : celui qui ferme l'onglet devant le formulaire de carte ne
 * doit pas immobiliser une chambre.
 *
 * ⚠️ ON NE FAIT AUCUNE CONFIANCE À L'APPELANT. Elle est déclenchée par le
 * `onSuccess` du checkout, donc par le navigateur, qui peut l'appeler sans
 * avoir rien réglé. On relit donc l'état de la demande chez Mews : sans un
 * `Completed`, aucune vente ne se ferme. Ce contrôle était promis en
 * commentaire depuis le 26/08/2026 et n'existait pas dans le code.
 */

const estGuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const estDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

type Corps = {
  langue?: Langue;
  demandeId?: string;
  reservationIds?: string[];
  sejour?: { lignes?: { categorieId?: string; tarifId?: string; adultes?: number }[]; arrivee?: string; depart?: string };
};

/* ⛔ FERMÉE DEPUIS LA BASCULE DES VOILES VERS LESSCLIC (10/11/2026). Elle confirmait chez Mews une option payée par
 * le checkout de Mews : plus rien ne se vend par Mews, aucune option n'y est plus posée (`/api/reserver` refuse).
 * Si l'appel arrive quand même (une page ouverte avant la bascule), on relit la demande chez Mews :
 *   · payée (`Completed`) → de l'argent est pris et AUCUNE réservation n'existera : alerte (journal, mail à l'équipe,
 *     consigne de réception) et refus ; la réception rappelle le client et le rembourse ou le reloge dans lessclic ;
 *   · pas payée → on annule la demande (plus rien ne pourra être encaissé) et on refuse.
 * Le code d'origine reste en dessous, inatteignable, jusqu'au retrait du code Mews. */
const FERMEE = true;

async function refuserApresBascule(demandeId: string | undefined, ids: string[]): Promise<NextResponse> {
  let etat: string | null = null;
  if (estGuid(demandeId)) {
    try { etat = await etatDemandePaiement(demandeId); } catch (e) {
      console.error('Mews paymentRequests/getAll (après bascule)', e instanceof Error ? e.message : e);
      etat = 'illisible';
    }
  }
  if (etat === 'Completed' || etat === 'illisible') {
    await alerterArgentSansResa({
      origine: '/api/reserver/confirmer (checkout Mews)',
      reference: demandeId ?? null,
      detail: `options Mews ${ids.join(', ') || '?'}${etat === 'illisible' ? ' — état du paiement ILLISIBLE, peut-être encaissé' : ''}`,
      sortDeLArgent: etat === 'Completed' ? 'encaissé chez Mews, NON remboursé (à rembourser ou reloger)' : 'à vérifier chez Mews',
    });
  } else if (estGuid(demandeId)) {
    await annulerDemandePaiement(demandeId).catch(() => {});
  }
  return NextResponse.json({
    erreur: 'moteur change',
    message: etat === 'Completed'
      ? 'Votre paiement a bien été reçu, mais la réservation n’a pas pu être enregistrée. La réception est prévenue et vous rappelle ; vous pouvez aussi l’appeler au 04 94 41 36 23.'
      : 'Notre réservation en ligne a changé : rien n’a été réservé. Rechargez la page pour réserver, ou appelez-nous au 04 94 41 36 23.',
  }, { status: 409 });
}

export async function POST(req: NextRequest) {
  let corps: Corps;
  try { corps = await req.json(); } catch {
    return NextResponse.json({ erreur: 'requete illisible' }, { status: 400 });
  }
  const langue: Langue = corps.langue === 'en' ? 'en' : 'fr';
  const ids = (corps.reservationIds ?? []).filter(estGuid);
  const sejour = corps.sejour;

  if (FERMEE) return refuserApresBascule(corps.demandeId, ids);

  if (!ids.length) return NextResponse.json({ erreur: 'reservation absente' }, { status: 400 });
  if (!estGuid(corps.demandeId)) {
    return NextResponse.json({ erreur: 'demande absente' }, { status: 400 });
  }
  const brutes = sejour?.lignes ?? [];
  if (!brutes.length || brutes.length > 5) {
    return NextResponse.json({ erreur: 'sejour invalide' }, { status: 400 });
  }
  /* On valide EN CONSTRUISANT : `estGuid` est un garde de type, donc chaque
   * ligne sort d'ici avec des champs sûrs, sans une seule assertion. */
  const lignes: { categorieId: string; tarifId: string; adultes: number }[] = [];
  for (const l of brutes) {
    const categorieId = l?.categorieId;
    const tarifId = l?.tarifId;
    const adultes = Number(l?.adultes);
    if (!estGuid(categorieId) || !estGuid(tarifId)
        || !Number.isInteger(adultes) || adultes < 1 || adultes > 4) {
      return NextResponse.json({ erreur: 'sejour invalide' }, { status: 400 });
    }
    lignes.push({ categorieId, tarifId, adultes });
  }
  if (!estDate(sejour?.arrivee) || !estDate(sejour?.depart)) {
    return NextResponse.json({ erreur: 'sejour invalide' }, { status: 400 });
  }

  /* La preuve du paiement, chez Mews et pas dans la requête.
   * Une erreur de lecture bloque aussi : confirmer sans savoir reviendrait à
   * donner la chambre à qui sait appeler une URL. Mews relâchera l'option, et
   * le client voit un message qui lui donne le téléphone. */
  let etat: string | null;
  try {
    etat = await etatDemandePaiement(corps.demandeId);
  } catch (e) {
    console.error('Mews paymentRequests/getAll', e instanceof Error ? e.message : e);
    return NextResponse.json({ erreur: 'verification impossible' }, { status: 502 });
  }
  if (etat !== 'Completed') {
    console.warn('Confirmation refusee — demande', corps.demandeId, 'en etat', etat);
    return NextResponse.json({ erreur: 'paiement non abouti' }, { status: 402 });
  }

  /* Un échec ici est renvoyé au client, contrairement à la note : la chambre
   * n'est PAS acquise, et le laisser croire l'inverse est le pire scénario. */
  try {
    await finaliserVente({
      reservationIds: ids,
      sejour: { lignes, arrivee: sejour.arrivee, depart: sejour.depart },
      langue,
    });
  } catch (e) {
    console.error(
      'MEWS CONFIRMATION ECHOUEE APRES PAIEMENT — reservation relachee dans 20 min :',
      ids.join(', '), e instanceof Error ? e.message : e,
    );
    return NextResponse.json({ erreur: 'confirmation impossible' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

/* Le client a fermé l'onglet, ou le paiement a échoué définitivement.
 * On renonce à la demande pour ne pas laisser traîner une invitation à payer
 * une chambre que Mews va relâcher. L'option, elle, s'éteint toute seule. */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('demande');
  if (estGuid(id)) await annulerDemandePaiement(id);
  return NextResponse.json({ ok: true });
}
