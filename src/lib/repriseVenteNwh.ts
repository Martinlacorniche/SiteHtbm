/* Ce que `/reserver` emporte à travers la page Stripe, quand la vente passe par NWH (Les Voiles sur lessclic).
 *
 * ⚠️ LA PAGE DE LA BANQUE FAIT QUITTER LE SITE. Le client revient par `?vente=` et React remonte de zéro : le séjour
 * choisi, la table du rooftop, ses coordonnées ont disparu avec l'état du composant. Sans ce relais, la confirmation
 * ne savait redire ni les dates ni le total, et la table du rooftop — prise APRÈS la chambre, jamais avant — ne
 * l'était plus du tout.
 *
 * `sessionStorage` comme pour le 3-D Secure de Mews (`reprise3ds.ts`) : lié à l'onglet et à l'origine, effacé quand
 * l'onglet se ferme, et rien de tout cela ne transite par Stripe ni par la banque.
 *
 * ⚠️ RIEN ICI NE PROUVE UNE VENTE. C'est NWH (lessclic, qui relit Stripe) qui dit si la vente est confirmée ; ce
 * relais ne sert qu'à redire ce que le client a choisi. Aucune donnée bancaire : la carte n'a jamais approché ce site.
 */
import type { ChoixTable } from "@/app/reserver/TableRooftop";

const CLE = "voiles.venteEnLigne";
/* La page Stripe vit trente minutes ; au-delà, l'option est levée et ce relais ne redirait qu'un séjour perdu. */
const PEREMPTION = 40 * 60_000;

export type VenteNwhEnAttente = {
  client: { prenom: string; nom: string; email: string; telephone: string };
  arrivee: string;
  depart: string;
  resume: string;
  totalFormate: string;
  /** La table du rooftop choisie avec la chambre, et pour combien. */
  table: ChoixTable | null;
  pax: number;
  langue: "fr" | "en";
};

export function poserVenteNwh(v: VenteNwhEnAttente): void {
  try { sessionStorage.setItem(CLE, JSON.stringify({ ...v, poseeA: Date.now() })); } catch { /* navigation privée : la confirmation sera plus courte, la vente n'en dépend pas */ }
}

/** Relit ET efface : un rechargement ne rejoue pas la table du rooftop. */
export function reprendreVenteNwh(): VenteNwhEnAttente | null {
  let brut: string | null = null;
  try { brut = sessionStorage.getItem(CLE); sessionStorage.removeItem(CLE); } catch { return null; }
  if (!brut) return null;
  try {
    const v = JSON.parse(brut) as VenteNwhEnAttente & { poseeA?: number };
    if (!v?.arrivee || !v?.depart || !Number.isFinite(v.poseeA) || Date.now() - (v.poseeA ?? 0) > PEREMPTION) return null;
    return v;
  } catch {
    return null;
  }
}
