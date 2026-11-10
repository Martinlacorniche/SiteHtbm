// LE SÉJOUR D'UN HÔTEL SUR LESSCLIC, LU PAR NWH (11/11/2026).
//
// Les Voiles ont quitté Mews le 10/11/2026 : leur note, leurs factures et leurs règlements vivent dans lessclic. Ce
// site ne parle pas à lessclic — il n'en a pas les jetons. Il demande à NWH (`/api/moteur-lessclic/sejour`, réservé au
// relais), qui revérifie le jeton du séjour et répond dans le modèle de lessclic : des FACTURES (ouvertes, ou émises
// avec leur numéro), chacune avec ses lignes postées et à venir, ce qui est payé et ce qui reste.
//
// ⛔ AUCUN APPEL À MEWS, AUCUN STRIPE D'ICI. Régler une facture passe par le lien de lessclic, sur le compte Stripe
// de l'hôtel relié à lessclic ; c'est lessclic qui relit le reste dû et pose le règlement. Tant que ce lien manque,
// `lienDeReglement` rend `null` et l'écran dit « à régler à l'hôtel ».

const base = () => (process.env.GROUPE_RELAIS_NWH || '').replace(/\/$/, '');

export type LigneLessclic = { id: string; nom: string; jour: string | null; totalTtc: number; aVenir: boolean };
export type FactureLessclic = {
  id: string; nom: string | null;
  /** Le numéro légal, seulement une fois émise. */
  numero: string | null;
  emise: boolean;
  totalTtc: number;
  lignes: LigneLessclic[];
};
export type SejourLessclic = {
  sejour: {
    numero: string | null;
    /** `confirmee`, `option`, `annulee`, `no_show` (l'état de la RÉSERVATION chez lessclic). */
    etat: string;
    arrivee: string | null; depart: string | null;
    chambre: string | null; categorie: string | null;
    /** L'état de ménage de la chambre attribuée : `sale`, `propre`, `inspectee`, `hors_service`, ou null. */
    menage: string | null;
  };
  note: {
    factures: FactureLessclic[];
    /** Des lignes qui n'ont pas (encore) de facture cible. */
    sansFacture: LigneLessclic[];
    totalTtc: number; payeTtc: number; resteTtc: number;
    /** Le canal qui règle une partie par sa carte virtuelle (cette part n'est pas montrée). */
    priseEnCharge: string | null;
  };
};

async function appel(corps: Record<string, unknown>): Promise<Response> {
  const b = base();
  const secret = process.env.GROUPE_RELAIS_SECRET || '';
  if (!b || !secret) throw new Error('Relais NWH éteint (GROUPE_RELAIS_NWH / GROUPE_RELAIS_SECRET)');
  return fetch(`${b}/api/moteur-lessclic/sejour`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-nwh-relais': secret },
    body: JSON.stringify(corps),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
}

/** Le séjour et sa note. `null` : NWH ne connaît pas ce séjour (jeton invalide, ou ouvert du temps de Mews).
 *  ⚠️ Lève si NWH ou lessclic ne répondent pas : une panne ne s'affiche jamais en « tout est réglé ». */
export async function lireSejourLessclic(jeton: string): Promise<SejourLessclic | null> {
  const r = await appel({ jeton, op: 'lire' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`NWH séjour ${r.status} : ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as SejourLessclic;
}

/** Le PDF d'une facture émise de ce séjour, tel que NWH le relaie. */
export async function pdfFactureLessclic(jeton: string, factureId: string): Promise<Response> {
  return appel({ jeton, op: 'facture', factureId });
}

/** Le lien « payer » de lessclic pour une facture de ce séjour, ou `null` s'il n'est pas (encore) disponible. */
export async function lienDeReglement(jeton: string, factureId: string): Promise<string | null> {
  const r = await appel({ jeton, op: 'regler', factureId });
  if (!r.ok) return null;
  const j = (await r.json().catch(() => null)) as { url?: string } | null;
  return j?.url && /^https:\/\//.test(j.url) ? j.url : null;
}

/** Les factures qu'on propose de régler en ligne, quand il reste quelque chose à payer.
 *
 *  ⚠️ LESSCLIC NE DIT PAS ENCORE CE QUI RESTE SUR CHAQUE FACTURE, seulement sur le séjour. Une seule facture non
 *  vide : le reste du séjour est le sien, émise ou non. Plusieurs : on ne propose que les OUVERTES — une facture émise
 *  peut être soldée, et un bouton « régler » sur une facture payée se lirait comme une dette. Le lien, lui, relit le
 *  reste à l'ouverture et n'encaisse jamais deux fois. */
export function facturesAReglerEnLigne(s: SejourLessclic): FactureLessclic[] {
  if (s.note.resteTtc <= 0) return [];
  const pleines = s.note.factures.filter((f) => f.totalTtc > 0);
  return pleines.length === 1 ? pleines : pleines.filter((f) => !f.emise);
}
