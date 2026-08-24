import type { Metadata } from "next";
import { alternatesFor } from "@/lib/site";
import GroupPackagesClient from "./GroupPackagesClient";

// La page est interactive (selection de forfaits, formulaire) : elle reste un
// composant client, mais sous une enveloppe serveur, faute de quoi elle
// heritait du titre par defaut du layout — trois URLs du sitemap portaient le
// meme title.
export const metadata: Metadata = {
  alternates: alternatesFor("/group-packages"),
  title: "Séminaires et groupes à Toulon — forfaits clé en main",
  description:
    "Forfaits groupes et incentives face à la mer, à Toulon : nuit, petit-déjeuner et activité premium, de 15 à 30 personnes, au Best Western Plus La Corniche et à l'Hôtel Les Voiles.",
};

export default function Page() {
  return <GroupPackagesClient />;
}
