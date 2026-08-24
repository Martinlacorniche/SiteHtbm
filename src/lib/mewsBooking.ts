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
export const HOTEL_ID = '0a876d46-7b1a-4164-aafa-aaa90086e8bf'; // Hôtel Les Voiles

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

/* ------------------------------------------------------------- configuration */

type Categorie = { Id: string; Names?: Traduit; Name?: Traduit; ImageIds?: string[] };
type ReponseConfig = { Services?: { Id: string; Names?: Traduit }[]; ImageBaseUrl?: string };

/** Nom et photos d'une catégorie de chambre. */
export type CategorieChambre = { nom: string; images: string[] };

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
    images: c.ImageIds ?? [],
  }]));
}
