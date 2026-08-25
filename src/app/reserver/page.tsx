import type { Metadata } from "next";
import ReserverClient from "./ReserverClient";
import { alternatesFor } from "@/lib/site";

export const metadata: Metadata = {
  title: "Réserver à l'Hôtel-Rooftop Les Voiles — Toulon Mourillon",
  description:
    "Réservez en direct à l'Hôtel-Rooftop Les Voiles, Toulon Mourillon. Petit-déjeuner inclus, prix tout compris, annulation gratuite jusqu'au jour d'arrivée.",
  alternates: alternatesFor("/reserver"),
  // Tant que le paiement n'est pas branche, la page ne doit pas capter de
  // trafic de recherche : on y arrive par les cartes de l'accueil, pas par
  // Google. A retirer le jour ou le tunnel encaisse vraiment.
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ReserverClient langue="fr" />;
}
