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
        <section className="mx-auto max-w-3xl px-6 pb-20 pt-4">
          <h2 className="font-serif text-lg text-slate-700">Les chambres</h2>
          <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
            {chambres.map((c) => (
              <div key={c.id} className="py-4">
                <dt className="flex items-baseline justify-between gap-4">
                  <span className="font-medium text-slate-800">{c.nom}</span>
                  {c.aPartirDe !== null && (
                    <span className="shrink-0 tabular-nums text-sm text-slate-500">
                      dès {c.aPartirDe}&nbsp;€ la nuit
                    </span>
                  )}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-500">
                  {c.description}
                  {(c.surface || c.couchages) && (
                    <span className="block text-slate-400">
                      {[c.surface ? `${c.surface} m²` : null,
                        c.couchages ? `${c.couchages} personne${c.couchages > 1 ? 's' : ''}` : null]
                        .filter(Boolean).join(' · ')}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-400">
            Prix tout compris, petit-déjeuner et taxe de séjour inclus.
          </p>
        </section>
      )}
    </>
  );
}
