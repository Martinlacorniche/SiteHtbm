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

/** Les états de ménage qui valent « la chambre est prête ». */
const PRETE = new Set(['Clean', 'Inspected']);

export type Arrivee =
  | { pret: false; raison: string; a_partir_de?: string }
  | {
    pret: true; chambre: string; code_porte: string | null;
    code_portail: string | null; note_portail: string | null; note_porte: string | null;
  };

const jourParis = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const heureParis = () => Number(new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', hour: '2-digit', hour12: false,
}).format(new Date()));

/** Ce que le client peut savoir de son arrivée, maintenant. */
export async function arrivee(
  { hotelId, reservationId }: { hotelId: string; reservationId: string },
): Promise<Arrivee> {
  const r = await callMews<{
    Reservations?: { State?: string; StartUtc?: string; AssignedResourceId?: string | null }[];
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
  const [reglage, coffre] = await Promise.all([
    supabaseServer.from('codes_acces_reglage')
      .select('portail, porte').eq('hotel_id', hotelId).maybeSingle(),
    supabaseServer.from('codes_acces')
      .select('cible, code, note').eq('hotel_id', hotelId).eq('actif', true)
      .in('cible', ['portail', chambre]),
  ]);
  const aPortail = Boolean(reglage.data?.portail);
  const aCodePorte = Boolean(reglage.data?.porte);
  const par = new Map((coffre.data ?? []).map((c) => [String(c.cible), c]));
  const portail = aPortail ? par.get('portail') : undefined;
  const porte = aCodePorte ? par.get(chambre) : undefined;

  /* ⚠️ UNE CHAMBRE SANS CODE SE DIT, elle ne s'invente pas. Si le coffre est
   * vide pour cette porte, le client doit appeler plutôt que de rester devant
   * une serrure muette. */
  return {
    pret: true,
    chambre,
    code_portail: portail ? String(portail.code) : null,
    note_portail: portail?.note ? String(portail.note) : null,
    code_porte: porte ? String(porte.code) : null,
    note_porte: porte?.note ? String(porte.note) : null,
  };
}
