/* DE L'ARGENT PRIS SANS RÉSERVATION CRÉÉE — LE DIRE TOUT DE SUITE, À QUELQU'UN QUI LIT (10/11/2026).
 *
 * Depuis la bascule des Voiles vers lessclic, les anciens chemins de vente par Mews sont fermés (`/api/reserver`,
 * `carte`, `confirmer`, la vente par agent, le règlement d'un séjour). Mais une page ouverte avant la bascule, un lien
 * de paiement déjà envoyé, un webhook Stripe en retard peuvent encore arriver avec un paiement ENCAISSÉ : le client a
 * payé, et aucune réservation ne sera créée (on ne confirme plus rien chez Mews). C'est le pire cas, et il ne doit
 * jamais rester une ligne de journal.
 *
 * Trois traces, aucune ne bloque la réponse au client :
 *   · `console.error` (journal Netlify), préfixé « ARGENT SANS RESA » pour se chercher ;
 *   · un mail à l'équipe des Voiles (`hotels.email_equipe`, repli `ALERT_EMAIL`), par l'expéditeur des Voiles ;
 *   · une consigne de réception NWH.os (l'écran du matin), comme `alerte3ds.ts`.
 */

import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabase-server';
import { teamEmailForHotel } from '@/lib/hotel-email';
import { expediteurVoiles } from '@/lib/expediteurVoiles';
import { HOTEL_VOILES_NWH } from '@/lib/moteurVoiles';

export type ArgentSansResa = {
  /** D'où vient l'alerte (« /api/reserver/confirmer », « UCP webhook »…). */
  origine: string;
  /** Ce qui a été pris, en euros, quand on le sait. */
  montant?: number | null;
  /** La référence du paiement (demande Mews, PaymentIntent Stripe, session…). */
  reference?: string | null;
  /** Ce qu'on sait du client et du séjour, pour que la réception rappelle. */
  detail?: string | null;
  /** Ce qui a été fait de l'argent (« remboursé », « remboursement ÉCHOUÉ », « à rembourser »). */
  sortDeLArgent: string;
};

const echappe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function alerterArgentSansResa(a: ArgentSansResa): Promise<void> {
  const montant = a.montant != null && Number.isFinite(a.montant) ? `${a.montant.toFixed(2).replace('.', ',')} €` : 'montant inconnu';
  const ligne = `ARGENT SANS RESA — ${a.origine} · ${montant} · réf. ${a.reference ?? '?'} · ${a.sortDeLArgent}`
    + `${a.detail ? ` · ${a.detail}` : ''}`;
  console.error(ligne);

  const texte = `🔴 Site des Voiles : un paiement a été encaissé SANS réservation créée (${a.origine}). `
    + `${montant}, réf. ${a.reference ?? '?'}. ${a.sortDeLArgent}. ${a.detail ?? ''} `
    + 'Les Voiles ne vendent plus par Mews : vérifier le paiement (Mews / Stripe), rappeler le client, '
    + 'et créer la réservation dans lessclic ou confirmer le remboursement.';

  await Promise.allSettled([
    (async () => {
      const { error } = await supabaseServer.from('consignes').insert({
        texte,
        auteur: 'Moteur de réservation',
        service: 'Réception',
        date_creation: new Date().toISOString().slice(0, 10),
        date_fin: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
        valide: false,
        hotel_id: HOTEL_VOILES_NWH,
      });
      if (error) console.error('Consigne « argent sans résa » non posée :', error.message);
    })(),
    (async () => {
      const a2 = await teamEmailForHotel(HOTEL_VOILES_NWH).catch(() => process.env.ALERT_EMAIL || null);
      const { cle, from } = expediteurVoiles('Moteur de réservation');
      if (!a2 || !cle) { console.error('Mail « argent sans résa » non envoyé : destinataire ou clé Resend absent'); return; }
      await new Resend(cle).emails.send({
        from, to: a2,
        subject: `🔴 Paiement encaissé sans réservation — ${montant} (${a.origine})`,
        html: `<div style="font-family:sans-serif;max-width:560px;color:#1e293b">
          <p style="font-weight:700;color:#b91c1c">Un paiement a été encaissé sans qu'aucune réservation ne soit créée.</p>
          <p>${echappe(texte)}</p>
        </div>`,
      });
    })().catch((e) => console.error('Mail « argent sans résa » non envoyé :', e instanceof Error ? e.message : e)),
  ]);
}
