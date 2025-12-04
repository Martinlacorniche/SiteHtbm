import "./globals.css";
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

// Métadonnées globales par défaut (Title SEO)
export const metadata = { title: "Hôtels Bord de Mer – Toulon" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Langue par défaut
    <html lang="fr"> 
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>{children}</body>
    </html>
  );
}