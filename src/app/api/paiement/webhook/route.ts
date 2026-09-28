import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { finaliserSiPaye } from '@/lib/ucp/lodging';
import { consignerReglements } from '@/lib/ucp/sejour';

// LE PAIEMENT QUI ARRIVE QUAND PERSONNE NE REGARDE.
//
// 🔑 POURQUOI, ALORS QUE DEUX CHEMINS CONCLUAIENT DÉJÀ. La page de retour et
// la relecture de session suffisent quand le client revient et quand l'agent
// repasse. Mais un client qui paie son lien puis ferme l'onglet, sans que
// personne ne relise — c'est de l'argent encaissé chez Stripe et une chambre
// que Mews relâche une demi-heure plus tard. Rare, et récupérable à la main :
// mais dès que des agents arriveront pour de bon, rare cessera d'être jamais.
//
// ⚠️ ET LA SIGNATURE SE VÉRIFIE, SANS EXCEPTION. Cet endpoint conclut des
// ventes et pose des règlements au folio : sans vérification, n'importe qui
// pourrait nous faire confirmer une chambre en prétendant qu'elle est payée.
// Sans secret configuré, on REFUSE — un webhook qui accepte tout est pire
// qu'un webhook absent.
//
// ⚠️ IL NE FAIT RIEN LUI-MÊME. Il appelle exactement les mêmes fonctions que
// les deux autres chemins, et elles sont idempotentes : le verrou de session
// et `consigne_le` garantissent qu'un paiement conclu deux fois ne produit
// qu'une vente. Un webhook qui aurait sa propre logique aurait fini par
// diverger des deux autres.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET_VOILES;
  const cle = process.env.STRIPE_SECRET_KEY_VOILES;
  if (!secret || !cle) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET_VOILES ou STRIPE_SECRET_KEY_VOILES manquante');
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ ok: false }, { status: 400 });

  /* Le corps BRUT, pas l'objet analysé : la signature porte sur les octets. */
  const brut = await req.text();
  let evenement: Stripe.Event;
  try {
    evenement = new Stripe(cle).webhooks.constructEvent(brut, signature, secret);
  } catch (e) {
    console.error('[webhook] signature refusée', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  /* On ne réagit qu'à ce qui nous concerne. Stripe enverra d'autres
     événements ; les ignorer en 200 évite qu'il réessaie indéfiniment. */
  if (evenement.type !== 'checkout.session.completed'
    && evenement.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ ok: true, ignore: evenement.type });
  }

  const session = evenement.data.object as Stripe.Checkout.Session;
  const marque = session.metadata ?? {};

  try {
    if (marque.ucp_session) {
      await finaliserSiPaye(String(marque.ucp_session));
    } else if (marque.sejour_jeton) {
      await consignerReglements(String(marque.sejour_jeton));
    } else {
      /* ⚠️ UN PAIEMENT SANS MARQUE NE SE DEVINE PAS. On le crie plutôt que de
       * chercher à quelle réservation il pourrait bien appartenir : mieux vaut
       * un rapprochement à la main qu'un règlement posé au mauvais dossier. */
      console.error('[webhook] PAIEMENT SANS ORIGINE — a rapprocher a la main', session.id);
    }
  } catch (e) {
    /* ⚠️ ON REND 500 POUR QUE STRIPE RÉESSAIE. L'argent est déjà pris : c'est
     * exactement le cas où insister vaut mieux qu'abandonner. */
    console.error('[webhook] conclusion impossible', session.id, e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
