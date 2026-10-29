// Le moteur de La Corniche : prix et disponibilité HotSoft, servis par NWH et relayés ici
// (`relayerVersNwh`, comme les routes de groupe). Aucune logique de ce côté.
import { relayerVersNwh } from "@/lib/relaisNwh";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ operation: string[] }> }) {
  const { operation } = await params;
  const op = (operation ?? []).map(encodeURIComponent).join("/");
  return (await relayerVersNwh(req, `/api/moteur-hotsoft/${op}`))
    ?? NextResponse.json({ Message: "Relais NWH éteint" }, { status: 503 });
}
