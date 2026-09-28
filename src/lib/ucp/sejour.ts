// LE SÉJOUR, UNE FOIS QU'IL EXISTE — le lire, et régler sa note.
//
// 🔑 TOUT CE QUI EST ICI EXIGE LA CLÉ DU SÉJOUR, sans exception. Vendre est
// ouvert à tous ; toucher un séjour ne l'est à personne d'autre que celui qui
// détient le jeton. C'est la règle posée par Martin le 28/09/2026 — « sinon
// quelqu'un d'anonyme peut annuler toutes les resa » — et elle vaut aussi pour
// la simple LECTURE : le nom d'un client et le détail de sa note ne regardent
// que lui.
//
// ⚠️ ET ON NE PROPOSE NI ANNULATION NI MODIFICATION. « Changement de date non,
// non annulable non modifiable. » Le tarif vendu aux agents est prépayé : il
// n'y a donc rien à annuler ni à changer, et un outil qui le laisserait croire
// créerait une attente qu'on refuserait ensuite. Une porte absente ne s'ouvre
// pas par erreur.

import { callMews } from '@/lib/mewsConnector';
import { supabaseServer } from '@/lib/supabase-server';
import { SITE_URL } from '@/lib/site';
import { lienDePaiement, paiementDuLien, urlDuLien, LIEN_MINUTES } from '@/lib/ucp/paiement';
import { consignerPaiement } from '@/lib/ucp/reservationMews';

export type LigneNote = { date: string; libelle: string; montant: number };
export type Note = {
  lignes: LigneNote[];
  total: number;
  regle: number;
  solde: number;
  devise: string;
  /** 🔴 Un règlement que NOUS avons posé et que Mews n'expose pas encore. */
  enAttente: boolean;
};

/** Un libellé Mews arrive parfois multilingue. */
function texte(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object') {
    const m = v as Record<string, unknown>;
    for (const c of ['fr-FR', 'fr', 'en-US', 'en']) if (typeof m[c] === 'string') return String(m[c]).trim();
    const p = Object.values(m).find((x) => typeof x === 'string');
    if (p) return String(p).trim();
  }
  return '';
}

const LIBELLES: Record<string, string> = {
  SpaceOrder: 'Hébergement',
  ProductOrder: 'Prestation',
  OrderItem: 'Prestation',
};

/** La note du séjour : ce qui est dû, ce qui est réglé, ce qui reste. */
export async function noteDuSejour(
  { reservationId, accountId }: { reservationId: string; accountId?: string | null },
): Promise<Note> {
  const items = await callMews<{
    OrderItems?: {
      Type?: string; ConsumedUtc?: string; Amount?: { GrossValue?: number; Currency?: string };
      Data?: { Name?: unknown };
    }[];
  }>('orderItems/getAll', { ServiceOrderIds: [reservationId], Limitation: { Count: 200 } });

  const lignes: LigneNote[] = [];
  let total = 0;
  let devise = 'EUR';
  for (const o of items.OrderItems ?? []) {
    const m = o.Amount?.GrossValue ?? 0;
    total += m;
    if (o.Amount?.Currency) devise = String(o.Amount.Currency);
    lignes.push({
      date: String(o.ConsumedUtc ?? '').slice(0, 10),
      libelle: texte(o.Data?.Name) || LIBELLES[String(o.Type ?? '')] || 'Prestation',
      montant: Math.round(m * 100) / 100,
    });
  }
  lignes.sort((a, b) => a.date.localeCompare(b.date));

  /* ⚠️ LES RÈGLEMENTS SONT PORTÉS PAR LE COMPTE, PAS PAR LA RÉSERVATION, et
   * ils arrivent en NÉGATIF. Les additionner sans regarder le signe ferait
   * afficher un solde double — c'est exactement ce qui m'était arrivé en
   * vérifiant la première vente agentique. */
  let regle = 0;
  if (accountId) {
    const p = await callMews<{
      Payments?: { State?: string; Amount?: { GrossValue?: number; Value?: number } }[];
    }>('payments/getAll', { AccountIds: [accountId], Limitation: { Count: 100 } }).catch(() => ({ Payments: [] }));
    for (const x of p.Payments ?? []) {
      if (x.State === 'Canceled' || x.State === 'Failed') continue;
      regle += Math.abs(x.Amount?.GrossValue ?? x.Amount?.Value ?? 0);
    }
  }

  const arrondi = (n: number) => Math.round(n * 100) / 100;
  const solde = arrondi(total - regle);

  /* 🔴 MEWS MET QUELQUES SECONDES À EXPOSER UN RÈGLEMENT QU'ON VIENT DE POSER.
   * Mesuré le 28/09/2026 : la page du séjour, ouverte dans la foulée d'une
   * vente, affichait « Déjà réglé 0,00 € · Reste à régler 315,44 € » — alors
   * que le client venait de payer, et que le règlement était bien au folio
   * quelques secondes plus tard.
   *
   * Un client qui lit ça paie une seconde fois. On regarde donc NOS propres
   * écritures : si nous avons encaissé pour cette réservation dans les trois
   * dernières minutes, le solde affiché n'est pas fiable, et on le dit au lieu
   * de proposer de payer. */
  let enAttente = false;
  if (solde > 0) {
    const recemment = new Date(Date.now() - 3 * 60_000).toISOString();
    const [vente, reglement] = await Promise.all([
      supabaseServer.from('resa_agent').select('id')
        .eq('mews_reservation_id', reservationId).gt('cree_le', recemment).limit(1),
      supabaseServer.from('sejour_paiement').select('checkout')
        .eq('mews_reservation_id', reservationId).gt('consigne_le', recemment).limit(1),
    ]);
    enAttente = Boolean((vente.data ?? []).length || (reglement.data ?? []).length);
  }

  return {
    lignes,
    total: arrondi(total),
    regle: arrondi(regle),
    solde,
    devise,
    enAttente,
  };
}

export type Sejour = {
  numero: string | null;
  statut: string | null;
  arrivee: string;
  depart: string;
  chambre: string | null;
  accountId: string | null;
};

/** Ce qu'est ce séjour, vu du PMS. */
export async function lireSejour(reservationId: string): Promise<Sejour | null> {
  const r = await callMews<{
    Reservations?: {
      Number?: string; State?: string; StartUtc?: string; EndUtc?: string;
      AccountId?: string | null; AssignedResourceId?: string | null;
    }[];
  }>('reservations/getAll/2023-06-06', {
    ReservationIds: [reservationId], Extent: { Reservations: true }, Limitation: { Count: 1 },
  });
  const v = (r.Reservations ?? [])[0];
  if (!v) return null;

  let chambre: string | null = null;
  if (v.AssignedResourceId) {
    const res = await callMews<{ Resources?: { Name?: string }[] }>('resources/getAll', {
      ResourceIds: [v.AssignedResourceId], Extent: { Resources: true }, Limitation: { Count: 1 },
    }).catch(() => ({ Resources: [] }));
    chambre = (res.Resources ?? [])[0]?.Name ?? null;
  }

  return {
    numero: v.Number ?? null,
    statut: v.State ?? null,
    arrivee: String(v.StartUtc ?? '').slice(0, 10),
    depart: String(v.EndUtc ?? '').slice(0, 10),
    chambre,
    accountId: v.AccountId ?? null,
  };
}

/* ═══════════════════════ RÉGLER SA NOTE ════════════════════════════════════
 *
 * ⚠️ STRIPE ENCAISSE, MAIS C'EST NOUS QUI DEVONS LE DIRE À MEWS. Sans la
 * consignation au folio, le dossier reste dû dans le PMS et la réception
 * réclame au comptoir un montant déjà payé. C'est l'erreur que la borne a
 * commise pendant des mois.
 */

export type ReglementOuvert = { url: string; checkout: string; montant: number; expire: string };

/** Ouvre un règlement pour le solde d'un séjour. */
export async function ouvrirReglement(
  { jeton, hotelId, reservationId, accountId, centimes, libelle, email }:
  { jeton: string; hotelId: string; reservationId: string; accountId: string | null;
    centimes: number; libelle: string; email?: string },
): Promise<ReglementOuvert> {
  /* 🔴 ON N'OUVRE PAS DE RÈGLEMENT SUR UN SOLDE QU'ON SAIT FAUX — voir
   * `noteDuSejour` : Mews met quelques secondes à exposer ce qu'on vient de
   * poser, et c'est exactement là qu'un client paierait deux fois. */

  /* ⚠️ UN SEUL LIEN VIVANT À LA FOIS. Chaque appel créait une session Stripe
   * de plus : dix appels, dix liens pour le même solde — et si le client en
   * paie deux, `consignerReglements` pose les deux au folio. Il a payé deux
   * fois. On rend donc celui qui court encore. */
  const { data: deja } = await supabaseServer.from('sejour_paiement')
    .select('checkout, centimes, expire_le')
    .eq('jeton', jeton).eq('centimes', centimes).is('consigne_le', null)
    .gt('expire_le', new Date().toISOString())
    .order('cree_le', { ascending: false }).limit(1).maybeSingle();
  if (deja?.checkout) {
    const url = await urlDuLien(String(deja.checkout));
    if (url) {
      return {
        url, checkout: String(deja.checkout),
        montant: Number(deja.centimes) / 100, expire: String(deja.expire_le),
      };
    }
  }

  const lien = await lienDePaiement({
    centimes, description: libelle, email,
    retour: `${SITE_URL}/sejour/${jeton}?paye=1`,
  });
  const { error } = await supabaseServer.from('sejour_paiement').insert({
    checkout: lien.checkout, jeton, hotel_id: hotelId,
    mews_reservation_id: reservationId, mews_account_id: accountId,
    centimes, expire_le: lien.expire,
  });
  if (error) throw new Error(`Règlement non ouvert : ${error.message}`);
  return { url: lien.url, checkout: lien.checkout, montant: centimes / 100, expire: lien.expire };
}

/**
 * Consigne dans Mews les règlements payés mais pas encore posés, pour ce séjour.
 *
 * 🔑 APPELÉE PAR LES DEUX BOUTS — la page de retour et toute relecture de la
 * note — parce qu'aucun des deux n'est garanti. `consigne_le` empêche qu'un
 * même règlement soit posé deux fois au folio.
 */
export async function consignerReglements(jeton: string): Promise<number> {
  const { data } = await supabaseServer.from('sejour_paiement')
    .select('checkout, mews_reservation_id, mews_account_id, centimes')
    .eq('jeton', jeton).is('consigne_le', null);

  let poses = 0;
  for (const r of data ?? []) {
    const paiement = await paiementDuLien(String(r.checkout));
    if (!paiement) continue;
    try {
      await consignerPaiement({
        accountId: String(r.mews_account_id ?? ''),
        reservationId: String(r.mews_reservation_id),
        montant: Number(r.centimes) / 100,
        reference: paiement,
      });
      await supabaseServer.from('sejour_paiement')
        .update({ consigne_le: new Date().toISOString(), paiement_ref: paiement })
        .eq('checkout', String(r.checkout));
      poses += 1;
    } catch (e) {
      /* ⚠️ L'ARGENT EST PRIS : on ne perd pas la ligne, on la laisse en
       * attente pour le passage suivant, et on le crie dans les journaux. */
      console.error('[sejour] REGLEMENT ENCAISSE NON CONSIGNE DANS MEWS',
        { checkout: r.checkout, montant: Number(r.centimes) / 100 },
        e instanceof Error ? e.message : e);
    }
  }
  return poses;
}

export { LIEN_MINUTES };
