// LES CHAMBRES, ÉCRITES DANS LE HTML.
//
// 🔴 POURQUOI. Mesuré le 28/09/2026 en chargeant `/reserver` avec l'agent
// utilisateur d'OpenAI : les mots « Chambre », « Tarif » et le symbole « € »
// n'apparaissent NULLE PART dans le HTML servi. Tout le moteur est rendu par
// JavaScript — et les crawlers d'OpenAI, d'Anthropic et de Perplexity
// téléchargent le JavaScript sans jamais l'exécuter (mesuré par Vercel sur
// plus de 500 millions de requêtes).
//
// Conséquence : la page qui VEND les nuits ne dit à une machine ni ce qu'on
// loue, ni à quel prix. Adobe mesure l'effet par secteur — les compagnies
// aériennes, qui rendent leurs tarifs côté client, sont lisibles à 42 % quand
// les hôtels le sont à 71 %.
//
// ⚠️ ET ON MESURE LE PRIX, ON NE L'ÉCRIT PAS. Un « à partir de » saisi une
// fois devient faux à la première saison et ment ensuite pendant des mois — à
// des machines qui le recopient. Sans réponse du moteur, on ne publie pas de
// prix du tout pour cette chambre.

import { chercherDisponibilite, chargerCategories, estPrepaye, surfaceDe, type CategorieChambre } from './mewsBooking';

/* ⚠️ LA PREMIÈRE PHRASE, ET RIEN DE PLUS.
 *
 * Les descriptions Mews sont des notes d'exploitation empilées au fil des
 * années : la Supérieure annonce encore « possibilité d'ajouter un lit
 * d'appoint et lit bébé » alors que l'hôtel ne les propose plus depuis le
 * 25/08/2026. Publier ça, c'est promettre ce qu'on ne fait plus — à des
 * humains comme à des machines qui le recopieront.
 *
 * La première phrase porte l'essentiel : la surface, la vue, le calme. Le
 * reste est du commentaire interne. ⚠️ Ce n'est qu'un garde-fou d'affichage :
 * la vraie correction est dans le back-office Mews. */
const premierePhrase = (t: string): string => {
  const propre = t.replace(/\s+/g, ' ').trim();
  const fin = propre.search(/\.\s|\.$/);
  return fin > 0 ? propre.slice(0, fin + 1) : propre;
};

export type ChambrePubliee = {
  id: string;
  nom: string;
  description: string;
  surface: number | null;
  couchages: number | null;
  /** Le plus bas prix par nuit réellement proposé, ou `null`. */
  aPartirDe: number | null;
};

/** Les chambres telles qu'on peut les écrire, avec un prix mesuré. */
export async function chambresPubliees(): Promise<ChambrePubliee[]> {
  const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  /* ⚠️ QUATRE SONDAGES, ET PAS DEUX. Avec deux (J+1 et J+30), une seule des
   * trois chambres ressortait avec un prix : l'hôtel se loue en Villa sur une
   * partie de l'année, et une nuit sondée à ce moment-là ne rend aucune offre.
   * Une chambre affichée sans prix à côté d'une autre qui en a un se lit comme
   * « celle-là n'est pas disponible », ce qui est faux.
   *
   * Quatre appels par régénération, et la page est en cache une heure : c'est
   * le prix de trois nombres justes. */
  const sondages = [2, 20, 60, 240].map((d) => ({ arrivee: jour(d), depart: jour(d + 1) }));

  const cats = await chargerCategories('fr').catch(() => new Map<string, CategorieChambre>());
  const bas = new Map<string, number>();

  for (const s of sondages) {
    try {
      const dispo = await chercherDisponibilite({ ...s, adultes: 2, langue: 'fr' });
      for (const o of dispo.offres) {
        for (const p of o.prix) {
          /* Le prépayé seul : c'est le tarif qu'on annonce partout ailleurs,
             et mélanger les deux ferait un « à partir de » qui ne correspond à
             aucune ligne réservable. */
          if (!estPrepaye(dispo.tarifs.find((t) => t.Id === p.tarifId), dispo.groupes)) continue;
          if (p.parNuit <= 0) continue;
          const actuel = bas.get(o.categorieId);
          if (actuel === undefined || p.parNuit < actuel) bas.set(o.categorieId, p.parNuit);
        }
      }
    } catch {
      /* Une fenêtre fermée n'est pas une erreur : on continue, et les chambres
         sans prix sortiront sans prix. */
    }
  }

  const out: ChambrePubliee[] = [];
  for (const [id, c] of cats as Map<string, CategorieChambre>) {
    const nom = (c.nom ?? '').trim();
    if (!nom) continue;
    const prix = bas.get(id);
    out.push({
      id,
      nom,
      description: premierePhrase(c.description ?? ''),
      surface: c.surface ?? surfaceDe(c.description ?? ''),
      couchages: c.couchages ?? null,
      aPartirDe: prix === undefined ? null : Math.round(prix),
    });
  }
  /* Du plus petit au plus grand : c'est l'ordre dans lequel l'hôtel les
     présente, et celui d'un prix croissant. */
  return out.sort((a, b) => (a.aPartirDe ?? 9999) - (b.aPartirDe ?? 9999));
}
