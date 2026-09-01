/* Le décodeur des liens qui arrivent sur `/reserver`.
 *
 * ⚠️ GOOGLE N'ENVOIE PAS DES DATES, IL ENVOIE DES MORCEAUX.
 * Quand un voyageur clique un lien de réservation gratuit dans Google Hotels,
 * Google construit l'URL au moment du clic en remplaçant des variables dans un
 * gabarit qu'on lui donne. Ces variables ne ressemblent pas à ce qu'on utilise :
 * l'arrivée arrive en trois champs séparés, et la durée en nombre de nuits, pas
 * en date de départ.
 *
 * Noms relevés le 27/08/2026 sur `developers.google.com/hotels/hotel-prices/
 * dev-guide/pos-urls` — ne pas les re-deviner :
 *
 *   (CHECKINDAY) (CHECKINMONTH) (CHECKINYEAR)   jour, mois, année d'arrivée
 *   (CHECKOUTDAY) (CHECKOUTMONTH) (CHECKOUTYEAR) idem au départ
 *   (LENGTH)                                     nombre de nuits
 *   (NUM-ADULTS) (NUM-CHILDREN) (NUM-GUESTS)     occupation
 *   (USER-LANGUAGE) (USER-COUNTRY) (USER-CURRENCY)
 *   (PARTNER-HOTEL-ID) (RATE-PLAN-ID) (PARTNER-ROOM-ID)
 *
 * Le gabarit à donner au partenaire de connectivité (D-EDGE) est donc :
 *
 *   https://hotels-toulon-mer.com/reserver
 *     ?checkinYear=(CHECKINYEAR)&checkinMonth=(CHECKINMONTH)
 *     &checkinDay=(CHECKINDAY)&nuits=(LENGTH)&adultes=(NUM-ADULTS)
 *
 * ⚠️ SUR `hotels-toulon-mer.com`, ET SURTOUT PAS SUR `hotel-voiles.com`.
 * Ce gabarit portait le second, qui n'est plus qu'un domaine de renvoi : mesuré
 * le 01/09/2026, `https://www.hotel-voiles.com/reserver?checkinYear=…` répond
 * 301 vers `https://hotels-toulon-mer.com/` — l'ACCUEIL, chemin et paramètres
 * jetés. Donné tel quel à un partenaire, chaque lien de réservation gratuit
 * aurait déposé le voyageur sur la page d'accueil sans ses dates : il aurait vu
 * un autre prix que celui annoncé dans Google, ce qui est très exactement le
 * motif de suspension d'une fiche. Le domaine en ligne est le seul à tester,
 * et il répond 200 sur ce gabarit (vérifié le même jour).
 *
 * ⚠️ ON GARDE AUSSI L'ANCIENNE FORME, `?arrivee=…&depart=…&voyage=…`.
 * Elle sert aux liens de l'accueil, au partage entre deux personnes qui
 * décident ensemble, et au retour arrière du navigateur. Elle est prioritaire :
 * c'est la nôtre, et elle est explicite.
 */

export type Voyage = 'seul' | 'deux';

export type RechercheDemandee = {
  arrivee: string;
  depart: string;
  adultes: number;
  voyage: Voyage;
};

const estDate = (s: string | null | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Ajoute des nuits à une date civile sans jamais passer par l'heure locale :
 *  à Toulon, une addition en heure locale saute ou répète un jour deux fois par
 *  an, la nuit du changement d'heure. */
function plusNuits(dateIso: string, nuits: number): string {
  const [a, m, j] = dateIso.split('-').map(Number);
  return iso(new Date(Date.UTC(a, m - 1, j + nuits)));
}

/** Recolle les trois morceaux de Google en une date civile, ou rien. */
function recoller(
  annee: string | null, mois: string | null, jour: string | null,
): string | null {
  const a = Number(annee), m = Number(mois), j = Number(jour);
  if (!Number.isInteger(a) || !Number.isInteger(m) || !Number.isInteger(j)) return null;
  if (a < 2000 || a > 2100 || m < 1 || m > 12 || j < 1 || j > 31) return null;
  const d = new Date(Date.UTC(a, m - 1, j));
  // Rejette le 31 février : `Date.UTC` le décale silencieusement au 3 mars.
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null;
  return iso(d);
}

/**
 * Lit une recherche dans les paramètres d'URL, quelle que soit la forme.
 * Rend `null` si rien d'exploitable ne s'y trouve — l'appelant retombe alors
 * sur son défaut (la nuit du jour, pour deux), qui vaut mieux qu'un formulaire
 * vide.
 *
 * ⚠️ `aujourdhui` est passé en argument plutôt que lu ici : une arrivée dans le
 * passé se ramène à aujourd'hui, et cette borne doit pouvoir se tester.
 */
export function lireRecherche(
  params: URLSearchParams,
  aujourdhui: string,
): RechercheDemandee | null {
  const n = (cle: string) => params.get(cle);

  // ── Notre forme, prioritaire ────────────────────────────────────────────
  let arrivee = estDate(n('arrivee')) ? n('arrivee')! : null;
  let depart = estDate(n('depart')) ? n('depart')! : null;

  // ── La forme de Google : trois morceaux, et une durée ───────────────────
  if (!arrivee) arrivee = recoller(n('checkinYear'), n('checkinMonth'), n('checkinDay'));
  if (!depart) depart = recoller(n('checkoutYear'), n('checkoutMonth'), n('checkoutDay'));

  if (!arrivee) return null;

  // Une arrivée passée n'est pas une erreur du client : c'est un lien qui a
  // vieilli dans un onglet ou dans l'index de Google. On la ramène à ce soir
  // plutôt que de lui montrer une recherche impossible.
  if (arrivee < aujourdhui) arrivee = aujourdhui;

  if (!depart) {
    // `nuits` est le nom qu'on donne à `(LENGTH)` ; `nights` par courtoisie
    // pour un partenaire qui recopierait le nom anglais.
    const nuits = Number(n('nuits') ?? n('nights') ?? 1);
    // Un séjour se borne : au-delà de trente nuits ce n'est plus une
    // réservation d'hôtel, et Mews refuserait la disponibilité de toute façon.
    depart = plusNuits(arrivee, Number.isInteger(nuits) && nuits >= 1 && nuits <= 30 ? nuits : 1);
  }

  // Un départ qui ne suit pas l'arrivée est un lien cassé, pas une intention.
  if (depart <= arrivee) depart = plusNuits(arrivee, 1);

  /* L'occupation. Le tunnel ne vend qu'une chambre pour une ou deux personnes :
   * un groupe plus grand est ramené à deux plutôt que refusé — il verra des
   * chambres et des prix, et pourra ajouter la seconde chambre ensuite. Lui
   * montrer une page vide serait le perdre pour de bon. */
  const brut = Number(
    n('adultes') ?? n('adults') ?? n('numAdults') ?? n('guests') ?? n('numGuests') ?? NaN,
  );
  const voyageUrl = n('voyage');
  const adultes = voyageUrl === 'seul' ? 1
    : voyageUrl === 'deux' ? 2
    : Number.isInteger(brut) && brut >= 1 ? Math.min(brut, 2)
    : 2;

  return { arrivee, depart, adultes, voyage: adultes === 1 ? 'seul' : 'deux' };
}
