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
import { supabaseServer } from '@/lib/supabase-server';

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

/* L'hôtel dont cette page vend les nuits, côté base NWH. */
const HOTEL_NWH = 'ded6e6fb-ff3c-4fa8-ad07-403ee316be53';
/* Le miroir est repeint toutes les quatre heures ; on tolère un passage
   manqué, pas une journée de retard. */
const MIROIR_AGE_MAX_MS = 9 * 60 * 60 * 1000;

/**
 * Les alternatives, lues dans le MIROIR — ou `null` s'il ne sait pas répondre.
 *
 * 🔑 POURQUOI. La version ci-dessous interroge le moteur une fois PAR DÉCALAGE
 * ESSAYÉ : jusqu'à huit appels en série, à 356 ms de médiane, soit près de
 * trois secondes d'attente pour l'agent — et ça arrive au pire moment, celui où
 * on vient de lui dire « complet » et où il hésite à passer à l'hôtel suivant.
 * Le miroir répond pour tous les décalages en une seule lecture.
 *
 * ⛔ ET IL REND LE PRIX PRÉPAYÉ, comme la vente. Le miroir porte les deux
 * tarifs depuis la migration 361 : proposer le flexible ici annoncerait 9 € de
 * plus que ce que l'agent paiera — un écart qui décrédibilise tout le reste.
 */
async function duMiroir(
  { arrivee, nuits, adultes, combien, decalages, aujourdHui }:
  { arrivee: string; nuits: number; adultes: number; combien: number; decalages: number[]; aujourdHui: string },
): Promise<Alternative[] | null> {
  try {
    /* Une seule lecture couvrant tous les décalages, bornes comprises. */
    const bas = Math.min(...decalages), haut = Math.max(...decalages);
    const { data, error } = await supabaseServer
      .from('prix_miroir')
      .select('date, categorie_id, prix_ttc, prix_prepaye, pax, dispo, ferme, mlos, releve_le')
      .eq('hotel_id', HOTEL_NWH)
      .gte('date', jour(arrivee, bas))
      .lte('date', jour(arrivee, haut + nuits));
    if (error || !data?.length) return null;

    const limite = Date.now() - MIROIR_AGE_MAX_MS;
    /* Une seule photo trop vieille et on rend la main au moteur : mélanger du
       frais et du périmé ferait un prix qui n'a jamais existé. */
    if (data.some((r) => !(new Date(String(r.releve_le)).getTime() >= limite))) return null;

    const par = new Map<string, Map<string, typeof data[number]>>();
    for (const r of data) {
      const c = String(r.categorie_id);
      if (!par.has(c)) par.set(c, new Map());
      par.get(c)!.set(String(r.date), r);
    }

    const out: Alternative[] = [];
    for (const d of decalages) {
      if (out.length >= combien) break;
      const a = jour(arrivee, d);
      if (a < aujourdHui) continue;
      const nuitsDuSejour = Array.from({ length: nuits }, (_, i) => jour(a, i));

      let meilleur: { total: number; cat: string } | null = null;
      for (const [cat, parDate] of par) {
        let total = 0; let bon = true;
        for (const n of nuitsDuSejour) {
          const r = parDate.get(n);
          const prix = r?.prix_prepaye != null ? Number(r.prix_prepaye)
            : r?.prix_ttc != null ? Number(r.prix_ttc) : null;
          const capacite = r?.pax == null ? 2 : Number(r.pax);
          if (!r || prix == null || prix <= 0 || r.ferme || Number(r.dispo ?? 0) <= 0
              || capacite !== adultes
              || (r.mlos != null && Number(r.mlos) > nuits)) { bon = false; break; }
          total += prix;
        }
        if (!bon) continue;
        const arrondi = Math.round(total * 100) / 100;
        if (!meilleur || arrondi < meilleur.total) meilleur = { total: arrondi, cat };
      }
      if (meilleur) out.push({ arrivee: a, depart: jour(a, nuits), decalage: d, chambre: meilleur.cat, total: meilleur.total });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

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

  /* ⚠️ LE MIROIR D'ABORD, LE MOTEUR EN REPLI. S'il est muet, trop vieux, ou ne
   * trouve rien, on redescend sur les sondages ci-dessous : une alternative
   * ratée vaut mieux qu'une alternative fausse, et mieux que pas de réponse. */
  const rapide = await duMiroir({ arrivee, nuits, adultes, combien, decalages, aujourdHui });
  if (rapide) return rapide;

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
