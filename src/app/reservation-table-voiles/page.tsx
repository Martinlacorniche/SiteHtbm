import type { Metadata } from "next";
import { alternatesFor } from "@/lib/site";
import ReservationClient from "./ReservationClient";

export const metadata: Metadata = {
  alternates: alternatesFor("/reservation-table-voiles"),
  title: "Réserver une table au Rooftop Les Voiles – Toulon",
  description:
    "Réservez votre table au Rooftop de l'Hôtel Les Voiles à Toulon (Mourillon) : bar à ciel ouvert sur la rade, petites assiettes et vue sur la mer.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <ReservationClient />;
}
