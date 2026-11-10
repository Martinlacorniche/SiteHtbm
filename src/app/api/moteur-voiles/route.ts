// Le moteur des Voiles, pour l'écran `/reserver` : Mews, NWH (lessclic), ou rien — voir `lib/moteurVoilesServeur.ts`.
// La page est en cache une heure ; cette question-ci ne l'est pas, pour que la bascule se voie dans la minute.
import { NextResponse } from "next/server";
import { moteurVoilesNavigateur } from "@/lib/moteurVoilesServeur";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await moteurVoilesNavigateur(), { headers: { "cache-control": "no-store" } });
}
