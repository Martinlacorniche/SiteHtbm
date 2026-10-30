// UCP — LA CORNICHE, SUR LE MÊME ENDPOINT QUE LES VOILES.
//
// 🔑 POURQUOI UN FICHIER À PART. Les Voiles sont sur Mews, et ce site leur parle directement (clé Mews,
// compte Stripe des Voiles). La Corniche est sur HotSoft, et ce site ne lui parle PAS : tout passe par
// NWH, par le relais authentifié (`x-nwh-relais`), comme son tunnel `/reserver-corniche`. Ce site ne
// connaît ni la clé Stripe de La Corniche, ni les écritures HotSoft — il porte le protocole, NWH vend.
//
//   create_booking_session  → NWH `agent/devis` (prix du moteur : RACK − remise, code NWHNR)
//   complete_booking_session→ NWH `agent/vendre` (option HotSoft, débit du jeton, confirmation, mail)
//
// ⚠️ SEUL LE PRÉPAYÉ SE VEND PAR AGENT, comme aux Voiles, et pour la même raison : un jeton partagé
// Stripe est à usage unique et ne garde aucune carte. Le flexible se DIT (prix, conditions) puis renvoie
// au tunnel par `continue_url`. Le prépayé n'existe qu'à partir du lendemain : une arrivée du jour
// renvoie aussi au tunnel.
//
// ⚠️ ET RIEN NE SE VEND TANT QUE NWH N'A PAS DE PROFIL STRIPE POUR LA CORNICHE. Un jeton se frappe vers
// un profil, et le profil connu est celui du compte des Voiles : un jeton accordé à celui-là ne se
// débite pas sur le compte de La Corniche. NWH dit le profil (`agent/profil`, réglage `profilAgent` du
// connecteur Stripe de l'hôtel) ; vide, la session rend les prix et un `continue_url`, jamais un
// handler de paiement. Le drapeau est là-bas, pas ici : un seul endroit qui dit « c'est ouvert ».
//
// ⚠️ LES PRIX NE SE CALCULENT PAS ICI. Le devis de NWH donne le total (chambres + taxe de séjour) ; on le
// convertit en centimes, rien de plus. La vente relit tout chez HotSoft et refuse de débiter plus que
// ce qui a été annoncé.

import { SITE_URL } from '@/lib/site';
import { supabaseServer } from '@/lib/supabase-server';
import { HOTEL_CORNICHE, pageMoteurCorniche } from '@/lib/moteurNwh/pageCorniche';
import {
  ErreurUcp, ErreurPaiement, UCP_VERSION, DUREE_SESSION_MS, ranger, identifiant, lireSession,
  prendreLaMain, jetonDe, clientComplet, type DemandeSejour, type Session,
} from '@/lib/ucp/lodging';

/** La Corniche, telle qu'UCP la décrit. L'identifiant est celui de NWH (pas de Mews ici). */
export const PROPRIETE_CORNICHE = {
  id: HOTEL_CORNICHE,
  name: 'Best Western Plus La Corniche',
  address: {
    street_address: '17 Littoral Frédéric Mistral',
    address_locality: 'Toulon',
    address_country: 'FR',
    postal_code: '83000',
  },
} as const;

/** Le tunnel de La Corniche, avec les dates : là où le client finit quand l'agent ne peut pas. */
export const tunnelCorniche = (d: { arrivee: string; depart: string; adultes: number }) =>
  `${SITE_URL}/reserver-corniche?arrivee=${d.arrivee}&depart=${d.depart}&adultes=${d.adultes}`;

/** Le handler de paiement de La Corniche : même forme que celui des Voiles, autre profil. */
export const HANDLER_ID_CORNICHE = 'stripe_spt_corniche';
export const handlerCorniche = (profil: string) => ({
  version: UCP_VERSION,
  id: HANDLER_ID_CORNICHE,
  provider: 'stripe',
  available_instruments: [{
    type: 'tokenized_card',
    credential: { type: 'stripe_shared_payment_token' },
    /* ⚠️ UN AUTRE PROFIL QUE CELUI DES VOILES : deux sociétés, deux comptes Stripe. Un jeton frappé vers
       l'un ne se débite pas sur l'autre. */
    network_business_profile: profil,
    currency: 'EUR',
  }],
  note: 'Best Western Plus La Corniche uniquement. Jeton de paiement partagé Stripe, accordé au profil ci-dessus. '
    + 'Le séjour est débité en totalité à la réservation (tarif prépayé, non remboursable).',
});

/* ── Le relais vers NWH ────────────────────────────────────────────────────── */

async function nwh<T>(op: 'profil' | 'devis' | 'vendre', corps: Record<string, unknown>, delaiMs = 25_000): Promise<T> {
  const base = (process.env.GROUPE_RELAIS_NWH || '').replace(/\/$/, '');
  const secret = process.env.GROUPE_RELAIS_SECRET || '';
  if (!base || !secret) throw new ErreurUcp('La réservation de cet hôtel est momentanément indisponible.', 'unavailable');
  const r = await fetch(`${base}/api/moteur-hotsoft/agent/${op}`, {
    method: 'POST', cache: 'no-store',
    headers: { 'content-type': 'application/json', 'x-nwh-relais': secret },
    body: JSON.stringify({ HotelId: HOTEL_CORNICHE, ...corps }),
    signal: AbortSignal.timeout(delaiMs),
  }).catch(() => null);
  const j = (await r?.json().catch(() => null)) as (T & { erreur?: string }) | null;
  /* ⚠️ Pour une VENTE, un silence n'est pas un échec : elle est peut-être en cours chez NWH (option,
     débit). L'agent doit rappeler la MÊME session — une nouvelle session, avec un nouveau jeton, ferait
     une seconde vente et un second débit (revue du 30/10/2026). */
  if (!r || !j) throw new ErreurUcp(op === 'vendre'
    ? 'La confirmation est toujours en cours chez l’hôtel. Rappelez `complete_booking_session` avec la MÊME session dans deux minutes : ne rouvrez PAS de session, la réservation ne sera ni posée ni débitée deux fois.'
    : 'Le moteur de réservation de l’hôtel n’a pas répondu.', 'unavailable');
  if (!r.ok && op !== 'vendre') {
    /* ⚠️ UNE PANNE N'EST PAS UN « COMPLET ». NWH dit 502 quand HotSoft ne répond pas : on le dit aussi. */
    throw new ErreurUcp(r.status === 400 ? `Demande refusée : ${j.erreur ?? 'invalide'}.` : 'Le moteur de réservation de l’hôtel n’a pas répondu.',
      r.status === 400 ? 'invalid_request' : 'unavailable');
  }
  return j;
}

/* 🔑 LE PROFIL SE RELIT, IL NE SE RECOPIE PAS — mais pas à chaque appel. Cinq minutes de mémoire : le
 * profil UCP est lu par des robots, et il ne change que le jour où Martin l'active. */
let profilCache: { le: number; profil: string | null } | null = null;
export async function profilCorniche(): Promise<string | null> {
  if (profilCache && Date.now() - profilCache.le < 300_000) return profilCache.profil;
  try {
    const { profil } = await nwh<{ profil: string | null }>('profil', {}, 5_000);
    const p = typeof profil === 'string' && /^profile_[A-Za-z0-9]+$/.test(profil) ? profil : null;
    profilCache = { le: Date.now(), profil: p };
    return p;
  } catch {
    /* NWH injoignable : on n'annonce rien (fermé), et on réessaiera au prochain passage. */
    return null;
  }
}

/* ── La session ────────────────────────────────────────────────────────────── */

type OffreAgent = {
  categorieId: string; code: string; nom: string; nomEn: string | null; capacite: number; libres: number;
  description: string | null; photos: string[]; tarifId: string; mode: 'flexible' | 'prepaye';
  chambres: number; taxe: number; total: number;
};
type Devis = { nuits: number; adultes: number; taxeParNuitee: number; pdjPrix: number; prepaye: OffreAgent | null; flexible: OffreAgent | null; profil: string | null };

const ESTDATE = /^\d{4}-\d{2}-\d{2}$/;
const centimes = (euros: number) => Math.round(euros * 100);
const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

/** Les conditions de La Corniche, dites AVANT de payer (cf. `conditions.ts` pour Les Voiles). */
export function conditionsCorniche(taxeParNuitee: number, pdjPrix: number) {
  return [
    {
      type: 'com.htbm.policy.cancellation',
      description: {
        plain: 'Tarif prépayé : le séjour est réglé en totalité à la réservation. '
          + 'Il n’est NI ANNULABLE, NI MODIFIABLE, NI REMBOURSABLE — les dates ne peuvent pas être changées. '
          + 'Le client est réputé avoir accepté ces conditions en réglant. '
          + 'Un tarif flexible, annulable sans frais jusqu’au jour d’arrivée à 18 h (heure de Paris), '
          + 'existe mais ne se réserve pas par agent : il est disponible sur le site de l’hôtel.',
      },
    },
    {
      type: 'com.htbm.policy.payment',
      description: {
        plain: 'Le paiement se fait à la réservation, par jeton de paiement partagé Stripe. '
          + 'Si la banque du client réclame une authentification, rien n’est débité ni réservé : '
          + 'la réservation se termine alors sur le site de l’hôtel (`continue_url`).',
      },
    },
    {
      type: 'com.htbm.policy.check_in',
      description: { plain: 'Réception ouverte 24 h/24 : arrivée à l’heure qui convient au client. Départ avant midi.' },
    },
    {
      type: 'com.htbm.policy.taxes',
      description: {
        plain: `Taxe de séjour de ${eur(taxeParNuitee)} par adulte et par nuit, déjà comprise dans le total annoncé.`,
      },
    },
    {
      type: 'com.htbm.policy.breakfast',
      description: {
        plain: `Petit-déjeuner NON compris dans le tarif réservé par agent. Buffet face à la rade, `
          + `${eur(pdjPrix)} par personne et par nuit, à prendre sur place.`,
      },
    },
  ];
}

/** Ouvre une session de réservation à La Corniche, à partir du devis de NWH. */
export async function creerSessionCorniche(d: DemandeSejour): Promise<Session> {
  if (!ESTDATE.test(d.arrivee) || !ESTDATE.test(d.depart) || d.depart <= d.arrivee) {
    throw new ErreurUcp('Dates de séjour invalides (AAAA-MM-JJ, départ après arrivée).');
  }
  if (!Number.isInteger(d.adultes) || d.adultes < 1 || d.adultes > 4) {
    throw new ErreurUcp('Occupation invalide : de 1 à 4 adultes.');
  }
  const devis = await nwh<Devis>('devis', {
    arrivee: d.arrivee, depart: d.depart, adultes: d.adultes, categorieId: d.accommodationTypeId ?? null,
  });

  /* Le plan demandé : le prépayé par défaut ; le flexible s'il est nommé (pour le DIRE, pas le vendre). */
  const veutFlexible = !!d.ratePlanId && d.ratePlanId === devis.flexible?.tarifId;
  if (d.ratePlanId && !veutFlexible && d.ratePlanId !== devis.prepaye?.tarifId) {
    throw new ErreurUcp('Plan tarifaire inconnu pour ces dates — ouvrez une session sans `rate_plan` pour obtenir le prépayé.');
  }
  const offre = veutFlexible ? devis.flexible : (devis.prepaye ?? devis.flexible);
  if (!offre) throw new ErreurUcp('Aucune disponibilité pour ces dates et cette occupation.', 'unavailable');

  /* 🔴 QUAND L'AGENT NE PEUT PAS VENDRE, LA SESSION LE DIT ET DÉSIGNE LE TUNNEL. Trois cas : le flexible
   * (jamais par agent), une arrivée du jour (pas de prépayé), et la vente par agent pas encore ouverte. */
  const raison = offre.mode === 'flexible'
    ? (veutFlexible
      ? 'Le tarif flexible ne se réserve pas par agent : le client le réserve sur le site de l’hôtel.'
      : 'Aucun tarif prépayé pour ces dates (il n’est proposé qu’à partir du lendemain) : '
        + 'seul le tarif flexible est disponible, et il se réserve sur le site de l’hôtel.')
    : !devis.profil
      ? 'Le paiement par agent n’est pas encore ouvert pour cet hôtel : le client termine la réservation sur le site.'
      : null;

  const media = offre.photos.map((url) => ({ type: 'image', url, alt_text: `${offre.nom} — ${PROPRIETE_CORNICHE.name}` }));
  const nomTarif = offre.mode === 'prepaye' ? 'Prépayé — non remboursable' : 'Flexible — exclu direct';
  const totaux = [
    { type: 'subtotal', amount: centimes(offre.chambres) },
    { type: 'tax', amount: centimes(offre.taxe) },
    { type: 'total', amount: centimes(offre.total) },
  ];
  const id = identifiant('bk');
  const continueUrl = `${tunnelCorniche(d)}&ucp=${id}`;
  const client = d.client;

  const booking: Record<string, unknown> = {
    ucp: {
      version: UCP_VERSION,
      status: 'success',
      capabilities: { 'dev.ucp.lodging.booking': [{ version: UCP_VERSION }] },
      /* Le handler n'est annoncé QUE s'il peut servir : jamais sur une session qui renvoie au tunnel. */
      ...(!raison && devis.profil ? { payment_handlers: { [HANDLER_ID_CORNICHE]: [handlerCorniche(devis.profil)] } } : {}),
    },
    id,
    status: raison ? 'requires_escalation'
      : client?.nom && client?.email ? 'ready_for_complete' : 'incomplete',
    property: PROPRIETE_CORNICHE,
    stays: [{
      id: identifiant('ss'),
      accommodation_type: {
        id: offre.categorieId,
        title: offre.nom,
        ...(offre.description ? { description: offre.description } : {}),
        ...(media.length ? { media } : {}),
        capacity: { adults: Math.max(offre.capacite, d.adultes), total: Math.max(offre.capacite, d.adultes) },
      },
      rate_plan: { id: offre.tarifId, title: nomTarif },
      occupancy: { adults: d.adultes, total: d.adultes },
      stay_dates: { start_date: d.arrivee, end_date: d.depart },
      totals: totaux,
    }],
    currency: 'EUR',
    totals: totaux,
    policies: conditionsCorniche(devis.taxeParNuitee, devis.pdjPrix),
    links: [{ type: 'privacy_policy', url: `${SITE_URL}/confidentialite` }],
    continue_url: continueUrl,
    expires_at: new Date(Date.now() + DUREE_SESSION_MS).toISOString(),
    ...(raison ? { messages: [{ type: 'info', content: { plain: `${raison} Transmettez-lui \`continue_url\`, qui ouvre la même recherche.` } }] } : {}),
  };

  const session: Session = {
    id, cree: Date.now(), demande: d, booking,
    choix: {
      categorieId: offre.categorieId, tarifId: offre.tarifId, centimes: centimes(offre.total),
      taxe: offre.taxe, chambre: offre.nom, hotel: 'corniche', mode: raison ? 'flexible' : 'prepaye',
    },
    ...(client ? { client } : {}),
  };
  /* ⚠️ `mode: 'flexible'` sert aussi de verrou quand le profil manque : une session ouverte « fermée » ne
     devient pas vendable parce que le profil a été posé entre-temps — on en rouvre une, au vrai prix. */
  await ranger(session);
  return session;
}

/* ── Conclure ──────────────────────────────────────────────────────────────── */

type IssueVente =
  | { ok: true; numeros: string[]; total: number; paiement: string; carte: string | null; deja?: boolean }
  | { ok: false; code: string; message: string };

/** Conclut une session de La Corniche : la vente est faite par NWH, ici on porte le protocole. */
export async function completerCorniche(
  session: Session,
  { instruments }: { instruments: Record<string, unknown>[]; cleIdempotence?: string },
): Promise<Record<string, unknown>> {
  /* Reprise : la vente faite se redonne telle quelle. */
  if (session.fait) return session.booking;
  if (session.choix.mode !== 'prepaye' || session.booking.status === 'requires_escalation') {
    throw new ErreurUcp(
      'Cette réservation ne se paie pas par agent (tarif flexible, arrivée du jour ou paiement par agent non ouvert) : '
      + `le client la termine sur le site, via \`continue_url\` (${String(session.booking.continue_url ?? tunnelCorniche(session.demande))}).`,
    );
  }
  if (!clientComplet(session)) {
    throw new ErreurUcp(
      'Le nom ET l’e-mail du client sont nécessaires avant de conclure (la confirmation part par e-mail) — '
      + 'donnez `booker` à la création ou par `update_booking_session`.',
    );
  }
  const spt = jetonDe(instruments);

  /* 🔴 UN SEUL APPELANT CONCLUT. Le même verrou que Les Voiles (migration 357) ; NWH en tient un second
     (une seule vente par session, index unique). */
  if (!await prendreLaMain(session.id)) {
    const relue = await lireSession(session.id);
    if (relue?.fait) return relue.booking;
    throw new ErreurUcp('Une confirmation est déjà en cours pour cette session — rappelez `complete_booking_session` '
      + 'dans deux minutes avec la même session : la réservation ne sera ni posée ni débitée deux fois.', 'unavailable');
  }
  /* ⚠️ LE VERROU SE RELÂCHE SUR UN REFUS NET (jeton au plafond trop bas, carte refusée…) : l'agent doit
     pouvoir réessayer avec un autre jeton sans attendre. Jamais sur un silence de NWH — la vente y est
     peut-être en cours, et c'est le verrou qui empêche de la doubler. */
  const relacher = () => supabaseServer.from('ucp_session').update({ verrou_le: null }).eq('id', session.id)
    .then(undefined, () => {});

  const c = session.client!;
  const r = await nwh<IssueVente>('vendre', {
    arrivee: session.demande.arrivee, depart: session.demande.depart, adultes: session.demande.adultes,
    categorieId: session.choix.categorieId,
    client: { prenom: c.prenom, nom: c.nom, email: c.email, telephone: c.telephone ?? null },
    spt, centimes: session.choix.centimes, cle: session.id, langue: 'fr',
  /* ⚠️ Plus long que les lectures : option HotSoft relue, débit, confirmation. Un délai dépassé n'est pas
     un échec — la reprise retrouve la vente (même clé de session). */
  }, 28_000);

  if (!r.ok) {
    /* Un refus sans code est une panne de NWH (502) : on ne relâche pas, la reprise passera par sa clé. */
    if (r.code && r.code !== 'en_cours') await relacher();
    if (r.code === 'requires_action') {
      /* 🔑 L'AUTHENTIFICATION BANCAIRE : NWH a déjà annulé l'option et le paiement. Le client finit dans le
         tunnel, où le 3-D Secure se fait — rien n'a été débité. */
      session.booking = {
        ...session.booking,
        status: 'requires_escalation',
        continue_url: tunnelCorniche(session.demande),
        messages: [{ type: 'info', content: { plain: `${r.message} Transmettez au client \`continue_url\` : il retrouvera la même recherche.` } }],
      };
      session.choix = { ...session.choix, mode: 'flexible' };
      await ranger(session);
      return session.booking;
    }
    if (r.code === 'en_cours') throw new ErreurUcp(r.message, 'unavailable');
    if (r.code === 'payment_declined') throw new ErreurPaiement(r.message, 'payment_declined');
    if (r.code === 'unavailable' || r.code === 'prix_change' || r.code === 'ferme') throw new ErreurUcp(r.message, 'unavailable');
    if (r.code === 'invalid_request') throw new ErreurUcp(r.message);
    throw new ErreurUcp(r.message || 'Le moteur de réservation de l’hôtel n’a pas abouti — rappelez `complete_booking_session` '
      + 'avec la même session dans deux minutes : une vente déjà faite sera retrouvée, jamais doublée.', 'unavailable');
  }

  const numero = r.numeros.join(', ');
  session.fait = { reservationId: r.numeros[0] ?? '', customerId: '', numero, paiement: r.paiement };
  session.booking = {
    ...session.booking,
    status: 'completed',
    totals: [{ type: 'total', amount: centimes(r.total) }],
    confirmation: { id: numero, label: `Réservation ${numero}` },
    payment: {
      instruments: [{
        id: r.paiement, handler_id: HANDLER_ID_CORNICHE, type: 'tokenized_card', selected: true,
        ...(r.carte ? { display: { label: r.carte } } : {}),
      }],
    },
    /* ⚠️ PAS DE CLÉ DE SÉJOUR À LA CORNICHE (pour l'instant) : `get_stay`, `get_check_in` et `get_folio`
       parlent Mews. La confirmation part par e-mail, et la réception est ouverte 24 h/24. */
    messages: [{ type: 'info', content: { plain: `Réservation confirmée et réglée (${eur(r.total)}). Le client reçoit sa confirmation par e-mail ; `
      + 'la réception est ouverte 24 h/24 (+33 4 94 41 35 12). Tarif prépayé : ni annulable, ni modifiable, ni remboursable.' } }],
    continue_url: undefined,
  };
  await ranger(session);
  return session.booking;
}

/* ── La fiche ──────────────────────────────────────────────────────────────── */

/** La fiche de La Corniche pour un agent. Le récit et « ce qui est compris » se LISENT chez NWH (le même
 *  contenu que la page du moteur) ; seule l'identité, déjà publiée sur ce site, est écrite ici. */
export async function ficheCorniche() {
  const p = await pageMoteurCorniche('fr').catch(() => null);
  const recit = p?.recit as { lignes?: string[]; compris?: { items?: { texte: string; absent?: boolean }[] } } | null;
  const items = recit?.compris?.items ?? [];
  return {
    name: PROPRIETE_CORNICHE.name,
    property_id: PROPRIETE_CORNICHE.id,
    star_rating: 4,
    address: '17 Littoral Frédéric Mistral, 83000 Toulon',
    phone: '+33 4 94 41 35 12',
    email: 'contact-corniche@htbm.fr',
    url: `${SITE_URL}/hotel-bord-de-mer-toulon`,
    booking_url: `${SITE_URL}/reserver-corniche`,
    ...(recit?.lignes?.length ? { description: recit.lignes.join(' ') } : {}),
    /* Les mêmes coordonnées que le balisage de la page du moteur (`balisageCorniche.ts`). */
    location: {
      latitude: 43.1071245, longitude: 5.9357019,
      neighbourhood: 'Le Mourillon, Toulon',
      notes: 'Face à la mer, au Mourillon : plages et criques à deux minutes à pied.',
    },
    check_in: { around_the_clock: true, notes: 'Réception ouverte 24 h/24 : arrivée à l’heure qui convient.' },
    check_out: { until: '12:00' },
    reception: { around_the_clock: true },
    ...(items.length ? {
      amenities: items.filter((i) => !i.absent).map((i) => i.texte),
      not_available: items.filter((i) => i.absent).map((i) => i.texte),
    } : {}),
    breakfast: {
      included: false,
      notes: `Petit-déjeuner buffet face à la rade, en option : non compris dans le tarif réservé par agent, à prendre sur place.`,
    },
    rooms: {
      notes: 'Six types de chambres, de la Classique (rez-de-chaussée) à la Suite Prestige vue mer. '
        + 'Le détail, les photos et le prix du jour s’obtiennent par `create_booking_session` avec cette propriété.',
    },
    rates: {
      agent_bookable: 'Tarif prépayé uniquement : réglé en totalité à la réservation, non remboursable, '
        + 'proposé à partir du lendemain (pas pour une arrivée le jour même).',
      also_sold: 'Un tarif flexible existe, annulable sans frais jusqu’au jour d’arrivée à 18 h '
        + '(heure de Paris), carte en garantie. Il ne se réserve pas par agent : réservez-le sur le site.',
      city_tax: p ? `Taxe de séjour ${eur(p.taxeSejour)} par adulte et par nuit, déjà comprise dans les prix annoncés.`
        : 'Taxe de séjour comprise dans les prix annoncés.',
    },
    after_booking: 'La confirmation part par e-mail. Pas de clé de séjour par agent pour cet hôtel : '
      + 'pour toute question, la réception (24 h/24) au +33 4 94 41 35 12.',
  };
}
