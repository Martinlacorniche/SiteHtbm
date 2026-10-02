// LE RECORD DE LA MAISON — lecture et dépôt d'un score, pour le jeu de la valise.
//
// 🔁 JUMEAU DE `siteconsignes/src/app/api/h/[slug]/jeu/route.ts`. Même table,
// mêmes bornes, même bride. Seule la façon de désigner l'hôtel change : un
// identifiant en paramètre plutôt qu'un slug dans le chemin, parce que le
// portail est servi par ce site-ci et qu'il connaît l'hôtel qu'il affiche.
//
// 🔑 POURQUOI UNE ROUTE ET PAS UNE LECTURE DIRECTE. Le portail est public : un
// jeton anonyme qui pourrait écrire dans `jeu_records` y poserait le maximum en
// une requête, et le jeu serait mort pour tout le monde, pour toujours. La
// table est fermée (RLS sans policy), et tout passe par ici.
//
// ⛔ ON NE PEUT PAS FAIRE MIEUX QUE RENDRE LA TRICHE PÉNIBLE. Un score calculé
// dans le navigateur est un chiffre que le navigateur peut inventer. On borne
// bas — 9 999 m, soit deux minutes et demie sans une faute là où le jeu monte à
// 66 m/s —, on limite la fréquence, et on s'arrête là.
//
// 🔑 Le record se remet à zéro en une ligne :
//   delete from public.jeu_records where hotel_id = '…';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const MAX = 9999;
/** Les deux maisons, et elles seules : un identifiant arbitraire ne doit pas
 *  pouvoir créer une ligne de record pour n'importe quel hôtel. */
const HOTELS = new Set([
  'f9d59e56-9a2f-433e-bcf4-f9753f105f32',
  'ded6e6fb-ff3c-4fa8-ad07-403ee316be53',
]);

async function record(hotelId: string): Promise<number> {
  const { data } = await supabaseServer
    .from('jeu_records').select('score').eq('hotel_id', hotelId).maybeSingle();
  return Number(data?.score ?? 0);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('hotel') ?? '';
  if (!HOTELS.has(id)) return NextResponse.json({ record: 0 });
  return NextResponse.json({ record: await record(id) });
}

/* Combien de fois une même adresse a déposé un score récemment. ⚠️ En mémoire,
 * donc par instance et remis à zéro au déploiement : c'est assez pour empêcher
 * une boucle, et ça ne mérite pas une table. */
const depots = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('hotel') ?? '';
  if (!HOTELS.has(id)) return NextResponse.json({ record: 0 });

  const ip = (req.headers.get('x-nf-client-connection-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0] || 'inconnue').trim();
  const maintenant = Date.now();
  const recents = (depots.get(ip) ?? []).filter((t) => maintenant - t < 60_000);
  /* Une partie dure au mieux quelques dizaines de secondes : vingt dépôts par
   * minute, c'est déjà une machine. */
  if (recents.length >= 20) return NextResponse.json({ record: await record(id) });
  depots.set(ip, [...recents, maintenant]);

  let corps: { score?: unknown };
  try { corps = await req.json() as { score?: unknown }; } catch { corps = {}; }
  const score = Math.max(0, Math.min(MAX, Math.floor(Number(corps.score) || 0)));

  const actuel = await record(id);
  if (score <= actuel) return NextResponse.json({ record: actuel, bat: false });

  const { error } = await supabaseServer.from('jeu_records')
    .upsert({ hotel_id: id, score, obtenu_le: new Date().toISOString() }, { onConflict: 'hotel_id' });
  /* ⛔ Un record qui ne s'enregistre pas ne doit pas casser la fin de partie :
   * on rend l'ancien, le joueur voit son score, et personne ne sait qu'il y a
   * eu un hoquet. C'est un jeu. */
  if (error) return NextResponse.json({ record: actuel, bat: false });
  return NextResponse.json({ record: score, bat: true });
}
