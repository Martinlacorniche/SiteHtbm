import type { Metadata } from "next";
import { alternatesFor, SITE_URL } from "@/lib/site";
import RooftopCarteClient from "./RooftopCarteClient";

export const metadata: Metadata = {
  alternates: alternatesFor("/rooftop-les-voiles"),
  title: "Rooftop vue mer à Toulon – Le seul rooftop face à la rade | Les Voiles",
  description:
    "Le seul rooftop avec vue mer de Toulon : bar à ciel ouvert sur la rade, à l'Hôtel Les Voiles (Mourillon). Petites assiettes salées et desserts glacés à picorer, un verre à la main. Réservez votre table.",
  keywords: [
    "rooftop Toulon",
    "rooftop vue mer Toulon",
    "bar rooftop Toulon",
    "rooftop Mourillon",
    "bar vue mer Toulon",
    "Les Voiles Toulon rooftop",
  ],
  openGraph: {
    title: "Rooftop vue mer à Toulon – Les Voiles",
    description:
      "Le seul rooftop vue mer de Toulon. Bar à ciel ouvert sur la rade, petites assiettes à picorer, un verre à la main.",
    images: [{ url: "/images/package-rooftop.jpg", width: 1200, height: 630, alt: "Rooftop vue mer à Toulon – Les Voiles" }],
  },
};

// Données structurées : aide Google + les moteurs IA à comprendre qu'il s'agit
// d'un bar/rooftop avec vue mer à Toulon (rich results + réponses génératives).
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BarOrPub",
  "@id": `${SITE_URL}/rooftop-les-voiles#rooftop`,
  name: "Le Rooftop – Hôtel Les Voiles",
  description:
    "Le seul rooftop avec vue mer de Toulon : bar à ciel ouvert sur la rade, petites assiettes à picorer, un verre à la main.",
  url: `${SITE_URL}/rooftop-les-voiles`,
  image: `${SITE_URL}/images/package-rooftop.jpg`,
  servesCuisine: ["Bar à cocktails", "Tapas", "Desserts glacés"],
  priceRange: "€€",
  address: {
    "@type": "PostalAddress",
    streetAddress: "124 rue Gubler",
    addressLocality: "Toulon",
    addressRegion: "Provence-Alpes-Côte d'Azur",
    postalCode: "83000",
    addressCountry: "FR",
  },
  geo: { "@type": "GeoCoordinates", latitude: 43.1091085, longitude: 5.9511278 },
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Vue mer", value: true },
    { "@type": "LocationFeatureSpecification", name: "Rooftop / terrasse à ciel ouvert", value: true },
    { "@type": "LocationFeatureSpecification", name: "Bar", value: true },
  ],
  containedInPlace: {
    "@type": "Hotel",
    name: "Hôtel Les Voiles",
    url: `${SITE_URL}/#voiles`,
  },
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RooftopCarteClient />
    </>
  );
}
