// Configuration centrale du site pour le SEO (URL de prod, hreflang, etc.)

export const SITE_URL = "https://hotels-toulon-mer.com";

// Grappes de pages équivalentes dans plusieurs langues.
// Sert à générer les balises hreflang (alternates) et le sitemap.
// Clé = code langue ISO ; valeur = chemin (sans domaine).
export type LangCluster = Partial<Record<"fr" | "en" | "es" | "it" | "de", string>>;

export const LANG_CLUSTERS: LangCluster[] = [
  {
    // Guide "où dormir" — disponible dans les 5 langues
    fr: "/ou-dormir-a-toulon",
    en: "/en/where-to-stay-in-toulon",
    es: "/es/donde-dormir-en-tolon",
    it: "/it/dove-dormire-a-tolone",
    de: "/de/wo-in-toulon-ubernachten",
  },
  {
    // Le tunnel de réservation directe des Voiles.
    fr: "/reserver",
    en: "/en/book",
  },
  {
    fr: "/hotel-bord-de-mer-toulon",
    en: "/en/seafront-hotel-toulon",
  },
  {
    fr: "/hotel-plage-mourillon",
    en: "/en/mourillon-beach-hotels",
  },
  {
    fr: "/hotel-seminaire-toulon",
    en: "/en/toulon-business-hotel",
  },
  {
    fr: "/villa-les-voiles-toulon",
    en: "/en/villa-les-voiles-toulon",
  },
];

// Retrouve la grappe (et donc les alternates hreflang) contenant un chemin donné.
// Renvoie un objet prêt à passer à `alternates.languages` dans les Metadata Next.
export function hreflangFor(path: string): Record<string, string> | undefined {
  const cluster = LANG_CLUSTERS.find((c) =>
    Object.values(c).includes(path)
  );
  if (!cluster) return undefined;
  const languages: Record<string, string> = {};
  for (const [lang, p] of Object.entries(cluster)) {
    if (p) languages[lang] = `${SITE_URL}${p}`;
  }
  // x-default pointe vers la version française (langue principale)
  if (cluster.fr) languages["x-default"] = `${SITE_URL}${cluster.fr}`;
  return languages;
}

// Helper pour fabriquer le bloc `alternates` d'une page (canonical + hreflang).
export function alternatesFor(path: string) {
  return {
    canonical: `${SITE_URL}${path}`,
    languages: hreflangFor(path),
  };
}

/* ─────────────────────────── Liens de réservation ───────────────────────────
 * Un seul endroit pour décider où part un bouton « Réserver ».
 *
 * Aujourd'hui les deux hôtels partent chez D-EDGE. Demain Les Voiles passera
 * sur notre propre moteur (Mews Booking Engine) pendant que La Corniche restera
 * chez D-EDGE en attendant l'ouverture de l'OpenAPI HotSoft : la bascule doit
 * donc pouvoir se faire hôtel par hôtel, sans toucher aux pages.
 *
 * D'où cette table plutôt qu'une constante : changer `moteur` d'un hôtel suffit.
 */

export type Hotel = "corniche" | "voiles";
export type Locale = "fr" | "en";

type Moteur =
  | { type: "dedge"; slug: string; code: string }
  | { type: "maison"; chemin: string };

const MOTEURS: Record<Hotel, Moteur> = {
  // Best Western Plus La Corniche — « Hotels Toulon Bord De Mer » chez D-EDGE.
  corniche: { type: "dedge", slug: "Hotels-Toulon-Bord-De-Mer", code: "JJ8R" },
  voiles: { type: "dedge", slug: "Hotel-Les-Voiles", code: "JJ8J" },
};

// D-EDGE veut une locale complète (`fr-FR`), pas un code à deux lettres.
const LOCALE_DEDGE: Record<Locale, string> = { fr: "fr-FR", en: "en-US" };

/**
 * L'URL vers laquelle envoyer un bouton « Réserver ».
 *
 * Retourne une URL absolue tant qu'on est chez D-EDGE, un chemin relatif une
 * fois le moteur maison en place — les deux se passent tels quels à `href`.
 */
export function lienReservation(hotel: Hotel, locale: Locale = "fr"): string {
  const moteur = MOTEURS[hotel];
  if (moteur.type === "maison") {
    return locale === "fr" ? moteur.chemin : `/${locale}${moteur.chemin}`;
  }
  return `https://www.secure-hotel-booking.com/d-edge/${moteur.slug}/${moteur.code}/${LOCALE_DEDGE[locale]}`;
}

/** Vrai quand l'hôtel est passé sur notre moteur : le lien reste alors interne. */
export function reservationInterne(hotel: Hotel): boolean {
  return MOTEURS[hotel].type === "maison";
}

/* ─────────────────────────────── Coordonnees ────────────────────────────────
 * Nom, adresse et telephone des deux etablissements, au meme endroit que les
 * liens de reservation. Le pied de page les affiche sur tout le site : c'est
 * ce que Google recoupe (coherence NAP) et ce qu'un client cherche en premier.
 */
export const ETABLISSEMENTS = [
  {
    hotel: "corniche" as Hotel,
    nom: "Best Western Plus La Corniche",
    etoiles: 4,
    adresse: "17 Littoral Frédéric Mistral, 83000 Toulon",
    telephone: "04 94 41 35 12",
    email: "contact-corniche@htbm.fr",
    page: "/hotel-bord-de-mer-toulon",
  },
  {
    hotel: "voiles" as Hotel,
    nom: "Hôtel-Rooftop Les Voiles",
    etoiles: 3,
    adresse: "124 rue Gubler, 83000 Toulon",
    telephone: "04 94 41 36 23",
    email: "contact-lesvoiles@htbm.fr",
    page: "/hotel-plage-mourillon",
  },
];

/** Les comptes existaient dans le code depuis le debut sans jamais etre rendus. */
export const RESEAUX = {
  instagram: "https://www.instagram.com/hotels_toulon_mer/",
  facebook: "https://www.facebook.com/hotelstbm",
};

/* ─────────────────────────────── Privileges ─────────────────────────────────
 * Ce que la reservation en direct donne de plus, hotel par hotel. Affiche en
 * haut du tunnel : un avantage ne vaut que par ce a quoi il se compare.
 *
 * PARAMETRE PAR HOTEL, volontairement. Ecrit en dur, « depart 12 h offert »
 * deviendrait faux le jour ou La Corniche ouvre son propre tunnel — elle
 * facture aujourd'hui le depart tardif.
 *
 * Regle : on n'ecrit ici que ce qui est vrai et verifiable. « Petit-dejeuner
 * inclus » l'est (les deux tarifs Mews des Voiles le portent), « meilleur prix
 * garanti » ne l'est pas tant que la parite n'est pas arbitree.
 */
/* Un privilège porte son texte et, éventuellement, le fait qu'on ne l'obtienne
 * QUE par le tunnel direct — c'est cette exclusivité qui se vend, pas la liste.
 * « En direct, sans intermédiaire » n'y figure plus : ce n'est pas un avantage
 * pour le client, c'est notre intérêt à nous. Il reste dit, une fois, au-dessus
 * du bouton de paiement. */
export type Privilege = { texte: string; exclusif?: boolean };

export const PRIVILEGES: Record<Hotel, Record<Locale, Privilege[]>> = {
  voiles: {
    fr: [
      // ⚠️ Le −10 % n'est vrai que lorsque les deux tarifs dérivés sont actifs
      // dans Mews sur la configuration du moteur direct. Tant qu'ils ne le sont
      // pas, cette ligne promet une remise que la page n'applique pas :
      // retirer l'entrée, ou créer les tarifs. Voir [[project_mews_prise_resa]].
      { texte: "−10 % sur le tarif public", exclusif: true },
      { texte: "Départ 12 h offert", exclusif: true },
      { texte: "Petit-déjeuner inclus" },
    ],
    en: [
      { texte: "10% off the public rate", exclusif: true },
      { texte: "Noon check-out, on us", exclusif: true },
      { texte: "Breakfast included" },
    ],
  },
  // La Corniche reste chez D-EDGE : pas de tunnel maison, donc pas de bandeau.
  corniche: { fr: [], en: [] },
};

/* ─────────────────────────────── Le récit de l'hôtel ────────────────────────
 * Un tunnel qui ne montre que des prix vend une nuit ; il ne donne pas envie de
 * celle-ci plutôt que d'une autre. Trois phrases, pas trois paragraphes, et
 * chacune tient un fait déjà écrit ailleurs sur le site : le quartier calme des
 * hauteurs du Mourillon, le rooftop du 4ᵉ (le seul de Toulon ouvert sur la
 * rade), les plages en bas de la colline. Rien d'inventé, rien de vantard.
 *
 * ── `arrivee` : la contrainte dite avant qu'elle ne se découvre ─────────────
 * Le comptoir est tenu de 6 h 30 à 13 h 30 et de 14 h 30 à 22 h, et l'après-midi
 * l'équipe est au rooftop : un client qui arrive à 15 h trouve un hall vide et
 * ne sait pas quoi en penser. Une contrainte d'effectif découverte sur place se
 * paie en avis ; annoncée d'avance, et rattachée à ce qu'elle permet vraiment
 * (entrer à l'heure qu'on veut, être accueilli face à la rade plutôt qu'à un
 * comptoir), elle cesse d'être un manque.
 *
 * ⚠️ « Montez au rooftop » engage l'hôtel : à confirmer par Martin avant mise
 * en ligne — c'est la seule ligne d'ici qui décrive un geste d'accueil plutôt
 * qu'un fait vérifiable.
 */
export type Recit = {
  titre: string; photo: string; alt: string; lignes: string[];
  /** Comment on arrive. Voir le commentaire de `RECIT` : c'est la contrainte
   *  d'effectif de l'hôtel, dite avant qu'elle ne se découvre sur place. */
  arrivee: { titre: string; lignes: string[] };
  /** Ce que le séjour comprend, au dos de la carte. `absent` marque ce que
   *  l'hôtel n'a PAS : le dire ici vaut mieux que le laisser découvrir.
   *
   *  Neuf lignes, pas onze : la face de la carte ne défile pas, et trois entrées
   *  faisaient doublon — le rooftop est dans le récit, la chambre PMR dans la
   *  description de la Confort, et « non-fumeur » est la loi depuis 2007. */
  compris: { titre: string; items: { texte: string; absent?: boolean }[] };
  /** Les communs, en galerie. `src` accepte une image du dépôt (`/images/…`)
   *  comme une image hébergée par Mews : ajouter une photo = ajouter une ligne. */
  communs: { src: string; alt: string }[];
};

export const RECIT: Record<Hotel, Record<Locale, Recit | null>> = {
  voiles: {
    fr: {
      titre: "L'hôtel",
      photo: "/images/rooftop.jpg",
      alt: "Le rooftop des Voiles, au 4ᵉ étage, face à la rade de Toulon",
      lignes: [
        "Une maison de trois étoiles sur les hauteurs du Mourillon, dans une rue où l'on dort vraiment : au 4ᵉ, le seul rooftop de Toulon ouvert sur la rade ; en bas de la colline, les plages.",
      ],
      arrivee: {
        titre: "Votre arrivée",
        lignes: [
          "Arrivée autonome à partir de 15\u202Fh, à l'heure qui vous arrange : personne à attendre, aucun horaire à tenir.",
          "L'après-midi, l'équipe est au rooftop du 4ᵉ. Si le comptoir est vide, montez — on vous accueille face à la rade.",
        ],
      },
      compris: {
        titre: "Ce qui est compris",
        items: [
          { texte: "Petit-déjeuner inclus" },
          { texte: "Wi-Fi gratuit" },
          { texte: "Climatisation" },
          { texte: "TV écran plat" },
          { texte: "Salle de bain privative" },
          { texte: "Cuisine en libre-service" },
          { texte: "Thé & café à volonté dans les communs" },
          { texte: "Stationnement facile" },
          { texte: "Pas de minibar", absent: true },
        ],
      },
      communs: [
        { src: "/images/rooftop.jpg", alt: "Le rooftop du 4ᵉ étage au coucher du soleil, guirlandes et vue sur la rade" },
        { src: "/images/popuproof.jpg", alt: "Un cocktail sur la table du rooftop, la rade de Toulon en arrière-plan" },
        // Hébergée par Mews (`Enterprise.IntroImageId`) : la façade et l'oriflamme.
        { src: "https://cdn.mews.com/Media/Image/771bbef8-83fd-43ea-843d-ae4c00779428?w=1400", alt: "La façade de l'hôtel, rue Gubler, et l'oriflamme Les Voiles" },
      ],
    },
    en: {
      titre: "The hotel",
      photo: "/images/rooftop.jpg",
      alt: "The rooftop at Les Voiles, fourth floor, facing the bay of Toulon",
      lignes: [
        "A three-star house up on the Mourillon heights, in a street where you actually sleep: on the fourth floor, the only rooftop in Toulon open onto the bay; down the hill, the beaches.",
      ],
      arrivee: {
        titre: "Your arrival",
        lignes: [
          "Self check-in from 3 pm, whenever suits you: nobody to queue for, no schedule to keep.",
          "In the afternoon the team is up at the fourth-floor rooftop. If the desk is empty, come up — we welcome you facing the bay.",
        ],
      },
      compris: {
        titre: "What's included",
        items: [
          { texte: "Breakfast included" },
          { texte: "Free Wi-Fi" },
          { texte: "Air conditioning" },
          { texte: "Flat-screen TV" },
          { texte: "Private bathroom" },
          { texte: "Self-service kitchen" },
          { texte: "Free tea & coffee in the common areas" },
          { texte: "Easy street parking" },
          { texte: "No minibar", absent: true },
        ],
      },
      communs: [
        { src: "/images/rooftop.jpg", alt: "The fourth-floor rooftop at sunset, string lights and a view over the bay" },
        { src: "/images/popuproof.jpg", alt: "A cocktail on the rooftop table, the bay of Toulon behind" },
        { src: "https://cdn.mews.com/Media/Image/771bbef8-83fd-43ea-843d-ae4c00779428?w=1400", alt: "The hotel front on rue Gubler, with the Les Voiles banner" },
      ],
    },
  },
  corniche: { fr: null, en: null },
};
