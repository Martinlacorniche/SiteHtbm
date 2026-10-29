// L'état d'une vente du moteur de La Corniche au retour de Stripe, lu chez NWH (relayé).
import { relayerVersNwh } from "@/lib/relaisNwh";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const vente = new URL(req.url).searchParams.get("vente") || "";
  if (!/^[0-9a-f-]{36}$/i.test(vente)) return NextResponse.json({ erreur: "vente invalide" }, { status: 400 });
  return (await relayerVersNwh(req, `/api/reserver/vente?vente=${vente}`))
    ?? NextResponse.json({ erreur: "relais NWH éteint" }, { status: 503 });
}
