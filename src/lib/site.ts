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

/* ─────────────────────────── Liens de réservation ───────────────────────────
 * Un seul endroit pour décider où part un bouton « Réserver ».
 *
 * Aujourd'hui les deux hôtels partent chez D-EDGE. Demain Les Voiles passera
 * sur notre propre moteur (Mews Booking Engine) pendant que La Corniche restera
 * chez D-EDGE en attendant l'ouverture de l'OpenAPI HotSoft : la bascule doit
 * donc pouvoir se faire hôtel par hôtel, sans toucher aux pages.
 *
 * D'où cette table plutôt qu'une constante : changer `moteur` d'un hôtel suffit.
 */

export type Hotel = "corniche" | "voiles";
export type Locale = "fr" | "en";

type Moteur =
  | { type: "dedge"; slug: string; code: string }
  | { type: "maison"; chemin: string };

const MOTEURS: Record<Hotel, Moteur> = {
  // Best Western Plus La Corniche — « Hotels Toulon Bord De Mer » chez D-EDGE.
  corniche: { type: "dedge", slug: "Hotels-Toulon-Bord-De-Mer", code: "JJ8R" },
  voiles: { type: "dedge", slug: "Hotel-Les-Voiles", code: "JJ8J" },
};

// D-EDGE veut une locale complète (`fr-FR`), pas un code à deux lettres.
const LOCALE_DEDGE: Record<Locale, string> = { fr: "fr-FR", en: "en-US" };

/**
 * L'URL vers laquelle envoyer un bouton « Réserver ».
 *
 * Retourne une URL absolue tant qu'on est chez D-EDGE, un chemin relatif une
 * fois le moteur maison en place — les deux se passent tels quels à `href`.
 */
export function lienReservation(hotel: Hotel, locale: Locale = "fr"): string {
  const moteur = MOTEURS[hotel];
  if (moteur.type === "maison") {
    return locale === "fr" ? moteur.chemin : `/${locale}${moteur.chemin}`;
  }
  return `https://www.secure-hotel-booking.com/d-edge/${moteur.slug}/${moteur.code}/${LOCALE_DEDGE[locale]}`;
}

/** Vrai quand l'hôtel est passé sur notre moteur : le lien reste alors interne. */
export function reservationInterne(hotel: Hotel): boolean {
  return MOTEURS[hotel].type === "maison";
}
