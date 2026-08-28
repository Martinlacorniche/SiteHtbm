import { NextRequest, NextResponse } from 'next/server';
import { libresParNuit } from '@/lib/mewsConnector';
import { etatDeLaNuit, type EtatNuit } from '@/lib/villa';

/* Le calendrier : l'état de chaque nuit, en UN appel.
 *
 *   GET /api/villa/calendrier?debut=2026-11-01&fin=2026-12-31
 *
 * ⚠️ POURQUOI PAS LA MÊME API QUE LE VERDICT.
 * `/api/villa/dispo` interroge la Booking Engine, qui ne répond que sur une
 * période entière : elle rend ce qui est réservable de bout en bout, le
 * minimum des nuits. Pour peindre soixante jours il aurait fallu soixante
 * appels, sur une API dont la documentation dit qu'elle est « unsuitable for
 * continuous polling by a single server ».
 * Le Connector, lui, rend un tableau — une case par nuit — pour toute la
 * fenêtre. Deux mois coûtent un appel, mis en cache cinq minutes.
 *
 * ⚠️ ET LES DEUX CONCORDENT : vérifié le 28/08/2026 sur les données réelles
 * (20, 21, 22 octobre → 15 chambres des deux côtés ; 10, 11 novembre → 16).
 * Le calendrier ne promettra donc pas ce que le verdict refusera.
 *
 * ⚠️ CETTE ROUTE PARLE À MEWS AVEC NOS JETONS. Elle ne rend que des comptes de
 * chambres, jamais un nom ni une réservation — mais c'est bien pour ça qu'elle
 * borne sa fenêtre : sans plafond, une boucle chez un visiteur ferait défiler
 * l'année entière chez Mews.
 */

export const dynamic = 'force-dynamic';

const estDate = (s: string | null): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// Deux mois affichés côte à côte, plus la marge du mois suivant : soixante-dix
// jours suffisent largement, et bornent la fenêtre demandée à Mews.
const JOURS_MAX = 70;

export type JourCalendrier = { jour: string; libres: number; etat: EtatNuit };

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const debut = p.get('debut'), fin = p.get('fin');
  if (!estDate(debut) || !estDate(fin) || fin < debut)
    return NextResponse.json({ erreur: 'dates' }, { status: 400 });

  const jours = Math.round((Date.parse(fin) - Date.parse(debut)) / 86_400_000) + 1;
  if (jours > JOURS_MAX) return NextResponse.json({ erreur: 'fenetre' }, { status: 400 });

  try {
    const libres = await libresParNuit(debut, fin);
    const nuits: JourCalendrier[] = [...libres.entries()]
      .map(([jour, n]) => ({ jour, libres: n, etat: etatDeLaNuit(n) }));
    return NextResponse.json({ nuits });
  } catch {
    /* Mews injoignable : on rend une fenêtre VIDE plutôt qu'une erreur. Le
       calendrier s'affiche alors en gris neutre, sans rien promettre, et le
       visiteur peut quand même poser ses dates — c'est le verdict qui
       tranchera. Un calendrier absent vaut mieux qu'un calendrier menteur. */
    return NextResponse.json({ nuits: [], panne: true });
  }
}
