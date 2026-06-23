// Configuration centrale du site pour le SEO (URL de prod, hreflang, etc.)

export const SITE_URL = "https://hotels-toulon-mer.com";

// Grappes de pages équivalentes dans plusieurs langues.
// Sert à générer les balises hreflang (alternates) et le sitemap.
// Clé = code langue ISO ; valeur = chemin (sans domaine).
export type LangCluster = Partial<Record<"fr" | "en" | "es" | "it" | "de", string>>;

export const LANG_CLUSTERS: LangCluster[] = [
  {
    // Guide "où dormir" — disponible dans les 5 langues
    fr: "/ou-dormir-a-toulon",
    en: "/en/where-to-stay-in-toulon",
    es: "/es/donde-dormir-en-tolon",
    it: "/it/dove-dormire-a-tolone",
    de: "/de/wo-in-toulon-ubernachten",
  },
  {
    fr: "/hotel-bord-de-mer-toulon",
    en: "/en/seafront-hotel-toulon",
  },
  {
    fr: "/hotel-plage-mourillon",
    en: "/en/mourillon-beach-hotels",
  },
  {
    fr: "/hotel-seminaire-toulon",
    en: "/en/toulon-business-hotel",
  },
  {
    fr: "/villa-les-voiles-toulon",
    en: "/en/villa-les-voiles-toulon",
  },
];

// Retrouve la grappe (et donc les alternates hreflang) contenant un chemin donné.
// Renvoie un objet prêt à passer à `alternates.languages` dans les Metadata Next.
export function hreflangFor(path: string): Record<string, string> | undefined {
  const cluster = LANG_CLUSTERS.find((c) =>
    Object.values(c).includes(path)
  );
  if (!cluster) return undefined;
  const languages: Record<string, string> = {};
  for (const [lang, p] of Object.entries(cluster)) {
    if (p) languages[lang] = `${SITE_URL}${p}`;
  }
  // x-default pointe vers la version française (langue principale)
  if (cluster.fr) languages["x-default"] = `${SITE_URL}${cluster.fr}`;
  return languages;
}

// Helper pour fabriquer le bloc `alternates` d'une page (canonical + hreflang).
export function alternatesFor(path: string) {
  return {
    canonical: `${SITE_URL}${path}`,
    languages: hreflangFor(path),
  };
}
