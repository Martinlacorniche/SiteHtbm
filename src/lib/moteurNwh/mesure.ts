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

/* Copie du moteur NWH pour le site vitrine.
 *
 * 🔴 19/11/2026 — CETTE COPIE ÉTAIT RESTÉE À SIX MARCHES, SANS CONTEXTE. C'est elle que lit le moteur
 * de la Corniche depuis son ouverture (29/10) : pas de `carte`, pas de `3ds_echec`, pas
 * d'`aucune_offre`, aucune date, aucun prix affiché, aucune provenance. L'entonnoir de la Corniche
 * montrait donc 0 carte saisie puis 5 confirmées (« sans les étapes d'avant »), et « 0 session porte
 * ses dates » — alors que le tunnel des Voiles (`src/lib/mesure.ts`) les portait depuis le 20/10.
 * Elle reprend maintenant les mêmes marches, le même contexte et la même provenance. */
import { supabase } from "@/lib/supabase";
import { noterProvenance } from "@/lib/mesure";

/** Les marches, dans l'ordre — les mêmes que `src/lib/mesure.ts` (Voiles). La table les contrôle
 *  (migration 391) : une étape inventée est refusée par Postgres plutôt que comptée à part. */
export type Etape =
  | "ouverture"   // le tunnel s'affiche
  | "recherche"   // dates et occupants validés
  | "aucune_offre" // SORTIE : la recherche n'a rien rendu (complet ou séjour trop long)
  | "offres"      // au moins une chambre est proposée
  | "choix"       // une chambre est sélectionnée
  | "paiement"    // le PANNEAU de paiement s'ouvre — pas la carte
  | "carte"       // coordonnées validées, chambre tenue, carte donnée (ou départ vers la page Stripe)
  | "3ds"         // la banque réclame le client : on l'envoie s'authentifier
  | "3ds_echec"   // il revient SANS authentification (ou la banque a refusé)
  | "confirmee";  // la réservation existe

/** Ce qu'on joint à un jalon. Rien qui désigne une personne : des dates de séjour, un nombre de
 *  nuits et de personnes, un montant affiché (TTC). `montant` : sur `offres`, le séjour le moins
 *  cher proposé ; à partir de `choix`, le total du panier. */
export type Contexte = {
  nuits?: number;
  montant?: number;
  arrivee?: string;
  personnes?: number;
  raison?: "complet" | "trop_long";
};

const CLE = "waveos_mesure_session";
const CLE_POSEES = "waveos_mesure_posees";

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

/* ⚠️ UNE ÉTAPE N'EST POSÉE QU'UNE FOIS PAR VISITE — et la visite SURVIT AU RETOUR DE STRIPE.
 * Le jeu des étapes posées vivait en mémoire : le client qui part payer chez Stripe revient sur une
 * page rechargée, le jeu est vide, et le montage reposait `ouverture`, `recherche` (sur la nuit du
 * jour, les dates de l'URL ayant été effacées) et `offres`. Mesuré le 19/11 : 354 `ouverture` pour
 * 268 visiteurs, et chaque confirmée suivie d'une fausse recherche « pour ce soir ». Avec le contexte,
 * ces fausses recherches auraient faussé le délai et les nuits. Le jeu est donc rangé dans le même
 * `sessionStorage` que l'identifiant : il meurt avec l'onglet, comme lui.
 * La clé porte la MAISON : le jalon d'un hôtel ne fait pas taire celui d'un autre. */
const enMemoire = new Set<string>();

function dejaPosee(cle: string): boolean {
  if (enMemoire.has(cle)) return true;
  try {
    const l = JSON.parse(window.sessionStorage.getItem(CLE_POSEES) ?? "[]");
    return Array.isArray(l) && l.includes(cle);
  } catch { return false; }
}

function marquer(cle: string): void {
  enMemoire.add(cle);
  try {
    const l = JSON.parse(window.sessionStorage.getItem(CLE_POSEES) ?? "[]");
    const liste = Array.isArray(l) ? l : [];
    if (!liste.includes(cle)) liste.push(cle);
    window.sessionStorage.setItem(CLE_POSEES, JSON.stringify(liste.slice(-50)));
  } catch { /* la mémoire suffit */ }
}

function provenance(): string | null {
  try {
    noterProvenance();
    return window.sessionStorage.getItem("htbm_mesure_provenance");
  } catch {
    return null;
  }
}

/* ⚠️ `maison` était la constante "voiles" : tous les jalons d'un futur client
 * seraient tombés dans la ligne des Voiles, et la mesure aurait été fausse pour
 * les deux. L'appelant la donne — c'est `maisonDuSlug(hotel.slug)`. */
export function jalon(maison: string, etape: Etape, extras?: Contexte): void {
  const s = session();
  if (!s) return;
  const cle = `${maison}:${etape}`;
  if (dejaPosee(cle)) return;
  marquer(cle);
  try {
    const nombre = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const montant = nombre(extras?.montant);
    void supabase.from("moteur_evenements").insert({
      hotel: maison,
      session: s,
      etape,
      nuits: nombre(extras?.nuits),
      montant: montant == null ? null : Math.round(montant * 100) / 100,
      arrivee: extras?.arrivee && /^\d{4}-\d{2}-\d{2}$/.test(extras.arrivee) ? extras.arrivee : null,
      personnes: nombre(extras?.personnes),
      raison: extras?.raison ?? null,
      // Sur chaque ligne : une session dont l'ouverture s'est perdue garde son origine.
      provenance: provenance(),
    }).then(undefined, () => { /* silence : voir l'en-tête */ });
  } catch { /* idem */ }
}
