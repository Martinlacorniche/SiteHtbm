// Le Distributor de NWH pour un hôtel sur lessclic (Les Voiles, 10/11/2026), relayé ici comme celui de La Corniche
// (`/api/moteur-hotsoft`). Aucune logique de ce côté.
//
// ⛔ LES LECTURES SEULEMENT. NWH sait aussi y créer une réservation (`reservationGroups/create`), ferme et SANS carte :
// elle ne doit pas être joignable depuis ce site — la vente des Voiles passe par `/api/corniche/reserver`, qui ouvre la
// page Stripe de l'hôtel. Une porte qui vendrait sans garantie, il suffirait de l'appeler.
import { relayerVersNwh } from "@/lib/relaisNwh";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LECTURES = new Set(["configuration/get", "hotels/getAvailability", "tarifs/public"]);

export async function POST(req: Request, { params }: { params: Promise<{ operation: string[] }> }) {
  const { operation } = await params;
  const op = (operation ?? []).join("/");
  if (!LECTURES.has(op)) return NextResponse.json({ Message: `Opération ${op} indisponible ici` }, { status: 404 });
  return (await relayerVersNwh(req, `/api/moteur-lessclic/${op}`))
    ?? NextResponse.json({ Message: "Relais NWH éteint" }, { status: 503 });
}
