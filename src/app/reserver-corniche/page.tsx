import type { Metadata } from "next";
import { pageCorniche } from "./vue";
import { alternatesFor } from "@/lib/site";

/* LE MOTEUR DE RÉSERVATION DE LA CORNICHE (29/10/2026) — l'écran du tunnel ici, sur le site de l'hôtel
 * (forfait personnalisé HTBM) ; les prix, la disponibilité HotSoft, la vente et Stripe chez NWH, par le
 * relais. Voir `src/lib/moteurNwh/pageCorniche.ts`. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Réserver au Best Western Plus La Corniche — Toulon, face à la mer",
  description: "Réservez en direct au Best Western Plus La Corniche, Toulon Mourillon : −10 € par nuit sur le tarif public, petit-déjeuner en option.",
  alternates: alternatesFor("/reserver-corniche"),
};

export default async function Page() {
  return pageCorniche("fr");
}
