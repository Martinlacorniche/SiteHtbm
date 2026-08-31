// Client Mews Connector API — Hôtel-Rooftop Les Voiles.
//
// ⚠️ CE N'EST PAS `mewsBooking.ts`, ET LA DISTINCTION EST STRUCTURELLE.
// La Booking Engine (`mewsBooking.ts`) est publique, appelée depuis le
// navigateur, et sert à VENDRE : chercher, tarifer, créer. Le Connector est
// authentifié par jetons secrets, ne sort jamais du serveur, et sert à tout ce
// que la Booking Engine ne sait pas faire — ici : poser la note que la
// réception lira.
//
// Les jetons viennent de siteconsignes (repris le 25/08/2026). Le champ
// `Client` doit rester STABLE : c'est la clé par laquelle Mews retrouve nos
// appels dans ses journaux.

const BASE = process.env.MEWS_BASE || 'https://api.mews.com/api/connector/v1';
const CLIENT = process.env.MEWS_CLIENT_NAME || 'Hotel Les Voiles Integration INT004073';

/** Le service « Hébergement » des Voiles — celui qui porte chambres et tarifs. */
export const SERVICE_HEBERGEMENT = '9475cd2d-5fa3-4a8a-9abb-aaa9008717f2';

export async function callMews<T>(operation: string, corps: Record<string, unknown>): Promise<T> {
  const ClientToken = process.env.MEWS_CLIENT_TOKEN;
  const AccessToken = process.env.MEWS_ACCESS_TOKEN;
  if (!ClientToken || !AccessToken) throw new Error('MEWS_CLIENT_TOKEN / MEWS_ACCESS_TOKEN manquants');

  const res = await fetch(`${BASE}/${operation}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ClientToken, AccessToken, Client: CLIENT, ...corps }),
  });
  const texte = await res.text();
  let json: unknown;
  try { json = JSON.parse(texte); } catch { json = texte; }
  if (!res.ok) {
    const msg = (json as { Message?: string })?.Message || `HTTP ${res.status}`;
    throw new Error(`Mews ${operation} → ${res.status} ${msg}`);
  }
  return json as T;
}

/* ─────────────────────────── La note de réservation ──────────────────────────
 *
 * ⚠️ PIÈGE, PAYÉ DEUX FOIS. La note que lit la réception ne vit ni dans le
 * champ `Notes` de `reservations/getAll`, ni dans celui de
 * `reservationGroups/get` — les deux restent vides quoi qu'on écrive, et
 * `reservations/update` avec un champ `Notes` est ignoré EN SILENCE. Elle vit
 * dans `serviceOrderNotes` : une réservation EST un service order.
 * Constaté côté siteconsignes le 23/07/2026, reconstaté ici le 26/08/2026 sur
 * la résa 29814 — le mot du client posé par la Booking Engine s'y trouvait
 * bien, en note `General`, alors que les deux champs `Notes` le donnaient vide.
 */
export async function ajouterNote(reservationId: string, texte: string): Promise<string | null> {
  const r = await callMews<{ ServiceOrderNotes?: { Id: string }[] }>('serviceOrderNotes/add', {
    ServiceOrderNotes: [{ ServiceOrderId: reservationId, Type: 'General', Text: texte }],
  });
  return r.ServiceOrderNotes?.[0]?.Id ?? null;
}

/* Le type de chambre en code court réception.
 * Repris de `otaResa.shortRoom` (siteconsignes) : la réception lit le MÊME code
 * qu'une résa Booking ou Expedia, sans avoir à savoir d'où vient la nuit. */
const MOTS_JETES = new Set([
  'chambre', 'room', 'de', 'du', 'des', 'la', 'le', 'les', 'avec', 'et',
  'vue', 'mer', 'douche', 'bain', 'salle', 'balcon', 'terrasse', 'grand', 'grande',
]);
const GAMMES = new Set(['supérieure', 'superieure', 'confort', 'deluxe', 'luxe', 'prestige', 'standard', 'familiale', 'individuelle', 'simple', 'suite']);

export function codeChambre(nom: string | null | undefined): string {
  if (!nom) return 'chambre';
  const mots = nom.split(/[^A-Za-zÀ-ÿ]+/).filter(Boolean);
  const gardes = mots.filter((m) => !MOTS_JETES.has(m.toLowerCase()));
  const gamme = gardes.find((m) => GAMMES.has(m.toLowerCase()));
  return (gamme || gardes[0] || mots[0] || 'chambre').toLowerCase();
}

/* ⚠️ SANS CET APPEL, LA RÉSERVATION EST PERDUE EN VINGT MINUTES.
 *
 * `reservationGroups/create` de la Booking Engine ne crée pas une réservation
 * ferme : il pose une option. Elle sort en `State: Optional` avec un
 * `ReleasedUtc` à création + 20 min, et Mews la relâche ensuite de lui-même
 * (`CancellationReason: BookingAbandoned`). Constaté deux fois le 26/08/2026,
 * sur la 29814 puis sur la 29816 — celle-ci avait pourtant une carte attachée
 * et un client qui avait payé son geste jusqu'au bout.
 *
 * La Booking Engine n'expose AUCUN moyen de confirmer : `reservationGroups/
 * confirm`, `/update`, `/pay`, `reservations/confirm` y répondent tous 404.
 * Seul le Connector le sait faire. C'est donc lui qui ferme la vente, juste
 * après que la Booking Engine l'a ouverte.
 *
 * C'est aussi ce passage en `Confirmed` que les rate groups attendent pour
 * déclencher leur règlement (`SettlementTrigger: Confirmation`). */
export async function confirmerReservations(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await callMews('reservations/confirm', { ReservationIds: ids });
}

/* ─────────────────────── La demande de paiement ──────────────────────────────
 *
 * C'est elle que Mews Payments Checkout consomme : on la crée ici, côté
 * serveur, et le navigateur ne reçoit que son identifiant. Le montant est donc
 * FIXÉ PAR NOUS et invérifiable depuis la page — c'est tout l'intérêt du
 * « Flow 1 » de Mews sur le « Flow 2 », où le montant se lit dans la
 * configuration du navigateur et se modifie à la console.
 *
 * ⚠️ `SendPaymentRequestEmails: false`. Par défaut Mews envoie au client un
 * courriel « Autoriser un paiement » avec un lien vers SA page de paiement.
 * Ici le client a le formulaire sous les yeux : ce courriel ne ferait que
 * semer le doute, et le renverrait ailleurs au pire moment. Vérifié le
 * 26/08/2026 — sans ce champ, le courriel part bien.
 *
 * ⚠️ `Reason: 'Other'` impose une `Description`, et cette description est LUE
 * PAR LE CLIENT dans le checkout. Elle doit donc être écrite pour lui.
 */
export type TypeReglement = 'Payment' | 'Preauthorization';

export async function creerDemandePaiement(
  { customerId, reservationId, montant, type, description, expireUtc }:
  {
    customerId: string; reservationId: string; montant: number;
    type: TypeReglement; description: string; expireUtc: string;
  },
): Promise<string | null> {
  const r = await callMews<{ PaymentRequests?: { Id: string }[] }>('paymentRequests/add', {
    PaymentRequests: [{
      AccountId: customerId,
      ReservationId: reservationId,
      Amount: { Currency: 'EUR', Value: montant },
      Type: type,
      Reason: 'Other',
      Description: description,
      ExpirationUtc: expireUtc,
    }],
    SendPaymentRequestEmails: false,
  });
  return r.PaymentRequests?.[0]?.Id ?? null;
}

/* ⚠️ SANS CETTE LECTURE, N'IMPORTE QUI RÉSERVE SANS PAYER.
 *
 * `/api/reserver/confirmer` est appelée par le `onSuccess` du checkout, donc
 * par le navigateur — qui peut l'appeler sans avoir rien réglé. Le commentaire
 * de cette route promettait depuis le 26/08/2026 qu'on relisait l'état de la
 * demande chez Mews avant de confirmer ; le code ne le faisait pas. Il le fait
 * ici. Une demande qui n'est pas `Completed` ne ferme aucune vente.
 *
 * `paymentRequests/getAll` filtre par identifiants — vérifié sur la production
 * le 27/08/2026 : il rend bien l'état de la demande visée. ⚠️ `Limitation` y est
 * OBLIGATOIRE, sans quoi 400 « Invalid Limitation ». */
export async function etatDemandePaiement(id: string): Promise<string | null> {
  const r = await callMews<{ PaymentRequests?: { Id: string; State?: string }[] }>(
    'paymentRequests/getAll',
    { PaymentRequestIds: [id], Limitation: { Count: 1 } },
  );
  return r.PaymentRequests?.find((p) => p.Id === id)?.State ?? null;
}

/** Le montant qu'une demande de paiement va réellement porter à la carte, ou
 *  `null` si on n'a pas pu le lire.
 *
 *  ⚠️ IL N'EST PAS FORCÉMENT CELUI DU SÉJOUR, et c'est tout l'objet de cette
 *  lecture. La demande créée par `reservationGroups/create` suit la règle du
 *  GROUPE TARIFAIRE, qui aux Voiles ne couvre que l'hébergement nu : mesuré le
 *  31/08/2026 sur une confort prépayée, Mews demandait **83,00 €** quand le
 *  client voyait **98,86 €** — les 14 € de petit-déjeuner, pourtant compris
 *  dans le tarif, et les 1,86 € de taxe de séjour restaient dehors. Le dossier
 *  de Mireille Guignard (29886) est parti comme ça : 90,90 € encaissés pour
 *  106,76 € dus, avec une note « rien à encaisser » par-dessus. */
export async function montantDemandePaiement(id: string): Promise<number | null> {
  try {
    const r = await callMews<{
      PaymentRequests?: { Id: string; Amount?: { GrossValue?: number; Value?: number } }[];
    }>('paymentRequests/getAll', { PaymentRequestIds: [id], Limitation: { Count: 1 } });
    const a = r.PaymentRequests?.find((p) => p.Id === id)?.Amount;
    /* ⚠️ LE MONTANT EST DANS `GrossValue`, PAS DANS `Value` — et s'être trompé
     * de champ a rendu le garde-fou muet pendant sa première mise en ligne :
     * `Amount.Value` est `undefined`, donc `null`, donc aucune comparaison,
     * donc la demande tronquée de Mews passait quand même. Relevé sur une
     * demande réelle (31/08/2026) :
     *   Amount: { Currency: 'EUR', NetValue: 83, GrossValue: 83, TaxValues: [] }
     * On lit le TTC (`GrossValue`) : c'est ce qui est porté à la carte. */
    const v = a?.GrossValue ?? a?.Value;
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}

/** Renonce à une demande restée en plan — le client a fermé l'onglet. */
export async function annulerDemandePaiement(id: string): Promise<void> {
  try {
    await callMews('paymentRequests/cancel', { PaymentRequestIds: [id] });
  } catch { /* elle expirera d'elle-même */ }
}

/* ─────────────────────── La note de contrôle réception ───────────────────────
 *
 * Elle ne décrit pas le tarif : elle dit à la réception CE QU'ELLE DOIT FAIRE.
 * Format arrêté avec Martin le 26/08/2026 :
 *
 *     #<chambre> <FLEX|NANR> / DIRECT DÉPART 12H OK / <consigne d'encaissement>
 *
 * Trois blocs, pour les trois seules questions qu'on se pose au comptoir, dans
 * l'ordre où elles se posent : quelle chambre, sous quelles conditions, et
 * est-ce que j'encaisse.
 *
 * ⚠️ ON NE PARLE PAS DE LA CARTE, ET C'EST UN CHOIX.
 * Une première version écrivait « CB OK » après avoir relu `CreditCardId` chez
 * Mews. Inutile : Mews relâche lui-même une réservation dont la règle
 * d'encaissement n'a rien pu saisir — constaté le 26/08/2026 sur la résa
 * 29814, créée sans carte, `ReleasedUtc` +20 min, `CancellationReason:
 * BookingAbandoned`. Donc une réservation qui EXISTE est une réservation
 * garantie, par construction. L'écrire ferait douter la réception d'un fait
 * acquis, et un doute au comptoir se paie en temps devant un client. Un
 * aller-retour Connector économisé au passage.
 *
 * ⚠️ « DÉPART 12H OK » N'EST PAS UN ORNEMENT. Mews pose l'heure de départ par
 * défaut de l'hôtel — relevé sur la 29814 : `EndUtc` 10:00Z, soit 11 h à
 * Toulon en janvier. Le direct promet midi (`PRIVILEGES.voiles` → « Départ
 * 12 h offert »), et cette promesse ne voyage NULLE PART dans les données de
 * la réservation. Sans cette ligne, la réception applique 11 h et le client a
 * raison de se plaindre.
 *
 * ⚠️ LA CONSIGNE D'ENCAISSEMENT DIT LE GESTE, PAS LE TARIF.
 *  · Flexible : Mews n'a pris qu'une préautorisation de 1 %. Tout reste à
 *    encaisser, taxe de séjour comprise — elle est dans le folio (relevé sur
 *    la 29814 : `ProductOrder` 1,86 €, catégorie « Taxe de séjour », code 700).
 *  · Prépayé : Mews a débité 100 % du coût, taxe comprise. Il n'y a RIEN à
 *    demander. Écrire « à débiter » ici ferait réencaisser un client qui a
 *    déjà payé — l'accident du 29/07/2026 (cf. `mewsNotes.ts`), à l'envers.
 */
export function noteDeControle(
  { chambre, prepaye, total, taxe, langueClient }:
  { chambre: string; prepaye: boolean; total: number; taxe: number; langueClient?: string },
): string {
  const eur = (n: number) => `${n.toFixed(2).replace('.', ',')}€`;
  const bloc: string[] = [`#${codeChambre(chambre)}`, prepaye ? 'NANR' : 'FLEX'];
  bloc.push('/ DIRECT DÉPART 12H OK');
  bloc.push(prepaye
    ? `/ DÉJÀ DÉBITÉ ${eur(total)} TS COMPRISE — RIEN À ENCAISSER`
    : `/ RSP ${eur(total)} DONT TS ${eur(taxe)}`);
  if (langueClient && langueClient !== 'fr') bloc.push(langueClient.toUpperCase());
  return bloc.join(' ');
}

/* ───────────────────────── Le prix qu'il aurait payé ailleurs ────────────────
 *
 * L'hôtel vend les mêmes nuits sur Booking, à ses propres tarifs OTA, dans le
 * même Mews. Depuis le 26/08/2026 les tarifs directs portent −10 % : l'écart
 * est donc réel, et on peut le MONTRER au lieu de le proclamer.
 *
 * On lit ces prix ici plutôt que de les recopier : ce sont des prix de vente,
 * ils bougent, et un chiffre barré faux est pire qu'une absence de comparaison.
 * Le Connector est le seul chemin — les tarifs OTA ne sont pas publiés sur la
 * configuration du moteur, et il ne faut surtout pas les y mettre : ils
 * deviendraient réservables en direct.
 */
const OTA_FLEX = 'fd513c84-1e76-4cca-af16-af7000ec157e';   // OTA FLEX BB 🥐
const OTA_NANR = 'f6860941-9bb2-4746-a50f-af7000ee444a';   // OTA NANR BB 🥐
const PDJ_OTA = 'c55e5b6f-3986-4dd4-8498-ab7a01255dec';    // Petit-déjeuner OTA

/* Mews compte ses nuits en « unités de temps » qui commencent à MINUIT LOCAL.
 * Passer 00:00Z se fait refuser (« FirstTimeUnitStartUtc is not start of
 * TimeUnit ») : l'hôtel est à Toulon, donc 23:00Z l'hiver et 22:00Z l'été.
 * On demande l'écart à `Intl` plutôt que de le coder — il change deux fois par an. */
function minuitLocalUtc(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  // Midi UTC : jamais ambigu, quel que soit le sens du changement d'heure.
  const repere = new Date(Date.UTC(a, m - 1, j, 12));
  const rendu = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', timeZoneName: 'longOffset',
  }).format(repere);
  const trouve = rendu.match(/GMT([+-])(\d{2}):(\d{2})/);
  const minutes = trouve
    ? (trouve[1] === '-' ? -1 : 1) * (Number(trouve[2]) * 60 + Number(trouve[3]))
    : 0;
  return new Date(Date.UTC(a, m - 1, j, 0, -minutes)).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

type ReponsePricing = {
  CategoryPrices?: { CategoryId: string; Prices: number[] }[];
};

export type PrixPublic = { flexible: number; prepaye: number };

/* Le cache.
 *
 * Un appel Connector par recherche serait payé par chaque visiteur alors que
 * ces prix bougent au mieux une fois par jour. Quinze minutes suffisent à
 * absorber une rafale de recherches sans jamais afficher un tarif de la veille.
 * En mémoire du processus, volontairement : rien à purger, rien à administrer,
 * et un redémarrage repart propre. */
const CACHE = new Map<string, { a: number; v: Map<string, PrixPublic> }>();
const TTL = 15 * 60 * 1000;

export async function prixPublic(
  { arrivee, depart, adultes }: { arrivee: string; depart: string; adultes: number },
): Promise<Map<string, PrixPublic>> {
  const cle = `${arrivee}|${depart}|${adultes}`;
  const garde = CACHE.get(cle);
  if (garde && Date.now() - garde.a < TTL) return garde.v;

  const nuits = Math.round((Date.parse(depart) - Date.parse(arrivee)) / 86_400_000);
  if (!Number.isFinite(nuits) || nuits < 1) return new Map();

  // La dernière unité est la nuit qui PRÉCÈDE le départ : on dort du 13 au 14,
  // la nuit facturée est celle du 13.
  const veille = new Date(Date.parse(depart) - 86_400_000).toISOString().slice(0, 10);
  const bornes = {
    FirstTimeUnitStartUtc: minuitLocalUtc(arrivee),
    LastTimeUnitStartUtc: minuitLocalUtc(veille),
  };

  const [flex, nanr, produits] = await Promise.all([
    callMews<ReponsePricing>('rates/getPricing', { RateId: OTA_FLEX, ...bornes }),
    callMews<ReponsePricing>('rates/getPricing', { RateId: OTA_NANR, ...bornes }),
    callMews<{ Products?: { Id: string; Price?: { GrossValue?: number } }[] }>(
      'products/getAll',
      { ServiceIds: [SERVICE_HEBERGEMENT], Limitation: { Count: 200 } },
    ),
  ]);

  // Le petit-déjeuner des OTA a son propre produit, distinct de celui du direct
  // (vérifié sur 681 lignes de réservations réelles le 26/08/2026). Son prix se
  // lit, il ne se suppose pas : il a changé deux fois dans la même journée.
  const pdj = produits.Products?.find((p) => p.Id === PDJ_OTA)?.Price?.GrossValue ?? 0;
  const supplement = pdj * adultes * nuits;

  const somme = (r: ReponsePricing, categorieId: string) =>
    r.CategoryPrices?.find((c) => c.CategoryId === categorieId)
      ?.Prices.reduce((t, p) => t + p, 0) ?? null;

  const out = new Map<string, PrixPublic>();
  for (const c of flex.CategoryPrices ?? []) {
    const f = somme(flex, c.CategoryId);
    const n = somme(nanr, c.CategoryId);
    if (f === null || n === null) continue;
    out.set(c.CategoryId, { flexible: f + supplement, prepaye: n + supplement });
  }

  CACHE.set(cle, { a: Date.now(), v: out });
  return out;
}

/* ───────────────────── La disponibilité, JOUR PAR JOUR ─────────────────────
 *
 * ⚠️ C'EST L'AUTRE API, ET C'EST TOUT LE POINT.
 * `hotels/getAvailability` (Booking Engine) ne répond que sur une période
 * entière : il rend ce qui est réservable de bout en bout, c'est-à-dire le
 * MINIMUM des nuits. Parfait pour un verdict, inutilisable pour peindre un
 * calendrier — il aurait fallu un appel par jour, et sa documentation dit
 * elle-même qu'elle est « unsuitable for continuous polling by a single
 * server ».
 *
 * `services/getAvailability` (Connector) rend un TABLEAU, une case par jour,
 * pour toute la fenêtre demandée. Un mois entier coûte UN appel. C'est ce que
 * fait déjà le back-office pour poser ses allotements.
 *
 * ⚠️ LES DEUX SOURCES CONCORDENT — vérifié le 28/08/2026 sur les vraies
 * données : 20, 21 et 22 octobre donnent 15 chambres des deux côtés, 10 et 11
 * novembre en donnent 16. On peut donc peindre le calendrier avec l'une et
 * rendre le verdict avec l'autre sans se contredire. (La première lecture
 * semblait diverger : je comptais le jour du DÉPART comme une nuit.)
 *
 * ⚠️ Ces chiffres sont NETS : Mews y a déjà retiré les chambres vendues, celles
 * tenues en option, et celles prises par un allotement. Une chambre en option
 * ferme donc la privatisation sans qu'on ait rien à coder — c'est la règle
 * voulue par Martin le 28/08/2026.
 */

/** Les chambres libres pour chaque nuit de la fenêtre, dans l'ordre.
 *  Clé = date de la nuit (`AAAA-MM-JJ`), valeur = chambres libres cette nuit-là. */
export async function libresParNuit(
  premiere: string, derniere: string,
): Promise<Map<string, number>> {
  const cle = `${premiere}|${derniere}`;
  const garde = CACHE_JOURS.get(cle);
  if (garde && Date.now() - garde.a < TTL_JOURS) return garde.v;

  const av = await callMews<{ CategoryAvailabilities?: { Availabilities?: number[] }[] }>(
    'services/getAvailability',
    {
      ServiceId: SERVICE_HEBERGEMENT,
      FirstTimeUnitStartUtc: minuitLocalUtc(premiere),
      LastTimeUnitStartUtc: minuitLocalUtc(derniere),
    },
  );

  const cats = av.CategoryAvailabilities ?? [];
  const nbJours = cats[0]?.Availabilities?.length ?? 0;
  const out = new Map<string, number>();
  const depart = Date.parse(`${premiere}T12:00:00Z`);
  for (let i = 0; i < nbJours; i++) {
    const jour = new Date(depart + i * 86_400_000).toISOString().slice(0, 10);
    out.set(jour, cats.reduce((s, c) => s + (c.Availabilities?.[i] ?? 0), 0));
  }

  CACHE_JOURS.set(cle, { a: Date.now(), v: out });
  return out;
}

/**
 * Combien de chambres sont libres sur TOUTE la période — le verdict de la
 * privatisation. La villa veut les seize, donc c'est la nuit la plus chargée
 * qui décide.
 *
 * ⚠️ CETTE FONCTION A CHANGÉ DE SOURCE LE 28/08/2026, ET C'EST LA RAISON QUI
 * COMPTE. Elle interrogeait `hotels/getAvailability` (la Booking Engine), qui
 * rend la même chose à un détail près : ELLE OBÉIT AUX RESTRICTIONS. Mesuré ce
 * jour-là sur une fermeture d'essai — le moteur passe de 16 chambres à 0, le
 * connecteur en rend toujours 16.
 *
 * Or Les Voiles ferme l'hôtel de novembre à mars et ne vend QUE la villa sur
 * ces mois. Le jour où la fermeture de saison est posée dans Mews, la villa
 * disparaîtrait de notre propre site pendant les cinq mois où elle est le seul
 * produit — 35 000 € de budget qui tombent pile là. Le moteur répond « pas
 * vendable » ; la question de la villa est « la maison est-elle vide », et
 * c'est le connecteur qui y répond.
 *
 * Les deux sources concordent par ailleurs, options comprises (cf. le pavé
 * ci-dessus) : la bascule ne change aucun chiffre, seulement ce à quoi ils
 * obéissent.
 *
 * `arrivee` / `depart` sont des dates civiles ; les nuits vont de l'arrivée à
 * la veille du départ.
 */
export async function chambresLibres(
  { arrivee, depart }: { arrivee: string; depart: string },
): Promise<number> {
  const veille = new Date(Date.parse(`${depart}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  if (veille < arrivee) return 0;      // un séjour sans nuit ne libère rien
  const parNuit = await libresParNuit(arrivee, veille);
  if (!parNuit.size) return 0;
  return Math.min(...parNuit.values());
}

/* Cinq minutes, contre quinze pour les prix. Une disponibilité bouge plus vite
 * qu'un tarif — une chambre se vend à toute heure — et un calendrier qui
 * annonce libre une nuit qui vient d'être prise fait promettre à un commercial
 * ce qu'il ne pourra pas tenir. En mémoire du processus : rien à purger, et un
 * redémarrage repart propre. */
const CACHE_JOURS = new Map<string, { a: number; v: Map<string, number> }>();
const TTL_JOURS = 5 * 60 * 1000;
