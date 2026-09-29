// CE QUE LE MOTEUR DE RÉSERVATION DIT AUX MACHINES.
//
// 🔑 POURQUOI CE FICHIER EXISTE. Le site parle déjà bien aux agents : le
// `robots.txt` autorise explicitement GPTBot, ClaudeBot, PerplexityBot et les
// autres, le `llms.txt` décrit les deux maisons, et les pages d'accueil, du
// rooftop et de la villa portent du schema.org. Mais `/reserver` — LA PAGE QUI
// VEND LES NUITS — n'avait aucun balisage. Vérifié en ligne le 28/09/2026 :
// zéro bloc `ld+json`.
//
// Un agent pouvait donc citer l'hôtel (« boutique-hôtel 3★ au Mourillon, à 300 m
// des plages ») sans jamais savoir COMBIEN COÛTE UNE NUIT. C'est tout l'écart
// entre être connu et être comparé : dans une réponse qui aligne trois hôtels
// avec leurs prix, celui qui n'en a pas ne figure pas.
//
// ⚠️ ET LE PRIX EST MESURÉ, PAS ÉCRIT À LA MAIN. Un « à partir de » saisi une
// fois devient faux à la première saison et ment ensuite pendant des mois — à
// des machines qui le recopient. On interroge donc le vrai moteur (l'API
// Distributor de Mews, la même que le tunnel de réservation) sur les semaines à
// venir, et on publie le minimum RÉELLEMENT proposé. Sans réponse, on ne publie
// pas de prix du tout : une offre absente vaut mieux qu'une offre fausse.

import { chercherDisponibilite } from './mewsBooking';
import { supabaseServer } from './supabase-server';
import { SITE_URL } from './site';

/* L'hôtel dont cette page vend les nuits, côté base NWH. */
const HOTEL_NWH = 'ded6e6fb-ff3c-4fa8-ad07-403ee316be53';
/* Une photo de plus d'une journée franche ne vaut rien : on repasse par le
   moteur plutôt que de publier un prix dont on ne sait plus s'il est vrai. */
const MIROIR_AGE_MAX_MS = 26 * 60 * 60 * 1000;

/**
 * Le plus bas prix vendable, lu dans le MIROIR — ou `null` s'il est muet.
 *
 * 🔑 POURQUOI CE DÉTOUR. Les deux sondages ci-dessous coûtent deux appels au
 * Distributor Mews à CHAQUE régénération de page (médiane mesurée : 356 ms
 * l'appel), et ils ne regardent que deux dates sur soixante : le vrai minimum
 * de la fenêtre leur échappe. Le miroir (`prix_miroir`, peint chaque jour
 * depuis le Connector) répond en ~64 ms sur 120 nuits, et il rend le minimum
 * RÉEL — vérifié le 29/09/2026 : écart 0,00 € contre le moteur sur dix-sept
 * comparaisons.
 *
 * ⛔ « Vendable » exige les trois : un prix, de la disponibilité, pas de
 * fermeture. Un prix sans chambre derrière est une offre fausse.
 */
async function prixDuMiroir(jours: number): Promise<number | null> {
  try {
    const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await supabaseServer
      .from('prix_miroir')
      .select('prix_ttc, prix_prepaye, releve_le')
      .eq('hotel_id', HOTEL_NWH)
      .gte('date', jour(0)).lte('date', jour(jours))
      .eq('ferme', false).gt('dispo', 0).not('prix_ttc', 'is', null)
      .order('prix_ttc', { ascending: true }).limit(1);
    if (error || !data?.length) return null;
    const releve = new Date(String(data[0].releve_le)).getTime();
    /* Une date illisible n'est pas une date fraîche : `NaN < limite` vaut
       false, et le prix serait passé pour neuf. */
    if (!Number.isFinite(releve) || releve < Date.now() - MIROIR_AGE_MAX_MS) return null;
    /* 🔑 LE PRÉPAYÉ, LE PLUS BAS — c'est le prix qu'un client peut réellement
     * obtenir sur cette page, et celui que le tunnel agent vend. Publier le
     * flexible nous déclarait 9 € plus cher que notre meilleure offre, sur un
     * balisage lu par des machines qui comparent. Le flexible reste le repli
     * quand la remise n'a pas pu être mesurée. */
    const prepaye = data[0].prix_prepaye == null ? null : Number(data[0].prix_prepaye);
    const prix = prepaye != null && prepaye > 0 ? prepaye : Number(data[0].prix_ttc);
    return prix > 0 ? prix : null;
  } catch {
    /* Base injoignable : on redescend sur le moteur, comme avant. */
    return null;
  }
}

/** Le plus bas prix par nuit réellement proposé sur la fenêtre, ou `null`. */
export async function prixAPartirDe(
  { jours = 60, adultes = 2 }: { jours?: number; adultes?: number } = {},
): Promise<number | null> {
  /* ⚠️ LE MIROIR D'ABORD, LE MOTEUR EN REPLI — jamais l'inverse. Tant que le
   * cron qui peint le miroir n'est pas programmé, il reste muet et cette page
   * se comporte exactement comme avant : rien ne casse le jour du déploiement,
   * et rien ne change le jour où le cron démarre, sinon la justesse. */
  const duMiroir = await prixDuMiroir(jours);
  if (duMiroir !== null) return Math.round(duMiroir);

  const jour = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  /* ⚠️ DEUX SONDAGES, PAS SOIXANTE. Une nuit par quinzaine suffit à trouver le
   * creux : interroger chaque date ferait soixante appels pour un seul nombre,
   * à chaque régénération de la page. On regarde le début et le milieu de la
   * fenêtre — la basse saison se trouve toujours dans l'un des deux. */
  const sondages = [1, Math.round(jours / 2)].map((d) => ({ arrivee: jour(d), depart: jour(d + 1) }));

  let bas: number | null = null;
  for (const s of sondages) {
    try {
      const dispo = await chercherDisponibilite({ ...s, adultes, langue: 'fr' });
      for (const offre of dispo.offres) {
        for (const p of offre.prix) {
          if (p.parNuit > 0 && (bas === null || p.parNuit < bas)) bas = p.parNuit;
        }
      }
    } catch {
      /* Une fenêtre fermée ou un moteur qui ne répond pas n'est pas une erreur
         d'affichage : on continue, et s'il ne reste rien on ne publie pas de prix. */
    }
  }
  return bas === null ? null : Math.round(bas);
}

/* L'identité de la maison, telle que schema.org la comprend. Les valeurs sont
 * celles déjà publiées sur les autres pages : on ne réinvente pas une adresse
 * ni des coordonnées qui divergeraient d'une page à l'autre — deux fiches qui
 * se contredisent valent moins qu'une seule. */
const VOILES = {
  '@type': 'Hotel',
  '@id': `${SITE_URL}/hotel-plage-mourillon#hotel`,
  name: 'Hôtel-Rooftop Les Voiles',
  url: `${SITE_URL}/hotel-plage-mourillon`,
  telephone: '+33494413623',
  email: 'contact-lesvoiles@htbm.fr',
  starRating: { '@type': 'Rating', ratingValue: '3' },
  address: {
    '@type': 'PostalAddress',
    streetAddress: '124 rue Gubler',
    addressLocality: 'Toulon',
    postalCode: '83000',
    addressCountry: 'FR',
  },
  /* ⚠️ VÉRIFIÉES AUPRÈS DU GÉOCODEUR DE L'ÉTAT (api-adresse.data.gouv.fr),
   * le 28/09/2026 : « 124 Rue Gubler 83000 Toulon », score 0,97. Ce fichier
   * publiait 43,1076 / 5,9469 — 460 m plus loin, soit une autre rue — en
   * prétendant reprendre « les valeurs déjà publiées sur les autres pages ».
   * Un client guidé par un agent serait descendu au mauvais endroit. */
  geo: { '@type': 'GeoCoordinates', latitude: 43.109081, longitude: 5.951233 },
  priceCurrency: 'EUR',
  currenciesAccepted: 'EUR',
  availableLanguage: ['fr', 'en', 'es', 'it', 'de'],
} as const;

/** Le bloc JSON-LD de la page de réservation. */
export async function balisageReserver(langue: string, chemin: string) {
  const bas = await prixAPartirDe();

  return {
    '@context': 'https://schema.org',
    ...VOILES,
    inLanguage: langue,
    /* ⚠️ `makesOffer` NE SORT QUE SI LE MOTEUR A RÉPONDU. Publier une offre sans
     * prix, ou avec un prix de repli, apprendrait à une machine un chiffre que
     * l'hôtel ne pratique pas. */
    ...(bas
      ? {
        makesOffer: {
          '@type': 'Offer',
          name: 'Nuit avec petit-déjeuner inclus',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: bas,
            priceCurrency: 'EUR',
            unitCode: 'DAY',
            /* Le prix affiché est tout compris, taxe de séjour comprise :
               c'est l'argument du direct, autant qu'une machine le sache. */
            valueAddedTaxIncluded: true,
          },
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}${chemin}`,
        },
      }
      : {}),
    /* 🔑 CE QUI DIT À UN AGENT « ON PEUT RÉSERVER ICI, ET VOICI COMMENT ».
     * Sans cette action, une page de réservation n'est qu'une page de plus :
     * l'agent lit du texte et ne sait pas qu'il y a un tunnel derrière, ni avec
     * quels paramètres l'ouvrir. `ReserveAction` est le vocabulaire prévu pour
     * ça, et les paramètres sont ceux que notre propre moteur attend. */
    potentialAction: {
      '@type': 'ReserveAction',
      name: 'Réserver en direct',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}${chemin}?arrivee={checkin}&depart={checkout}&adultes={adults}`,
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
        inLanguage: langue,
      },
      result: { '@type': 'LodgingReservation', name: 'Réservation à l’Hôtel-Rooftop Les Voiles' },
    },
  };
}
