// QUI VEND LES NUITS DES VOILES ? NWH → LESSCLIC, ET PERSONNE D'AUTRE — CÔTÉ SERVEUR UNIQUEMENT.
//
// Voir `moteurVoiles.ts` pour le pourquoi. Ici, le comment : on demande à NWH la page du moteur des Voiles sur
// lessclic (`/api/moteur-lessclic/page`) :
//
//   · 200 avec une configuration → on vend par NWH ;
//   · tout le reste (NWH muet, 404, 5xx, 501, moteur non configuré, relais éteint) → `indisponible` : on ne vend RIEN,
//     l'écran dit « réservez par téléphone » avec le numéro de l'hôtel.
//
// ⛔ PLUS JAMAIS MEWS (10/11/2026, bascule faite). Les Voiles ont quitté Mews pour lessclic : Mews ne reçoit plus les
// ventes, la réception ne le regarde plus, et il sera désactivé. Le repli vers Mews (404 de NWH, `hotels.pms`,
// dernière réponse connue, `MOTEUR_VOILES=mews`, relais éteint) a été RETIRÉ : chacun de ces chemins aurait vendu des
// nuits dans un PMS mort. `MOTEUR_VOILES` et l'absence de `GROUPE_RELAIS_NWH` ne ramènent plus Mews : sans NWH, rien
// ne se vend en ligne. Le mode `mews` reste dans le type (le code Mews mort sera retiré à part), mais n'est plus rendu.

import {
  HOTEL_VOILES_NWH, SLUG_VOILES, categoriesNwh, disponibiliteNwh,
  type MoteurNwhVoiles, type MoteurVoiles,
} from "./moteurVoiles";
import type { CategorieChambre, Disponibilite, Langue } from "./mewsBooking";
import type { ConfigMoteur } from "./moteurNwh/mews";

/* Trente secondes de mémoire pour une réponse de NWH ; cinq seulement pour « indisponible », pour qu'un hoquet de NWH
 * ne ferme pas la vente une demi-minute de plus que nécessaire. */
const MEMOIRE_MS = 30_000;
const MEMOIRE_PANNE_MS = 5_000;
let memoire: { quand: number; moteur: MoteurVoiles } | null = null;

const baseNwh = () => (process.env.GROUPE_RELAIS_NWH || "").replace(/\/$/, "");

async function demanderANwh(): Promise<MoteurNwhVoiles | "muet"> {
  const base = baseNwh();
  if (!base) return "muet";
  try {
    const r = await fetch(`${base}/api/moteur-lessclic/page`, {
      method: "POST", cache: "no-store",
      headers: { "content-type": "application/json", "x-nwh-relais": process.env.GROUPE_RELAIS_SECRET || "" },
      body: JSON.stringify({ HotelId: HOTEL_VOILES_NWH, Langue: "fr" }),
      signal: AbortSignal.timeout(6_000),
    });
    /* Un 404 disait autrefois « pas sur lessclic : restez sur Mews ». Les Voiles n'ont plus de Mews : c'est une panne
     * de configuration chez NWH, on ne vend pas. */
    if (!r.ok) {
      console.error(`Moteur des Voiles : NWH répond ${r.status} — vente en ligne suspendue (réservation par téléphone)`);
      return "muet";
    }
    const p = (await r.json()) as { cfg?: ConfigMoteur | null; slug?: string | null; correspondance?: Record<string, string> };
    if (!p?.cfg?.hotelId) {
      console.error("Moteur des Voiles : NWH sans configuration de moteur — vente en ligne suspendue");
      return "muet";
    }
    return {
      mode: "nwh",
      /* L'adresse du Distributor, ABSOLUE côté serveur (NWH lui-même) ; le navigateur, lui, passe par le relais de ce
       * site (`/api/moteur-voiles` la réécrit). */
      cfg: { ...p.cfg, base: `${base}/api/moteur-lessclic` },
      hotel: p.slug || SLUG_VOILES,
      correspondance: p.correspondance ?? {},
    };
  } catch (e) {
    console.error("Moteur des Voiles : NWH injoignable —", e instanceof Error ? e.message : e);
    return "muet";
  }
}

async function decider(): Promise<MoteurVoiles> {
  const nwh = await demanderANwh();
  return nwh === "muet" ? { mode: "indisponible" } : nwh;
}

/** Le moteur des Voiles, vu du serveur (adresse de NWH absolue). */
export async function moteurVoilesServeur(): Promise<MoteurVoiles> {
  if (memoire && Date.now() - memoire.quand < (memoire.moteur.mode === "nwh" ? MEMOIRE_MS : MEMOIRE_PANNE_MS)) return memoire.moteur;
  const moteur = await decider();
  memoire = { quand: Date.now(), moteur };
  return moteur;
}

/** Le même, pour le navigateur : le Distributor de NWH se joint par le relais de ce site. */
export async function moteurVoilesNavigateur(): Promise<MoteurVoiles> {
  const m = await moteurVoilesServeur();
  return m.mode === "nwh" ? { ...m, cfg: { ...m.cfg, base: "/api/moteur-lessclic" } } : m;
}

export class MoteurVoilesIndisponible extends Error {
  constructor() { super("Moteur des Voiles indisponible : NWH ne répond pas (réservation par téléphone)"); }
}

/** `chercherDisponibilite` des Voiles, chez NWH (identifiants Mews de l'écran). Lève si NWH ne répond pas. */
export async function disponibiliteVoiles(q: { arrivee: string; depart: string; adultes: number; langue: Langue }): Promise<Disponibilite> {
  const m = await moteurVoilesServeur();
  if (m.mode !== "nwh") throw new MoteurVoilesIndisponible();
  return disponibiliteNwh(m, q);
}

/** `chargerCategories` des Voiles, chez NWH. Lève si NWH ne répond pas. */
export async function categoriesVoiles(langue: Langue): Promise<Map<string, CategorieChambre>> {
  const m = await moteurVoilesServeur();
  if (m.mode !== "nwh") throw new MoteurVoilesIndisponible();
  return categoriesNwh(m, langue);
}

/** Tests seulement. */
export function oublierMoteurVoiles() { memoire = null; }
