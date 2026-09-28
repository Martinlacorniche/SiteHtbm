import type { Metadata } from "next";
import ReserverClient from "./ReserverClient";
import { alternatesFor } from "@/lib/site";
import { balisageReserver } from "@/lib/balisageReserver";

export const metadata: Metadata = {
  title: "Réserver à l'Hôtel-Rooftop Les Voiles — Toulon Mourillon",
  description:
    "Réservez en direct à l'Hôtel-Rooftop Les Voiles, Toulon Mourillon. Petit-déjeuner inclus, prix tout compris, annulation gratuite jusqu'au jour d'arrivée.",
  alternates: alternatesFor("/reserver"),
};

/* ⚠️ UNE HEURE DE CACHE, PAS PLUS ET PAS MOINS. Le balisage interroge le vrai
 * moteur pour publier un « à partir de » mesuré : le recalculer à chaque
 * visite ferait deux appels Mews par page vue, le figer au build le rendrait
 * faux dès le lendemain. Une heure suit les mouvements de prix d'un hôtel sans
 * peser sur le moteur. */
export const revalidate = 3600;

export default async function Page() {
  const balisage = await balisageReserver("fr", "/reserver");
  return (
    <>
      {/* Le bloc part dans le HTML RENDU PAR LE SERVEUR : un agent qui ne joue
          pas le JavaScript le lit quand même. Posé dans une page client, il
          n'aurait existé que pour les navigateurs. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(balisage) }}
      />
      <ReserverClient langue="fr" />
    </>
  );
}
