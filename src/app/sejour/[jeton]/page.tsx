// VOTRE SÉJOUR — la page derrière la clé.
//
// 🔴 ELLE N'EXISTAIT PAS. `ouvrirAcces` rend `/sejour/<jeton>` et le met dans la
// confirmation UCP ; `pay_folio` s'en sert comme adresse de retour après
// paiement. Les deux envoyaient sur un 404 : le seul endroit où la clé est
// remise au client, et où son règlement devait se consigner.
//
// ⚠️ ET ELLE FAIT LE TRAVAIL, elle ne l'attend pas. `consignerReglements` est
// appelée au chargement : sans webhook, c'est le retour de Stripe qui dit à
// Mews que l'argent est arrivé. Sans elle, le client paie et le folio reste dû
// — le mode de défaillance de la borne, à l'identique.
//
// ⚠️ UN JETON INVALIDE NE SE MOTIVE PAS. Inconnu, expiré ou révoqué : la même
// page. Distinguer les trois apprendrait à qui tâtonne s'il a trouvé quelque
// chose.

import Link from 'next/link';
import { reconnaitre } from '@/lib/ucp/acces';
import { lireSejour, noteDuSejour, consignerReglements } from '@/lib/ucp/sejour';
import { arrivee, HEURE_ARRIVEE } from '@/lib/ucp/checkin';

export const dynamic = 'force-dynamic';

const euro = (centimes: number) => `${(centimes / 100).toFixed(2).replace('.', ',')} €`;

export default async function PageSejour({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const ouvert = await reconnaitre(jeton).catch(() => null);
  const sejour = ouvert ? await lireSejour(ouvert.reservationId).catch(() => null) : null;

  if (!ouvert || !sejour) {
    return (
      <Cadre titre="Ce lien n’est plus valable">
        <p className="text-slate-600">
          Il a peut-être expiré. Votre réservation, elle, n’est pas affectée — l’hôtel la retrouvera
          avec votre nom.
        </p>
        <Contact />
      </Cadre>
    );
  }

  /* Un règlement payé mais pas encore posé au folio fausserait la note qu'on
     s'apprête à montrer : on le consigne avant de lire. */
  await consignerReglements(jeton).catch(() => 0);
  const note = await noteDuSejour({ reservationId: ouvert.reservationId, accountId: sejour.accountId })
    .catch(() => null);
  const a = await arrivee({ hotelId: ouvert.hotelId, reservationId: ouvert.reservationId, reference: `ucp:${jeton}` })
    .catch(() => null);

  const dateFr = (d: string) => {
    try { return new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch { return d; }
  };

  return (
    <Cadre titre="Votre séjour">
      <p className="text-slate-600">
        Du <strong className="text-slate-900">{dateFr(sejour.arrivee)}</strong> au{' '}
        <strong className="text-slate-900">{dateFr(sejour.depart)}</strong>
        {sejour.numero ? <> · réservation {sejour.numero}</> : null}
      </p>

      {/* ── L'arrivée. C'est ce que le client vient chercher le jour J. ── */}
      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-[0.12em] text-slate-400">Votre arrivée</h2>
        {a?.pret ? (
          <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <Ligne libelle="Chambre" valeur={a.chambre} />
            {a.code_portail ? <Ligne libelle="Portail" valeur={a.code_portail} note={a.note_portail} /> : null}
            {a.code_porte_entree ? <Ligne libelle="Porte d’entrée" valeur={a.code_porte_entree} note={a.note_porte_entree} /> : null}
            {a.code_chambre
              ? <Ligne libelle="Chambre — code" valeur={a.code_chambre} note={a.note_chambre} />
              : <p className="pt-1 text-sm text-slate-500">{a.note_chambre}</p>}
          </div>
        ) : (
          <p className="mt-3 text-slate-600">
            {a?.raison ?? `Les codes vous seront donnés le jour de votre arrivée, à partir de ${HEURE_ARRIVEE} h.`}
          </p>
        )}
      </section>

      {/* ── La note. ── */}
      {note ? (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-[0.12em] text-slate-400">Votre note</h2>
          <div className="mt-3 rounded-xl ring-1 ring-slate-200">
            {note.lignes.map((l, i) => (
              <div key={i} className="flex items-baseline justify-between px-4 py-2.5 text-sm border-b border-slate-100 last:border-0">
                <span className="text-slate-700">{l.libelle}<span className="ml-2 text-slate-400">{l.date}</span></span>
                <span className="tabular-nums text-slate-900">{euro(Math.round(l.montant * 100))}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-baseline justify-between text-sm">
            <span className="text-slate-500">Déjà réglé</span>
            <span className="tabular-nums text-slate-700">{euro(Math.round(note.regle * 100))}</span>
          </div>
          {/* 🔴 UN SOLDE QU'ON SAIT FAUX NE S'AFFICHE PAS. Mews met quelques
              secondes à exposer un règlement qu'on vient de poser ; montrer
              « reste à régler » à ce moment-là fait payer deux fois. */}
          {note.enAttente ? (
            <p className="mt-3 text-slate-600">
              Votre règlement vient d’être enregistré et n’apparaît pas encore ici.
              Rechargez la page dans quelques instants — il n’y a rien d’autre à faire.
            </p>
          ) : (
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-medium text-slate-900">
                {note.solde > 0 ? 'Reste à régler' : 'Tout est réglé'}
              </span>
              <span className="tabular-nums text-lg font-medium text-slate-900">{euro(Math.round(note.solde * 100))}</span>
            </div>
          )}
        </section>
      ) : null}

      <Contact />
    </Cadre>
  );
}

function Ligne({ libelle, valeur, note }: { libelle: string; valeur: string | null; note?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-slate-500">{libelle}</span>
      <span className="text-right">
        <span className="font-medium tracking-wide text-slate-900">{valeur}</span>
        {note ? <span className="block text-xs text-slate-500">{note}</span> : null}
      </span>
    </div>
  );
}

function Contact() {
  return (
    <p className="mt-8 border-t border-slate-100 pt-6 text-sm text-slate-500">
      Une question ? <a href="tel:+33494413623" className="underline">04 94 41 36 23</a> ·{' '}
      <a href="mailto:contact-lesvoiles@htbm.fr" className="underline">contact-lesvoiles@htbm.fr</a>
    </p>
  );
}

function Cadre({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <Link href="/" className="text-xs uppercase tracking-[0.12em] text-[#C6A972]">
          Hôtel-Rooftop Les Voiles
        </Link>
        <h1 className="mt-2 font-serif text-2xl text-slate-900">{titre}</h1>
        {children}
      </div>
    </main>
  );
}
