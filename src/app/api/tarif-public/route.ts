import { NextRequest, NextResponse } from 'next/server';
import { prixPublic } from '@/lib/mewsConnector';
import { moteurVoilesServeur } from '@/lib/moteurVoilesServeur';
import { prixPublicVersMews } from '@/lib/moteurVoiles';

/* Ce que le même séjour coûterait sur Booking.
 *
 * Pourquoi une route serveur alors que tout le reste du tunnel interroge Mews
 * depuis le navigateur : les tarifs OTA ne sont pas publiés sur la
 * configuration du moteur, et ils ne doivent SURTOUT pas l'être — ils
 * deviendraient réservables en direct. Ils ne sont lisibles que par le
 * Connector, dont les jetons ne sortent pas d'ici.
 *
 * Rien de sensible ne ressort : uniquement des prix que l'hôtel affiche déjà
 * publiquement sur les plateformes.
 */

const estDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const arrivee = p.get('arrivee');
  const depart = p.get('depart');
  const adultes = Number(p.get('adultes'));

  if (!estDate(arrivee) || !estDate(depart) || depart <= arrivee) {
    return NextResponse.json({ erreur: 'dates invalides' }, { status: 400 });
  }
  if (!Number.isInteger(adultes) || adultes < 1 || adultes > 4) {
    return NextResponse.json({ erreur: 'occupation invalide' }, { status: 400 });
  }

  /* Les Voiles sur lessclic (10/11/2026) : le prix des OTA est celui que lessclic montre à la grille du RMS, lu par NWH
   * (`tarifs/public`). Il manque quand lessclic ne sait pas le dire — jamais recalculé ici. Moteur indisponible : on se
   * tait, la comparaison n'est qu'un bonus. */
  const moteur = await moteurVoilesServeur();
  if (moteur.mode === 'indisponible') return NextResponse.json({ prix: {} });
  if (moteur.mode === 'nwh') {
    try {
      const r = await fetch(`${moteur.cfg.base}/tarifs/public`, {
        method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ HotelId: moteur.cfg.hotelId, StartUtc: `${arrivee}T00:00:00Z`, EndUtc: `${depart}T00:00:00Z`, AdultCount: adultes }),
        signal: AbortSignal.timeout(8_000),
      });
      const j = r.ok ? ((await r.json()) as { prix?: Record<string, { flexible?: number; prepaye?: number }> }) : null;
      return NextResponse.json({ prix: prixPublicVersMews(moteur, j?.prix ?? {}) });
    } catch (e) {
      console.error('NWH tarif public', e instanceof Error ? e.message : e);
      return NextResponse.json({ prix: {} });
    }
  }

  try {
    const prix = await prixPublic({ arrivee, depart, adultes });
    return NextResponse.json({ prix: Object.fromEntries(prix) });
  } catch (e) {
    // La comparaison est un bonus : si elle échoue, le tunnel continue sans
    // elle. On ne casse pas une réservation pour un chiffre d'ornement.
    console.error('Mews tarif public', e instanceof Error ? e.message : e);
    return NextResponse.json({ prix: {} });
  }
}
