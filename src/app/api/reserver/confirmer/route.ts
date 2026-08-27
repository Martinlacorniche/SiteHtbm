import { NextRequest, NextResponse } from 'next/server';
import type { Langue } from '@/lib/mewsBooking';
import { annulerDemandePaiement, etatDemandePaiement } from '@/lib/mewsConnector';
import { finaliserVente } from '@/lib/finaliserVente';

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

export async function POST(req: NextRequest) {
  let corps: Corps;
  try { corps = await req.json(); } catch {
    return NextResponse.json({ erreur: 'requete illisible' }, { status: 400 });
  }
  const langue: Langue = corps.langue === 'en' ? 'en' : 'fr';
  const ids = (corps.reservationIds ?? []).filter(estGuid);
  const sejour = corps.sejour;

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
