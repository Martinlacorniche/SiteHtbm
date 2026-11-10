// RÉGLER UNE NOTE DU SÉJOUR EN LIGNE — vers le lien de lessclic, sur le Stripe de l'hôtel (11/11/2026).
//
// Le lien se demande AU CLIC, pas à l'affichage : il ne porte pas de montant, lessclic relit le reste dû à son
// ouverture et dit « réglée » plutôt que d'encaisser deux fois. Le règlement est posé sur la facture par lessclic
// lui-même (retour de Stripe et notification) : il n'y a rien à consigner ici.
//
// ⛔ JAMAIS MEWS, JAMAIS UN AUTRE STRIPE. Pas de lien chez lessclic : retour sur la page, qui dit « à l'hôtel ».
import { NextResponse } from 'next/server';
import { reconnaitre } from '@/lib/ucp/acces';
import { lienDeReglement } from '@/lib/ucp/sejourLessclic';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ jeton: string; id: string }> }) {
  const { jeton, id } = await params;
  const page = `${SITE_URL}/sejour/${encodeURIComponent(jeton)}`;
  const ouvert = await reconnaitre(jeton).catch(() => null);
  if (!ouvert) return NextResponse.redirect(page, 303);

  const url = await lienDeReglement(jeton, id).catch(() => null);
  return NextResponse.redirect(url ?? `${page}?regler=indisponible`, 303);
}
