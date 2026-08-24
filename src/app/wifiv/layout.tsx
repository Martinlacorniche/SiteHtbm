import type { Metadata } from "next";
import FondWifi from "@/components/FondWifi";

// Portail des clients deja sur place (QR code, URL directe) : ce n'est pas une
// page de destination. Indexee, elle remontait a la place de la page de
// l'hotel. On la retire de Google, pas du site : les cartes de l'accueil, le
// QR code et le lien direct continuent d'y mener.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function WifiVLayout({ children }: { children: React.ReactNode }) {
  return <FondWifi>{children}</FondWifi>;
}
