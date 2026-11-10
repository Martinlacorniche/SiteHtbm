// L'ARRIVÉE — et les codes qui ouvrent.
//
// 🔑 POURQUOI CET OUTIL EXISTE. Aux Voiles il n'y a pas de réception 24 h/24 :
// l'arrivée est autonome, et le code du portail plus le numéro de chambre SONT
// l'accueil. Un client qui les obtient de son agent, au bon moment, n'a besoin
// de personne — c'est exactement le service que l'hôtel rend déjà, en mieux.
//
// 🔴 ET C'EST LE SEUL ENDROIT OÙ UNE ERREUR OUVRE UNE PORTE. Partout ailleurs,
// se tromper coûte une chambre vendue en trop ; ici, cela laisse entrer
// quelqu'un chez un autre. D'où quatre conditions, toutes obligatoires, toutes
// vérifiées à chaque appel :
//
//   1. UN SÉJOUR IDENTIFIÉ — Martin : « attention pas de resa pas de code ».
//      Le jeton du séjour, et rien d'autre : un numéro de réservation se devine.
//   2. LE BON JOUR — pas la veille, pas trois jours avant.
//   3. À PARTIR DE 15 h, heure de Paris.
//   4. LA CHAMBRE EST PRÊTE — assignée ET propre. Martin : « l'agent ne donne
//      la clef qu'à 15h si chambre propre ». C'est le ménage qui décide, pas
//      l'horloge : une chambre encore sale à 15 h n'est pas une chambre.
//
// ⚠️ ET ON DIT POURQUOI ON REFUSE, ICI. C'est l'inverse de la règle du jeton :
// un client légitime dont la chambre n'est pas faite doit savoir qu'il doit
// patienter, pas croire que son séjour n'existe pas. Le jeton, lui, a déjà été
// vérifié en amont — nous ne renseignons donc personne qui tâtonne.

import { callMews } from '@/lib/mewsConnector';
import { supabaseServer } from '@/lib/supabase-server';

export const HEURE_ARRIVEE = 15;

/* 🔑 LE CODE DE LA CHAMBRE SE DEMANDE À NWH, IL NE SE FABRIQUE PAS ICI. Les
 * serrures appartiennent à l'outil de gestion, avec ses jetons TTLock et son
 * journal d'encodage. Le site public sait à quel séjour il parle et quand il
 * commence ; il demande, et NWH décide. Donner les clés TTLock à un site
 * ouvert à tous les vents serait l'inverse du bon sens.
 *
 * ⚠️ SANS CE SECRET, PAS DE CODE DE CHAMBRE — et c'est mieux qu'un code faux :
 * le client lit alors le numéro de téléphone de l'hôtel. */
const NWH = process.env.NWH_URL ?? 'https://consigneshtbm.com';

async function codeDeLaChambre(
  { hotelId, chambre, debut, fin, reference }:
  { hotelId: string; chambre: string; debut: string; fin: string; reference: string },
): Promise<string | null> {
  const cle = process.env.CLE_MACHINE_SERRURES;
  if (!cle) return null;
  try {
    const r = await fetch(`${NWH}/api/serrures/code-sejour`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-machine-key': cle },
      body: JSON.stringify({ hotel_id: hotelId, chambre, debut, fin, reference }),
    });
    const j = await r.json().catch(() => null) as { ok?: boolean; code?: string } | null;
    return j?.ok && j.code ? String(j.code) : null;
  } catch (e) {
    console.error('[checkin] code de chambre indisponible', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Les états de ménage qui valent « la chambre est prête ». */
const PRETE = new Set(['Clean', 'Inspected']);

export type Arrivee =
  | { pret: false; raison: string; a_partir_de?: string }
  | {
    pret: true; chambre: string;
    code_portail: string | null; note_portail: string | null;
    code_porte_entree: string | null; note_porte_entree: string | null;
    code_chambre: string | null; note_chambre: string;
  };

const jourParis = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());

/* ⚠️ LE DÉCALAGE DE PARIS N'EST PAS `+02:00`. Il était codé en dur : juste de
 * fin mars à fin octobre, faux le reste de l'année — un agent aurait annoncé
 * « à partir de 15 h » en donnant un instant qui vaut 14 h en novembre. On le
 * demande à `Intl`, qui connaît les changements d'heure. */
function instantParis(jour: string, heure = HEURE_ARRIVEE): string {
  const [a, m, j] = jour.split('-').map(Number);
  const repere = new Date(Date.UTC(a, m - 1, j, 12));
  const rendu = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'longOffset' }).format(repere);
  const t = rendu.match(/GMT([+-])(\d{2}):(\d{2})/);
  const decalage = t ? `${t[1]}${t[2]}:${t[3]}` : '+01:00';
  return `${jour}T${String(heure).padStart(2, '0')}:00:00${decalage}`;
}
const heureParis = () => Number(new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', hour: '2-digit', hour12: false,
}).format(new Date()));

/** Ce que le client peut savoir de son arrivée, maintenant. */
export async function arrivee(
  { hotelId, reservationId, reference }:
  { hotelId: string; reservationId: string; reference: string },
): Promise<Arrivee> {
  const r = await callMews<{
    Reservations?: { State?: string; StartUtc?: string; EndUtc?: string; AssignedResourceId?: string | null }[];
  }>('reservations/getAll/2023-06-06', {
    ReservationIds: [reservationId], Extent: { Reservations: true }, Limitation: { Count: 1 },
  });
  const resa = (r.Reservations ?? [])[0];
  if (!resa) return { pret: false, raison: 'Cette réservation est introuvable.' };
  if (resa.State === 'Canceled') {
    return { pret: false, raison: 'Cette réservation a été annulée.' };
  }

  /* 🔴 IL MANQUAIT LA BORNE DE FIN, ET ELLE COÛTAIT CHER. On vérifiait que le
   * séjour avait COMMENCÉ, jamais qu'il n'était pas fini. Or la clé vaut
   * jusqu'à départ + 30 jours (le temps de réclamer une facture).
   *
   * Un client parti depuis trois semaines rappelait donc `get_check_in` : sa
   * réservation n'est pas annulée, le jour d'arrivée est passé, il est plus de
   * 15 h, et sa chambre — relouée entre-temps — est repassée en `Clean` pour
   * l'occupant suivant. Il recevait le numéro d'une chambre occupée par
   * quelqu'un d'autre, ET les codes du portail et de la porte d'entrée, qui
   * sont statiques et communs à tout l'immeuble. Accès continu pendant un
   * mois.
   *
   * Le code de sa chambre, lui, expirait bien sur la serrure. C'est ce qui
   * rendait le trou discret. */
  const jourDepart = String(resa.EndUtc ?? '').slice(0, 10);
  if (resa.State === 'Processed' || (jourDepart && jourParis() > jourDepart)) {
    return { pret: false, raison: 'Ce séjour est terminé.' };
  }

  /* ⚠️ LE BON JOUR, ET PAS LA VEILLE. `StartUtc` porte l'heure d'arrivée
   * prévue ; seule la DATE compte ici, comparée à celle de Toulon — un client
   * à New York ne doit pas obtenir son code avec six heures d'avance. */
  const jourArrivee = String(resa.StartUtc ?? '').slice(0, 10);
  const aujourdHui = jourParis();
  if (!jourArrivee) return { pret: false, raison: 'Cette réservation n’a pas de date d’arrivée.' };
  if (aujourdHui < jourArrivee) {
    return {
      pret: false,
      raison: `Les codes sont délivrés le jour de l’arrivée, le ${jourArrivee}, à partir de ${HEURE_ARRIVEE} h.`,
      a_partir_de: instantParis(jourArrivee),
    };
  }

  if (aujourdHui === jourArrivee && heureParis() < HEURE_ARRIVEE) {
    return {
      pret: false,
      raison: `La chambre se libère à ${HEURE_ARRIVEE} h. Les bagages peuvent être déposés avant, à l’hôtel.`,
      a_partir_de: instantParis(jourArrivee),
    };
  }

  if (!resa.AssignedResourceId) {
    return { pret: false, raison: 'La chambre n’est pas encore attribuée. Elle le sera avant votre arrivée.' };
  }

  const res = await callMews<{ Resources?: { Name?: string; State?: string }[] }>(
    'resources/getAll',
    { ResourceIds: [resa.AssignedResourceId], Extent: { Resources: true }, Limitation: { Count: 1 } },
  );
  const unite = (res.Resources ?? [])[0];
  const chambre = String(unite?.Name ?? '').trim();
  if (!chambre) return { pret: false, raison: 'La chambre n’est pas encore attribuée.' };

  /* 🔴 LE MÉNAGE DÉCIDE, PAS L'HORLOGE. Une chambre encore à faire à 15 h
   * n'est pas une chambre : envoyer quelqu'un dedans, c'est le faire entrer
   * dans les draps de la veille. */
  if (!PRETE.has(String(unite?.State ?? ''))) {
    return {
      pret: false,
      raison: 'La chambre est en cours de préparation. Elle sera prête d’ici peu — '
        + 'l’équipe est au rooftop du 4ᵉ étage si vous voulez patienter au frais.',
    };
  }

  return codesDArrivee({
    hotelId, chambre, reference,
    debut: String(resa.StartUtc ?? ''),
    /* La validité court jusqu'au départ à midi — l'heure du PMS, pas la nôtre. */
    fin: String(resa.EndUtc ?? ''),
  });
}

/* ═══════════════════════ UN HÔTEL SUR LESSCLIC ══════════════════════════════
 *
 * Depuis le 10/11/2026 les Voiles sont sur lessclic : la réservation, la chambre attribuée et son état de ménage se
 * lisent là-bas (par NWH, `sejourLessclic.ts`), plus chez Mews. Les QUATRE conditions restent les mêmes, dans le même
 * ordre : un séjour identifié (le jeton, vérifié en amont et par NWH), le bon jour, 15 h, une chambre attribuée ET
 * propre. Seule la source change. */

/** Les états de ménage de lessclic qui valent « la chambre est prête ». */
const PRETE_LESSCLIC = new Set(['propre', 'inspectee']);
/** L'heure de départ : la validité du code de la chambre court jusque-là. */
const HEURE_DEPART = 12;

export async function arriveeLessclic(
  { hotelId, sejour, reference }:
  {
    hotelId: string; reference: string;
    sejour: { etat: string; arrivee: string | null; depart: string | null; chambre: string | null; menage: string | null };
  },
): Promise<Arrivee> {
  if (sejour.etat === 'annulee') return { pret: false, raison: 'Cette réservation a été annulée.' };
  if (sejour.etat === 'no_show') {
    return { pret: false, raison: 'Cette réservation n’est plus active. Appelez l’hôtel : 04 94 41 36 23.' };
  }
  /* Une option n'est pas un séjour : elle peut tomber d'ici ce soir. */
  if (sejour.etat !== 'confirmee') {
    return { pret: false, raison: 'Cette réservation n’est pas encore confirmée. Appelez l’hôtel : 04 94 41 36 23.' };
  }

  /* 🔴 LA BORNE DE FIN, comme chez Mews : un client parti ne reçoit pas les codes de l'immeuble. */
  const jourDepart = sejour.depart ?? '';
  const aujourdHui = jourParis();
  if (jourDepart && (aujourdHui > jourDepart || (aujourdHui === jourDepart && heureParis() >= HEURE_DEPART))) {
    return { pret: false, raison: 'Ce séjour est terminé.' };
  }

  const jourArrivee = sejour.arrivee ?? '';
  if (!jourArrivee) return { pret: false, raison: 'Cette réservation n’a pas de date d’arrivée.' };
  if (aujourdHui < jourArrivee) {
    return {
      pret: false,
      raison: `Les codes sont délivrés le jour de l’arrivée, le ${jourArrivee}, à partir de ${HEURE_ARRIVEE} h.`,
      a_partir_de: instantParis(jourArrivee),
    };
  }
  if (aujourdHui === jourArrivee && heureParis() < HEURE_ARRIVEE) {
    return {
      pret: false,
      raison: `La chambre se libère à ${HEURE_ARRIVEE} h. Les bagages peuvent être déposés avant, à l’hôtel.`,
      a_partir_de: instantParis(jourArrivee),
    };
  }

  const chambre = String(sejour.chambre ?? '').trim();
  if (!chambre) {
    return { pret: false, raison: 'La chambre n’est pas encore attribuée. Elle le sera avant votre arrivée.' };
  }
  /* 🔴 LE MÉNAGE DÉCIDE, PAS L'HORLOGE. Un état inconnu (lessclic muet) n'est pas « propre ». */
  if (!PRETE_LESSCLIC.has(String(sejour.menage ?? ''))) {
    return {
      pret: false,
      raison: 'La chambre est en cours de préparation. Elle sera prête d’ici peu — '
        + 'l’équipe est au rooftop du 4ᵉ étage si vous voulez patienter au frais.',
    };
  }

  return codesDArrivee({
    hotelId, chambre, reference,
    debut: instantParis(jourArrivee),
    fin: instantParis(jourDepart || jourArrivee, HEURE_DEPART),
  });
}

/** La chambre est prête : les codes des portes communes et celui de la chambre.
 *
 *  ⚠️ TOUS LES HÔTELS N'ONT PAS DE PORTAIL, NI DE CODE À LA PORTE — le réglage dit lequel existe (migration 352).
 *  🔑 DEUX CODES FIXES (portail, porte d'entrée), PLUS UN PAR SÉJOUR pour la chambre, engendré par NWH sur la
 *  serrure connectée et le MÊME à chaque demande (c'est la `reference` qui le garantit). */
async function codesDArrivee(
  { hotelId, chambre, reference, debut, fin }:
  { hotelId: string; chambre: string; reference: string; debut: string; fin: string },
): Promise<Arrivee> {
  const [reglage, coffre] = await Promise.all([
    supabaseServer.from('codes_acces_reglage')
      .select('portail, porte').eq('hotel_id', hotelId).maybeSingle(),
    supabaseServer.from('codes_acces')
      .select('cible, code, note').eq('hotel_id', hotelId).eq('actif', true)
      .in('cible', ['portail', 'porte']),
  ]);
  const par = new Map((coffre.data ?? []).map((c) => [String(c.cible), c]));
  const portail = reglage.data?.portail ? par.get('portail') : undefined;
  const porte = reglage.data?.porte ? par.get('porte') : undefined;

  /* ⚠️ UN CODE ABSENT SE DIT, il ne s'invente pas : le client doit appeler
   * plutôt que de rester devant une porte muette.
   *
   * ⚠️ ET LE CODE DE LA CHAMBRE N'EST PAS ENCORE ICI. Il s'engendre par séjour
   * sur la serrure connectée (module Clefs) ; tant qu'il n'est pas branché, on
   * rend le numéro de chambre et les deux portes communes, et on le dit. */
  /* ⚠️ LE CODE DE LA CHAMBRE EST ENGENDRÉ SUR LES DATES DU SÉJOUR, et il est
   * le MÊME à chaque demande : un client le redemande le lendemain matin, et
   * celui qu'il a noté doit encore ouvrir. C'est la `reference` qui le garantit
   * côté NWH. */
  const codeChambre = await codeDeLaChambre({ hotelId, chambre, reference, debut, fin });

  return {
    pret: true,
    chambre,
    code_portail: portail ? String(portail.code) : null,
    note_portail: portail?.note ? String(portail.note) : null,
    code_porte_entree: porte ? String(porte.code) : null,
    note_porte_entree: porte?.note ? String(porte.note) : null,
    code_chambre: codeChambre,
    note_chambre: codeChambre
      ? 'Ce code n’ouvre que cette chambre, et seulement pendant votre séjour.'
      /* ⚠️ PAS DE CODE INVENTÉ. Un client devant une porte muette doit avoir un
         numéro à composer, pas des chiffres qui ne marchent pas. */
      : 'Le code de la chambre est à demander à l’hôtel : 04 94 41 36 23.',
  };
}
