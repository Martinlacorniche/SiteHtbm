import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import HomeClient from "./HomeClient";

// Page d'accueil = Server Component minimal qui porte les metadata SEO,
// puis rend l'interface interactive (HomeClient, "use client").
// Le rendu visuel est identique : seule la couche <head> est ajoutée.
export const metadata: Metadata = {
  title:
    "Hôtels Bord de Mer à Toulon – La Corniche 4★ & Les Voiles 3★ (Mourillon)",
  description:
    "Réservez en direct nos deux hôtels en bord de mer à Toulon, quartier du Mourillon : le Best Western Plus La Corniche (4★, face à la rade) et l'Hôtel Les Voiles (boutique-hôtel 3★). Séminaires et villa privatisable.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "Hôtels Bord de Mer Toulon",
    title: "Hôtels Bord de Mer à Toulon – La Corniche & Les Voiles",
    description:
      "Deux hôtels en bord de mer à Toulon (Mourillon) : 4★ face à la rade et boutique-hôtel 3★. Réservation directe au meilleur prix.",
    images: [{ url: "/images/corniche.jpg", width: 1200, height: 630, alt: "Hôtels bord de mer à Toulon" }],
  },
};

export default function Page() {
  return <HomeClient />;
}
