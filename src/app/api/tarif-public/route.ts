import { NextRequest, NextResponse } from 'next/server';
import { prixPublic } from '@/lib/mewsConnector';

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
