// Client de la Booking Engine API de Mews (ex-« Distributor »).
//
// Cette API est CONÇUE pour être appelée depuis le navigateur : leur propre
// documentation précise qu'elle est « unsuitable for continuous polling by a
// single server » et protégée contre le scraping. Le travail serveur (imports,
// tableaux de bord) reste sur la Connector API, côté siteconsignes.
//
// Rien de secret ici : `CLIENT` et `CONFIGURATION_ID` sont publics, exactement
// comme le sont le widget Mews et l'URL app.mews.com/distributor/<id>.
//
// ⚠️ TROIS PIÈGES, tous payés au prix de l'essai :
//
//  1. `FullAmounts` est OBLIGATOIRE dans chaque requête. Sans lui, 400.
//  2. Un `Client` non enregistré chez Mews donne un 401 « Cannot perform
//     operation or session has expired » — message trompeur, ce n'est ni une
//     session ni un problème d'origine. Le nôtre a été enregistré le 13/08/2026
//     par Mews sur Production ET Demo.
//  3. Les montants sont des objets MULTI-DEVISES (une clé par monnaie, ~150
//     entrées). On lit `.EUR`, jamais `.Value`.

const BASE = 'https://api.mews.com/api/distributor/v1';

export const CLIENT = 'HTBM Booking Engine 1.0.0';
export const CONFIGURATION_ID = 'c8eb4251-a965-458e-932e-aaa900872f96';
export const HOTEL_ID = '0a876d46-7b1a-4164-aafa-aaa90086e8bf'; // Hôtel-Rooftop Les Voiles

export type Langue = 'fr' | 'en';
const CULTURE: Record<Langue, string> = { fr: 'fr-FR', en: 'en-GB' };

/** Mews renvoie TOUTES ses traductions d'un coup : on choisit ici, sans rappeler l'API. */
type Traduit = Record<string, string> | string | null | undefined;
export function t(valeur: Traduit, langue: Langue): string {
  if (!valeur) return '';
  if (typeof valeur === 'string') return valeur.trim();
  return (valeur[CULTURE[langue]] ?? valeur['en-GB'] ?? valeur['fr-FR'] ?? Object.values(valeur)[0] ?? '').trim();
}

/** Un montant Mews porte ~150 devises. Seul l'euro nous intéresse. */
type Montant = Record<string, number> | null | undefined;
export const eur = (m: Montant): number | null =>
  m && typeof m.EUR === 'number' ? m.EUR : null;

async function appel<T>(operation: string, corps: Record<string, unknown>, langue: Langue): Promise<T> {
  const res = await fetch(`${BASE}/${operation}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Client: CLIENT,
      FullAmounts: false,
      LanguageCode: CULTURE[langue],
      ...corps,
    }),
  });
  if (!res.ok) {
    const texte = await res.text();
    throw new Error(`Mews ${operation} → ${res.status} ${texte.slice(0, 160)}`);
  }
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------- disponibilité */

export type Tarif = {
  Id: string;
  RateGroupId: string;
  Name: Traduit;
  Description: Traduit;
  IsPrivate: boolean;
};

export type GroupeTarifaire = {
  Id: string;
  SettlementAction: 'CreatePreauthorization' | 'ChargeCreditCard' | string;
  SettlementTrigger: string;
  SettlementValue: number | null;
  SettlementFlatValue: number | null;
};

type Prix = { Total: Montant; AveragePerNight: Montant };
type Occupation = {
  AdultCount: number;
  ChildCount: number;
  Pricing: { RateId: string; Price: Prix }[];
};
type CategorieDisponible = {
  RoomCategoryId: string;
  AvailableRoomCount: number;
  RoomOccupancyAvailabilities: Occupation[];
};

type ReponseDisponibilite = {
  Rates: Tarif[];
  RateGroups: GroupeTarifaire[];
  RoomCategoryAvailabilities: CategorieDisponible[];
  ViolatedRestrictions?: unknown[];
};

/** Ce que l'écran affiche : une chambre, son stock, et un prix par tarif. */
/* Prepaye ou flexible ? La reponse est STRUCTURELLE, pas textuelle.
 *
 * Le groupe tarifaire dit si la carte est debitee (`ChargeCreditCard`) ou
 * seulement preautorisee (`CreatePreauthorization`). On ne retombe sur le
 * libelle que si le groupe manque — un libelle faux sur une condition
 * d'annulation se paierait au comptoir.
 *
 * Vit ici et non dans l'ecran : la note posee dans le PMS doit qualifier le
 * tarif avec exactement les memes yeux que la page qui l'a vendu. Deux copies
 * de cette regle, c'est un jour ou elles divergent — et ce jour-la, la
 * reception encaisse un client qui a deja paye. */
export const estPrepaye = (tarif: Tarif | undefined, groupes: GroupeTarifaire[]): boolean => {
  const groupe = groupes.find((g) => g.Id === tarif?.RateGroupId);
  if (groupe?.SettlementAction === 'ChargeCreditCard') return true;
  if (groupe?.SettlementAction === 'CreatePreauthorization') return false;
  return /non[\s-]*remboursable|non[\s-]*refundable|prépaiement|prepay/.test(
    `${String(tarif?.Name ?? '')} ${String(tarif?.Description ?? '')}`.toLowerCase(),
  );
};

/* Ce qui va arriver a la carte, lu chez Mews et jamais ecrit en dur.
 *
 * Le groupe tarifaire porte la regle complete :
 *   Flexible  → CreatePreauthorization, SettlementValue 0.01  → empreinte de 1 %
 *   NANR BB   → ChargeCreditCard,       SettlementValue 1.0   → debit de 100 %
 *
 * On CALCULE au lieu d'ecrire « 1 % ». Le jour ou l'hotel passera son empreinte
 * a 30 %, une phrase codee en dur continuerait d'annoncer 1 % pendant qu'on
 * preleve trente fois plus — et la demande de paiement envoyee a Mews porterait
 * le mauvais montant.
 *
 * Vit ici et non dans l'ecran : c'est le SERVEUR qui fixe le montant demande,
 * et l'ecran qui l'annonce. Deux copies de cette regle, c'est un jour ou elles
 * divergent. */
export type Reglement = { debite: boolean; montant: number; part: number | null };

export const reglementDe = (
  tarif: Tarif | undefined,
  groupes: GroupeTarifaire[],
  total: number,
): Reglement | null => {
  const g = groupes.find((x) => x.Id === tarif?.RateGroupId);
  if (!g) return null;
  const debite = g.SettlementAction === 'ChargeCreditCard';
  if (!debite && g.SettlementAction !== 'CreatePreauthorization') return null;
  const fixe = typeof g.SettlementFlatValue === 'number' ? g.SettlementFlatValue : null;
  const part = typeof g.SettlementValue === 'number' ? g.SettlementValue : null;
  if (fixe !== null) return { debite, montant: fixe, part: null };
  if (part === null) return null;
  // Mews arrondit au centime : une demande a 1.2345 € est refusee.
  return { debite, montant: Math.round(total * part * 100) / 100, part };
};

export type Offre = {
  categorieId: string;
  chambresRestantes: number;
  /** Nombre de personnes que couvre CE prix. Peut différer de la demande :
   *  Mews renvoie la chambre individuelle même sur une recherche à deux, avec
   *  son prix pour une personne. C'est ce qui nous permet de la proposer alors
   *  que les moteurs classiques la masquent. */
  pourPersonnes: number;
  prix: { tarifId: string; total: number; parNuit: number }[];
};

export type Disponibilite = {
  tarifs: Tarif[];
  groupes: GroupeTarifaire[];
  offres: Offre[];
};

/**
 * Interroge la disponibilité et les prix.
 * `arrivee` / `depart` sont des dates civiles 'YYYY-MM-DD'.
 */
export async function chercherDisponibilite(
  { arrivee, depart, adultes, langue }: { arrivee: string; depart: string; adultes: number; langue: Langue },
): Promise<Disponibilite> {
  const j = await appel<ReponseDisponibilite>('hotels/getAvailability', {
    HotelId: HOTEL_ID,
    ConfigurationId: CONFIGURATION_ID,
    StartUtc: `${arrivee}T00:00:00Z`,
    EndUtc: `${depart}T00:00:00Z`,
    AdultCount: adultes,
  }, langue);

  const offres: Offre[] = [];
  for (const cat of j.RoomCategoryAvailabilities ?? []) {
    // Mews propose parfois plusieurs occupations pour une même catégorie. On
    // retient celle qui colle le mieux à la demande, sans jeter les autres :
    // c'est exactement là que se cachait la chambre individuelle.
    for (const occ of cat.RoomOccupancyAvailabilities ?? []) {
      const prix = (occ.Pricing ?? [])
        .map((p) => ({
          tarifId: p.RateId,
          total: eur(p.Price?.Total) ?? 0,
          parNuit: eur(p.Price?.AveragePerNight) ?? 0,
        }))
        .filter((p) => p.total > 0);
      if (!prix.length) continue;
      offres.push({
        categorieId: cat.RoomCategoryId,
        chambresRestantes: cat.AvailableRoomCount,
        pourPersonnes: occ.AdultCount,
        prix,
      });
    }
  }

  return { tarifs: j.Rates ?? [], groupes: j.RateGroups ?? [], offres };
}

/** Combien de chambres sont libres sur TOUTE la période, toutes catégories
 *  confondues. Sert à la privatisation, qui les veut toutes.
 *
 *  ⚠️ POURQUOI PAS `chercherDisponibilite` : celle-ci jette les catégories sans
 *  prix (`if (!prix.length) continue`) — parfaitement légitime pour un tunnel
 *  qui vend des chambres, faux ici. Une catégorie sans tarif publié reste une
 *  catégorie occupable : l'ignorer ferait dire « les seize sont libres » alors
 *  qu'il y a du monde dedans.
 *
 *  ⚠️ MEWS NE REND QUE CE QUI RESTE. Une catégorie tombée à zéro DISPARAÎT de
 *  la réponse au lieu d'y figurer à 0 — d'où la capacité totale en constante
 *  (`CAPACITE`, dans `villa.ts`) et non déduite d'ici.
 *
 *  Les réservations optionnelles sont déjà décomptées par Mews : une chambre
 *  simplement tenue en option ferme la privatisation, sans rien à ajouter. */
export async function chambresLibres(
  { arrivee, depart }: { arrivee: string; depart: string },
): Promise<number> {
  const j = await appel<ReponseDisponibilite>('hotels/getAvailability', {
    HotelId: HOTEL_ID,
    ConfigurationId: CONFIGURATION_ID,
    StartUtc: `${arrivee}T00:00:00Z`,
    EndUtc: `${depart}T00:00:00Z`,
    // Une privatisation se demande pour la maison, pas pour un couple. On
    // interroge à une personne : c'est l'occupation la plus permissive, donc
    // celle qui ne masque aucune chambre.
    AdultCount: 1,
  }, 'fr');

  return (j.RoomCategoryAvailabilities ?? [])
    .reduce((n, cat) => n + (cat.AvailableRoomCount ?? 0), 0);
}

/* ------------------------------------------------------------- configuration */

type Categorie = {
  Id: string;
  Names?: Traduit;
  Name?: Traduit;
  Descriptions?: Traduit;
  Description?: Traduit;
  ImageIds?: string[];
  NormalBedCount?: number;
};
type ReponseConfig = { Services?: { Id: string; Names?: Traduit }[]; ImageBaseUrl?: string };

/** Ce que Mews sait d'une catégorie de chambre, et que l'écran peut montrer. */
export type CategorieChambre = {
  nom: string;
  /** Le nom tel que Mews le porte en francais. Sert a savoir si `nom` est une
   *  vraie traduction ou le repli francais — voir `NOM_ANGLAIS` cote ecran. */
  nomFr: string;
  images: string[];
  /** Combien de personnes y dorment — `NormalBedCount` de la configuration. */
  couchages: number | null;
  /** Surface en m², extraite de la description libre. Nulle si l'hôtel ne l'y a
   *  pas écrite : mieux vaut ne rien dire qu'annoncer une surface fausse. */
  surface: number | null;
};

/* La surface vit dans la description libre de la catégorie, pas dans un champ.
 * L'hôtel l'écrit à sa façon — « Chambre de 11m2 avec balcon », « Chambre
 * d'environ 14 m2 », « around 19m2 ». On la lit, on ne la recopie pas : le jour
 * où l'hôtel corrige une surface dans son back-office, l'écran suit. */
export const surfaceDe = (description: string): number | null => {
  const m = description.match(/(\d{1,3})\s*(?:m2|m²)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 5 && n <= 200 ? n : null;
};

/**
 * L'URL d'une photo hébergée par Mews, à la largeur demandée.
 *
 * Les photos vivent déjà dans Mews (3 à 5 par catégorie) : rien à copier dans
 * le dépôt, rien à redéployer, et ce que l'hôtel change dans son back-office
 * apparaît ici. Ce sont aussi les seules sans le bandeau « petit-déjeuner
 * inclus » que les OTA incrustent dans leurs exports.
 */
export const CDN_MEWS = 'https://cdn.mews.com/Media/Image';
export const urlPhoto = (imageId: string, largeur: number) =>
  `${CDN_MEWS}/${imageId}?w=${largeur}`;

/** Les noms et photos de catégories ne vivent pas dans la réponse de disponibilité. */
export async function chargerCategories(langue: Langue): Promise<Map<string, CategorieChambre>> {
  const j = await appel<ReponseConfig & Record<string, unknown>>('configuration/get', {
    Ids: [CONFIGURATION_ID],
    PrimaryId: CONFIGURATION_ID,
  }, langue);

  // La liste des catégories est imbriquée et son emplacement a bougé entre
  // versions : on la retrouve par sa forme plutôt que par un chemin figé.
  const trouver = (o: unknown, profondeur = 0): Categorie[] | null => {
    if (profondeur > 4 || !o || typeof o !== 'object') return null;
    for (const [cle, valeur] of Object.entries(o as Record<string, unknown>)) {
      if (/categor/i.test(cle) && Array.isArray(valeur) && valeur.length && 'Id' in valeur[0]) {
        return valeur as Categorie[];
      }
      const trouvee = trouver(valeur, profondeur + 1);
      if (trouvee) return trouvee;
    }
    return null;
  };

  const cats = trouver(j) ?? [];
  return new Map(cats.map((c) => [c.Id, {
    nom: t(c.Names ?? c.Name, langue),
    nomFr: t(c.Names ?? c.Name, 'fr'),
    images: c.ImageIds ?? [],
    couchages: typeof c.NormalBedCount === 'number' ? c.NormalBedCount : null,
    surface: surfaceDe(t(c.Descriptions ?? c.Description, langue)),
  }]));
}

/* ------------------------------------------------------------- prise de résa */

/* Écrire la réservation dans le PMS de l'hôtel.
 *
 * Contrat relevé dans la doc Mews le 25/08/2026 — ne pas re-deviner ces noms.
 * `Customer` exige Email, FirstName, LastName ; chaque réservation exige
 * RoomCategoryId, StartUtc, EndUtc, RateId, AdultCount, ChildCount.
 *
 * `CreditCardData.PaymentGatewayData` est le `transactionId` rendu par PciProxy
 * DANS LE NAVIGATEUR : la carte ne transite jamais par nous, c'est tout l'intérêt
 * de passer par la Booking Engine plutôt que par le Connector. Les trois champs
 * de l'objet sont requis dès qu'on le fournit. ⚠️ Le jeton vaut 30 minutes.
 *
 * Les règles d'encaissement (préautorisation ou débit) sont portées par les rate
 * groups et s'exécutent côté Mews : rien à décider ici.
 */
/* ─────────────────── La configuration de paiement PciProxy ───────────────────
 *
 * Remise en service le 27/08/2026, après avoir été retirée la veille au profit
 * de Mews Payments Checkout. Le checkout reste, mais pour le tarif PRÉPAYÉ
 * seulement : il ne sait pas conclure une préautorisation (voir `reglementDe`).
 * Le tarif FLEXIBLE reprend donc les champs sécurisés, et cette `PublicKey` est
 * l'identifiant marchand qu'ils attendent.
 */

export type ConfigPaiement = {
  publicKey: string;
  cartes: string[];
  surcharges: Record<string, number>;
};

type ReponseConfigPaiement = {
  PaymentGateway?: {
    PublicKey?: string | null;
    SupportedCreditCardTypes?: string[] | null;
  } | null;
  SurchargeConfiguration?: { SurchargeFees?: Record<string, number> | null } | null;
};

export async function chargerConfigPaiement(langue: Langue): Promise<ConfigPaiement> {
  const j = await appel<ReponseConfigPaiement>('hotels/getPaymentConfiguration', {
    HotelId: HOTEL_ID,
    ConfigurationId: CONFIGURATION_ID,
  }, langue);

  const publicKey = j.PaymentGateway?.PublicKey?.trim() ?? '';
  // Sans elle, les iframes ne montent pas : mieux vaut échouer ici, en amont du
  // tunnel, que d'ouvrir un écran de paiement où le champ carte reste vide.
  if (!publicKey) throw new Error('Mews getPaymentConfiguration → PublicKey absente');

  return {
    publicKey,
    cartes: j.PaymentGateway?.SupportedCreditCardTypes ?? [],
    surcharges: j.SurchargeConfiguration?.SurchargeFees ?? {},
  };
}

export type ClientResa = {
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
};

export type Carte = {
  /** `transactionId` PciProxy. */
  jeton: string;
  /** 'AAAA-MM'. */
  expiration: string;
  porteur: string;
};

export type LigneResa = {
  categorieId: string;
  tarifId: string;
  /** Dates civiles 'YYYY-MM-DD'. */
  arrivee: string;
  depart: string;
  adultes: number;
  /** Le mot du client à l'hôtel, et la table du rooftop s'il y en a une. */
  notes?: string;
};

export type ResaCreee = {
  /** Sert de clé à la page de gestion : `reservationGroups/get` le relit. */
  groupeId: string;
  numeros: string[];
  /** Les réservations elles-mêmes. La note de réception se pose sur CELLES-CI
   *  (`serviceOrderNotes` veut un `ServiceOrderId`), jamais sur le groupe. */
  reservationIds: string[];
  /** Le compte client créé par Mews. C'est lui que `paymentRequests/add`
   *  attend en `AccountId` — sans lui, pas de demande de paiement. */
  customerId: string;
  /** ⚠️ SANS LUI, AUCUNE PRÉAUTORISATION NE PARTIRA JAMAIS.
   *  Le `PaymentCardId` que Mews rend en attachant la carte. On le jetait, et
   *  ça a coûté deux journées : une carte tokenisée par PciProxy arrive chez
   *  Mews en `AuthorizationState: Authorizable`, pas `Authorized` — vérifié le
   *  27/08/2026 sur la carte réelle de la résa 29841. Sous la DSP2, Mews ne
   *  préautorise pas depuis une carte non authentifiée : la demande reste
   *  `Pending` puis expire, en silence. C'est cet identifiant qui ouvre l'étape
   *  de 3-D Secure. Voir `autoriserCarte()`. */
  carteId: string;
  /** ⚠️ MEWS FABRIQUE DÉJÀ LA DEMANDE DE PAIEMENT, ET ON L'IGNORAIT.
   *
   *  `reservationGroups/create` la crée tout seul, à partir de la règle
   *  d'encaissement du groupe tarifaire — donc du bon type et du bon montant,
   *  sans qu'on ait à les recalculer. On en fabriquait une SECONDE par le
   *  Connector : relevé le 27/08/2026 dans `paymentRequests/getAll`, chaque
   *  réservation du 26/08 en portait deux, créées à la même seconde
   *  (« Paiement de la réservation », la sienne, et « Garantie de votre
   *  réservation », la nôtre). On prend la sienne. */
  demandeId: string;
};

type ReponseCreate = {
  ReservationGroupId?: string;
  Id?: string;
  CustomerId?: string;
  PaymentRequestId?: string;
  PaymentCardId?: string;
  Reservations?: { Id?: string; Number?: string; ConfirmationNumber?: string }[];
};

/* ⚠️ `carte` EST DE NOUVEAU REMPLIE, mais pour le seul tarif FLEXIBLE.
 *
 * Les deux tarifs ne prennent plus le même chemin, et la raison est mesurée :
 *  · PRÉPAYÉ (`ChargeCreditCard` 100 %) — pas de carte ici. Mews Payments
 *    Checkout encaisse dans son iframe, avec 3-D Secure. Prouvé le 26/08/2026 :
 *    la seule demande de type `Payment` de la journée est passée `Completed`,
 *    débitée à 15:19:52 et remboursée à 15:21:03.
 *  · FLEXIBLE (`CreatePreauthorization` 1 %) — la carte revient ici, tokenisée
 *    par PciProxy. Le checkout ne sait PAS conclure une préautorisation : sur
 *    les 28 demandes de ce type créées le 26/08, zéro `Completed`. Sa
 *    documentation ne connaît d'ailleurs que trois événements de succès
 *    (`payment-charged`, `payment-submitted`, `payment-method-collected`) —
 *    aucun pour une préautorisation.
 *
 * Sur le flexible, c'est donc Mews qui préautorise lui-même à la confirmation
 * (`SettlementType: Automatic`, `SettlementTrigger: Confirmation`), depuis la
 * carte attachée ici. Il n'y a aucune demande de paiement dans ce chemin. */
export async function creerReservation(
  { client, lignes, carte, langue }:
  { client: ClientResa; lignes: LigneResa[]; carte?: Carte; langue: Langue },
): Promise<ResaCreee> {
  const j = await appel<ReponseCreate>('reservationGroups/create', {
    HotelId: HOTEL_ID,
    ConfigurationId: CONFIGURATION_ID,
    Customer: {
      Email: client.email.trim(),
      FirstName: client.prenom.trim(),
      LastName: client.nom.trim(),
      Telephone: client.telephone?.trim() || '',
      SendMarketingEmails: false,
    },
    Reservations: lignes.map((l) => ({
      RoomCategoryId: l.categorieId,
      RateId: l.tarifId,
      // Mews attend des instants UTC. L'hôtel est en Europe/Paris et raisonne en
      // nuits : minuit UTC est la convention de `hotels/getAvailability`, on la
      // garde pour que la recherche et l'écriture parlent des mêmes journées.
      StartUtc: `${l.arrivee}T00:00:00Z`,
      EndUtc: `${l.depart}T00:00:00Z`,
      AdultCount: l.adultes,
      ChildCount: 0,
      ...(l.notes ? { Notes: l.notes } : {}),
    })),
    ...(carte ? {
      CreditCardData: {
        PaymentGatewayData: carte.jeton,
        Expiration: carte.expiration,
        HolderName: carte.porteur,
      },
    } : {}),
  }, langue);

  /* Releve le 26/08/2026 sur une creation reelle (resa 29814) : la reponse ne
   * porte NI `ReservationGroupId` (c'est `Id`) NI `ConfirmationNumber` (c'est
   * `Number`). Les replis ci-dessous etaient justes — ils le sont maintenant
   * pour une raison connue, et non par prudence. */
  return {
    groupeId: j.ReservationGroupId ?? j.Id ?? '',
    numeros: (j.Reservations ?? [])
      .map((r) => r.ConfirmationNumber ?? r.Number ?? r.Id ?? '')
      .filter(Boolean),
    reservationIds: (j.Reservations ?? []).map((r) => r.Id ?? '').filter(Boolean),
    customerId: j.CustomerId ?? '',
    demandeId: j.PaymentRequestId ?? '',
    carteId: j.PaymentCardId ?? '',
  };
}

/* ───────────────── L'autorisation de la carte — le 3-D Secure ────────────────
 *
 * ⚠️ C'EST L'ÉTAPE QUI MANQUAIT, ET ELLE EXPLIQUE TOUT.
 *
 * PciProxy en mode tokenisation ne fait que tokeniser : la carte arrive chez
 * Mews utilisable mais NON AUTHENTIFIÉE. Relevé le 27/08/2026 sur la carte de
 * la résa 29841, une vraie Visa saisie par Martin :
 *
 *     { "AuthorizationState": "Authorizable" }      ← et pas "Authorized"
 *
 * Sous la DSP2, Mews ne déclenche pas sa préautorisation automatique depuis une
 * carte dans cet état. La demande de 1,23 € est restée `Pending` jusqu'à
 * expirer — exactement comme la 29816 la veille, qui avait pourtant sa carte.
 * On a longtemps cru à un bouton mort, puis à un checkout capricieux : c'était
 * une carte jamais authentifiée.
 *
 * Le remède est documenté (booking-engine-guide/use-cases/payment-card-
 * authorization) et tient en trois temps :
 *   1. `paymentCards/getAll` — l'état est-il `Authorizable` ?
 *   2. `paymentCards/authorize` — on tente, avec l'empreinte du navigateur ;
 *   3. si la réponse n'est pas finie (`Pending` / `Requested`), on envoie le
 *      client sur la page 3-D Secure hébergée par Mews, puis on le récupère.
 *
 * ⚠️ ET LA CONFIRMATION VIENT APRÈS, PAS AVANT. Confirmer d'abord, c'est
 * déclencher le règlement contre une carte non authentifiée — donc l'échec
 * silencieux qu'on vient de passer deux jours à chercher.
 *
 * ⚠️ `BrowserInfo` EST REQUIS, ET C'EST POUR ÇA QUE CET APPEL PART DU
 * NAVIGATEUR. Ce sont les données d'empreinte que réclame le 3-D Secure ; un
 * serveur ne peut pas les inventer sans mentir à la banque.
 */

/** Fini = plus rien à faire. Non fini = il faut passer par la page de Mews. */
export type EtatAutorisation = 'Authorized' | 'Authorizable' | 'Pending' | 'Requested' | 'Declined';

type ReponseCartes = { PaymentCards?: { Id: string; AuthorizationState?: EtatAutorisation }[] };

/** Relit l'état d'autorisation d'une carte. C'est la seule preuve qui vaille :
 *  le navigateur peut dire n'importe quoi, Mews non. */
export async function etatCarte(carteId: string, langue: Langue): Promise<EtatAutorisation | null> {
  const j = await appel<ReponseCartes>('paymentCards/getAll', {
    HotelId: HOTEL_ID,
    PaymentCardIds: [carteId],
  }, langue);
  return j.PaymentCards?.find((c) => c.Id === carteId)?.AuthorizationState ?? null;
}

/** L'empreinte que le 3-D Secure réclame. Sept champs, tous requis — Mews rend
 *  400 s'il en manque un. `JavaEnabled` vaut toujours `false` : leur doc le dit
 *  elle-même, ce n'est pas une approximation de notre part. */
export type InfosNavigateur = {
  ScreenWidth: number; ScreenHeight: number; ColorDepth: number;
  UserAgent: string; Language: string; JavaEnabled: boolean; TimeZoneOffset: number;
};

export function infosNavigateur(): InfosNavigateur {
  return {
    ScreenWidth: window.screen.width,
    ScreenHeight: window.screen.height,
    ColorDepth: window.screen.colorDepth,
    UserAgent: window.navigator.userAgent,
    Language: window.navigator.language,
    JavaEnabled: false,
    TimeZoneOffset: new Date().getTimezoneOffset(),
  };
}

type ReponseAutorisation = { Id?: string; PaymentCardId?: string; State?: EtatAutorisation };

/** Tente l'autorisation. Beaucoup de cartes passent « sans friction » et
 *  reviennent directement `Authorized` : le client ne voit alors RIEN, pas de
 *  redirection, pas d'écran de banque. C'est le cas qu'on espère. */
export async function autoriserCarte(
  { carteId, navigateur, langue }:
  { carteId: string; navigateur: InfosNavigateur; langue: Langue },
): Promise<EtatAutorisation | null> {
  const j = await appel<ReponseAutorisation>('paymentCards/authorize', {
    EnterpriseId: HOTEL_ID,
    PaymentCardId: carteId,
    BrowserInfo: navigateur,
  }, langue);
  return j.State ?? null;
}

/** La page 3-D Secure de Mews, quand l'autorisation demande la banque.
 *  ⚠️ `returnUrl` se transmet en Base64 — Mews rejette une URL nue. */
export function lien3DSecure(carteId: string, retour: string): string {
  return `https://app.mews.com/navigator/card-authorization/detail/${carteId}`
    + `?returnUrl=${encodeURIComponent(btoa(retour))}`;
}

/** Relit une réservation pour la page de gestion. La Booking Engine sait la
 *  MONTRER ; annuler, modifier ou annoter passent par le Connector (404 ici). */
export async function relireReservation(groupeId: string, langue: Langue): Promise<unknown> {
  return appel('reservationGroups/get', {
    HotelId: HOTEL_ID,
    ConfigurationId: CONFIGURATION_ID,
    ReservationGroupId: groupeId,
  }, langue);
}
