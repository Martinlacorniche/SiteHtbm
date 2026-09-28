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
      a_partir_de: `${jourArrivee}T${String(HEURE_ARRIVEE).padStart(2, '0')}:00:00+02:00`,
    };
  }

  if (aujourdHui === jourArrivee && heureParis() < HEURE_ARRIVEE) {
    return {
      pret: false,
      raison: `La chambre se libère à ${HEURE_ARRIVEE} h. Les bagages peuvent être déposés avant, à l’hôtel.`,
      a_partir_de: `${jourArrivee}T${String(HEURE_ARRIVEE).padStart(2, '0')}:00:00+02:00`,
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

  /* ⚠️ TOUS LES HÔTELS N'ONT PAS DE PORTAIL, NI DE CODE À LA PORTE. Le réglage
   * dit lequel des deux existe ici (migration 352). Annoncer « votre code de
   * porte » à un hôtel qui remet des cartes au comptoir enverrait le client
   * chercher un clavier qui n'existe pas. */
  /* 🔑 DEUX CODES FIXES, PAS UN PAR CHAMBRE. Les dix-huit chambres des Voiles
   * ont une serrure connectée : leur code est engendré POUR CE SÉJOUR par le
   * module Clefs, il n'est pas écrit d'avance. Ce qui se saisit une fois pour
   * toutes, ce sont les deux portes communes — le portail de la rue, puis la
   * porte d'entrée.
   *
   * ⚠️ ET TOUS LES HÔTELS N'ONT NI L'UN NI L'AUTRE (migration 352). Annoncer
   * un code à qui remet des cartes au comptoir enverrait le client chercher un
   * clavier qui n'existe pas. */
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
  const codeChambre = await codeDeLaChambre({
    hotelId, chambre, reference,
    debut: String(resa.StartUtc ?? ''),
    /* La validité court jusqu'au départ à midi — l'heure du PMS, pas la nôtre. */
    fin: String(resa.EndUtc ?? ''),
  });

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
