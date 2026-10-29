// Les données de la page du moteur de La Corniche, demandées à NWH (`/api/moteur-hotsoft/page`), côté
// serveur, par le même relais authentifié que les routes de groupe. Le contenu (privilèges, récit,
// descriptions, photos) et les réglages (petit-déjeuner, ordre des chambres) vivent dans NWH et se
// changent sans toucher à ce site.
import type { ConfigMoteur } from "./mews";

export const HOTEL_CORNICHE = "f9d59e56-9a2f-433e-bcf4-f9753f105f32";

export type PageMoteur = {
  cfg: ConfigMoteur; slug: string; taxeSejour: number;
  marque: { nom: string; adresse: string; telephone: string; couleur: string; accent: string; logo: string | null; policeTitre: string | null };
  privileges: { texte: string; exclusif?: boolean }[];
  recit: unknown;
  categories: Record<string, { description: string | null; nomEn: string | null; photos: string[]; photoTete: string | null; couverture: string | null; photosEcartees: string[] }>;
};

export async function pageMoteurCorniche(langue: "fr" | "en"): Promise<PageMoteur | null> {
  const base = (process.env.GROUPE_RELAIS_NWH || "").replace(/\/$/, "");
  const secret = process.env.GROUPE_RELAIS_SECRET || "";
  if (!base || !secret) return null;
  const r = await fetch(`${base}/api/moteur-hotsoft/page`, {
    method: "POST", cache: "no-store",
    headers: { "content-type": "application/json", "x-nwh-relais": secret },
    body: JSON.stringify({ HotelId: HOTEL_CORNICHE, Langue: langue }),
  }).catch(() => null);
  if (!r?.ok) return null;
  const p = (await r.json()) as PageMoteur;
  /* Les photos sont servies par CE site : en chemin relatif (next/image n'accepte pas son propre domaine
   * écrit en entier). */
  const local = (u: unknown) => (typeof u === "string" ? u.replace(/^https:\/\/hotels-toulon-mer\.com(?=\/)/, "") : u);
  for (const c of Object.values(p.categories)) {
    c.photos = c.photos.map((u) => local(u) as string); c.couverture = local(c.couverture) as string | null;
  }
  const rec = p.recit as { photo?: string; communs?: { src: string }[] } | null;
  if (rec) { rec.photo = local(rec.photo) as string; for (const x of rec.communs ?? []) x.src = local(x.src) as string; }
  /* Le logo est une adresse de NWH : on la rend absolue. */
  if (p.marque.logo && p.marque.logo.startsWith("/")) p.marque.logo = `${base}${encodeURI(p.marque.logo)}`;
  return p;
}
