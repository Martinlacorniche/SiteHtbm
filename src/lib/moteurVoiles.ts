// LE MOTEUR DES VOILES : MEWS, OU NWH → LESSCLIC (10/11/2026).
//
// Les Voiles quittent Mews pour lessclic. `/reserver` garde EXACTEMENT son écran et son parcours ; seule change la
// source des chambres et des prix, et c'est NWH qui la désigne : tant que `hotels.pms` des Voiles vaut « mews », le
// Distributor de Mews ; dès qu'il vaut « lessclic », le Distributor de NWH (`/api/moteur-lessclic`, la même forme de
// réponses), et la vente part sur la page Stripe que lessclic ouvre sur le compte de l'hôtel. Aucun déploiement le
// jour J : la question est posée à NWH (`moteurVoilesServeur.ts`), côté serveur.
//
// 🔑 L'ÉCRAN NE CONNAÎT QUE LES IDENTIFIANTS MEWS — ses photos, ses descriptions, son nom anglais, sa couverture sont
// indexés par eux (`ReserverClient.tsx`, `moteur_categories`). On ne les réécrit pas : les chambres de lessclic sont
// RENOMMÉES à l'entrée (identifiant lessclic → identifiant Mews, la correspondance du connecteur que NWH rend avec la
// page), et rendues à leur nom lessclic à la sortie, au moment de vendre (`versLessclic`). Entre les deux, rien ne
// sait qu'on a changé de PMS.
//
// Ce fichier tourne des DEUX côtés (navigateur et serveur) : rien de secret, aucune dépendance serveur.

import * as nwh from "./moteurNwh/mews";
import type { CategorieChambre, Disponibilite, Langue } from "./mewsBooking";

/** Les Voiles dans NWH (`hotels.id`), et leur slug — celui que les routes de vente de NWH exigent. */
export const HOTEL_VOILES_NWH = "ded6e6fb-ff3c-4fa8-ad07-403ee316be53";
export const SLUG_VOILES = "les-voiles";

/** Ce que NWH dit du moteur des Voiles.
 *  · `mews`         — l'hôtel est sur Mews : tout reste comme avant ;
 *  · `nwh`          — l'hôtel est sur lessclic : chambres, prix et vente par NWH ;
 *  · `indisponible` — l'hôtel a quitté Mews mais NWH ne répond pas (ou n'a pas de moteur pour lui) : on ne vend
 *                     RIEN, ni par Mews (l'hôtel n'y est plus), ni sans garantie. L'écran dit « appelez-nous ». */
export type MoteurVoiles =
  | { mode: "mews" }
  | { mode: "nwh"; cfg: nwh.ConfigMoteur; hotel: string; correspondance: Record<string, string> }
  | { mode: "indisponible" };

export type MoteurNwhVoiles = Extract<MoteurVoiles, { mode: "nwh" }>;

/* La correspondance lessclic → Mews des trois catégories, relevée dans le connecteur lessclic des Voiles le
 * 10/11/2026. NWH la rend avec la page (`correspondance`) et c'est elle qui prime ; celle-ci n'est que le filet du
 * jour où le champ `miroir` du connecteur serait vidé (il ne sert plus au miroir une fois Mews arrêté) — sans elle,
 * les chambres perdraient leurs photos et leurs descriptions en silence. */
const CORRESPONDANCE_CONNUE: Record<string, string> = {
  "6524edbd-a55d-4779-a9f7-4f95bcb965d5": "e34e45e7-8ce1-4b68-8547-aaa9008727ad", // Confort
  "98064031-a615-49bc-9ed9-903ca84020cd": "a1f3a293-0567-49c7-81c6-aaa9008727ad", // Individuelle
  "ef77ad23-f1f0-4638-887d-c2527632cafe": "c60f97a0-8870-4c0e-8d1e-aaa9008727ad", // Supérieure vue mer
};

/* ⚠️ CE QUE MEWS DISAIT DE CHAQUE CHAMBRE, ET QUE LESSCLIC NE PORTE PAS. lessclic rend un nom et une capacité ; la
 * surface et la phrase de présentation vivaient dans la description libre de la catégorie Mews (relevée le
 * 10/11/2026, `configuration/get`). Ce sont des faits de la chambre, pas des prix : ils ne changent pas avec le PMS.
 * Les photos Mews, elles, ne sont PAS reprises : elles vivent sur le CDN de Mews, qui peut s'éteindre avec
 * l'abonnement — l'écran se rabat sur les photos du site (`PHOTOS_LOCALES`, `COUVERTURE`). */
const FICHE_MEWS: Record<string, { nom: string; surface: number; description: Record<Langue, string> }> = {
  "a1f3a293-0567-49c7-81c6-aaa9008727ad": {
    nom: "Chambre Individuelle",
    surface: 11,
    description: { fr: "Chambre de 11 m² avec balcon, idéale pour un court séjour d'affaires.", en: "An 11 m² room with a balcony, ideal for a short business stay." },
  },
  "e34e45e7-8ce1-4b68-8547-aaa9008727ad": {
    nom: "Chambre confort",
    surface: 14,
    description: { fr: "Chambre d'environ 14 m², côté rue, dans un quartier résidentiel très calme.", en: "A room of about 14 m², street side, in a very quiet residential district." },
  },
  "c60f97a0-8870-4c0e-8d1e-aaa9008727ad": {
    nom: "Chambre supérieure - vue mer",
    surface: 19,
    description: { fr: "Chambre d'environ 19 m², vue mer, avec balcon pour certaines chambres.", en: "A room of about 19 m² with a sea view, some with a balcony." },
  },
};

/** 🔑 LA RÈGLE DES VOILES : le petit-déjeuner est compris, il ne s'affiche jamais en supplément. Seuls les tarifs
 *  « BB » de lessclic sortent ; une chambre seule (FLEX-RO, le pivot) ne doit jamais apparaître comme « le direct »
 *  à côté d'un prix petit-déjeuner compris. Filtré chez NWH (`Repas`). */
export const REPAS_VOILES = ["BB"];

const versMews = (m: MoteurNwhVoiles, id: string) => m.correspondance[id] ?? CORRESPONDANCE_CONNUE[id] ?? id;

/** L'identifiant lessclic d'une catégorie que l'écran désigne par son identifiant Mews — au moment de vendre. */
export function versLessclic(m: MoteurNwhVoiles, idEcran: string): string {
  for (const [l, mews] of Object.entries(m.correspondance)) if (mews === idEcran) return l;
  for (const [l, mews] of Object.entries(CORRESPONDANCE_CONNUE)) if (mews === idEcran && !m.correspondance[l]) return l;
  return idEcran;
}

/** La disponibilité des Voiles chez NWH, dans la forme de `mewsBooking.chercherDisponibilite` et avec les
 *  identifiants Mews. */
export async function disponibiliteNwh(
  m: MoteurNwhVoiles,
  q: { arrivee: string; depart: string; adultes: number; langue: Langue },
): Promise<Disponibilite> {
  const d = await nwh.chercherDisponibilite(m.cfg, q, { Repas: REPAS_VOILES });
  return {
    tarifs: d.tarifs,
    /* ⚠️ UNE GARANTIE SANS PART CHIFFRÉE SE LIT « PAYER ». L'écran décide du chemin de paiement par `reglementDe`, qui
     * rend `null` sur un groupe de préautorisation sans `SettlementValue` — et `null` y retombe sur « débité ». Le
     * flexible de lessclic est une carte en garantie, rien n'est débité : 0 %, comme HotSoft. */
    groupes: d.groupes.map((g) => (g.SettlementAction === "CreatePreauthorization" && g.SettlementValue == null && g.SettlementFlatValue == null
      ? { ...g, SettlementValue: 0 } : g)),
    offres: d.offres.map((o) => ({ ...o, categorieId: versMews(m, o.categorieId) })),
  };
}

/** Les chambres des Voiles chez NWH, dans la forme de `mewsBooking.chargerCategories` et avec les identifiants Mews.
 *
 *  ⚠️ LE NOM EST CELUI QUE LE SITE AFFICHAIT, PAS CELUI DU PLANNING. lessclic rend « Confort », « Vue Mer » — le nom
 *  court de la réception, tant que le nom public n'y est pas saisi (relevé le 10/11/2026). L'écran garde donc les noms
 *  qu'il montrait sous Mews ; une catégorie inconnue de la fiche prend celui de lessclic. L'anglais suit `NOM_ANGLAIS`
 *  de l'écran, comme avant. */
export async function categoriesNwh(m: MoteurNwhVoiles, langue: Langue): Promise<Map<string, CategorieChambre>> {
  const cats = await nwh.chargerCategories(m.cfg, langue);
  const out = new Map<string, CategorieChambre>();
  for (const [id, c] of cats) {
    const cle = versMews(m, id);
    const fiche = FICHE_MEWS[cle];
    out.set(cle, {
      nom: fiche?.nom ?? c.nom, nomFr: fiche?.nom ?? c.nomFr, images: [],
      description: fiche?.description[langue] ?? "",
      couchages: c.couchages,
      surface: fiche?.surface ?? c.surface,
    });
  }
  return out;
}

/** Le prix des OTA (la comparaison « nous / Booking »), rendu par NWH avec les identifiants lessclic : renommé. */
export function prixPublicVersMews<T>(m: MoteurNwhVoiles, prix: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(prix).map(([id, p]) => [versMews(m, id), p]));
}
