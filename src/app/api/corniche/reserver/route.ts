// La vente du moteur de La Corniche (option HotSoft + Stripe), faite par NWH et relayée ici.
import { relayerVersNwh } from "@/lib/relaisNwh";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return (await relayerVersNwh(req, "/api/reserver"))
    ?? NextResponse.json({ erreur: "relais NWH éteint" }, { status: 503 });
}
