import type { Metadata } from "next";
import { alternatesFor, SITE_URL } from "@/lib/site";
import SiteBrand from "@/components/SiteBrand";
import PiedDePage from "@/components/PiedDePage";
import VillaClient from "./VillaClient";
import { chargerContenuVilla, chargerTarifsVilla } from "@/lib/villaDb";

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

/* ⚠️ LA PAGE EST DYNAMIQUE, ET C'EST LE PRIX DE L'ÉDITION EN LIGNE.
 * Elle lisait deux constantes du dépôt et se pré-rendait à la construction.
 * Depuis que le commercial peut changer un tarif ou une photo depuis le
 * back-office, une page figée annoncerait l'ancien prix jusqu'au prochain
 * déploiement. `villaDb` garde trente secondes en cache, ce qui suffit à
 * absorber une rafale sans faire mentir la page. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const [contenu, tarifs] = await Promise.all([chargerContenuVilla(), chargerTarifsVilla()]);

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
    image: contenu.photo.startsWith("http") ? contenu.photo : `${SITE_URL}${contenu.photo}`,
    url: `${SITE_URL}/villa-les-voiles-toulon`,
    brand: { "@type": "Hotel", "@id": `${SITE_URL}/#voiles` },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      // Le plancher est le prix par personne à pleine occupation, le plafond
      // la nuit entière : entre les deux se trouve tout ce qu'on peut payer.
      lowPrice: Math.round(tarifs.formules.complete.parNuit / tarifs.formules.complete.personnes),
      highPrice: tarifs.formules.complete.parNuit,
      // Pas d'`availabilityStarts/Ends` : la privatisation n'a plus de saison,
      // c'est la disponibilité réelle qui tranche.
      offerCount: 2,
    },
  };

  return (
    <>
      {/* ⚠️ UNE BALISE `<script>` ORDINAIRE, PAS `next/script` — même piège que
          sur l'accueil : `<Script>` la pose après l'hydratation, donc le robot
          reçoit une page sans balisage. C'est précisément ce qu'un moteur ou
          une IA vient chercher pour comprendre qu'on vend un lieu entier, à
          quel prix, et où il se trouve. */}
      <script id="villa-schema" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteBrand />
      <main><VillaClient langue="fr" contenu={contenu} tarifs={tarifs} /></main>
      <PiedDePage />
    </>
  );
}
