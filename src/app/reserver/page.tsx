import type { Metadata } from "next";
import ReserverClient from "./ReserverClient";
import { alternatesFor } from "@/lib/site";
import { balisageReserver } from "@/lib/balisageReserver";
import { chambresPubliees } from "@/lib/chambresPubliees";

export const metadata: Metadata = {
  title: "Réserver à l'Hôtel-Rooftop Les Voiles — Toulon Mourillon",
  description:
    "Réservez en direct à l'Hôtel-Rooftop Les Voiles, Toulon Mourillon. Petit-déjeuner inclus, prix tout compris, annulation gratuite jusqu'au jour d'arrivée.",
  alternates: alternatesFor("/reserver"),
};

/* ⚠️ UNE HEURE DE CACHE, PAS PLUS ET PAS MOINS. Le balisage interroge le vrai
 * moteur pour publier un « à partir de » mesuré : le recalculer à chaque
 * visite ferait deux appels Mews par page vue, le figer au build le rendrait
 * faux dès le lendemain. Une heure suit les mouvements de prix d'un hôtel sans
 * peser sur le moteur. */
export const revalidate = 3600;

export default async function Page() {
  const [balisage, chambres] = await Promise.all([
    balisageReserver("fr", "/reserver"),
    chambresPubliees().catch(() => []),
  ]);
  return (
    <>
      {/* Le bloc part dans le HTML RENDU PAR LE SERVEUR : un agent qui ne joue
          pas le JavaScript le lit quand même. Posé dans une page client, il
          n'aurait existé que pour les navigateurs. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(balisage) }}
      />
      <ReserverClient langue="fr" />

      {/* 🔴 LES CHAMBRES, ÉCRITES DANS LE HTML — et c'est tout l'enjeu.
          Mesuré le 28/09/2026 avec l'agent utilisateur d'OpenAI : ni
          « Chambre », ni « Tarif », ni « € » n'apparaissaient dans le HTML de
          cette page. Le moteur est rendu par JavaScript, et les crawlers
          d'OpenAI, d'Anthropic et de Perplexity le téléchargent sans jamais
          l'exécuter. La page qui VEND les nuits ne disait donc à une machine
          ni ce qu'on loue, ni à quel prix.

          ⚠️ DISCRET, ET C'EST UNE CONSIGNE. Ce bloc vient APRÈS le moteur : il
          ne doit pas concurrencer le geste de réserver, seulement exister pour
          qui lit la page — machine ou humain qui fait défiler. Pas de cartes,
          pas de couleur, pas d'appel à l'action. */}
      {chambres.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pb-16 pt-2">
          {/* ⚠️ REPLIÉ, PAS CACHÉ — et la nuance est tout le sujet.
              Masquer en CSS ce qu'on écrit pour les robots est du cloaking :
              le texte reste dans le HTML brut, mais il disparaît de l'arbre
              d'accessibilité et des captures — les deux autres façons dont un
              agent regarde une page — et ça tombe sous les règles anti-spam.
              Un bloc dépliable, lui, est un motif d'interface légitime,
              indexé normalement depuis le passage au mobile-first.

              À l'écran il ne reste qu'une ligne. Dans le HTML, tout y est —
              et c'est la seule chose qu'une machine trouve de nos chambres,
              le moteur au-dessus étant rendu en JavaScript qu'aucun crawler
              IA n'exécute. */}
          <details className="group">
            <summary className="cursor-pointer list-none text-xs uppercase tracking-[0.12em] text-slate-400 hover:text-slate-500">
              Les chambres
              <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
            </summary>
            <ul className="mt-3 space-y-2">
              {chambres.map((c) => (
                <li key={c.id} className="text-xs leading-relaxed text-slate-400">
                  <span className="text-slate-500">{c.nom}</span>
                  {[c.surface ? `${c.surface} m²` : null,
                    c.couchages ? `${c.couchages} pers.` : null,
                    c.aPartirDe !== null ? `dès ${c.aPartirDe} €` : null]
                    .filter(Boolean).map((x) => <span key={x as string}> · {x}</span>)}
                  {c.description ? <span className="block">{c.description}</span> : null}
                </li>
              ))}
              <li className="text-xs text-slate-400">
                Prix tout compris, petit-déjeuner et taxe de séjour inclus.
              </li>
            </ul>
          </details>
        </section>
      )}
    </>
  );
}
