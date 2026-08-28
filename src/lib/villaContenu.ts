/* Le contenu éditorial de la Villa Les Voiles — textes, photos, arguments.
 *
 * ⚠️ CE FICHIER EST UNE ÉTAPE, PAS UNE DESTINATION.
 * Martin veut pouvoir éditer les prix, les photos et les textes depuis le
 * back-office (`siteconsignes`) — demandé le 28/08/2026. Tout est donc regroupé
 * ICI, dans un seul objet, plutôt que semé dans le JSX : le jour où ça vient de
 * la base, on remplace la constante par la lecture d'une ligne et pas une
 * balise ne bouge. Sa forme est déjà celle qu'aurait cette ligne.
 *
 * Les PRIX ne sont pas ici : ils vivent dans `villa.ts` avec la règle de
 * disponibilité, parce qu'ils sont calculés (chambres × prix par chambre) et
 * que le serveur s'en sert pour écrire le devis dans la demande. Un prix
 * recopié dans le contenu, c'est un jour où l'écran et la base annoncent deux
 * montants différents.
 *
 * Sources des textes : la plaquette `public/docs/villa-les-voiles.pdf` et
 * l'annonce leboncoin relue par Martin le 28/08/2026.
 */

export type LangueVilla = 'fr' | 'en';

export const CONTENU = {
  /* ⚠️ CES PHOTOS SONT CELLES DE L'ANNONCE AIRBNB, ET ELLES SEULES.
     Consigne de Martin, 28/08/2026. La page tirait avant sur le stock du site
     (`/images/voiles.jpg`, `/images/rooftop.jpg`, les chambres du tunnel) :
     des images justes pour l'hôtel vendu à la chambre, mais qui ne montraient
     pas ce qu'on vend ici — un lieu qu'on occupe en entier. Fournies en AVIF,
     converties en JPEG dans `public/images/villa/`.

     ⚠️ LE HÉROS EST RECADRÉ. L'original portait un bandeau publicitaire
     incrusté (« Votre hôtel privé vue mer · 16 chambres · 300m de la plage »)
     qui aurait doublé notre propre titre, en moins bien. Les 42 % du haut sont
     coupés : il reste la rade, propre. */
  photo: '/images/villa/00-vue-mer.jpg',

  /* ⚠️ LE TÉLÉPHONE A SA PROPRE PHOTO DE HÉROS, ET CE N'EST PAS UN CAPRICE.
     La vue mer est une bande : 1200 × 464 une fois le bandeau publicitaire
     retiré. Sur un écran vertical, `object-cover` la met à la largeur du
     téléphone — 464 px de haut deviennent 180 — puis l'agrandit quatre fois
     pour remplir la hauteur du héros. Résultat : un zoom violent dans une
     bande floue, ce que Martin a vu tout de suite (28/08/2026).
     Cette photo-ci est verticale (720 × 1080) : elle remplit un écran de
     téléphone sans qu'on l'étire d'un pixel. */
  photoMobile: '/images/villa/02-porte-fenetre-mer.jpg',

  /* Le coin photo, dans l'ordre où on vend le lieu : d'abord ce que c'est
     (la façade, la vue), puis ce qu'on y partage (le toit, le salon, la
     cuisine), puis où l'on dort. Personne ne loue seize chambres sur trois
     arguments et une seule image.
     ⚠️ En attendant que le back-office serve la vraie galerie — c'est un
     simple tableau pour que le jour venu, on remplace la constante sans
     toucher au carrousel. */
  galerie: [
    /* ⚠️ L'ORDRE COMPTE PLUS QUE LA LISTE. Sur téléphone on ne voit QUE la
       première vignette : c'était la façade, un mur crème vu d'en bas — la
       photo la moins désirable du lot, en tête d'une page qui vend un lieu.
       La rade ouvre maintenant la galerie, puis le rooftop au coucher du
       soleil ; la façade descend au rang d'information pratique.
       C'est aussi la photo que Martin cherchait ici : elle servait de fond au
       héros, mais elle ne figurait dans aucune vignette. */
    { src: '/images/villa/00-vue-mer.jpg', alt: { fr: 'La rade de Toulon depuis la maison', en: 'Toulon bay from the house' } },
    { src: '/images/villa/03-rooftop-soiree.jpg', alt: { fr: 'Une soirée sur le rooftop, au coucher du soleil', en: 'An evening on the rooftop at sunset' } },
    { src: '/images/villa/02-porte-fenetre-mer.jpg', alt: { fr: 'Une chambre ouverte sur les palmiers et la rade', en: 'A room opening onto palms and the bay' } },
    { src: '/images/villa/11-rade.jpg', alt: { fr: 'La Méditerranée depuis le toit', en: 'The Mediterranean from the roof' } },
    { src: '/images/villa/04-salon-commun.jpg', alt: { fr: 'Le salon et son ouverture sur le patio', en: 'The lounge opening onto the patio' } },
    { src: '/images/villa/05-cuisine.jpg', alt: { fr: 'La cuisine à disposition', en: 'The kitchen at your disposal' } },
    { src: '/images/villa/06-chambre-tarantella.jpg', alt: { fr: 'La chambre Tarantella', en: 'The Tarantella room' } },
    { src: '/images/villa/08-chambre-susanna.jpg', alt: { fr: 'La chambre Susanna II', en: 'The Susanna II room' } },
    { src: '/images/villa/09-chambre-emeraude.jpg', alt: { fr: 'La chambre Émeraude', en: 'The Émeraude room' } },
    { src: '/images/villa/07-chambre-mat.jpg', alt: { fr: 'La chambre Mât II', en: 'The Mât II room' } },
    { src: '/images/villa/10-salle-de-bain.jpg', alt: { fr: 'Une salle de bain, une par chambre', en: 'A bathroom — one per bedroom' } },
    { src: '/images/villa/01-facade.jpg', alt: { fr: 'La façade, rue Gubler', en: 'The front, rue Gubler' } },
  ],

  fr: {
    /* ⚠️ LE HÉROS NE DIT PAS « HÔTEL » (Martin, 28/08/2026).
       Ce qu'on vend ici n'est pas une chambre d'hôtel : c'est une maison
       qu'on occupe en entier. Le mot « hôtel » ramenait le visiteur à la
       réception, aux horaires, aux voisins de palier — exactement ce que la
       privatisation supprime. Il reste dans le titre de la page (`<title>`),
       parce que « louer un hôtel entier » est ce que les gens TAPENT dans
       Google : le mot travaille au référencement, pas à la vente. */
    surtitre: 'Toulon · Mourillon · Location exclusive',
    titre: 'Privatisez la villa entière, face à la Méditerranée',
    chapo:
      "Seize chambres, un rooftop vue mer, un patio ombragé, à 300 mètres des plages du " +
      "Mourillon. La maison entière pour vous — et personne d'autre dans les murs.",
    galerieTitre: 'La maison en images',

    /* Ce qui distingue vraiment l'offre. Trois arguments, pas dix : une liste
       longue se lit comme un cahier des charges, pas comme une invitation. */
    forces: [
      /* ⚠️ NE PAS OPPOSER L'HÔTEL À LA MAISON (correction de Martin, 28/08/2026).
         La première version disait « un hôtel, pas une maison » : elle vendait
         à l'envers. Ce que cherche un groupe qui privatise, c'est justement de
         se sentir chez lui — la chambre d'hôtel et sa salle de bain viennent
         EN PLUS, elles ne remplacent rien. */
      { titre: 'À la maison, comme à l’hôtel',
        texte: "Vous vivez le lieu comme une grande maison : le salon, le patio, le toit, les allées et venues à votre heure. Avec, en plus, ce qu'une maison n'a jamais — une salle de bain par chambre, la climatisation, l'ascenseur, et une équipe d'hôteliers derrière." },
      { titre: 'Le rooftop vue mer',
        texte: "L'espace le plus rare de Toulon, compris dans la privatisation — soirées, cérémonies, petits-déjeuners face à la Méditerranée." },
      { titre: 'Autonomie totale',
        texte: "Codes d'accès personnalisés, entrée libre à toute heure. Vous êtes chez vous, et l'équipe reste joignable si vous en avez besoin." },
    ],

    inclus: [
      'Linge de lit et de bain pour tous',
      'Rooftop, patio et salon communs',
      'Wifi fibre dans toute la maison',
      'Accès autonome par serrure électronique',
      'Deux places de parking privées',
      'Ménage quotidien des espaces communs',
    ],

    /* ⚠️ LE PETIT-DÉJEUNER N'EST PAS DANS LE TARIF (Martin, 28/08/2026).
       Il l'est sur les chambres vendues à l'unité, pas sur la privatisation —
       et l'annoncer inclus ferait une mauvaise surprise à l'arrivée, sur le
       repas le plus visible du séjour. Idem pour le ménage complet de fin de
       séjour : c'est une prestation, pas une évidence. */
    optionsTitre: 'À la carte',
    options: [
      'Petits-déjeuners maison',
      'Ménage complet de fin de séjour',
      'Ménage intermédiaire',
      'Traiteur, décoration, activités',
      'Conciergerie et partenaires bien-être',
    ],

    pour: [
      'Cousinades et retrouvailles familiales',
      'Séminaires et team-building',
      'Mariages intimes et anniversaires',
      'EVJF, EVG, groupes d’amis',
      'Tournages et équipes techniques',
      'Longs séjours professionnels',
    ],

    /* Ce qu'il vaut mieux dire avant qu'après. Une privatisation se prépare :
       le client qui découvre la caution à l'arrivée est un client fâché. */
    /* ⚠️ PLUS DE « D'OCTOBRE À MAI » : la disponibilité est lue dans Mews, donc
       l'été se ferme tout seul quand il est plein — et s'ouvre quand il ne
       l'est pas. Et la caution est POSSIBLE, pas systématique : elle se décide
       au devis, selon le séjour. */
    aSavoir: [
      'Deux nuits minimum.',
      'Toute l’année, selon les disponibilités de la maison.',
      'Une caution peut être demandée à l’arrivée, selon la durée et le séjour.',
      'Animaux acceptés. Non-fumeur à l’intérieur, fumeurs bienvenus au rooftop et au patio.',
      'Arrivée à partir de 16 h, départ avant 11 h.',
    ],

    services:
      "Nous sommes hôteliers : traiteur, décoration, activités, conciergerie — l'événement peut être organisé de bout en bout. Dites-nous ce que vous imaginez.",
  },

  en: {
    surtitre: 'Toulon · Mourillon · Exclusive rental',
    titre: 'Rent the whole villa, facing the Mediterranean',
    chapo:
      'Sixteen bedrooms, a sea-view rooftop, a shaded patio, 300 metres from the Mourillon ' +
      'beaches. The whole house is yours — and nobody else inside.',
    galerieTitre: 'The house in pictures',

    forces: [
      { titre: 'At home, with a hotel behind you',
        texte: "You live the place like a large house: the lounge, the patio, the roof, coming and going on your own schedule. Plus what a house never has — a bathroom in every room, air conditioning, a lift, and a team of hoteliers behind it." },
      { titre: 'The sea-view rooftop',
        texte: 'The rarest space in Toulon, included in the rental — evenings, ceremonies, breakfasts facing the Mediterranean.' },
      { titre: 'Complete independence',
        texte: 'Personal access codes, come and go at any hour. The place is yours, and the team stays reachable if you need it.' },
    ],

    inclus: [
      'Bed and bath linen for everyone',
      'Rooftop, patio and lounge',
      'Fibre wifi throughout the house',
      'Independent access by electronic lock',
      'Two private parking spaces',
      'Daily cleaning of shared spaces',
    ],

    optionsTitre: 'On request',
    options: [
      'Homemade breakfasts',
      'Full end-of-stay cleaning',
      'Mid-stay cleaning',
      'Catering, decoration, activities',
      'Concierge and wellness partners',
    ],

    pour: [
      'Family reunions',
      'Company offsites and team-building',
      'Intimate weddings and birthdays',
      'Hen and stag parties, groups of friends',
      'Film shoots and technical crews',
      'Long professional stays',
    ],

    aSavoir: [
      'Two-night minimum.',
      'All year round, subject to availability.',
      'A deposit may be requested on arrival, depending on the stay.',
      'Pets welcome. No smoking indoors; smoking is fine on the rooftop and patio.',
      'Check-in from 4pm, check-out before 11am.',
    ],

    services:
      'We are hoteliers: catering, decoration, activities, concierge — the whole event can be organised end to end. Tell us what you have in mind.',
  },
} as const;

/** Le contact commercial de la privatisation. Ce n'est PAS la réception : une
 *  demande de privatisation qui atterrit au standard se perd.
 *
 *  ⚠️ LE SITE AFFICHAIT UN FAUX NUMÉRO. `CONFIG.villa.phone` portait
 *  `07 59 91 63 54` — un chiffre de travers, en ligne depuis des mois sur la
 *  carte d'accueil. Le bon est celui de la plaquette, confirmé par Martin le
 *  28/08/2026 : `07 56 91 63 54`. Corrigé des deux côtés le même jour. */
export const CONTACT = {
  email: 'commercial2@htbm.fr',
  telephone: '07 56 91 63 54',
};

/** Qui reçoit l'alerte quand une demande arrive (Martin, 28/08/2026).
 *
 *  ⚠️ DEUX ADRESSES, ET LA SECONDE N'EST PAS UNE COPIE DE COURTOISIE. Le
 *  commercial vend la privatisation, mais c'est la réception des Voiles qui
 *  sait ce qui se passe dans l'hôtel cette semaine-là — et qui décroche quand
 *  le prospect rappelle avant qu'on l'ait rappelé. Une demande connue d'un
 *  seul des deux, c'est un client qui s'entend dire « je ne suis pas au
 *  courant ».
 *
 *  ⚠️ PLUS D'`ALERT_EMAIL` ICI. Cette variable d'environnement sert aux
 *  demandes séminaire et rooftop ; la faire recevoir aussi la privatisation
 *  aurait ajouté un destinataire invisible depuis le code. La liste se lit
 *  ici, en clair, et s'allonge ici. */
export const ALERTES = ['commercial2@htbm.fr', 'contact-lesvoiles@htbm.fr'];
