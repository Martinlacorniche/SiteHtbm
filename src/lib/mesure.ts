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

/** Les marches, dans l'ordre. La table les contrôle : une étape inventée est
 *  refusée par Postgres plutôt que comptée à part (migration 371).
 *
 *  🔴 LES TROIS DERNIÈRES ONT ÉTÉ AJOUTÉES LE 08/10/2026, et il a fallu une
 *  cliente au téléphone pour s'en apercevoir. `paiement` ne veut PAS dire « la
 *  carte est saisie » — il se pose quand le panneau s'ouvre. Entre les deux il
 *  y a tout : le client qui regarde le total et renonce, celui qui tape sa
 *  carte, celui que sa banque interroge, celui qui ne finit pas son
 *  3-D Secure. 57 sessions avaient atteint `paiement`, 23 avaient confirmé, et
 *  on ne pouvait rien dire des 34 autres. */
export type Etape =
  | "ouverture"   // le tunnel s'affiche
  | "recherche"   // dates et occupants validés
  | "aucune_offre" // SORTIE : la recherche n'a rien rendu (complet ou séjour trop long)
  | "offres"      // au moins une chambre est proposée
  | "choix"       // une chambre est sélectionnée
  | "paiement"    // le PANNEAU de paiement s'ouvre — pas la carte
  | "carte"       // la carte est saisie et la réservation posée chez Mews
  | "3ds"         // la banque réclame le client : on l'envoie s'authentifier
  | "3ds_echec"   // il revient SANS authentification : la vente ne peut pas se fermer
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

/** Ce qu'on joint à un jalon. Rien qui désigne une personne : des dates de
 *  séjour, un nombre de nuits et de personnes, un montant affiché.
 *  `montant` : sur `offres`, le séjour le moins cher proposé ; à partir de
 *  `choix`, le total du panier. Toujours TTC. */
export type Contexte = {
  nuits?: number;
  montant?: number;
  arrivee?: string;
  personnes?: number;
  raison?: "complet" | "trop_long";
};

/* ── D'OÙ VIENT LE VISITEUR ─────────────────────────────────────────────────
 * Martin, 20/10/2026 : l'entonnoir disait où l'on perd les gens, jamais d'où
 * ils arrivaient. On le note UNE FOIS, à la première page de l'onglet — sur
 * /reserver, le référent est presque toujours notre propre page d'accueil, et
 * la vraie origine serait perdue.
 * ⚠️ UNE ÉTIQUETTE, PAS UNE ADRESSE : `utm_source`, sinon le DOMAINE du
 * référent (« google.com »), jamais le chemin ni la requête. */
const CLE_PROVENANCE = "htbm_mesure_provenance";

function lireProvenance(): string {
  try {
    const u = new URL(window.location.href);
    const utm = u.searchParams.get("utm_source")?.trim().toLowerCase();
    if (utm) return utm.slice(0, 60);
    if (u.searchParams.has("gclid")) return "google_ads";
    if (u.searchParams.has("fbclid")) return "facebook";
    if (!document.referrer) return "direct";
    const h = new URL(document.referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (!h) return "direct";
    if (h === u.hostname.replace(/^www\./, "").toLowerCase()) return "site";
    return h.slice(0, 60);
  } catch {
    return "direct";
  }
}

/** À appeler au montage de chaque page : ne note que la PREMIÈRE de l'onglet. */
export function noterProvenance(): void {
  if (typeof window === "undefined") return;
  try {
    if (!window.sessionStorage.getItem(CLE_PROVENANCE)) {
      window.sessionStorage.setItem(CLE_PROVENANCE, lireProvenance());
    }
  } catch { /* navigation privée : on ne mesure pas */ }
}

function provenance(): string | null {
  try {
    noterProvenance();
    return window.sessionStorage.getItem(CLE_PROVENANCE);
  } catch {
    return null;
  }
}

export function jalon(etape: Etape, extras?: Contexte): void {
  if (posees.has(etape)) return;
  const s = session();
  if (!s) return;
  posees.add(etape);
  try {
    const nombre = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    void supabase.from("moteur_evenements").insert({
      hotel: "voiles",
      session: s,
      etape,
      nuits: nombre(extras?.nuits),
      montant: nombre(extras?.montant) == null ? null : Math.round(extras!.montant! * 100) / 100,
      arrivee: extras?.arrivee && /^\d{4}-\d{2}-\d{2}$/.test(extras.arrivee) ? extras.arrivee : null,
      personnes: nombre(extras?.personnes),
      raison: extras?.raison ?? null,
      // Sur chaque ligne et pas seulement la première : une session dont
      // l'ouverture s'est perdue garde son origine.
      provenance: provenance(),
    }).then(undefined, () => { /* silence : voir l'en-tête */ });
  } catch { /* idem */ }
}
