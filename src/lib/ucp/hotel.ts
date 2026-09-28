// LA FICHE DE L'HÔTEL, POUR UNE MACHINE.
//
// 🔑 POURQUOI ELLE N'EXISTAIT PAS. Martin, 28/09/2026 : « comment l'agent va
// décrire l'hôtel aux clients, les chambres, l'installation les horaires les
// services… ». Un agent savait réserver chez nous depuis le protocole, mais ne
// recevait qu'un nom et une adresse : il pouvait vendre une nuit sans pouvoir
// dire un mot de la maison. Or un client qui compare trois hôtels ne choisit
// pas celui dont l'agent n'a rien à raconter.
//
// ⚠️ ET UCP NE SAIT PAS PORTER TOUT ÇA. La capacité `lodging` décrit une
// propriété par son nom, son adresse et ses photos, une chambre par son titre,
// sa description et sa capacité, et les règles par `policies[]`. Elle n'a rien
// pour les horaires du rooftop, la climatisation ou le petit-déjeuner. D'où un
// outil à nous, sur le même transport — comme `htbm.rooftop`.
//
// 🔑 ON LIT, ON NE RECOPIE PAS. Chaque valeur ci-dessous vient de l'endroit où
// elle est DÉJÀ écrite pour les humains : `RECIT.voiles` (ce que le tunnel
// affiche), `ETABLISSEMENTS` (l'identité), les créneaux du rooftop. Une fiche
// recopiée aurait divergé au premier changement — et des machines auraient
// répété pendant des mois un horaire qui n'a plus cours.

import { ETABLISSEMENTS, RECIT, SITE_URL } from '@/lib/site';
import { COUVERTS_MAX, creneauxDe } from '@/lib/ucp/rooftop';

const VOILES = ETABLISSEMENTS.find((e) => e.hotel === 'voiles')!;

/** La fiche, telle qu'un agent la reçoit. */
export function ficheHotel() {
  const recit = RECIT.voiles.fr!;

  return {
    name: VOILES.nom,
    star_rating: VOILES.etoiles,
    address: VOILES.adresse,
    phone: '+33 4 94 41 36 23',
    email: VOILES.email,
    url: `${SITE_URL}${VOILES.page}`,
    booking_url: `${SITE_URL}/reserver`,

    /* La phrase que l'hôtel emploie lui-même. Un agent qui la reprend dit ce
       que dit la maison, pas une paraphrase approximative. */
    description: recit.lignes.join(' '),

    location: {
      /* Vérifiées auprès du géocodeur de l'État (api-adresse.data.gouv.fr) le
       * 28/09/2026 : « 124 Rue Gubler 83000 Toulon », score 0,97. Le site en
       * publiait deux jeux distants de 460 m ; c'est un agent qui guide un
       * client jusqu'à la porte, autant que ce soit la bonne. */
      latitude: 43.109081,
      longitude: 5.951233,
      neighbourhood: 'Le Mourillon, Toulon',
      beach_distance_m: 300,
      notes: 'Sur les hauteurs du Mourillon, dans un quartier résidentiel très calme. '
        + 'Les plages sont en bas de la colline.',
    },

    /* ⚠️ LE DÉPART EST DONNÉ SELON LES CGV, qui sont le document opposable
     * (art. 9 : « arrivée dès 15 h, départ au plus tard 12 h »). Le portail
     * client, lui, annonce 11 h — la contradiction est signalée à l'hôtel et
     * se tranchera là-bas, pas ici. */
    check_in: { from: '15:00', self_service: true,
      notes: recit.arrivee?.lignes.join(' ') ?? '' },
    check_out: { until: '12:00', notes: 'Départ 12 h, sur toute réservation prise en direct.' },

    reception: {
      around_the_clock: false,
      notes: 'Pas de réception 24 h/24 — c’est un choix assumé, qui tient le prix. '
        + 'L’arrivée est autonome, et l’après-midi l’équipe est au rooftop du 4ᵉ étage.',
    },

    /* La liste que l'hôtel tient lui-même, y compris ce qu'il n'a PAS : un
       « pas de minibar » annoncé évite une déception, et c'est la maison qui a
       choisi de le dire. */
    amenities: recit.compris?.items.filter((i) => !i.absent).map((i) => i.texte) ?? [],
    not_available: recit.compris?.items.filter((i) => i.absent).map((i) => i.texte) ?? [],

    breakfast: { included: true, notes: 'Petit-déjeuner buffet, inclus dans les deux tarifs.' },

    rooftop: {
      name: 'Le rooftop des Voiles',
      notes: 'Au 4ᵉ étage, le seul rooftop de Toulon ouvert sur la rade. '
        + 'Bar à cocktails, tapas, desserts glacés.',
      service: '17:00 – 22:00, tous les soirs',
      last_arrival: '21:30',
      booking_required: true,
      max_party_size: COUVERTS_MAX,
      times_today: creneauxDe(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())),
      tool: 'create_rooftop_reservation',
    },

    rooms: {
      total: 16,
      notes: 'Trois catégories : Individuelle, Confort, Supérieure (vue sur la rade). '
        + 'Le détail, les photos et le prix du jour s’obtiennent par `create_booking_session`.',
      accessible: 'Une chambre Confort est accessible PMR, selon disponibilité.',
    },

    rates: {
      /* ⚠️ CE QU'UN AGENT PEUT ACHETER, ET CE QU'IL NE PEUT PAS. Le flexible
       * existe et se vend — mais pas par agent, faute de pouvoir en garantir
       * le paiement. Le taire ferait croire qu'il n'existe pas. */
      agent_bookable: 'Tarif prépayé uniquement : réglé en totalité à la réservation, non remboursable.',
      also_sold: 'Un tarif flexible existe, annulable sans frais jusqu’au jour d’arrivée à 18 h '
        + '(heure de Paris). Il ne se réserve pas par agent : réservez-le sur le site.',
      city_tax: 'Taxe de séjour 1,86 € par adulte et par nuit, déjà comprise dans les prix annoncés.',
      all_inclusive: 'Les prix sont tout compris, petit-déjeuner et taxe de séjour inclus.',
    },

    languages: {
      website: ['fr', 'en', 'es', 'it', 'de'],
      /* ⚠️ On ne dit RIEN des langues parlées à la réception : le site est
       * traduit en cinq langues, ce qui n'est pas la même chose, et un agent
       * qui lirait l'un pour l'autre promettrait un accueil en allemand. */
    },

    links: {
      terms: `${SITE_URL}/cgv`,
      legal: `${SITE_URL}/mentions`,
      rooftop: `${SITE_URL}/rooftop-les-voiles`,
      whole_property: `${SITE_URL}/villa-les-voiles-toulon`,
    },
  };
}
