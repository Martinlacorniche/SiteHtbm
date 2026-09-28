// LE LIEN UNIQUE D'UN SÉJOUR — la clé, et la seule.
//
// 🔑 POURQUOI ELLE EXISTE. Martin, 28/09/2026 : « le lien unique obligatoire
// pour tout… sinon quelqu'un d'anonyme peut annuler toutes les resa ».
//
// Vendre n'exige aucune preuve : demander une chambre et un prix est sans
// conséquence, et c'est pour ça que l'endpoint est ouvert. TOUCHER un séjour
// existant est l'inverse — voir une note, la régler, annoncer une heure
// d'arrivée, obtenir un code de porte. Là, il faut prouver qu'on parle pour ce
// client-là, et un numéro de réservation ne prouve rien : il se devine.
//
// 🔑 ET ELLE NAÎT À LA VENTE, PAS APRÈS. « Le lien unique se prépare dès la
// vente. » Le jeton part avec la confirmation, dans le champ qu'UCP prévoit
// exactement pour ça (`booking_confirmation.permalink_url` et `pincode`).
// L'agent le garde, le client aussi : c'est la même clé, et il n'y a donc
// jamais de moment où le séjour existe sans que personne ne puisse y accéder.

import { randomBytes } from 'node:crypto';
import { supabaseServer } from '@/lib/supabase-server';
import { SITE_URL } from '@/lib/site';

export type AccesSejour = { jeton: string; code: string; url: string; expire: string };

/* ⚠️ 32 OCTETS D'ALÉA, PAS UN IDENTIFIANT. Un jeton dérivé du numéro de
 * réservation, de la date ou de l'e-mail se devine — et « se devine » veut
 * dire qu'on peut balayer le planning entier. `randomBytes` puise dans le
 * générateur du système ; `Math.random()` n'aurait rien prouvé. */
const jetonNeuf = () => randomBytes(32).toString('base64url');

/* Le code court est POUR L'HUMAIN : le lire au téléphone, le donner au
 * comptoir. Il n'ouvre rien tout seul — il accompagne le jeton. D'où des
 * chiffres seulement, et jamais moins de six. */
const codeNeuf = () => String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');

/** Ouvre l'accès à un séjour. À appeler au moment où la vente aboutit. */
export async function ouvrirAcces(
  { hotelId, reservationId, depart, origine = 'agent' }:
  { hotelId: string; reservationId: string; depart: string; origine?: string },
): Promise<AccesSejour> {
  const jeton = jetonNeuf();
  const code = codeNeuf();
  /* ⚠️ L'ÉCHÉANCE SE CALCULE SUR LE DÉPART, PAS SUR LA VENTE. Un séjour se
   * réserve des mois à l'avance ; une validité de trente jours depuis l'achat
   * fermerait la porte avant même l'arrivée. On compte trente jours APRÈS le
   * départ — le temps qu'une facture se réclame. */
  const expire = new Date(Date.parse(`${depart}T00:00:00Z`) + 30 * 86_400_000).toISOString();

  const { error } = await supabaseServer.from('sejour_acces').insert({
    jeton, hotel_id: hotelId, mews_reservation_id: reservationId, code, origine, expire_le: expire,
  });
  if (error) throw new Error(`Accès au séjour non créé : ${error.message}`);

  return { jeton, code, url: `${SITE_URL}/sejour/${jeton}`, expire };
}

export type SejourOuvert = { hotelId: string; reservationId: string; code: string | null };

/**
 * Reconnaît un jeton, ou rend `null`. Ne dit JAMAIS pourquoi il a refusé.
 *
 * ⚠️ UN REFUS NE SE MOTIVE PAS. « Jeton inconnu », « jeton expiré » et « jeton
 * révoqué » sont trois réponses différentes, et les distinguer apprend à qui
 * tâtonne s'il a trouvé quelque chose. Le résultat est le même pour
 * l'appelant légitime — il n'entre pas — et une seule réponse ne renseigne
 * personne.
 */
export async function reconnaitre(jeton: string): Promise<SejourOuvert | null> {
  if (!jeton || jeton.length < 32) return null;
  const { data, error } = await supabaseServer
    .from('sejour_acces')
    .select('hotel_id, mews_reservation_id, code, expire_le, revoque_le')
    .eq('jeton', jeton).maybeSingle();
  if (error || !data) return null;
  if (data.revoque_le) return null;
  if (Date.parse(String(data.expire_le)) < Date.now()) return null;

  /* La dernière utilisation se note, sans bloquer la réponse : elle sert à
     repérer un accès qui vit sa vie longtemps après le départ. */
  void supabaseServer.from('sejour_acces')
    .update({ dernier_usage_le: new Date().toISOString() }).eq('jeton', jeton)
    .then(undefined, () => {});

  return {
    hotelId: String(data.hotel_id),
    reservationId: String(data.mews_reservation_id),
    code: data.code ? String(data.code) : null,
  };
}

/** Retire un accès. On révoque, on ne supprime pas. */
export async function revoquer(jeton: string, motif: string): Promise<void> {
  await supabaseServer.from('sejour_acces')
    .update({ revoque_le: new Date().toISOString(), revoque_motif: motif })
    .eq('jeton', jeton);
}
