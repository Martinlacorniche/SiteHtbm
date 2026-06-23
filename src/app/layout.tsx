import "./globals.css";
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

// Métadonnées globales par défaut. `metadataBase` résout les URLs OG/canoniques
// relatives ; chaque page peut surcharger title/description/alternates.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Hôtels Bord de Mer à Toulon – Best Western Plus La Corniche & Les Voiles",
    template: "%s",
  },
  description:
    "Deux hôtels en bord de mer à Toulon, quartier du Mourillon : le Best Western Plus La Corniche (4★ face à la rade) et l'Hôtel Les Voiles (boutique-hôtel 3★). Réservation directe, séminaires, villa privatisable.",
  applicationName: "Hôtels Bord de Mer Toulon",
  keywords: [
    "hôtel Toulon",
    "hôtel bord de mer Toulon",
    "hôtel Mourillon",
    "Best Western Plus La Corniche",
    "Hôtel Les Voiles Toulon",
    "où dormir à Toulon",
    "séminaire Toulon",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Hôtels Bord de Mer Toulon",
    url: SITE_URL,
    title: "Hôtels Bord de Mer à Toulon – La Corniche & Les Voiles",
    description:
      "Deux hôtels en bord de mer à Toulon (Mourillon) : 4★ face à la rade et boutique-hôtel 3★. Réservation directe au meilleur prix.",
    images: [{ url: "/images/corniche.jpg", width: 1200, height: 630, alt: "Hôtels bord de mer à Toulon" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hôtels Bord de Mer à Toulon – La Corniche & Les Voiles",
    description: "Deux hôtels en bord de mer à Toulon, quartier du Mourillon.",
    images: ["/images/corniche.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Langue par défaut
    <html lang="fr"> 
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>{children}</body>
    </html>
  );
}