// LE RETOUR DU CLIENT APRÈS AVOIR PAYÉ SON LIEN.
//
// 🔑 C'EST ICI QUE LA VENTE SE TERMINE, pour le client dont la banque a réclamé
// une authentification que son agent ne pouvait pas lever. Il arrive de Stripe,
// il a payé, et il doit repartir avec sa confirmation — pas avec un doute.
//
// ⚠️ ET LA PAGE FAIT LE TRAVAIL, elle ne l'attend pas. `finaliserSiPaye`
// confirme la chambre, consigne le règlement, pose la note et délivre la clé.
// C'est aussi ce que fait toute relecture de la session : sans webhook, deux
// chemins valent mieux qu'un, et l'opération est idempotente — elle ne conclut
// jamais deux fois.

import Link from 'next/link';
import { finaliserSiPaye } from '@/lib/ucp/lodging';

export const dynamic = 'force-dynamic';

export default async function RetourUcp({
  searchParams,
}: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const booking = s ? await finaliserSiPaye(s).catch(() => null) : null;

  const conclu = booking?.status === 'completed';
  const confirmation = (booking?.confirmation ?? {}) as { id?: string; permalink_url?: string; pincode?: string };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        {conclu ? (
          <>
            <p className="text-xs uppercase tracking-[0.12em] text-[#C6A972]">Hôtel-Rooftop Les Voiles</p>
            <h1 className="mt-2 font-serif text-2xl text-slate-900">Votre chambre est réservée</h1>
            <p className="mt-4 text-slate-600">
              Le paiement est enregistré et votre réservation est confirmée
              {confirmation.id ? <> sous le numéro <strong className="text-slate-900">{confirmation.id}</strong></> : null}.
              Vous recevrez le code du portail et votre numéro de chambre le jour de votre arrivée,
              à partir de 15&nbsp;h.
            </p>
            {confirmation.permalink_url ? (
              <div className="mt-6 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-sm text-slate-600">Votre séjour, à garder :</p>
                <a href={confirmation.permalink_url} className="mt-1 block break-all text-sm font-medium text-[#004e7c] underline">
                  {confirmation.permalink_url}
                </a>
                {confirmation.pincode ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Code à donner au comptoir : <strong className="text-slate-900">{confirmation.pincode}</strong>
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.12em] text-[#C6A972]">Hôtel-Rooftop Les Voiles</p>
            <h1 className="mt-2 font-serif text-2xl text-slate-900">Ce paiement n’a pas abouti</h1>
            {/* ⚠️ ON NE DIT PAS « ÉCHEC » SANS SAVOIR. Le lien a pu expirer, le
                paiement être abandonné, ou la page être rouverte des heures
                plus tard. Dans tous les cas rien n'a été débité, et c'est LA
                chose que le client doit lire en premier. */}
            <p className="mt-4 text-slate-600">
              Rien n’a été débité et la chambre n’est plus tenue. Le lien de paiement n’était
              valable que quelques minutes, le temps de vous réserver la chambre.
            </p>
            <p className="mt-3 text-slate-600">
              Vous pouvez réserver à nouveau directement, au même prix.
            </p>
            <Link href="/reserver" className="mt-6 inline-block rounded-lg bg-[#004e7c] px-5 py-3 text-sm font-medium text-white">
              Réserver une chambre
            </Link>
          </>
        )}
        <p className="mt-8 text-sm text-slate-500">
          Une question ? <a href="tel:+33494413623" className="underline">04 94 41 36 23</a> ·{' '}
          <a href="mailto:contact-lesvoiles@htbm.fr" className="underline">contact-lesvoiles@htbm.fr</a>
        </p>
      </div>
    </main>
  );
}
