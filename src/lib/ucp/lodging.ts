// UCP — LODGING BOOKING : notre moteur, parlé par une machine.
//
// 🔑 POURQUOI. Martin, 28/09/2026 : « moi je veux bien être 1er, aujourd'hui on
// sait prendre une résa en MCP, manque que le paiement agentique ». Le 24/09, la
// capacité `dev.ucp.lodging.booking` a été fusionnée dans le Universal Commerce
// Protocol — la première verticale hors shopping, co-écrite par Amadeus,
// Booking.com, Expedia, Hilton, Marriott et Trip.com. C'est le langage dans
// lequel un agent demandera bientôt « une chambre à Toulon du 12 au 14 ».
//
// ⚠️ ET UNE NUIT N'EST PAS UN ARTICLE DE CATALOGUE. C'est ce qui rendait ACP
// (OpenAI/Stripe) inutilisable ici : il ne connaît que des biens, des
// abonnements et du numérique. UCP, lui, modélise exactement ce qu'on vend —
// une unité réservable est la composition d'un TYPE DE CHAMBRE, d'un PLAN
// TARIFAIRE, de DATES et d'une OCCUPATION. Quatre choses, pas un SKU.
//
// 🔑 ET ON PEUT ÊTRE RÉSERVABLE SANS ATTENDRE LE PAIEMENT DÉLÉGUÉ. La
// spécification prévoit deux portes de sortie, et elles suffisent :
//   · `payment: {}` vide est VALIDE quand aucun instrument n'est exigé — une
//     réservation sans garantie se complète donc de bout en bout ;
//   · `continue_url` rend la main à notre propre tunnel quand une carte est
//     nécessaire, sous le statut `requires_escalation`.
// L'agent prépare, le client finit chez nous. Rien à attendre de personne.

import { chercherDisponibilite, chargerCategories, estPrepaye, HOTEL_ID } from '@/lib/mewsBooking';
import { SITE_URL } from '@/lib/site';

/** La version de protocole qu'on annonce, et la seule qu'on sait parler. */
export const UCP_VERSION = '2026-01-01';

export type DemandeSejour = {
  accommodationTypeId?: string;
  ratePlanId?: string;
  adultes: number;
  arrivee: string;
  depart: string;
};

/* ⚠️ LES MONTANTS D'UCP SONT EN PLUS PETITE UNITÉ. Le barème du protocole suit
 * la convention des processeurs de paiement : 116,00 € s'écrit 11600. Rendre
 * des euros ferait une réservation à 116 centimes, et personne ne s'en
 * apercevrait avant la facture. */
const centimes = (euros: number) => Math.round(euros * 100);

/** L'établissement, tel qu'UCP le décrit. Les valeurs sont celles déjà
 *  publiées sur le site : deux fiches qui se contredisent valent moins qu'une. */
export const PROPRIETE = {
  id: HOTEL_ID,
  name: 'Hôtel-Rooftop Les Voiles',
  address: {
    street_address: '124 rue Gubler',
    address_locality: 'Toulon',
    address_country: 'FR',
    postal_code: '83000',
  },
} as const;

export type Session = {
  id: string;
  cree: number;
  demande: DemandeSejour;
  booking: Record<string, unknown>;
};

/* ⚠️ LES SESSIONS VIVENT EN MÉMOIRE, ET C'EST ASSUMÉ POUR CE PREMIER JALON.
 * Une session de réservation dure quelques minutes ; la perdre au redéploiement
 * fait retomber l'agent sur une erreur claire, pas sur une réservation
 * fantôme. Le jour où l'on complète des paiements ici, elle ira en base — mais
 * pas avant, parce qu'une table de sessions à moitié utilisée est une table
 * qu'on oublie de purger. */
const SESSIONS = new Map<string, Session>();
const DUREE_SESSION_MS = 30 * 60_000;

export function lireSession(id: string): Session | null {
  const s = SESSIONS.get(id);
  if (!s) return null;
  if (Date.now() - s.cree > DUREE_SESSION_MS) { SESSIONS.delete(id); return null; }
  return s;
}

function ranger(s: Session) {
  /* Ménage opportuniste : sans lui, une carte en mémoire ne fait que grandir. */
  for (const [k, v] of SESSIONS) if (Date.now() - v.cree > DUREE_SESSION_MS) SESSIONS.delete(k);
  SESSIONS.set(s.id, s);
}

/** Un libellé Mews, qui arrive parfois en chaîne et parfois par langue. */
function aplatir(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object') {
    const m = v as Record<string, unknown>;
    for (const cle of ['fr-FR', 'fr', 'en-US', 'en']) {
      if (typeof m[cle] === 'string') return String(m[cle]).trim();
    }
    const premier = Object.values(m).find((x) => typeof x === 'string');
    if (premier) return String(premier).trim();
  }
  return '';
}

/* ⚠️ LES EMOJIS DU MOTEUR NE SONT PAS POUR UNE MACHINE. L'hôtel nomme ses
 * tarifs « ✅ 🥐 Flexible, petit-déjeuner inclus » — la coche et le croissant
 * aident l'œil d'un client dans une liste déroulante. Recopiés par un agent
 * dans une réponse écrite, ils font désordre. On retire la décoration de tête
 * et on garde le nom. */
const sansDecor = (t: string) => t.replace(/^[^\p{L}\p{N}]+/u, '').trim();

const identifiant = (prefixe: string) =>
  `${prefixe}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export class ErreurUcp extends Error {
  constructor(message: string, readonly code = 'invalid_request') { super(message); }
}

const ESTDATE = /^\d{4}-\d{2}-\d{2}$/;

/** Construit une session de réservation à partir de la VRAIE disponibilité. */
export async function creerSession(d: DemandeSejour): Promise<Session> {
  if (!ESTDATE.test(d.arrivee) || !ESTDATE.test(d.depart) || d.depart <= d.arrivee) {
    throw new ErreurUcp('Dates de séjour invalides (AAAA-MM-JJ, départ après arrivée).');
  }
  if (!Number.isInteger(d.adultes) || d.adultes < 1 || d.adultes > 4) {
    throw new ErreurUcp('Occupation invalide : de 1 à 4 adultes.');
  }

  const [dispo, categories] = await Promise.all([
    chercherDisponibilite({ arrivee: d.arrivee, depart: d.depart, adultes: d.adultes, langue: 'fr' }),
    chargerCategories('fr').catch(() => new Map()),
  ]);

  /* ⚠️ AUCUNE OFFRE N'EST UNE RÉPONSE, PAS UNE PANNE. L'hôtel se loue en Villa
   * de mi-octobre à mi-mai : « complet » et « fermé » se disent tous deux par
   * une absence d'offre, et un agent doit pouvoir le rapporter sans croire que
   * notre serveur est cassé. */
  const retenues = dispo.offres
    .filter((o) => !d.accommodationTypeId || o.categorieId === d.accommodationTypeId)
    .filter((o) => o.prix.length > 0);
  if (!retenues.length) {
    throw new ErreurUcp('Aucune disponibilité pour ces dates et cette occupation.', 'unavailable');
  }

  /* 🔴 UN AGENT N'ACHÈTE QUE DU PRÉPAYÉ. Martin, 28/09/2026 : « agent =
   * prépayé, ne pas lui ouvrir le flex ». Ce n'est pas une préférence
   * commerciale, c'est ce que le paiement délégué permet — mesuré le même
   * jour sur les jetons partagés Stripe :
   *   · un jeton d'agent est à USAGE UNIQUE — il se désactive au premier
   *     paiement, donc pas de second débit en cas de no-show ;
   *   · `setup_future_usage` est refusé avec un jeton partagé — donc aucune
   *     carte conservée, rechargeable au comptoir comme le fait Mews ;
   *   · une empreinte carte tombe au bout de sept jours, quand une résa
   *     flexible se prend couramment à J-30.
   * Vendre un flexible à un agent, c'est donc vendre une chambre sans
   * garantie. Le prépayé, lui, est payé le jour même : pas de paiement, pas de
   * chambre.
   *
   * ⚠️ ET LA QUESTION SE POSE AU GROUPE TARIFAIRE, PAS AU LIBELLÉ. `estPrepaye`
   * lit `SettlementAction: ChargeCreditCard` ; un tarif renommé un jour chez
   * Mews ne doit pas rouvrir le flexible par la bande. */
  const prepaye = (tarifId: string) =>
    estPrepaye(dispo.tarifs.find((t) => t.Id === tarifId), dispo.groupes);

  if (d.ratePlanId && !prepaye(d.ratePlanId)) {
    throw new ErreurUcp('Ce plan tarifaire ne se vend pas par agent — seuls les tarifs prépayés le sont.');
  }

  /* Le moins cher qui corresponde, parmi les prépayés : c'est ce qu'un agent
     compare. Un plan tarifaire nommé par la demande l'emporte sur le prix. */
  let choisi: { categorieId: string; tarifId: string; total: number; parNuit: number } | null = null;
  for (const o of retenues) {
    for (const p of o.prix) {
      if (d.ratePlanId && p.tarifId !== d.ratePlanId) continue;
      if (!prepaye(p.tarifId)) continue;
      if (!choisi || p.total < choisi.total) {
        choisi = { categorieId: o.categorieId, tarifId: p.tarifId, total: p.total, parNuit: p.parNuit };
      }
    }
  }
  if (!choisi) {
    throw new ErreurUcp(
      'Aucun tarif prépayé disponible pour ces dates — la réservation par agent ne se fait qu\'en prépaiement.',
      'unavailable',
    );
  }

  const cat = (categories as Map<string, { nom?: string; couchages?: number | null }>).get(choisi.categorieId);
  /* ⚠️ MEWS REND UN NOM MULTILINGUE, PAS UNE CHAÎNE. `Name` vaut
   * `{ "fr-FR": "Tarif Prépayé, petit déjeuner inclus" }` : le passer tel quel
   * à un agent lui ferait lire « [object Object] », ou pire, recopier
   * l'accolade dans une réponse au client. On aplatit, français d'abord. */
  const tarif = (dispo.tarifs as { Id?: string; Name?: unknown }[]).find((t) => t.Id === choisi!.tarifId);
  const nomTarif = sansDecor(aplatir(tarif?.Name)) || 'Tarif direct';

  const stay = {
    id: identifiant('ss'),
    accommodation_type: {
      id: choisi.categorieId,
      title: cat?.nom || 'Chambre',
      /* ⚠️ LA CAPACITÉ NE PEUT PAS ÊTRE INFÉRIEURE À L'OCCUPATION VENDUE.
       * La configuration donne « Chambre Individuelle : 1 couchage » alors que
       * Mews la propose — et la facture — pour deux adultes. Annoncer une
       * capacité de 1 sur un séjour à 2 personnes fait une fiche qui se
       * contredit elle-même, et un agent averti l'écarterait à juste titre.
       * On rend donc ce que la chambre accueille RÉELLEMENT : le plus grand
       * des deux. */
      capacity: {
        adults: Math.max(cat?.couchages ?? 0, d.adultes),
        total: Math.max(cat?.couchages ?? 0, d.adultes),
      },
    },
    rate_plan: { id: choisi.tarifId, title: nomTarif },
    occupancy: { adults: d.adultes, total: d.adultes },
    stay_dates: { start_date: d.arrivee, end_date: d.depart },
    totals: [
      { type: 'subtotal', amount: centimes(choisi.total) },
      { type: 'total', amount: centimes(choisi.total) },
    ],
  };

  const id = identifiant('bk');
  const booking = {
    ucp: {
      version: UCP_VERSION,
      status: 'success',
      capabilities: { 'dev.ucp.lodging.booking': [{ version: UCP_VERSION }] },
      payment_handlers: {},
    },
    id,
    /* 🔴 `requires_escalation` TOUJOURS — ET C'EST UNE RÈGLE, PAS UN MANQUE.
     *
     * Martin, 28/09/2026 : « résa sans garantie c'est non, trop risqué ». La
     * spécification autorise pourtant un `payment: {}` VIDE pour les
     * réservations sans empreinte : un agent pourrait alors bloquer une chambre
     * de bout en bout sans qu'aucune carte soit engagée. Sur seize chambres,
     * quelques réservations fantômes un samedi de juillet suffisent à fermer
     * l'hôtel à la vraie clientèle.
     *
     * Donc : on ne complète JAMAIS ici. L'agent prépare, propose un prix vrai,
     * et rend la main à notre tunnel par `continue_url` — c'est lui qui prend
     * la carte et pose la garantie. C'est aussi pour ça qu'il n'existe ni
     * `complete_booking_session` ni `update_booking_session` sur cet endpoint :
     * une porte absente ne s'ouvre pas par erreur. */
    status: 'requires_escalation',
    property: PROPRIETE,
    stays: [stay],
    currency: 'EUR',
    totals: [
      { type: 'subtotal', amount: centimes(choisi.total) },
      { type: 'total', amount: centimes(choisi.total) },
    ],
    links: [
      { type: 'terms_of_service', url: `${SITE_URL}/cgv` },
      { type: 'privacy_policy', url: `${SITE_URL}/confidentialite` },
    ],
    continue_url: `${SITE_URL}/reserver?arrivee=${d.arrivee}&depart=${d.depart}&adultes=${d.adultes}&ucp=${id}`,
    expires_at: new Date(Date.now() + DUREE_SESSION_MS).toISOString(),
  };

  const session: Session = { id, cree: Date.now(), demande: d, booking };
  ranger(session);
  return session;
}
