// LES JALONS DU TUNNEL — de quoi savoir où l'on perd les gens.
//
// ⚠️ MEWS NE PEUT PAS RÉPONDRE À CETTE QUESTION. Le PMS ne connaît que ceux
// qui sont allés au bout : il dira toujours « 12 réservations », jamais « 400
// personnes ont ouvert le tunnel et 388 sont parties ». Ces jalons sont la
// seule source de la seconde phrase.
//
// ⚠️ AUCUNE DONNÉE PERSONNELLE, ET C'EST STRUCTUREL. `session` est un
// identifiant tiré au sort pour la durée d'un onglet : il ne survit pas à la
// fermeture, ne suit personne d'une visite à l'autre, et ne se recoupe avec
// rien. Ni IP, ni e-mail, ni user-agent, ni empreinte. On mesure un PARCOURS,
// pas une personne — c'est pour ça que ça ne demande pas de bandeau de
// consentement, et il ne faut pas y ajouter ce qui l'exigerait.
//
// ⚠️ ET ÇA NE DOIT JAMAIS FAIRE TOMBER UNE RÉSERVATION. Toute erreur est
// avalée : une mesure manquante coûte une ligne de statistique, une exception
// dans le tunnel coûte une vente. Aucun `await` non plus au fil du parcours —
// le jalon part et on n'attend pas.

import { supabase } from "@/lib/supabase";

/** Les six marches, dans l'ordre. La table les contrôle : une étape inventée
 *  est refusée par Postgres plutôt que comptée à part. */
export type Etape =
  | "ouverture"   // le tunnel s'affiche
  | "recherche"   // dates et occupants validés
  | "offres"      // au moins une chambre est proposée
  | "choix"       // une chambre est sélectionnée
  | "paiement"    // la carte est saisie
  | "confirmee";  // la réservation existe dans Mews

const CLE = "htbm_mesure_session";

/** L'identifiant de visite. `sessionStorage` et pas `localStorage` : on veut
 *  qu'il meure avec l'onglet — un identifiant qui survit devient un traceur. */
function session(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let s = window.sessionStorage.getItem(CLE);
    if (!s) {
      s = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      window.sessionStorage.setItem(CLE, s);
    }
    return s;
  } catch {
    // Navigation privée ou cookies bloqués : on ne mesure pas, et c'est tout.
    return null;
  }
}

/* ⚠️ UNE ÉTAPE N'EST POSÉE QU'UNE FOIS PAR VISITE. Un visiteur qui relance
 * trois recherches produirait trois `recherche` : l'entonnoir s'élargirait au
 * milieu et ses taux cesseraient de vouloir dire quelque chose. La route de
 * lecture compte déjà des sessions distinctes, mais autant ne pas écrire trois
 * lignes pour une. */
const posees = new Set<Etape>();

export function jalon(etape: Etape, extras?: { nuits?: number; montant?: number }): void {
  if (posees.has(etape)) return;
  const s = session();
  if (!s) return;
  posees.add(etape);
  try {
    void supabase.from("moteur_evenements").insert({
      hotel: "voiles",
      session: s,
      etape,
      nuits: extras?.nuits ?? null,
      montant: extras?.montant ?? null,
    }).then(undefined, () => { /* silence : voir l'en-tête */ });
  } catch { /* idem */ }
}
