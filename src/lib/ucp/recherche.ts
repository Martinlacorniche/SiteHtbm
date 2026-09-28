// `search` ET `fetch` — les deux outils qu'OpenAI attend d'un connecteur.
//
// 🔑 POURQUOI CES DEUX NOMS-LÀ. Ce ne sont pas des outils de notre invention :
// ChatGPT reconnaît `search` et `fetch` comme le couple standard d'un
// connecteur de recherche — `search` rend des résultats courts avec un
// identifiant, `fetch` rend le texte complet de l'un d'eux. Un serveur qui les
// expose est utilisable là où un serveur d'outils métier ne l'est pas.
//
// L'Hôtel Sporthotel IDEAL, seul autre indépendant du registre MCP, les expose.
// C'est ce qui le rend compatible avec ChatGPT et pas seulement avec Claude.
//
// ⚠️ ON N'INDEXE PAS LE SITE, ON ÉCRIT CE QU'ON SAIT. Un crawl produirait des
// bouts de pages, des menus et des mentions légales ; ici chaque fiche répond à
// une vraie question de client. Ce qui bouge — prix, disponibilités — n'est pas
// là : c'est le rôle des autres outils, et une réponse figée sur un prix serait
// une réponse fausse.

import { ficheHotel } from '@/lib/ucp/hotel';
import { SITE_URL } from '@/lib/site';

export type Fiche = {
  id: string; titre: string; texte: string; url?: string;
  /* ⚠️ UN CLIENT NE PARLE PAS COMME UN HÔTELIER. La fiche dit « animaux », il
   * demande « chien ». Sans ces mots, la recherche répond à côté — vérifié le
   * 28/09 : « est-ce que je peux venir avec mon chien » ne trouvait pas la
   * fiche animaux. Ils ne sont pas rendus, ils servent à trouver. */
  motsCles?: string[];
};

/** Ce que la maison répond aux questions qu'on lui pose vraiment. */
function fiches(): Fiche[] {
  const h = ficheHotel();
  const compris = h.amenities.join(', ');

  return [
    {
      id: 'hotel',
      titre: 'L’Hôtel-Rooftop Les Voiles',
      url: `${SITE_URL}/hotel-plage-mourillon`,
      texte: `${h.description} ${h.star_rating} étoiles, ${h.address}. `
        + `${h.location.notes} Les plages sont à environ ${h.location.beach_distance_m} mètres. `
        + `Téléphone ${h.phone}, ${h.email}.`,
    },
    {
      id: 'arrivee-depart',
      titre: 'Arrivée, départ et réception',
      motsCles: ['heure', 'checkin', 'check-in', 'checkout', 'check-out', 'tard', 'tot',
        'bagage', 'valise', 'cle', 'code', 'porte', 'portail', 'reception', 'accueil'],
      texte: `Arrivée à partir de ${h.check_in.from}, en autonomie. ${h.check_in.notes} `
        + `Départ jusqu’à ${h.check_out.until} pour une réservation prise en direct `
        + `(11 h via une agence). ${h.reception.notes} `
        + 'Le code du portail, le numéro de chambre et le code de la porte sont délivrés '
        + 'le jour de l’arrivée à partir de 15 h, une fois la chambre faite.',
    },
    {
      id: 'compris',
      titre: 'Ce qui est compris dans le prix',
      motsCles: ['inclus', 'compris', 'petit-dejeuner', 'dejeuner', 'breakfast', 'wifi',
        'clim', 'climatisation', 'parking', 'stationnement', 'taxe', 'sejour', 'minibar'],
      texte: `Les prix sont tout compris : ${h.rates.all_inclusive} `
        + `Sont inclus : ${compris}. `
        + `Ne sont pas proposés : ${h.not_available.join(', ')}. `
        + `${h.rates.city_tax}`,
    },
    {
      id: 'chambres',
      titre: 'Les chambres',
      motsCles: ['chambre', 'lit', 'double', 'twin', 'famille', 'pmr', 'handicap',
        'accessible', 'surface', 'balcon', 'vue', 'mer'],
      url: `${SITE_URL}/reserver`,
      texte: `${h.rooms.total} chambres. ${h.rooms.notes} ${h.rooms.accessible} `
        + 'Le détail, les photos et le prix du jour s’obtiennent par create_booking_session.',
    },
    {
      id: 'rooftop',
      titre: 'Le rooftop',
      motsCles: ['bar', 'terrasse', 'table', 'boire', 'verre', 'diner', 'manger',
        'restaurant', 'cocktail', 'tapas', 'soir'],
      url: `${SITE_URL}/rooftop-les-voiles`,
      texte: `${h.rooftop.notes} Service ${h.rooftop.service}, dernière arrivée `
        + `${h.rooftop.last_arrival}. Réservation obligatoire, ${h.rooftop.max_party_size} `
        + 'personnes au maximum par table. Ouvert aussi aux personnes qui ne dorment pas à '
        + 'l’hôtel. Les soirs libres s’obtiennent par get_rooftop_availability.',
    },
    {
      id: 'conditions',
      titre: 'Conditions d’annulation et de paiement',
      motsCles: ['annuler', 'annulation', 'rembourser', 'remboursement', 'modifier',
        'changer', 'date', 'flexible', 'prepaye', 'paiement', 'carte', 'identite', 'police'],
      url: `${SITE_URL}/cgv`,
      texte: `${h.rates.agent_bookable} ${h.rates.also_sold} `
        + 'Une pièce d’identité est demandée à l’arrivée ; pour un client étranger, une fiche '
        + 'de police est obligatoire.',
    },
    {
      id: 'animaux',
      titre: 'Animaux',
      texte: 'Les animaux sont bienvenus, sans supplément.',
      motsCles: ['chien', 'chat', 'animal', 'compagnie', 'pet', 'dog', 'cat'],
    },
    {
      id: 'villa',
      titre: 'Privatiser l’hôtel entier',
      motsCles: ['villa', 'privatiser', 'privatisation', 'groupe', 'mariage', 'seminaire',
        'entier', 'evjf', 'evg', 'cousinade'],
      url: `${SITE_URL}/villa-les-voiles-toulon`,
      texte: 'L’hôtel se loue aussi en entier, personne d’autre dans les murs : 16 chambres '
        + 'pour 28 personnes, ou une demi-villa de 8 chambres. Deux nuits minimum, toute '
        + 'l’année selon les disponibilités. Rooftop, patio et salon communs. Devis sur demande.',
    },
  ];
}

const sansAccents = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export type Resultat = { id: string; title: string; text: string; url?: string };

/**
 * Cherche dans ce que la maison sait dire.
 *
 * ⚠️ UNE RECHERCHE QUI NE TROUVE RIEN DOIT RENDRE QUELQUE CHOSE D'UTILE. Un
 * tableau vide pousse un agent à inventer ou à renoncer ; on rend alors la
 * fiche de l'hôtel, qui répond à la moitié des questions.
 */
export function chercher(question: string, combien = 5): Resultat[] {
  /* ⚠️ DES MOTS, PAS DES BOUTS DE MOTS. Une recherche par sous-chaîne faisait
   * correspondre « mon » à « montez » : la question « je peux venir avec mon
   * chien » rendait la fiche des horaires d'arrivée plutôt que celle des
   * animaux. On compare donc des mots entiers, en tolérant le pluriel et les
   * formes courtes (« chambre » trouve « chambres »). */
  const decouper = (t: string) => new Set(sansAccents(t).split(/[^a-z0-9]+/).filter(Boolean));
  const correspond = (m: string, ensemble: Set<string>) => {
    if (ensemble.has(m)) return true;
    if (m.length < 5) return false;
    for (const x of ensemble) if (x.startsWith(m) || m.startsWith(x)) return true;
    return false;
  };

  const mots = [...decouper(question)].filter((m) => m.length > 2);
  const notes = fiches().map((f) => {
    const corps = decouper(f.texte);
    const titre = decouper(f.titre);
    const cles = decouper((f.motsCles ?? []).join(' '));
    let note = 0;
    for (const m of mots) {
      /* ⚠️ TROIS POIDS, ET LE PLUS FORT VA AUX MOTS-CLÉS. Ils sont écrits pour
       * capter l'intention d'un client — « chien » pour la fiche animaux — et
       * doivent donc l'emporter sur une occurrence de hasard dans le corps
       * d'une autre fiche. Sans ça, « je peux venir avec mon chien » rendait
       * les horaires d'arrivée avant les animaux. */
      if (correspond(m, cles)) note += 3;
      if (correspond(m, titre)) note += 2;
      if (correspond(m, corps)) note += 1;
    }
    return { f, note };
  }).filter((x) => x.note > 0).sort((a, b) => b.note - a.note);

  const gardees = (notes.length ? notes.map((x) => x.f) : fiches().slice(0, 1)).slice(0, combien);
  return gardees.map((f) => ({
    id: f.id,
    title: f.titre,
    /* Un extrait, pas le texte entier : `fetch` est là pour ça. */
    text: f.texte.length > 300 ? `${f.texte.slice(0, 300)}…` : f.texte,
    ...(f.url ? { url: f.url } : {}),
  }));
}

/** Le texte complet d'une fiche, par son identifiant. */
export function lire(id: string): Resultat | null {
  const f = fiches().find((x) => x.id === id);
  if (!f) return null;
  return { id: f.id, title: f.titre, text: f.texte, ...(f.url ? { url: f.url } : {}) };
}
