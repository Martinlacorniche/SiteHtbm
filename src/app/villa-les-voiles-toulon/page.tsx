import type { Metadata } from "next";
import Script from "next/script";
import { alternatesFor, SITE_URL } from "@/lib/site";
import SiteBrand from "@/components/SiteBrand";
import PiedDePage from "@/components/PiedDePage";
import VillaClient from "./VillaClient";
import { FORMULES } from "@/lib/villa";

/* La page de la privatisation.
 *
 * ⚠️ ELLE A REMPLACÉ UNE PAGE QUI ENVOYAIT AILLEURS. Jusqu'au 28/08/2026, elle
 * décrivait « une villa avec une cuisine entièrement équipée » — ce n'est pas
 * le produit, c'est un hôtel — et son seul bouton menait sur Airbnb, pendant
 * que la carte de l'accueil menait sur leboncoin. Deux places de marché
 * différentes pour le même bien, et pas une réservation en direct.
 *
 * On garde SON URL : elle est indexée, dans le sitemap, et son hreflang la lie
 * à `/en/villa-les-voiles-toulon`. En ouvrir une nouvelle aurait jeté ce
 * capital et créé un doublon à départager pour Google.
 */

export const metadata: Metadata = {
  alternates: alternatesFor("/villa-les-voiles-toulon"),
  title: "Privatiser un hôtel entier à Toulon — Villa Les Voiles, Mourillon",
  description:
    "Louez un boutique-hôtel 3★ en entier au Mourillon : 16 chambres, rooftop vue mer, à 300 m des plages. À partir de 40 € par personne et par nuit. Calendrier des disponibilités en direct.",
  openGraph: {
    title: "Privatiser un hôtel entier à Toulon — Villa Les Voiles",
    description:
      "Seize chambres, un rooftop vue mer, un patio — et personne d'autre dans les murs. Vérifiez vos dates en direct.",
    url: `${SITE_URL}/villa-les-voiles-toulon`,
    images: [{ url: "/images/villa.jpg", width: 1200, height: 630, alt: "Villa Les Voiles, Toulon Mourillon" }],
  },
};

export default function Page() {
  /* Le JSON-LD rattache la page à l'hôtel déjà déclaré en accueil (`#voiles`)
     au lieu d'inventer un second établissement au même endroit : c'est le même
     bâtiment, vendu autrement. `offers` porte le prix par personne — celui que
     le visiteur lit en premier, et le seul qui ait un sens pour un moteur. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Villa Les Voiles — privatisation de l'Hôtel-Rooftop Les Voiles",
    description:
      "Location exclusive d'un boutique-hôtel 3 étoiles au Mourillon (Toulon) : 16 chambres, rooftop vue mer, patio et salon communs, accès autonome.",
    image: `${SITE_URL}/images/villa.jpg`,
    url: `${SITE_URL}/villa-les-voiles-toulon`,
    brand: { "@type": "Hotel", "@id": `${SITE_URL}/#voiles` },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: FORMULES.complete.parPersonne,
      highPrice: FORMULES.complete.parNuit,
      // Pas d'`availabilityStarts/Ends` : la privatisation n'a plus de saison,
      // c'est la disponibilité réelle qui tranche.
      offerCount: 2,
    },
  };

  return (
    <>
      <Script id="villa-schema" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteBrand />
      <main><VillaClient langue="fr" /></main>
      <PiedDePage />
    </>
  );
}
