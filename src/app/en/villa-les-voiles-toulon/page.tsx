import type { Metadata } from "next";
import { alternatesFor, SITE_URL } from "@/lib/site";
import SiteBrand from "@/components/SiteBrand";
import PiedDePage from "@/components/PiedDePage";
import VillaClient from "../../villa-les-voiles-toulon/VillaClient";
import { chargerContenuVilla, chargerTarifsVilla } from "@/lib/villaDb";

// La version anglaise partage l'ÉCRAN, pas une copie : `VillaClient` porte ses
// deux dictionnaires. Deux pages jumelles divergent toujours — celle qu'on
// oublie de corriger finit par annoncer un autre prix.

export const metadata: Metadata = {
  alternates: alternatesFor("/en/villa-les-voiles-toulon"),
  title: "Rent a whole hotel in Toulon — Villa Les Voiles, Mourillon",
  description:
    "Rent an entire 3-star boutique hotel in Mourillon: 16 rooms, sea-view rooftop, 300 m from the beaches. From €40 per person per night. Live availability calendar.",
  openGraph: {
    title: "Rent a whole hotel in Toulon — Villa Les Voiles",
    description:
      "Sixteen rooms, a sea-view rooftop, a patio — and nobody else inside. Check your dates live.",
    url: `${SITE_URL}/en/villa-les-voiles-toulon`,
    images: [{ url: "/images/villa.jpg", width: 1200, height: 630, alt: "Villa Les Voiles, Toulon Mourillon" }],
  },
};

// Même raison qu'en français : le contenu vient de la base, la page ne peut
// plus être figée à la construction.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [contenu, tarifs] = await Promise.all([chargerContenuVilla(), chargerTarifsVilla()]);

  return (
    <>
      <SiteBrand />
      <main><VillaClient langue="en" contenu={contenu} tarifs={tarifs} /></main>
      <PiedDePage />
    </>
  );
}
