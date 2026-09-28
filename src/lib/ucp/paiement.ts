// LE PAIEMENT D'UN AGENT — un jeton partagé Stripe, et rien d'autre.
//
// 🔑 CE QU'EST UN JETON PARTAGÉ (SPT). Le client donne sa carte à SON agent ;
// l'agent demande à Stripe un jeton à portée limitée, accordé À NOTRE PROFIL,
// et nous l'envoie. Nous n'avons jamais la carte : nous avons le droit de la
// débiter une fois, dans une devise, jusqu'à un plafond, avant une échéance.
// C'est une carte, pas une promesse — et c'est pour ça que la règle de la
// maison (« résa sans garantie c'est non ») est tenue, pas contournée.
//
// ⚠️ TROIS CHOSES MESURÉES LE 28/09/2026, QUI DICTENT TOUT CE FICHIER :
//   · le jeton est à USAGE UNIQUE — il se désactive au premier paiement, et
//     un second débit répond « already in a deactivated state ». Il n'y a donc
//     pas de rattrapage possible : on ne débite qu'une fois, au bon montant ;
//   · `setup_future_usage` est REFUSÉ avec un jeton partagé — aucune carte ne
//     se conserve pour le comptoir ;
//   · une carte qui exige une authentification sort en `requires_action`, et
//     l'agent ne peut pas la lever seul. Ce n'est pas une panne : c'est le cas
//     où la réservation retourne dans notre tunnel.
//
// ⚠️ ET ON LIT LE JETON AVANT DE POSER QUOI QUE CE SOIT. Un plafond inférieur
// au séjour, ou une échéance déjà passée, se voient en une lecture — alors
// qu'après avoir créé la réservation, ils se paient d'une annulation.

/** La version d'API qui connaît les jetons partagés. */
const VERSION = '2026-04-22.preview';

const cle = () => {
  const k = process.env.STRIPE_SECRET_KEY_VOILES;
  if (!k) throw new Error('STRIPE_SECRET_KEY_VOILES manquante (env serveur).');
  return k;
};

async function stripe<T>(
  chemin: string,
  corps?: Record<string, string>,
  entetes: Record<string, string> = {},
): Promise<T> {
  const r = await fetch(`https://api.stripe.com/v1/${chemin}`, {
    method: corps ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${cle()}`,
      'Stripe-Version': VERSION,
      ...(corps ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...entetes,
    },
    ...(corps ? { body: new URLSearchParams(corps).toString() } : {}),
  });
  const j = await r.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!r.ok) throw new ErreurPaiement(j?.error?.message || `Stripe a répondu ${r.status}.`);
  return j as T;
}

export class ErreurPaiement extends Error {
  constructor(message: string, readonly code = 'payment_declined') { super(message); }
}

export type Jeton = {
  id: string;
  devise: string | null;
  plafond: number | null;
  echeance: number | null;
  actif: boolean;
  carte: string | null;
};

/** Relit un jeton avant de s'en servir. */
export async function lireJeton(spt: string): Promise<Jeton> {
  if (!/^spt_[A-Za-z0-9_]+$/.test(spt)) throw new ErreurPaiement('Jeton de paiement mal formé.', 'invalid_request');
  const j = await stripe<{
    id: string; deactivated_at: number | null;
    usage_limits?: { currency?: string; max_amount?: number; expires_at?: number };
    payment_method_details?: { card?: { brand?: string; last4?: string } };
  }>(`shared_payment/granted_tokens/${spt}`);
  const c = j.payment_method_details?.card;
  return {
    id: j.id,
    devise: j.usage_limits?.currency ?? null,
    plafond: j.usage_limits?.max_amount ?? null,
    echeance: j.usage_limits?.expires_at ?? null,
    actif: !j.deactivated_at,
    carte: c?.brand && c?.last4 ? `${c.brand} ···· ${c.last4}` : null,
  };
}

/** Vérifie qu'un jeton peut payer ce séjour. Lève en disant quoi corriger. */
export function verifierJeton(j: Jeton, centimes: number, arrivee: string): void {
  if (!j.actif) throw new ErreurPaiement('Ce jeton de paiement a déjà été utilisé ou révoqué.');
  if (j.devise && j.devise.toLowerCase() !== 'eur') {
    throw new ErreurPaiement(`L’hôtel encaisse en euros ; ce jeton est en ${j.devise.toUpperCase()}.`, 'invalid_request');
  }
  if (j.plafond !== null && j.plafond < centimes) {
    throw new ErreurPaiement(
      `Le plafond du jeton (${(j.plafond / 100).toFixed(2)} €) est inférieur au séjour `
      + `(${(centimes / 100).toFixed(2)} €).`, 'invalid_request',
    );
  }
  /* ⚠️ L'ÉCHÉANCE DOIT COUVRIR LE DÉBIT, PAS LE SÉJOUR. On encaisse à la
   * réservation — c'est du prépayé. Un jeton qui expire avant l'arrivée est
   * donc parfaitement utilisable, et le refuser fermerait la vente sans
   * raison. On ne vérifie que ce qui compte : qu'il vaille encore maintenant. */
  if (j.echeance !== null && j.echeance * 1000 < Date.now()) {
    throw new ErreurPaiement('Ce jeton de paiement a expiré.');
  }
  void arrivee;
}

export type Debit = { id: string; statut: string; montant: number };

/** Débite le jeton. `cleIdempotence` empêche un double débit sur reprise. */
export async function debiter(
  { spt, centimes, description, cleIdempotence }:
  { spt: string; centimes: number; description: string; cleIdempotence?: string },
): Promise<Debit> {
  /* ⚠️ L'IDEMPOTENCE N'EST PAS UN LUXE ICI. UCP exige une `idempotency-key` à
   * la complétion précisément pour ça : un agent qui réessaie après un réseau
   * coupé ne doit pas débiter deux fois. On la passe à Stripe telle quelle. */
  const pi = await stripe<{ id: string; status: string; amount: number; last_payment_error?: { message?: string } }>(
    'payment_intents',
    {
      amount: String(centimes),
      currency: 'eur',
      confirm: 'true',
      description,
      'payment_method_data[shared_payment_granted_token]': spt,
    },
    cleIdempotence ? { 'Idempotency-Key': cleIdempotence } : {},
  );

  /* Le seul statut qui vaut « payé ». `requires_action` (authentification
     bancaire) et `requires_payment_method` (refus) se disent à l'appelant, qui
     décide — ici, en défaisant la réservation. */
  if (pi.status !== 'succeeded') {
    throw new ErreurPaiement(
      pi.status === 'requires_action'
        ? 'La banque du client demande une authentification : la réservation doit être finalisée par le client lui-même.'
        : `Paiement refusé (${pi.status}).`,
      pi.status === 'requires_action' ? 'requires_action' : 'payment_declined',
    );
  }
  return { id: pi.id, statut: pi.status, montant: pi.amount };
}

/** Rend l'argent. Utilisé quand la réservation ne peut pas être posée après coup. */
export async function rembourser(paymentIntent: string): Promise<void> {
  await stripe('refunds', { payment_intent: paymentIntent });
}

/* ═══════════ QUAND L'AGENT NE PEUT PAS PAYER : UN LIEN, ET UNE HORLOGE ══════
 *
 * 🔑 Martin, 28/09/2026 : « s'il peut pas payer avec agent on peut lui envoyer
 * un lien de paiement valable 15 mn (réservation valable 15 mn aussi du coup) ».
 *
 * C'est la sortie du cas `requires_action` : la banque du client réclame une
 * authentification que l'agent ne peut pas lever. Plutôt que de renvoyer le
 * client vers un tunnel où il refera tout, on lui donne UN lien pour payer
 * exactement ce qui a été convenu — et la chambre reste tenue pendant ce
 * temps, ni plus ni moins.
 *
 * ⚠️ LES DEUX HORLOGES DOIVENT DIRE LA MÊME HEURE. La session Stripe expire à
 * 15 minutes, la chambre est relâchée par Mews à 15 minutes. Un lien qui vit
 * plus longtemps que la chambre encaisserait un séjour déjà repris par
 * quelqu'un d'autre.
 */

/* ⚠️ QUINZE MINUTES ÉTAIENT VOULUES, STRIPE EN IMPOSE TRENTE. Mesuré le
 * 28/09/2026 : « The `expires_at` timestamp must be at least 30 minutes from
 * Checkout Session creation ». On ne peut donc pas faire plus court côté
 * paiement — autant l'assumer des deux côtés plutôt que de bricoler.
 *
 * 🔑 ET LE LIEN MEURT AVANT LA CHAMBRE, jamais l'inverse. Cinq minutes de
 * marge : un client qui paie à la vingt-neuvième minute trouve encore sa
 * chambre tenue. Si l'ordre était inversé, on encaisserait une nuit que Mews
 * aurait déjà remise en vente. */
export const LIEN_MINUTES = 30;
export const TENUE_MINUTES = 35;

export type LienPaiement = { url: string; checkout: string; expire: string };

export async function lienDePaiement(
  { centimes, description, email, retour, marque }:
  { centimes: number; description: string; email?: string; retour: string;
    /** De quoi retrouver QUOI conclure quand le paiement arrive par webhook. */
    marque?: Record<string, string> },
): Promise<LienPaiement> {
  const expire = Math.floor(Date.now() / 1000) + LIEN_MINUTES * 60;
  const corps: Record<string, string> = {
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(centimes),
    'line_items[0][price_data][product_data][name]': description,
    success_url: retour,
    cancel_url: retour,
    /* ⚠️ SANS CETTE LIGNE, STRIPE DONNE 24 h À LA SESSION. La chambre, elle,
     * est relâchée dans un quart d'heure : le client paierait une nuit vendue
     * à quelqu'un d'autre. */
    expires_at: String(expire),
  };
  if (email) corps.customer_email = email;
  /* ⚠️ SANS CETTE MARQUE, UN PAIEMENT QUI ARRIVE PAR WEBHOOK EST ORPHELIN.
   * Stripe nous dit « telle session a été payée » ; encore faut-il savoir de
   * quelle réservation ou de quelle note il s'agit. */
  for (const [k, v] of Object.entries(marque ?? {})) corps[`metadata[${k}]`] = v;

  const s = await stripe<{ id: string; url: string }>('checkout/sessions', corps);
  return { url: s.url, checkout: s.id, expire: new Date(expire * 1000).toISOString() };
}

/** Ce lien a-t-il été payé ? Rend l'identifiant du paiement, ou `null`. */
export async function paiementDuLien(checkout: string): Promise<string | null> {
  const s = await stripe<{ payment_status?: string; payment_intent?: string | null }>(
    `checkout/sessions/${checkout}`,
  ).catch(() => null);
  if (!s || s.payment_status !== 'paid') return null;
  return typeof s.payment_intent === 'string' ? s.payment_intent : null;
}

/** L'adresse d'un lien encore ouvert, ou `null` s'il ne vaut plus. */
export async function urlDuLien(checkout: string): Promise<string | null> {
  const s = await stripe<{ url?: string | null; status?: string }>(`checkout/sessions/${checkout}`)
    .catch(() => null);
  if (!s || s.status !== 'open' || !s.url) return null;
  return s.url;
}
