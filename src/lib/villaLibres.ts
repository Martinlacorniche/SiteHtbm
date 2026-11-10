// LES CHAMBRES LIBRES DE LA VILLA, LUES DANS LESSCLIC PAR NWH (10/11/2026).
//
// Les Voiles ont quitté Mews pour lessclic le 10/11/2026 : Mews ne reçoit plus les ventes, et la villa y lisait des
// nuits libres qui ne l'étaient plus. La lecture passe désormais par NWH (`/api/moteur-lessclic/libres`, réservé au
// relais), qui interroge lessclic avec le connecteur de l'hôtel.
//
// 🔑 MÊME RÈGLE QU'AVEC MEWS : LA MAISON EST-ELLE VIDE, PAS « UNE CHAMBRE SE VEND-ELLE ». Le compte est celui des
// chambres PHYSIQUEMENT libres : chambres actives moins séjours (options comprises), blocs de groupe et hors service.
// Les fermetures de vente (stop-sell de l'hiver, CTA, séjours minimum) n'y pèsent pas — les privatisations se vendent
// justement pendant la fermeture (Martin, 10/11/2026). C'est ce que faisait `chambresLibres` de `mewsConnector.ts`
// avec le Connector (et non la Booking Engine).
//
// ⛔ UNE LECTURE RATÉE LÈVE. Jamais de zéro par défaut, jamais de « libre » par défaut : la route du calendrier
// répond alors « panne » (l'écran dit d'appeler), le verdict rend 503 (« appelez-nous »), la demande s'enregistre
// avec une dispo « non lue ».

import { HOTEL_VOILES_NWH } from './moteurVoiles';

const base = () => (process.env.GROUPE_RELAIS_NWH || '').replace(/\/$/, '');

/* Deux minutes de mémoire, par fenêtre : un calendrier qu'on feuillette ne rappelle pas NWH à chaque flèche, et une
 * chambre vendue se voit vite. En mémoire du processus : rien à purger. */
const TTL_MS = 2 * 60 * 1000;
const CACHE = new Map<string, { a: number; v: Map<string, number> }>();

const lendemain = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Les chambres libres de chaque nuit de [premiere, derniere] (bornes incluses). Lève si NWH ne répond pas. */
export async function libresParNuitVoiles(premiere: string, derniere: string): Promise<Map<string, number>> {
  const cle = `${premiere}|${derniere}`;
  const garde = CACHE.get(cle);
  if (garde && Date.now() - garde.a < TTL_MS) return garde.v;

  const b = base();
  const secret = process.env.GROUPE_RELAIS_SECRET || '';
  if (!b || !secret) throw new Error('Relais NWH éteint (GROUPE_RELAIS_NWH / GROUPE_RELAIS_SECRET)');

  const r = await fetch(`${b}/api/moteur-lessclic/libres`, {
    method: 'POST', cache: 'no-store',
    headers: { 'content-type': 'application/json', 'x-nwh-relais': secret },
    body: JSON.stringify({ HotelId: HOTEL_VOILES_NWH, du: premiere, au: derniere }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!r.ok) throw new Error(`NWH libres ${r.status} : ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { nuits?: { jour?: string; libres?: number }[] };
  const out = new Map<string, number>();
  for (const n of j.nuits ?? []) {
    if (typeof n.jour === 'string' && Number.isFinite(n.libres)) out.set(n.jour, Number(n.libres));
  }
  CACHE.set(cle, { a: Date.now(), v: out });
  return out;
}

/**
 * Combien de chambres sont libres sur TOUTE la période (nuits de l'arrivée à la veille du départ) — le verdict de la
 * privatisation : c'est la nuit la plus chargée qui décide.
 *
 * ⚠️ UNE NUIT QUE NWH NE REND PAS N'EST PAS UNE NUIT LIBRE : on lève, plutôt que de conclure sur les autres.
 */
export async function chambresLibresVoiles({ arrivee, depart }: { arrivee: string; depart: string }): Promise<number> {
  const veille = new Date(Date.parse(`${depart}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  if (veille < arrivee) return 0;
  const parNuit = await libresParNuitVoiles(arrivee, veille);
  let min = Infinity;
  for (let d = arrivee; d <= veille; d = lendemain(d)) {
    const n = parNuit.get(d);
    if (n === undefined) throw new Error(`Nuit ${d} non rendue par NWH`);
    min = Math.min(min, n);
  }
  return min === Infinity ? 0 : min;
}
