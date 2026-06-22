import Stripe from "stripe";

// Stripe multi-compte (un compte par hôtel). Server-only.
// Le paiement d'une chambre est encaissé sur le compte Stripe de SON hôtel.
const HOTELS: Record<string, { name: string; secretEnv: string }> = {
  "f9d59e56-9a2f-433e-bcf4-f9753f105f32": { name: "corniche", secretEnv: "STRIPE_SECRET_KEY" },        // La Corniche
  "ded6e6fb-ff3c-4fa8-ad07-403ee316be53": { name: "voiles",   secretEnv: "STRIPE_SECRET_KEY_VOILES" },  // Les Voiles
};
const DEFAULT_HOTEL = "f9d59e56-9a2f-433e-bcf4-f9753f105f32";

const cache = new Map<string, Stripe>();

export function getStripeForHotel(hotelId: string | null | undefined): Stripe {
  const conf = (hotelId && HOTELS[hotelId]) || HOTELS[DEFAULT_HOTEL];
  const key = process.env[conf.secretEnv];
  if (!key) throw new Error(`Clé Stripe manquante (${conf.secretEnv}) pour l'hôtel ${conf.name}`);
  if (!cache.has(conf.secretEnv)) cache.set(conf.secretEnv, new Stripe(key));
  return cache.get(conf.secretEnv)!;
}
