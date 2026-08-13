import type { Metadata } from "next";
import ReserverClient from "./ReserverClient";
import { alternatesFor } from "@/lib/site";

export const metadata: Metadata = {
  title: "Réserver à l'Hôtel Les Voiles — Toulon Mourillon",
  description:
    "Réservez en direct à l'Hôtel Les Voiles, Toulon Mourillon. Petit-déjeuner inclus, prix tout compris, annulation gratuite jusqu'au jour d'arrivée.",
  alternates: alternatesFor("/reserver"),
};

export default function Page() {
  return <ReserverClient langue="fr" />;
}
