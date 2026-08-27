// Les statuts d'une réservation d'invité de groupe, au même endroit.
//
// Ils étaient recopiés en dur dans six fichiers. L'ajout de `paiement_differe`
// (août 2026) en a oublié trois : l'invité voyait sa chambre marquée « réservée »
// mais son code à 4 chiffres répondait « aucune réservation active », et les
// boutons Modifier / Annuler n'apparaissaient jamais. Sa résa existait pourtant.

// Ce qui TIENT une chambre : elle n'est plus proposée aux autres invités.
// `en_attente_paiement` en fait partie — la session Stripe court encore.
export const TENUES = ["confirmee", "en_attente_paiement", "paiement_differe"] as const;

// Ce que l'invité peut GÉRER lui-même (accéder, modifier, annuler). On écarte
// `en_attente_paiement` : tant que Stripe n'a pas répondu, la chambre peut se
// libérer toute seule, il n'y a rien de stable à modifier.
export const GERABLES = ["confirmee", "paiement_differe"] as const;

export const estGerable = (s?: string | null) => (GERABLES as readonly string[]).includes(String(s));
