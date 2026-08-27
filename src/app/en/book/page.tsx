import type { Metadata } from "next";
import ReserverClient from "../../reserver/ReserverClient";
import { alternatesFor } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book Hôtel-Rooftop Les Voiles — Toulon, Mourillon beach",
  description:
    "Book direct at Hôtel-Rooftop Les Voiles, Toulon Mourillon. Breakfast included, all-inclusive prices, free cancellation until the day of arrival.",
  alternates: alternatesFor("/en/book"),
};

export default function Page() {
  return <ReserverClient langue="en" />;
}
