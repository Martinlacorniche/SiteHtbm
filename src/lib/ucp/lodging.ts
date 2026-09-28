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

import {
  chercherDisponibilite, chargerCategories, estPrepaye, urlPhoto,
  HOTEL_ID, type CategorieChambre,
} from '@/lib/mewsBooking';
import { lireJeton, verifierJeton, debiter, rembourser, ErreurPaiement } from '@/lib/ucp/paiement';
import {
  poserReservation, folioDe, consignerPaiement, annulerReservation, type ClientAgent,
} from '@/lib/ucp/reservationMews';
import { ajouterNote, noteDeControle } from '@/lib/mewsConnector';
import { SITE_URL } from '@/lib/site';
import { supabaseServer } from '@/lib/supabase-server';

/** La version de protocole qu'on annonce, et la seule qu'on sait parler.
 *
 * ⚠️ ELLE SE LIT DANS LA SPÉCIFICATION, ELLE NE S'INVENTE PAS. On annonçait
 * `2026-01-01`, une date qui ne correspondait à rien : les quatre URL de
 * spécification que le profil publiait rendaient toutes 404, vérifié le
 * 28/09/2026. Un agent qui suit nos liens pour savoir comment nous parler
 * tombait dans le vide, et rien ne le disait.
 *
 * La vraie version est celle de `info.version` du descripteur OpenRPC du
 * service Lodging. Et la capacité vit sous `/draft/` : elle est encore un
 * brouillon — `/latest/` ne la connaît pas. */
export const UCP_VERSION = '2026-09-25';

/** Le canal de publication de la spécification. Le lodging n'est pas stabilisé ;
 *  le jour où il l'est, cette constante devient `latest` et rien d'autre ne
 *  bouge. */
export const UCP_CANAL = 'draft';

export type DemandeSejour = {
  accommodationTypeId?: string;
  ratePlanId?: string;
  adultes: number;
  arrivee: string;
  depart: string;
  client?: ClientAgent;
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
  /** De quoi poser la réservation sans réinterroger la disponibilité. */
  choix: { categorieId: string; tarifId: string; centimes: number; taxe: number; chambre: string };
  /** Qui réserve. Donné à la création ou par `update`, jamais à la complétion. */
  client?: ClientAgent;
  /** Ce qui a été fait, pour ne pas le refaire sur une reprise. */
  fait?: { reservationId: string; customerId: string; numero: string | null; paiement: string };
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

/* ⚠️ LA TAXE DE SÉJOUR N'EST PAS DANS LE PRIX DU MOTEUR, ET ELLE EST AU FOLIO.
 * `hotels/getAvailability` détaille la TVA (`TaxValues`, code `FR-R`) mais
 * ignore la taxe municipale, qui se facture par personne et par nuit — 3,72 €
 * par nuit pour deux, relevé sur le folio. L'annoncer est la seule façon que
 * le prix donné à l'agent soit celui qui sera débité.
 *
 * ⚠️ ET ELLE SE LIT, ELLE NE SE CODE PAS EN DUR : c'est une décision
 * municipale, elle change. Sans elle, on n'annonce pas de prix du tout —
 * mieux vaut refuser de vendre que vendre au mauvais prix. */
let taxeCache: { quand: number; valeur: number } | null = null;
async function taxeSejourParNuitee(): Promise<number> {
  if (taxeCache && Date.now() - taxeCache.quand < 600_000) return taxeCache.valeur;
  const { data, error } = await supabaseServer
    .from('hotels').select('taxe_sejour').eq('id', HOTEL_NWH).maybeSingle();
  const v = Number(data?.taxe_sejour);
  if (error || !Number.isFinite(v)) {
    throw new ErreurUcp('Le tarif ne peut pas être établi : taxe de séjour indisponible.', 'unavailable');
  }
  taxeCache = { quand: Date.now(), valeur: v };
  return v;
}

/** Les Voiles, tel que NWH.os le nomme (l'identifiant Mews est `HOTEL_ID`). */
const HOTEL_NWH = 'ded6e6fb-ff3c-4fa8-ad07-403ee316be53';

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

  /* ⚠️ AUCUNE OFFRE N'EST UNE RÉPONSE, PAS UNE PANNE. L'hôtel se loue aussi
   * entière : « complet » et « fermé » se disent tous deux par
   * une absence d'offre, et un agent doit pouvoir le rapporter sans croire que
   * notre serveur est cassé. */
  const retenues = dispo.offres
    .filter((o) => !d.accommodationTypeId || o.categorieId === d.accommodationTypeId)
    .filter((o) => o.prix.length > 0)
    /* 🔴 L'OCCUPATION D'ABORD, LE PRIX ENSUITE. Interrogé pour deux adultes,
     * Mews répond AUSSI avec la Chambre Individuelle tarifée pour UNE
     * personne. Retenir la moins chère sans regarder `pourPersonnes`, c'est
     * annoncer à l'agent le prix d'un petit-déjeuner pour un quand le folio en
     * facturera deux : 262,00 € annoncés contre 297,44 € dus, mesuré le
     * 28/09/2026 sur un séjour de deux nuits. L'écart n'apparaît qu'au moment
     * de débiter — c'est-à-dire trop tard. */
    .filter((o) => o.pourPersonnes === d.adultes);
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

  const cat = (categories as Map<string, CategorieChambre>).get(choisi.categorieId);
  /* ⚠️ MEWS REND UN NOM MULTILINGUE, PAS UNE CHAÎNE. `Name` vaut
   * `{ "fr-FR": "Tarif Prépayé, petit déjeuner inclus" }` : le passer tel quel
   * à un agent lui ferait lire « [object Object] », ou pire, recopier
   * l'accolade dans une réponse au client. On aplatit, français d'abord. */
  const tarif = (dispo.tarifs as { Id?: string; Name?: unknown }[]).find((t) => t.Id === choisi!.tarifId);
  const nomTarif = sansDecor(aplatir(tarif?.Name)) || 'Tarif direct';

  const nuits = Math.round(
    (Date.parse(`${d.depart}T00:00:00Z`) - Date.parse(`${d.arrivee}T00:00:00Z`)) / 86_400_000,
  );
  const taxe = Math.round(await taxeSejourParNuitee() * nuits * d.adultes * 100) / 100;
  const aPayer = choisi.total + taxe;

  /* 🔑 UN AGENT NE PEUT DIRE QUE CE QU'ON LUI DONNE. On ne lui envoyait qu'un
   * titre et une capacité : il pouvait vendre une chambre sans jamais savoir
   * ce qu'elle contient, ni la montrer. Mews porte déjà la description et les
   * photos — 3 à 5 par catégorie, tenues à jour par l'hôtel dans son
   * back-office, et les seules sans le bandeau que les OTA incrustent.
   *
   * ⚠️ ON N'INVENTE RIEN ET ON NE RECOPIE RIEN : le jour où l'hôtel corrige
   * une description ou change une photo, ce que lisent les agents suit. Une
   * fiche recopiée dans le dépôt aurait divergé au premier changement. */
  const media = (cat?.images ?? []).slice(0, 5).map((id) => ({
    type: 'image',
    url: urlPhoto(id, 1600),
    alt_text: `${cat?.nom || 'Chambre'} — ${PROPRIETE.name}`,
  }));

  const stay = {
    id: identifiant('ss'),
    accommodation_type: {
      id: choisi.categorieId,
      title: cat?.nom || 'Chambre',
      ...(cat?.description ? { description: cat.description } : {}),
      ...(media.length ? { media } : {}),
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
      { type: 'tax', amount: centimes(taxe) },
      { type: 'total', amount: centimes(aPayer) },
    ],
  };

  const id = identifiant('bk');
  const booking = {
    ucp: {
      version: UCP_VERSION,
      status: 'success',
      capabilities: { 'dev.ucp.lodging.booking': [{ version: UCP_VERSION }] },
      /* Le même handler que le profil, répété ici : la spécification permet à
         l'agent de le lire sur la session sans relire `/.well-known/ucp`. */
      payment_handlers: { [HANDLER_ID]: [HANDLER] },
    },
    id,
    /* 🔑 LE STATUT DIT CE QU'IL MANQUE, ET RIEN D'AUTRE.
     *
     * Il a longtemps valu `requires_escalation` en toutes circonstances : on
     * ne savait pas encaisser depuis un agent, et la réservation repartait
     * dans notre tunnel. Ce n'est plus vrai — un jeton de paiement partagé EST
     * une carte, donc la règle de la maison (« résa sans garantie c'est non »)
     * est tenue sans passer la main.
     *
     * ⚠️ ET `continue_url` RESTE, TOUJOURS. C'est la porte de sortie quand la
     * banque du client réclame une authentification que l'agent ne peut pas
     * lever : mesuré le 28/09, une carte soumise au 3-D Secure sort en
     * `requires_action`, et rien n'est alors ni débité ni réservé. Sans cette
     * URL, ces clients-là seraient perdus en silence. */
    status: d.client?.nom ? 'ready_for_complete' : 'incomplete',
    property: PROPRIETE,
    stays: [stay],
    currency: 'EUR',
    totals: [
      { type: 'subtotal', amount: centimes(choisi.total) },
      /* La taxe de séjour, nommée : un agent qui la voit peut l'annoncer au
         client, et le total est alors exactement ce qui sera débité. */
      { type: 'tax', amount: centimes(taxe) },
      { type: 'total', amount: centimes(aPayer) },
    ],
    links: [
      { type: 'terms_of_service', url: `${SITE_URL}/cgv` },
      /* ⚠️ CE LIEN ÉTAIT MORT, ET IL PARTAIT À CHAQUE SESSION. `/confidentialite`
       * n'existe pas sur ce site — jamais créée. Tout agent qui suivait le lien
       * pour vérifier ce qu'on fait des données de son client tombait sur un
       * 404, en production, depuis la mise en ligne du protocole. La politique
       * de traitement des données vit dans les mentions légales (§ 4). */
      { type: 'privacy_policy', url: `${SITE_URL}/mentions` },
    ],
    continue_url: `${SITE_URL}/reserver?arrivee=${d.arrivee}&depart=${d.depart}&adultes=${d.adultes}&ucp=${id}`,
    expires_at: new Date(Date.now() + DUREE_SESSION_MS).toISOString(),
  };

  const session: Session = {
    id, cree: Date.now(), demande: d, booking,
    choix: {
      categorieId: choisi.categorieId, tarifId: choisi.tarifId,
      centimes: centimes(aPayer), taxe, chambre: cat?.nom || 'Chambre',
    },
    ...(d.client ? { client: d.client } : {}),
  };
  ranger(session);
  return session;
}

/* ═══════════════════════════ CONCLURE UNE RÉSERVATION ═══════════════════════
 *
 * 🔑 L'ORDRE DES GESTES EST TOUT. Il est dicté par deux faits mesurés :
 *   · un jeton d'agent est à USAGE UNIQUE — on ne débite qu'une fois, donc au
 *     bon montant du premier coup ;
 *   · LE MONTANT VIENT DU FOLIO, pas de la disponibilité (résa 29931).
 * Et le folio n'existe qu'une fois la réservation posée. D'où la séquence :
 * vérifier le jeton → poser la réservation → lire le folio → débiter → 
 * consigner. Si le débit échoue, la réservation est défaite ; si la
 * consignation échoue, on ne défait RIEN — l'argent est pris et la chambre est
 * acquise, c'est au comptoir de rattraper une écriture, pas au client de
 * perdre sa chambre.
 */

/** Complète la session : le client doit être connu, le paiement présent. */
export async function completerSession(
  { id, instruments, cleIdempotence }:
  { id: string; instruments: Record<string, unknown>[]; cleIdempotence?: string },
): Promise<Record<string, unknown>> {
  const session = lireSession(id);
  /* ⚠️ LES SESSIONS VIVENT EN MÉMOIRE. Un redéploiement entre l'ouverture et
   * la complétion la fait disparaître — l'agent doit alors rouvrir, et non
   * croire que sa réservation est perdue quelque part. Rien n'a été posé ni
   * débité à ce stade : une session absente ne coûte rien à personne. */
  if (!session) throw new ErreurUcp('Session inconnue ou expirée — ouvrez-en une nouvelle.', 'unavailable');

  /* Reprise : si tout était déjà fait, on rend le même résultat plutôt que de
     reposer une seconde chambre. */
  if (session.fait) return session.booking;

  const client = session.client;
  if (!client?.nom?.trim()) {
    throw new ErreurUcp(
      'Le nom du client est nécessaire avant de conclure — donnez `booker` à la création ou par `update_booking_session`.',
    );
  }

  const spt = jetonDe(instruments);
  const jeton = await lireJeton(spt);
  verifierJeton(jeton, session.choix.centimes, session.demande.arrivee);

  /* ── 1. la chambre ─────────────────────────────────────────────────────── */
  const posee = await poserReservation({
    client,
    categorieId: session.choix.categorieId,
    tarifId: session.choix.tarifId,
    arrivee: session.demande.arrivee,
    depart: session.demande.depart,
    adultes: session.demande.adultes,
  });

  /* ── 2. ce qu'elle coûte vraiment ──────────────────────────────────────── */
  let centimesDus: number;
  try {
    const total = await folioDe(posee.reservationId);
    centimesDus = Math.round(total * 100);
    if (centimesDus <= 0) throw new Error('folio vide');
    /* ⚠️ ON NE DÉBITE JAMAIS PLUS QUE LE PRIX ANNONCÉ À L'AGENT. Le client a
     * accepté un montant ; si le folio en dit un plus élevé, c'est un écart
     * qu'on ne peut pas lui imposer par surprise. On défait et on le dit. */
    if (centimesDus > session.choix.centimes) {
      throw new ErreurUcp(
        `Le prix a changé depuis l'ouverture de la session (${(centimesDus / 100).toFixed(2)} € `
        + `au lieu de ${(session.choix.centimes / 100).toFixed(2)} €) — rouvrez une session.`,
        'unavailable',
      );
    }
  } catch (e) {
    await annulerReservation(posee.reservationId, 'Agent : folio illisible ou prix changé').catch(() => {});
    throw e;
  }

  /* ── 3. l'argent ───────────────────────────────────────────────────────── */
  let paiement: string;
  try {
    const d = await debiter({
      spt, centimes: centimesDus, cleIdempotence,
      description: `${PROPRIETE.name} — ${session.demande.arrivee} → ${session.demande.depart}`
        + `${posee.numero ? ` (résa ${posee.numero})` : ''}`,
    });
    paiement = d.id;
  } catch (e) {
    /* La chambre ne reste pas tenue sur un paiement qui n'est pas venu. */
    await annulerReservation(posee.reservationId, 'Agent : paiement non abouti').catch(() => {});
    throw e;
  }

  /* ── 4. le dire au PMS ─────────────────────────────────────────────────── */
  try {
    await consignerPaiement({
      accountId: posee.customerId, reservationId: posee.reservationId,
      montant: centimesDus / 100, reference: paiement,
    });
  } catch (e) {
    /* ⚠️ ON NE DÉFAIT RIEN ICI, ET SURTOUT PAS LA CHAMBRE. L'argent est pris,
     * le client a sa réservation : une écriture manquante se rattrape au
     * comptoir, une chambre annulée ne se rattrape pas. */
    console.error('[ucp] REGLEMENT NON CONSIGNE DANS MEWS — a rattraper au comptoir.',
      { reservation: posee.numero, paymentIntent: paiement, montant: centimesDus / 100 },
      e instanceof Error ? e.message : e);
  }

  /* ── 5. ce que lira la réception ───────────────────────────────────────
   * Martin, 28/09/2026 : « notes dans la resa selon le protocole habituel plus
   * mention resa IA ». Même grammaire que le tunnel — la réception n'a pas à
   * apprendre une seconde forme — avec la provenance changée.
   *
   * ⚠️ ELLE NE FAIT JAMAIS ÉCHOUER LA RÉSERVATION : elle se rattrape en
   * ouvrant le dossier, alors qu'une chambre annulée ne se rattrape pas. */
  try {
    await ajouterNote(posee.reservationId, noteDeControle({
      chambre: session.choix.chambre,
      prepaye: true,
      total: centimesDus / 100,
      taxe: session.choix.taxe,
      source: 'AGENT IA',
    }));
  } catch (e) {
    console.error('[ucp] note de reception non posee', posee.numero, e instanceof Error ? e.message : e);
  }

  /* ── 6. de quoi la compter dans Distribution ────────────────────────────
   * ⚠️ SANS CETTE LIGNE, LA VENTE EST COMPTÉE EN « GROUPES & MARIAGES ». Une
   * réservation posée par le Connector arrive chez Mews en `Origin:
   * 'Connector'`, la même porte que les groupes : rien ne l'en distingue
   * là-bas. C'est notre trace, et elle seule, qui permet à `canalDe()` de la
   * reconnaître (migration 346). Elle ne fait pas échouer non plus — mais une
   * ligne manquante ici fausse une statistique en silence, alors on la crie. */
  try {
    const { error } = await supabaseServer.from('resa_agent').insert({
      hotel_id: HOTEL_NWH,
      mews_reservation_id: posee.reservationId,
      mews_numero: posee.numero,
      session_ucp: session.id,
      montant: centimesDus / 100,
      paiement_ref: paiement,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error('[ucp] VENTE AGENT NON TRACEE — elle sera comptee en Groupes & mariages.',
      { reservation: posee.numero }, e instanceof Error ? e.message : e);
  }

  session.fait = { ...posee, paiement };
  session.booking = {
    ...session.booking,
    status: 'completed',
    totals: [
      { type: 'subtotal', amount: centimesDus },
      { type: 'total', amount: centimesDus },
    ],
    confirmation: {
      id: posee.numero ?? posee.reservationId,
      label: `Réservation ${posee.numero ?? ''}`.trim(),
      permalink_url: `${SITE_URL}/reserver`,
    },
    payment: {
      instruments: [{
        id: paiement, handler_id: HANDLER_ID, type: 'tokenized_card', selected: true,
        ...(jeton.carte ? { display: { label: jeton.carte } } : {}),
      }],
    },
    /* `continue_url` n'a plus de sens : il n'y a plus rien à finir ailleurs. */
    continue_url: undefined,
  };
  return session.booking;
}

/** Complète la session avec ce que l'agent apprend en chemin (le client). */
export function majSession(id: string, client?: ClientAgent): Record<string, unknown> {
  const session = lireSession(id);
  if (!session) throw new ErreurUcp('Session inconnue ou expirée — ouvrez-en une nouvelle.', 'unavailable');
  if (client?.nom?.trim()) session.client = client;
  session.booking = {
    ...session.booking,
    /* Le statut dit à l'agent ce qui manque encore. C'est la seule chose qui
       le renseigne : la spécification n'a pas de champ « il manque ceci ». */
    status: session.client?.nom ? 'ready_for_complete' : 'incomplete',
    ...(session.client
      ? { booker: {
        first_name: session.client.prenom, last_name: session.client.nom,
        ...(session.client.email ? { email: session.client.email } : {}),
        ...(session.client.telephone ? { phone_number: session.client.telephone } : {}),
      } }
      : {}),
  };
  return session.booking;
}

/** L'identifiant de notre handler de paiement, tel que le profil l'annonce. */
export const HANDLER_ID = 'stripe_spt';

/* 🔑 LE PROFIL STRIPE EST L'ADRESSE. Un agent n'accorde pas un jeton « à
 * l'hôtel » : il l'accorde à un profil Stripe nommé, et c'est ce profil que
 * Stripe reconnaît quand nous débitons. Sans le publier, un agent ne peut
 * physiquement pas frapper de jeton pour nous. */
export const PROFIL_STRIPE = 'profile_61VU2xMKFf2D0J1qLA6VU2xMRlDPtzH80SX0leXxoG1A';

/** Ce qu'un agent doit savoir pour nous payer. */
export const HANDLER = {
  version: UCP_VERSION,
  id: HANDLER_ID,
  provider: 'stripe',
  /* La forme attendue, puisque personne ne l'a normalisée — voir `jetonDe`. */
  available_instruments: [{
    type: 'tokenized_card',
    credential: { type: 'stripe_shared_payment_token' },
    /* Le jeton se frappe vers CE profil, et sa limite doit couvrir le total
       annoncé sur la session. */
    network_business_profile: PROFIL_STRIPE,
    currency: 'EUR',
  }],
  note: 'Jeton de paiement partagé Stripe, accordé au profil ci-dessus. '
    + 'Le séjour est débité en totalité à la réservation (tarif prépayé, non remboursable).',
} as const;

/* ⚠️ LA FORME DU CREDENTIAL N'EST PAS NORMALISÉE, ET C'EST ASSUMÉ. UCP laisse
 * chaque fournisseur de paiement définir son instrument : le schéma de base
 * n'impose qu'un `type`, et ouvre le reste (`additionalProperties: true`).
 * Stripe n'a pas publié le sien au 28/09/2026. On publie donc le nôtre dans
 * `/.well-known/ucp` — c'est exactement là que la spécification dit de le
 * chercher — et on accepte ici les quelques écritures qu'un agent raisonnable
 * pourrait produire, plutôt que d'échouer sur une clé nommée autrement. Le
 * jour où Stripe publie sa forme, elle s'ajoute à cette liste. */
function jetonDe(instruments: Record<string, unknown>[]): string {
  for (const i of instruments ?? []) {
    const cred = (i.credential ?? {}) as Record<string, unknown>;
    for (const v of [
      cred.shared_payment_granted_token, cred.token, cred.id, cred.value,
      (i as Record<string, unknown>).shared_payment_granted_token, (i as Record<string, unknown>).token,
    ]) {
      if (typeof v === 'string' && v.startsWith('spt_')) return v;
    }
  }
  throw new ErreurUcp(
    'Aucun jeton de paiement dans `payment.instruments`. '
    + 'Cet hôtel n’accepte que des jetons de paiement partagés Stripe (`spt_…`), '
    + 'accordés au profil indiqué dans /.well-known/ucp.',
  );
}

export { ErreurPaiement, rembourser };
