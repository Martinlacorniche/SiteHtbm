// QUI VEND LES NUITS DES VOILES ? LA QUESTION POSÉE À NWH — CÔTÉ SERVEUR UNIQUEMENT (10/11/2026).
//
// Voir `moteurVoiles.ts` pour le pourquoi. Ici, le comment : on demande à NWH la page du moteur des Voiles sur
// lessclic (`/api/moteur-lessclic/page`). Sa réponse EST la bascule :
//
//   · 200 avec une configuration → les Voiles sont sur lessclic : on vend par NWH ;
//   · 404                         → NWH dit « pas sur lessclic » : Mews, comme avant ;
//   · tout le reste (NWH muet, 5xx, 501 d'un NWH trop ancien, moteur non configuré) → ON NE SAIT PAS.
//
// ⛔ « ON NE SAIT PAS » NE VEUT PAS DIRE MEWS. Repartir sur Mews par défaut, le lendemain de la bascule, ce serait
// vendre des nuits dans un PMS que la réception ne regarde plus. On relit alors `hotels.pms` dans la base (celle de
// NWH, que ce site lit déjà) : « lessclic » → `indisponible` (on ne vend rien, l'écran dit d'appeler) ; « mews » →
// Mews. Base muette aussi : la dernière réponse connue de ce serveur, et à défaut Mews — l'état d'avant la bascule,
// où Mews prend lui-même carte ou paiement : on ne vend jamais sans garantie.
//
// 🔧 `MOTEUR_VOILES` force la réponse sans rien demander : « mews » (le retour arrière, sans déploiement de NWH),
// « nwh » (NWH obligatoire : muet, c'est `indisponible`). Absente : NWH décide.

import { supabaseServer } from "./supabase-server";
import {
  HOTEL_VOILES_NWH, SLUG_VOILES, categoriesNwh, disponibiliteNwh,
  type MoteurNwhVoiles, type MoteurVoiles,
} from "./moteurVoiles";
import { chargerCategories, chercherDisponibilite, type CategorieChambre, type Disponibilite, type Langue } from "./mewsBooking";
import type { ConfigMoteur } from "./moteurNwh/mews";

/* Trente secondes de mémoire : la question se pose à chaque recherche (balisage, accueil, agents) et la réponse ne
 * change qu'une fois. Assez court pour que la bascule se voie dans la minute. */
const MEMOIRE_MS = 30_000;
let memoire: { quand: number; moteur: MoteurVoiles } | null = null;
let derniere: MoteurVoiles | null = null;

const baseNwh = () => (process.env.GROUPE_RELAIS_NWH || "").replace(/\/$/, "");

async function pmsEnBase(): Promise<string | null> {
  try {
    const { data, error } = await supabaseServer.from("hotels").select("pms").eq("id", HOTEL_VOILES_NWH).maybeSingle();
    if (error) return null;
    return typeof data?.pms === "string" ? data.pms : null;
  } catch {
    return null;
  }
}

async function demanderANwh(): Promise<MoteurVoiles | "muet"> {
  const base = baseNwh();
  if (!base) return "muet";
  try {
    const r = await fetch(`${base}/api/moteur-lessclic/page`, {
      method: "POST", cache: "no-store",
      headers: { "content-type": "application/json", "x-nwh-relais": process.env.GROUPE_RELAIS_SECRET || "" },
      body: JSON.stringify({ HotelId: HOTEL_VOILES_NWH, Langue: "fr" }),
      signal: AbortSignal.timeout(6_000),
    });
    if (r.status === 404) return { mode: "mews" };
    if (!r.ok) return "muet";
    const p = (await r.json()) as { cfg?: ConfigMoteur | null; slug?: string | null; correspondance?: Record<string, string> };
    if (!p?.cfg?.hotelId) return "muet";
    return {
      mode: "nwh",
      /* L'adresse du Distributor, ABSOLUE côté serveur (NWH lui-même) ; le navigateur, lui, passe par le relais de ce
       * site (`/api/moteur-voiles` la réécrit). */
      cfg: { ...p.cfg, base: `${base}/api/moteur-lessclic` },
      hotel: p.slug || SLUG_VOILES,
      correspondance: p.correspondance ?? {},
    };
  } catch {
    return "muet";
  }
}

async function decider(): Promise<MoteurVoiles> {
  const force = (process.env.MOTEUR_VOILES || "").trim().toLowerCase();
  if (force === "mews") return { mode: "mews" };
  const nwh = await demanderANwh();
  if (nwh !== "muet") return force === "nwh" && nwh.mode === "mews" ? { mode: "indisponible" } : nwh;
  if (force === "nwh") return { mode: "indisponible" };
  /* Relais éteint (aucune adresse NWH, un poste de développement) : rien n'a changé pour ce site, c'est Mews. */
  if (!baseNwh()) return { mode: "mews" };
  const pms = await pmsEnBase();
  if (pms === "mews") return { mode: "mews" };
  if (pms) return { mode: "indisponible" };
  return derniere ?? { mode: "mews" };
}

/** Le moteur des Voiles, vu du serveur (adresse de NWH absolue). */
export async function moteurVoilesServeur(): Promise<MoteurVoiles> {
  if (memoire && Date.now() - memoire.quand < MEMOIRE_MS) return memoire.moteur;
  const moteur = await decider();
  memoire = { quand: Date.now(), moteur };
  if (moteur.mode !== "indisponible") derniere = moteur;
  return moteur;
}

/** Le même, pour le navigateur : le Distributor de NWH se joint par le relais de ce site. */
export async function moteurVoilesNavigateur(): Promise<MoteurVoiles> {
  const m = await moteurVoilesServeur();
  return m.mode === "nwh" ? { ...m, cfg: { ...m.cfg, base: "/api/moteur-lessclic" } } : m;
}

export class MoteurVoilesIndisponible extends Error {
  constructor() { super("Moteur des Voiles indisponible : l'hôtel a quitté Mews et NWH ne répond pas"); }
}

/** `chercherDisponibilite` des Voiles, à la bonne source. Mêmes identifiants (Mews) quelle qu'elle soit. */
export async function disponibiliteVoiles(q: { arrivee: string; depart: string; adultes: number; langue: Langue }): Promise<Disponibilite> {
  const m = await moteurVoilesServeur();
  if (m.mode === "nwh") return disponibiliteNwh(m, q);
  if (m.mode === "indisponible") throw new MoteurVoilesIndisponible();
  return chercherDisponibilite(q);
}

/** `chargerCategories` des Voiles, à la bonne source. */
export async function categoriesVoiles(langue: Langue): Promise<Map<string, CategorieChambre>> {
  const m = await moteurVoilesServeur();
  if (m.mode === "nwh") return categoriesNwh(m as MoteurNwhVoiles, langue);
  if (m.mode === "indisponible") throw new MoteurVoilesIndisponible();
  return chargerCategories(langue);
}

/** Tests seulement. */
export function oublierMoteurVoiles() { memoire = null; derniere = null; }
