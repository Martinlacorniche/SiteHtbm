// CE QUE LE MOTEUR DE LA CORNICHE DIT AUX MACHINES (29/10/2026).
//
// Le pendant de `balisageReserver.ts` (Les Voiles) : le moteur est rendu en JavaScript, que ni Google au
// premier passage ni les crawlers d'OpenAI, d'Anthropic et de Perplexity n'exécutent. Sans ce bloc, la
// page qui vend les nuits ne dit à une machine ni ce qu'on loue, ni à quel prix, ni comment réserver.
//
// ⚠️ LE PRIX EST MESURÉ, PAS ÉCRIT À LA MAIN. On interroge le vrai moteur (NWH → HotSoft) sur quelques
// nuits à venir et on publie le plus bas RÉELLEMENT proposé. Sans réponse, pas de prix : une offre absente
// vaut mieux qu'une offre fausse.
//
// ⚠️ UNE HEURE DE MÉMOIRE. La page est dynamique : sans elle, chaque passage d'un robot coûterait quatre
// lectures HotSoft.

import { chercherDisponibilite, chargerCategories, type ConfigMoteur } from "./mews";
import { HOTEL_CORNICHE, type PageMoteur } from "./pageCorniche";
import { SITE_URL } from "@/lib/site";

type Mesure = { bas: number | null; noms: Map<string, string> };
const memoire = new Map<string, { le: number; m: Mesure }>();
const HEURE = 3600_000;

const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function mesurer(cfg: ConfigMoteur, langue: "fr" | "en"): Promise<Mesure> {
  const deja = memoire.get(langue);
  if (deja && Date.now() - deja.le < HEURE) return deja.m;
  const base = (process.env.GROUPE_RELAIS_NWH || "").replace(/\/$/, "");
  /* Côté serveur, l'adresse relative du navigateur (`/api/moteur-hotsoft`) ne mène nulle part : on parle
   * directement à NWH, dont ces deux opérations sont publiques (rien que la page ne montre déjà). */
  const c: ConfigMoteur = { ...cfg, base: `${base}/api/moteur-hotsoft` };
  const [noms, ...dispos] = await Promise.all([
    chargerCategories(c, langue).then((m) => new Map([...m].map(([id, x]) => [id, x.nom]))).catch(() => new Map<string, string>()),
    /* Quatre sondages, pas soixante : demain, dans une et deux semaines, dans un mois. */
    ...[1, 8, 15, 30].map((d) => chercherDisponibilite(c, { arrivee: jour(d), depart: jour(d + 1), adultes: 2, langue }).catch(() => null)),
  ]);
  let bas: number | null = null;
  for (const d of dispos) for (const o of d?.offres ?? []) for (const p of o.prix) {
    if (o.chambresRestantes > 0 && p.parNuit > 0 && (bas === null || p.parNuit < bas)) bas = p.parNuit;
  }
  const m = { bas: bas === null ? null : Math.round(bas), noms };
  memoire.set(langue, { le: Date.now(), m });
  return m;
}

/** Le « dès X € » de l'accueil : le même relevé que le balisage, sur la configuration minimale du moteur
 *  (les deux opérations lues ne regardent que l'identifiant de l'hôtel). */
export async function prixCorniche(): Promise<number | null> {
  const cfg: ConfigMoteur = { client: "nwh-os-hotsoft", configurationId: HOTEL_CORNICHE, hotelId: HOTEL_CORNICHE };
  return (await mesurer(cfg, "fr")).bas;
}

export type ChambrePubliee = { nom: string; description: string | null };

/** Le bloc JSON-LD de la page, et les chambres à écrire dans le HTML. */
export async function balisageCorniche(p: PageMoteur, langue: "fr" | "en", chemin: string) {
  const { bas, noms } = await mesurer(p.cfg, langue);
  const ordre = p.cfg.ordre ?? Object.keys(p.categories);
  const chambres: ChambrePubliee[] = ordre
    .filter((id) => p.categories[id])
    .map((id) => ({
      nom: (langue === "en" ? p.categories[id].nomEn : null) ?? noms.get(id) ?? "",
      description: p.categories[id].description,
    }))
    .filter((c) => c.nom);
  const recit = p.recit as { lignes?: string[]; compris?: { items?: { texte: string; absent?: boolean }[] } } | null;
  const plus = (recit?.compris?.items ?? []).filter((i) => !i.absent).map((i) => i.texte);
  const en = langue === "en";

  const ld = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    /* Le même identifiant que la fiche de l'accueil : deux fiches qui se contredisent valent moins qu'une. */
    "@id": `${SITE_URL}/#corniche`,
    name: "Best Western Plus La Corniche",
    url: `${SITE_URL}/hotel-bord-de-mer-toulon`,
    description: (recit?.lignes ?? []).join(" ") || undefined,
    telephone: "+33494413512",
    email: "contact-corniche@htbm.fr",
    starRating: { "@type": "Rating", ratingValue: "4" },
    address: { "@type": "PostalAddress", streetAddress: "17 Littoral Frédéric Mistral", addressLocality: "Toulon", postalCode: "83000", addressCountry: "FR" },
    geo: { "@type": "GeoCoordinates", latitude: 43.1071245, longitude: 5.9357019 },
    checkoutTime: "12:00",
    currenciesAccepted: "EUR",
    availableLanguage: ["fr", "en"],
    inLanguage: langue,
    amenityFeature: plus.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
    containsPlace: chambres.map((c) => ({ "@type": "HotelRoom", name: c.nom, ...(c.description ? { description: c.description } : {}) })),
    ...(bas ? {
      makesOffer: {
        "@type": "Offer",
        name: en ? "Night, booked direct" : "Nuit en réservation directe",
        priceSpecification: { "@type": "UnitPriceSpecification", price: bas, priceCurrency: "EUR", unitCode: "DAY", valueAddedTaxIncluded: true },
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}${chemin}`,
      },
    } : {}),
    potentialAction: {
      "@type": "ReserveAction",
      name: en ? "Book direct" : "Réserver en direct",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}${chemin}?arrivee={checkin}&depart={checkout}&adultes={adults}`,
        actionPlatform: ["https://schema.org/DesktopWebPlatform", "https://schema.org/MobileWebPlatform"],
        inLanguage: langue,
      },
      result: { "@type": "LodgingReservation", name: en ? "Booking at Best Western Plus La Corniche" : "Réservation au Best Western Plus La Corniche" },
    },
  };
  return { ld, chambres, plus, bas };
}
