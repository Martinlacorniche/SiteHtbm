// TÉLÉCHARGER UNE FACTURE DU SÉJOUR — le PDF émis par lessclic, relayé par NWH (11/11/2026).
//
// 🔑 LE JETON D'ABORD, ici puis chez NWH, qui vérifie aussi que la facture est bien une de CE séjour et qu'elle est
// ÉMISE : une note encore ouverte n'est pas une pièce que l'hôtel a délivrée.
import { reconnaitre } from '@/lib/ucp/acces';
import { pdfFactureLessclic } from '@/lib/ucp/sejourLessclic';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ jeton: string; id: string }> }) {
  const { jeton, id } = await params;
  const ouvert = await reconnaitre(jeton).catch(() => null);
  if (!ouvert) return new Response('Introuvable', { status: 404 });

  const r = await pdfFactureLessclic(jeton, id).catch(() => null);
  if (!r || !r.ok || !(r.headers.get('content-type') ?? '').includes('application/pdf')) {
    return new Response(
      r?.status === 409 ? 'Cette facture n’est pas encore émise.' : 'La facture ne peut pas être téléchargée pour le moment.',
      { status: r?.status === 404 ? 404 : r?.status === 409 ? 409 : 502, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }
  return new Response(r.body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': r.headers.get('content-disposition') ?? 'attachment; filename="facture.pdf"',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex',
    },
  });
}
