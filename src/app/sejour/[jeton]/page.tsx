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

// 🔁 LES VOILES SONT SUR LESSCLIC DEPUIS LE 10/11/2026. Plus rien ne se lit chez Mews : le séjour, la chambre,
// son ménage et la note viennent de lessclic par NWH (`sejourLessclic.ts`), dans le modèle de lessclic — des
// factures, ouvertes ou émises avec leur numéro, chacune avec ses lignes. Une facture émise se télécharge ; une note
// se règle par le lien de lessclic, sur le Stripe de l'hôtel (jamais Mews).

import Link from 'next/link';
import { reconnaitre } from '@/lib/ucp/acces';
import { lireSejour, noteDuSejour, consignerReglements, VOILES_HORS_MEWS } from '@/lib/ucp/sejour';
import { arrivee, arriveeLessclic, HEURE_ARRIVEE, type Arrivee } from '@/lib/ucp/checkin';
import {
  lireSejourLessclic, facturesAReglerEnLigne, type SejourLessclic, type FactureLessclic, type LigneLessclic,
} from '@/lib/ucp/sejourLessclic';

export const dynamic = 'force-dynamic';

const euro = (centimes: number) => `${(centimes / 100).toFixed(2).replace('.', ',')} €`;
const euros = (montant: number) => euro(Math.round(montant * 100));

const dateFr = (d: string) => {
  try { return new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }
  catch { return d; }
};
const jourCourt = (d: string | null) => {
  if (!d) return '';
  try { return new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }
  catch { return d; }
};

function LienInvalide() {
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

export default async function PageSejour(
  { params, searchParams }:
  { params: Promise<{ jeton: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  const { jeton } = await params;
  const q = await searchParams;
  const ouvert = await reconnaitre(jeton).catch(() => null);
  if (!ouvert) return <LienInvalide />;

  if (VOILES_HORS_MEWS) {
    return <SejourLessclicPage jeton={jeton} hotelId={ouvert.hotelId} reglerIndisponible={q.regler === 'indisponible'} />;
  }

  const sejour = await lireSejour(ouvert.reservationId).catch(() => null);
  if (!sejour) return <LienInvalide />;

  /* Un règlement payé mais pas encore posé au folio fausserait la note qu'on
     s'apprête à montrer : on le consigne avant de lire. */
  await consignerReglements(jeton).catch(() => 0);
  const note = await noteDuSejour({ reservationId: ouvert.reservationId, accountId: sejour.accountId })
    .catch(() => null);
  const a = await arrivee({ hotelId: ouvert.hotelId, reservationId: ouvert.reservationId, reference: `ucp:${jeton}` })
    .catch(() => null);

  return (
    <Cadre titre="Votre séjour">
      <p className="text-slate-600">
        Du <strong className="text-slate-900">{dateFr(sejour.arrivee)}</strong> au{' '}
        <strong className="text-slate-900">{dateFr(sejour.depart)}</strong>
        {sejour.numero ? <> · réservation {sejour.numero}</> : null}
      </p>

      <SectionArrivee a={a} />

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

/* ═══════════════════════ LES VOILES, SUR LESSCLIC ═════════════════════════ */

async function SejourLessclicPage(
  { jeton, hotelId, reglerIndisponible }: { jeton: string; hotelId: string; reglerIndisponible: boolean },
) {
  let s: SejourLessclic | null;
  try {
    s = await lireSejourLessclic(jeton);
  } catch (e) {
    /* ⛔ UNE PANNE NE S'AFFICHE PAS EN NOTE VIDE, ni en « tout est réglé ». */
    console.error('[sejour] lessclic par NWH injoignable', e instanceof Error ? e.message : e);
    return (
      <Cadre titre="Votre séjour">
        <p className="text-slate-600">Votre séjour ne peut pas être affiché pour le moment. Réessayez dans quelques minutes.</p>
        <Contact />
      </Cadre>
    );
  }
  if (!s) return <LienInvalide />;

  const a = await arriveeLessclic({ hotelId, sejour: s.sejour, reference: `ucp:${jeton}` }).catch(() => null);
  const aRegler = new Set(facturesAReglerEnLigne(s).map((f) => f.id));
  const factures = s.note.factures.filter((f) => f.lignes.length || f.totalTtc !== 0);
  const { sejour, note } = s;

  return (
    <Cadre titre="Votre séjour">
      {sejour.arrivee && sejour.depart ? (
        <p className="text-slate-600">
          Du <strong className="text-slate-900">{dateFr(sejour.arrivee)}</strong> au{' '}
          <strong className="text-slate-900">{dateFr(sejour.depart)}</strong>
          {sejour.numero ? <> · réservation {sejour.numero}</> : null}
        </p>
      ) : null}

      <SectionArrivee a={a} />

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-[0.12em] text-slate-400">Votre note</h2>
        {note.priseEnCharge ? (
          <p className="mt-3 text-sm text-slate-500">La part réglée par {note.priseEnCharge} n’apparaît pas ici.</p>
        ) : null}

        <div className="mt-3 space-y-3">
          {factures.map((f) => (
            <CarteFacture key={f.id} f={f} jeton={jeton} regler={aRegler.has(f.id)} />
          ))}
          {note.sansFacture.length ? (
            <div className="rounded-xl ring-1 ring-slate-200">
              {note.sansFacture.map((l) => <LigneNote key={l.id} l={l} />)}
            </div>
          ) : null}
          {!factures.length && !note.sansFacture.length ? (
            <p className="text-sm text-slate-500">Rien n’est encore porté sur votre note.</p>
          ) : null}
        </div>

        <div className="mt-4 flex items-baseline justify-between text-sm">
          <span className="text-slate-500">Déjà réglé</span>
          <span className="tabular-nums text-slate-700">{euros(note.payeTtc)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="font-medium text-slate-900">{note.resteTtc > 0 ? 'Reste à régler' : 'Tout est réglé'}</span>
          <span className="tabular-nums text-lg font-medium text-slate-900">{euros(note.resteTtc)}</span>
        </div>
        {note.resteTtc > 0 && (reglerIndisponible || !aRegler.size) ? (
          <p className="mt-3 text-sm text-slate-600">Le règlement se fait à l’hôtel, ou par le lien de paiement qu’il vous envoie.</p>
        ) : null}
      </section>

      <Contact />
    </Cadre>
  );
}

function CarteFacture({ f, jeton, regler }: { f: FactureLessclic; jeton: string; regler: boolean }) {
  const base = `/sejour/${encodeURIComponent(jeton)}`;
  return (
    <div className="rounded-xl ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 px-4 py-2.5">
        <span className="text-sm font-medium text-slate-900">
          {f.emise ? `Facture n° ${f.numero ?? ''}`.trim() : (f.nom || 'Note en cours')}
        </span>
        <span className="tabular-nums text-sm font-medium text-slate-900">{euros(f.totalTtc)}</span>
      </div>
      {f.lignes.map((l) => <LigneNote key={l.id} l={l} />)}
      {f.emise || regler ? (
        <div className="flex justify-end gap-4 px-4 py-2.5 text-sm">
          {f.emise ? <a href={`${base}/facture/${encodeURIComponent(f.id)}`} className="underline text-slate-700">Télécharger</a> : null}
          {regler ? <a href={`${base}/regler/${encodeURIComponent(f.id)}`} className="font-medium text-[#8a6d3b] underline">Régler en ligne</a> : null}
        </div>
      ) : null}
    </div>
  );
}

function LigneNote({ l }: { l: LigneLessclic }) {
  return (
    <div className="flex items-baseline justify-between border-b border-slate-100 px-4 py-2 text-sm last:border-0">
      <span className={l.aVenir ? 'text-slate-400' : 'text-slate-700'}>
        {l.nom}<span className="ml-2 text-slate-400">{jourCourt(l.jour)}{l.aVenir ? ' · à venir' : ''}</span>
      </span>
      <span className={`tabular-nums ${l.aVenir ? 'text-slate-400' : 'text-slate-900'}`}>{euros(l.totalTtc)}</span>
    </div>
  );
}

/* ── L'arrivée. C'est ce que le client vient chercher le jour J. ── */
function SectionArrivee({ a }: { a: Arrivee | null }) {
  return (
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
