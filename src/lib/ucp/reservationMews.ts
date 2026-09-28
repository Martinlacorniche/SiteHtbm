// POSER LA RÉSERVATION D'UN AGENT DANS MEWS — par le Connector, pas par le moteur.
//
// 🔑 LE FAIT QUI REND TOUT CECI POSSIBLE, mesuré le 28/09/2026. Les deux
// groupes tarifaires publics portent `SettlementTrigger: Confirmation` : le
// moteur de réservation fait donc encaisser Mews au moment où la réservation
// se confirme — 100 % sur le prépayé, 1 % de préautorisation sur le flexible.
// On en concluait qu'une réservation agentique exigeait une configuration
// dédiée chez Mews.
//
// C'est faux, et c'est vérifié : une réservation posée par le CONNECTOR sur ce
// même tarif prépayé, `State: 'Confirmed'` et SANS carte, ne déclenche rien.
// Zéro demande de paiement, zéro règlement, folio constitué normalement
// (résa n°30293, 148,72 €, annulée dans la foulée). `SettlementTrigger` est une
// règle de la Booking Engine, pas du PMS.
//
// ⚠️ C'EST DONC NOUS QUI ENCAISSONS, ET NOUS QUI DEVONS LE DIRE À MEWS.
// L'argent pris chez Stripe se consigne au folio par `payments/addExternal` —
// le même chemin que la borne, les groupes et l'encaissement du comptoir. Sans
// cette consignation, le dossier resterait dû dans le PMS et la réception
// réclamerait au client un séjour déjà payé.
//
// ⚠️ ET LE MONTANT VIENT DU FOLIO, JAMAIS DE LA DISPONIBILITÉ. C'est la leçon
// de la résa 29931 : relire le prix dans `hotels/getAvailability` après avoir
// vendu la chambre, c'est le chercher là où il vient de disparaître.

import { callMews, SERVICE_HEBERGEMENT } from '@/lib/mewsConnector';

export type ClientAgent = { prenom: string; nom: string; email?: string; telephone?: string };

/* ⚠️ MEWS VEUT UNE CATÉGORIE D'ÂGE, ET ELLE NE SE DEVINE PAS. Elle est propre
 * au service Hébergement ; on la lit une fois et on la garde. */
let adulteId: string | null = null;
async function categorieAdulte(): Promise<string> {
  if (adulteId) return adulteId;
  const r = await callMews<{ AgeCategories?: { Id: string; MinimalAge?: number | null }[] }>(
    'ageCategories/getAll', { ServiceIds: [SERVICE_HEBERGEMENT] },
  );
  const l = r.AgeCategories ?? [];
  const a = l.find((x) => x.MinimalAge == null || x.MinimalAge >= 13) ?? l[0];
  if (!a) throw new Error('Mews ne rend aucune catégorie d’âge pour l’hébergement.');
  adulteId = a.Id;
  return a.Id;
}

const sansAccents = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/* ⚠️ `customers/add` REFUSE UN EMAIL DÉJÀ CONNU, et c'est un 400 sec :
 * « A customer with the specified email already exists ». Un client qui revient
 * ferait donc échouer sa propre réservation — constaté au premier essai du
 * 28/09. Et `OverwriteExisting: true` n'est pas la réponse : il écraserait la
 * fiche d'un client existant avec ce qu'un agent aura bien voulu transmettre.
 *
 * Même règle que le module Groupes, qui vit avec ce cas depuis des mois :
 * même email ET même nom, c'est lui, on réutilise son historique ; même email
 * mais autre nom (un couple qui partage une adresse), on crée un profil
 * distinct SANS l'email — le laisser ferait échouer, l'écraser volerait sa
 * fiche à l'autre. */
async function profilClient(client: ClientAgent): Promise<string> {
  type Lite = { Id: string; FirstName?: string | null; LastName?: string | null };
  if (client.email) {
    const trouve = await callMews<{ Customers?: Lite[] }>('customers/getAll', {
      Emails: [client.email],
      Extent: { Customers: true, Documents: false, Addresses: false },
      Limitation: { Count: 50 },
    });
    const liste = trouve.Customers ?? [];
    if (liste.length) {
      const memeNom = liste.filter((c) => sansAccents(c.LastName ?? '') === sansAccents(client.nom));
      const exact = memeNom.find((c) => sansAccents(c.FirstName ?? '') === sansAccents(client.prenom ?? ''));
      const reprend = exact ?? (memeNom.length === 1 ? memeNom[0] : null);
      if (reprend) return reprend.Id;

      const sansMail = await callMews<{ Id?: string }>('customers/add', {
        LastName: client.nom, FirstName: client.prenom,
        ...(client.telephone ? { Phone: client.telephone } : {}),
        OverwriteExisting: false,
      });
      if (!sansMail.Id) throw new Error('Mews n’a pas créé le profil du client.');
      return sansMail.Id;
    }
  }
  const neuf = await callMews<{ Id?: string }>('customers/add', {
    LastName: client.nom, FirstName: client.prenom,
    ...(client.email ? { Email: client.email } : {}),
    ...(client.telephone ? { Phone: client.telephone } : {}),
    OverwriteExisting: false,
  });
  if (!neuf.Id) throw new Error('Mews n’a pas créé le profil du client.');
  return neuf.Id;
}

export type ResaPosee = { reservationId: string; customerId: string; numero: string | null };

/**
 * Crée le client et TIENT la chambre, sans la confirmer.
 *
 * 🔑 TENUE D'ABORD, CONFIRMÉE APRÈS PAIEMENT. On la posait `Confirmed` avant
 * de débiter : entre les deux, une chambre était vendue sans être payée, et il
 * fallait la défaire si le paiement échouait. Mews sait faire mieux —
 * `State: 'Optional'` avec un `ReleasedUtc` : il la relâche TOUT SEUL à
 * l'heure dite, même si notre code ne repasse jamais.
 *
 * ⚠️ Et le folio existe DÈS CE MOMENT, avec son montant définitif — vérifié le
 * 28/09/2026 : six lignes, 315,44 €, sur une réservation encore optionnelle.
 * C'est ce qui permet de débiter le bon montant avant d'avoir rien vendu.
 */
export async function poserReservation(
  { client, categorieId, tarifId, arrivee, depart, adultes, tenirJusqua }:
  { client: ClientAgent; categorieId: string; tarifId: string; arrivee: string; depart: string;
    adultes: number; tenirJusqua?: string },
): Promise<ResaPosee> {
  const customerId = await profilClient(client);

  /* Les instants sont en UTC. Ceux-ci sont exactement ceux de l'essai du
     28/09 qui a produit un folio juste — on ne les redevine pas. */
  const r = await callMews<{ Reservations?: { Reservation?: { Id: string; Number?: string } }[] }>(
    'reservations/add', {
      ServiceId: SERVICE_HEBERGEMENT,
      Reservations: [{
        StartUtc: `${arrivee}T14:00:00Z`,
        EndUtc: `${depart}T10:00:00Z`,
        CustomerId: customerId,
        RequestedCategoryId: categorieId,
        RateId: tarifId,
        PersonCounts: [{ AgeCategoryId: await categorieAdulte(), Count: Math.max(1, adultes) }],
        ...(tenirJusqua
          ? { State: 'Optional', ReleasedUtc: tenirJusqua }
          : { State: 'Confirmed' }),
      }],
    },
  );
  const res = (r.Reservations ?? [])[0]?.Reservation;
  if (!res?.Id) throw new Error('Mews n’a pas créé la réservation.');
  return { reservationId: res.Id, customerId, numero: res.Number ?? null };
}

/** Le total réellement dû, lu sur le folio. */
export async function folioDe(reservationId: string): Promise<number> {
  const lire = async () => {
    const r = await callMews<{ OrderItems?: { Amount?: { GrossValue?: number } }[] }>(
      'orderItems/getAll', { ServiceOrderIds: [reservationId], Limitation: { Count: 200 } },
    );
    return (r.OrderItems ?? []).reduce((s, x) => s + (x.Amount?.GrossValue ?? 0), 0);
  };
  /* ⚠️ LE FOLIO SE CONSTITUE JUSTE APRÈS LA RÉSERVATION, PAS PENDANT. Lu trop
   * tôt il rend 0 — et débiter 0 € puis consigner 0 € laisserait un dossier
   * dû que personne ne verrait. Une seule reprise suffit. */
  const a = await lire();
  if (a > 0) return a;
  await new Promise((r) => setTimeout(r, 2500));
  return lire();
}

/** Consigne dans Mews un règlement déjà encaissé chez Stripe. */
export async function consignerPaiement(
  { accountId, reservationId, montant, reference }:
  { accountId: string; reservationId: string; montant: number; reference: string },
): Promise<string | null> {
  /* `OnlinePayment` : l'argent est chez un PSP, ni sur le TPE ni dans le
     tiroir. Type vérifié accepté par `addExternal` le 13/08/2026. */
  const r = await callMews<{ ExternalPaymentId?: string }>('payments/addExternal', {
    AccountId: accountId,
    Amount: { Currency: 'EUR', GrossValue: montant, TaxCodes: [] },
    Type: 'OnlinePayment',
    ReservationId: reservationId,
    ExternalIdentifier: reference,
    Notes: 'Réservation par agent IA — encaissée par Stripe (jeton de paiement partagé).',
  });
  return r.ExternalPaymentId ?? null;
}

/** Défait une réservation qu'on n'a pas pu encaisser. */
export async function annulerReservation(reservationId: string, motif: string): Promise<void> {
  await callMews('reservations/cancel', { ReservationIds: [reservationId], Notes: motif });
}

/**
 * Confirme une chambre tenue — à n'appeler qu'une fois l'argent encaissé.
 *
 * 🔴 `reservations/update` NE CONFIRME PAS, ET RÉPOND 200. Mesuré le
 * 28/09/2026 : un `update` avec `State: { Value: 'Confirmed' }` renvoie un
 * succès et laisse la réservation `Optional`. J'avais pris ce 200 pour une
 * confirmation — la vente n°30309 est restée optionnelle, donc promise à être
 * relâchée par Mews une demi-heure plus tard, **l'argent déjà encaissé**.
 *
 * L'opération qui confirme est `reservations/confirm`, et elle n'existe que
 * sur le Connector.
 *
 * ⚠️ ET ON RELIT L'ÉTAT APRÈS. C'est toute la leçon : sur cette API, un 200 ne
 * prouve rien. Une chambre qu'on croit vendue et que Mews relâchera est le
 * pire résultat possible — le client a payé et n'a plus de chambre, et
 * personne ne s'en aperçoit avant son arrivée.
 */
export async function confirmerReservation(reservationId: string): Promise<void> {
  /* ⚠️ MEWS REFUSE DE CONFIRMER UNE RÉSERVATION QU'IL VIENT DE CRÉER, avec un
   * message trompeur : `403 ReservationIdDuplicityErrorMessage`. Le même appel,
   * isolé et quelques minutes plus tard, passe sans broncher — mesuré le
   * 28/09/2026 sur la résa 30311. Il tient visiblement la réservation le temps
   * de constituer son folio.
   *
   * 🔴 Et l'enjeu n'est pas mince : à cet instant, L'ARGENT EST DÉJÀ ENCAISSÉ.
   * Abandonner sur cette erreur laisserait une chambre `Optional` payée, que
   * Mews relâcherait une demi-heure plus tard — le client sans chambre, et
   * personne ne s'en apercevant avant son arrivée.
   *
   * On réessaie donc, avec des pauses qui s'allongent. Et on relit l'état à
   * chaque tour, parce que sur cette API un 200 ne prouve rien. */
  let dernier: unknown = null;
  for (const pause of [0, 2_000, 4_000, 8_000]) {
    if (pause) await new Promise((r) => setTimeout(r, pause));
    try {
      await callMews('reservations/confirm', { ReservationIds: [reservationId] });
    } catch (e) {
      dernier = e;
      continue;
    }
    const etat = await etatReservation(reservationId).catch(() => null);
    if (etat === 'Confirmed' || etat === 'Started') return;
    dernier = new Error(`état ${etat ?? 'inconnu'}`);
  }
  throw new Error(
    'Mews n’a pas confirmé la réservation : '
    + (dernier instanceof Error ? dernier.message : String(dernier)),
  );
}

/** L'état d'une chambre tenue : est-elle encore à nous ? */
export async function etatReservation(reservationId: string): Promise<string | null> {
  const r = await callMews<{ Reservations?: { State?: string }[] }>(
    'reservations/getAll/2023-06-06',
    { ReservationIds: [reservationId], Extent: { Reservations: true }, Limitation: { Count: 1 } },
  );
  return (r.Reservations ?? [])[0]?.State ?? null;
}
