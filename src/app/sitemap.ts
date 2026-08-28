import type { MetadataRoute } from "next";
import { SITE_URL, hreflangFor } from "@/lib/site";
// Derive de la meme source que les pages : plus de liste a garder synchro a la main,
// et un brouillon ne peut plus se retrouver dans le sitemap.
import { PUBLISHED_SLUGS as JOURNAL_SLUGS } from "./journal/articles";

// Pages de contenu indexables, avec priorité indicative.
const STATIC_PATHS: { path: string; priority: number; changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFreq: "weekly" },
  { path: "/ou-dormir-a-toulon", priority: 0.9, changeFreq: "monthly" },
  { path: "/hotel-bord-de-mer-toulon", priority: 0.8, changeFreq: "monthly" },
  { path: "/hotel-plage-mourillon", priority: 0.8, changeFreq: "monthly" },
  { path: "/hotel-seminaire-toulon", priority: 0.8, changeFreq: "monthly" },
  { path: "/villa-les-voiles-toulon", priority: 0.8, changeFreq: "monthly" },
  { path: "/rooftop-les-voiles", priority: 0.8, changeFreq: "monthly" },
  /* Le tunnel des Voiles. Il etait absent, heritage du temps ou il etait en
     `noindex` : le bouton le plus clique du site menait a une page que Google
     ne savait pas exister. C'est desormais LA page de vente de l'hotel — celle
     que doivent trouver « reserver hotel Mourillon » et le lien de
     reservation de la fiche Google Business Profile. Priorite 0.9 : juste
     derriere l'accueil.
     ⚠️ `/en/book` n'est pas `/en/reserver` — il n'y a pas de traduction
     mecanique du chemin, et `hreflangFor` le sait. */
  { path: "/reserver", priority: 0.9, changeFreq: "daily" },
  { path: "/en/book", priority: 0.8, changeFreq: "daily" },
  { path: "/group-packages", priority: 0.6, changeFreq: "monthly" },
  { path: "/journal", priority: 0.6, changeFreq: "weekly" },
  // Versions multilingues
  { path: "/en/where-to-stay-in-toulon", priority: 0.8, changeFreq: "monthly" },
  { path: "/en/seafront-hotel-toulon", priority: 0.7, changeFreq: "monthly" },
  { path: "/en/mourillon-beach-hotels", priority: 0.7, changeFreq: "monthly" },
  { path: "/en/toulon-business-hotel", priority: 0.7, changeFreq: "monthly" },
  { path: "/en/villa-les-voiles-toulon", priority: 0.7, changeFreq: "monthly" },
  { path: "/es/donde-dormir-en-tolon", priority: 0.7, changeFreq: "monthly" },
  { path: "/it/dove-dormire-a-tolone", priority: 0.7, changeFreq: "monthly" },
  { path: "/de/wo-in-toulon-ubernachten", priority: 0.7, changeFreq: "monthly" },
  // Infos. Les portails /wifi et /wifiv en sont volontairement absents : ils
  // servent les clients deja sur place et sont en noindex.
  { path: "/mentions", priority: 0.2, changeFreq: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => {
    const languages = hreflangFor(p.path);
    return {
      url: `${SITE_URL}${p.path}`,
      lastModified: now,
      changeFrequency: p.changeFreq,
      priority: p.priority,
      ...(languages ? { alternates: { languages } } : {}),
    };
  });

  const journalEntries: MetadataRoute.Sitemap = JOURNAL_SLUGS.map((slug) => ({
    url: `${SITE_URL}/journal/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...journalEntries];
}
