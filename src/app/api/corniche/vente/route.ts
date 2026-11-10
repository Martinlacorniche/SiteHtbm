// L'état d'une vente du moteur de La Corniche au retour de Stripe, lu chez NWH (relayé).
import { relayerVersNwh } from "@/lib/relaisNwh";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const vente = q.get("vente") || "";
  if (!/^[0-9a-f-]{36}$/i.test(vente)) return NextResponse.json({ erreur: "vente invalide" }, { status: 400 });
  /* L'hôtel de la page (son slug chez NWH) : une vente sur lessclic se demande au lessclic de CET hôtel. Borné, et
     il ne donne aucun droit — NWH ne fait que désigner l'hôtel avec. */
  const h = q.get("h") || "";
  const hotel = /^[a-z0-9-]{1,60}$/i.test(h) ? `&h=${h}` : "";
  return (await relayerVersNwh(req, `/api/reserver/vente?vente=${vente}${hotel}`))
    ?? NextResponse.json({ erreur: "relais NWH éteint" }, { status: 503 });
}
