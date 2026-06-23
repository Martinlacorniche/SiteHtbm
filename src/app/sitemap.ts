import type { MetadataRoute } from "next";
import { SITE_URL, hreflangFor } from "@/lib/site";

// Slugs des articles du journal (à garder synchro avec journal/articles.tsx)
const JOURNAL_SLUGS = [
  "criques-mitre-toulon",
  "art-figue",
  "le-mourillon-quartier-plage-toulon",
  "renovation-villa",
];

// Pages de contenu indexables, avec priorité indicative.
const STATIC_PATHS: { path: string; priority: number; changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFreq: "weekly" },
  { path: "/ou-dormir-a-toulon", priority: 0.9, changeFreq: "monthly" },
  { path: "/hotel-bord-de-mer-toulon", priority: 0.8, changeFreq: "monthly" },
  { path: "/hotel-plage-mourillon", priority: 0.8, changeFreq: "monthly" },
  { path: "/hotel-seminaire-toulon", priority: 0.8, changeFreq: "monthly" },
  { path: "/villa-les-voiles-toulon", priority: 0.8, changeFreq: "monthly" },
  { path: "/group-packages", priority: 0.6, changeFreq: "monthly" },
  { path: "/reservation-voiles", priority: 0.6, changeFreq: "monthly" },
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
  // Portails / infos
  { path: "/wifi", priority: 0.3, changeFreq: "yearly" },
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
