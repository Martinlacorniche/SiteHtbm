// QUAND C'EST COMPLET, PROPOSER AUTRE CHOSE.
//
// 🔑 POURQUOI. Repris de l'Hôtel Sporthotel IDEAL (Hochgurgl), le seul autre
// hôtel indépendant publié dans le registre MCP : son serveur a un outil
// `alternative_termine`, et ses consignes au modèle disent « si une période est
// complète, chercher des dates alternatives plutôt que de refuser ».
//
// Notre `create_booking_session` répondait « aucune disponibilité » et
// s'arrêtait là. Un agent passe alors à l'hôtel suivant — et c'est le cas le
// plus fréquent en haute saison, donc la vente qu'on perd le plus souvent.
// Sur seize chambres, deux jours de décalage suffisent presque toujours.
//
// ⚠️ SIX SONDAGES, PAS SOIXANTE. Chaque essai est un appel au moteur. On
// regarde autour des dates demandées, de plus en plus loin, et on s'arrête dès
// qu'on a trois propositions : un agent n'en lira pas davantage à son client.

import { chercherDisponibilite, estPrepaye } from '@/lib/mewsBooking';

export type Alternative = {
  arrivee: string;
  depart: string;
  /** Combien de jours plus tôt (négatif) ou plus tard (positif). */
  decalage: number;
  chambre: string;
  total: number;
};

const jour = (iso: string, n: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Des séjours de MÊME DURÉE, proches des dates demandées, réellement libres. */
export async function alternatives(
  { arrivee, depart, adultes, combien = 3 }:
  { arrivee: string; depart: string; adultes: number; combien?: number },
): Promise<Alternative[]> {
  const nuits = Math.round(
    (Date.parse(`${depart}T00:00:00Z`) - Date.parse(`${arrivee}T00:00:00Z`)) / 86_400_000,
  );
  if (nuits < 1) return [];

  const aujourdHui = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
  /* ⚠️ ON PROPOSE D'ABORD LE PLUS PROCHE. Un client qui voulait le 12 préfère
   * le 13 au 19 — et l'ordre des essais est aussi l'ordre de la réponse. */
  const decalages = [1, -1, 2, -2, 3, -3, 7, -7];

  const out: Alternative[] = [];
  for (const d of decalages) {
    if (out.length >= combien) break;
    const a = jour(arrivee, d);
    /* Une date passée n'est pas une alternative. */
    if (a < aujourdHui) continue;
    const b = jour(a, nuits);

    try {
      const dispo = await chercherDisponibilite({ arrivee: a, depart: b, adultes, langue: 'fr' });
      let meilleur: { total: number; cat: string } | null = null;
      for (const o of dispo.offres) {
        /* Même règle que la vente : le prépayé seul, et l'occupation exacte —
           sinon on proposerait le prix d'une personne pour deux. */
        if (o.pourPersonnes !== adultes) continue;
        for (const p of o.prix) {
          if (!estPrepaye(dispo.tarifs.find((t) => t.Id === p.tarifId), dispo.groupes)) continue;
          if (p.total <= 0) continue;
          if (!meilleur || p.total < meilleur.total) meilleur = { total: p.total, cat: o.categorieId };
        }
      }
      if (!meilleur) continue;
      const cat = meilleur.cat;
      out.push({ arrivee: a, depart: b, decalage: d, chambre: cat, total: meilleur.total });
    } catch {
      /* Une fenêtre fermée n'est pas une erreur : on essaie la suivante. */
    }
  }
  return out;
}
