import type { Metadata } from "next";
import ReserverClient from "../../reserver/ReserverClient";
import { alternatesFor } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book Hôtel Les Voiles — Toulon, Mourillon beach",
  description:
    "Book direct at Hôtel Les Voiles, Toulon Mourillon. Breakfast included, all-inclusive prices, free cancellation until the day of arrival.",
  alternates: alternatesFor("/en/book"),
  // Tant que le paiement n'est pas branche, la page ne doit pas capter de
  // trafic de recherche : on y arrive par les cartes de l'accueil, pas par
  // Google. A retirer le jour ou le tunnel encaisse vraiment.
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ReserverClient langue="en" />;
}
