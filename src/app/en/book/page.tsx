import type { Metadata } from "next";
import ReserverClient from "../../reserver/ReserverClient";
import { alternatesFor } from "@/lib/site";
import { balisageReserver } from "@/lib/balisageReserver";

export const metadata: Metadata = {
  title: "Book Hôtel-Rooftop Les Voiles — Toulon, Mourillon beach",
  description:
    "Book direct at Hôtel-Rooftop Les Voiles, Toulon Mourillon. Breakfast included, all-inclusive prices, free cancellation until the day of arrival.",
  alternates: alternatesFor("/en/book"),
};

/* Même cache que la version française : le prix vient du même moteur. */
export const revalidate = 3600;

export default async function Page() {
  const balisage = await balisageReserver("en", "/en/book");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(balisage) }}
      />
      <ReserverClient langue="en" />
    </>
  );
}
