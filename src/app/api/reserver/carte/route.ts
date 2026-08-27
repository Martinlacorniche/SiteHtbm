import { NextRequest, NextResponse } from 'next/server';
import { etatCarte, type Langue } from '@/lib/mewsBooking';
import { finaliserVente } from '@/lib/finaliserVente';

/* Ferme la vente du tarif FLEXIBLE, une fois la carte authentifiée.
 *
 * ⚠️ TOUT L'ORDRE DES OPÉRATIONS TIENT DANS CETTE ROUTE, et il a coûté deux
 * jours. PciProxy tokenise sans authentifier : la carte arrive chez Mews en
 * `AuthorizationState: Authorizable`. Sous la DSP2, Mews ne déclenche pas sa
 * préautorisation automatique depuis une carte dans cet état — la demande reste
 * `Pending` et expire, sans une ligne d'erreur nulle part. Vérifié le
 * 27/08/2026 sur la résa 29841, qui était pourtant `Confirmed` avec sa carte.
 *
 * Donc : autoriser d'abord, confirmer ensuite. C'est la confirmation qui
 * déclenche le règlement (`SettlementTrigger: Confirmation`), et elle ne doit
 * tomber que sur une carte prête à le supporter.
 *
 * ⚠️ ON NE CROIT PAS LE NAVIGATEUR SUR L'AUTORISATION. Il pourrait appeler
 * cette route en prétendant que le 3-D Secure a réussi. On relit l'état chez
 * Mews, et rien d'autre ne fait foi.
 */

const estGuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const estDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

type Corps = {
  langue?: Langue;
  carteId?: string;
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

  if (!estGuid(corps.carteId)) return NextResponse.json({ erreur: 'carte absente' }, { status: 400 });
  if (!ids.length) return NextResponse.json({ erreur: 'reservation absente' }, { status: 400 });
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

  /* La preuve de l'authentification, chez Mews.
   * Une lecture qui échoue bloque aussi : confirmer sans savoir, c'est
   * reproduire exactement le bug qu'on vient de corriger. */
  let etat;
  try {
    etat = await etatCarte(corps.carteId, langue);
  } catch (e) {
    console.error('Mews paymentCards/getAll', e instanceof Error ? e.message : e);
    return NextResponse.json({ erreur: 'verification impossible' }, { status: 502 });
  }
  if (etat !== 'Authorized') {
    /* `Authorizable` ici veut dire que le client n'a pas fini son 3-D Secure,
     * ou l'a abandonné. Ce n'est pas une panne : la chambre sera relâchée toute
     * seule, et l'écran le lui dira. */
    console.warn('Confirmation refusee — carte', corps.carteId, 'en etat', etat);
    return NextResponse.json({ erreur: 'carte non authentifiee', etat }, { status: 402 });
  }

  /* Un échec ici est renvoyé au client : la chambre n'est PAS acquise, et le
   * laisser croire l'inverse est le pire des scénarios. */
  try {
    await finaliserVente({
      reservationIds: ids,
      sejour: { lignes, arrivee: sejour.arrivee, depart: sejour.depart },
      langue,
    });
  } catch (e) {
    console.error(
      'MEWS CONFIRMATION ECHOUEE APRES 3-D SECURE — reservation relachee dans 20 min :',
      ids.join(', '), e instanceof Error ? e.message : e,
    );
    return NextResponse.json({ erreur: 'confirmation impossible' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
