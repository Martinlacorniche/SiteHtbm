import { notFound } from "next/navigation";
import Moteur, { type ContenuCategorie, type Privilege, type Recit } from "./Moteur";
import { pageMoteurCorniche } from "@/lib/moteurNwh/pageCorniche";
import { balisageCorniche } from "@/lib/moteurNwh/balisageCorniche";

/** La page du moteur, en français ou en anglais (les deux adresses la partagent). */
export async function pageCorniche(langue: "fr" | "en") {
  const p = await pageMoteurCorniche(langue);
  if (!p?.cfg) notFound();
  const chemin = langue === "en" ? "/en/book-corniche" : "/reserver-corniche";
  const b = await balisageCorniche(p, langue, chemin).catch(() => null);
  const en = langue === "en";
  return (
    <>
      {/* Rendu par le serveur : un agent qui ne joue pas le JavaScript le lit quand même. */}
      {b && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(b.ld) }} />}
      <Moteur
        langue={langue} hotel={p.slug} hotelId={p.cfg.hotelId} nom={p.marque.nom} adresse={p.marque.adresse}
        maison="corniche" cfg={p.cfg}
        contenu={p.categories as Record<string, ContenuCategorie>}
        privileges={p.privileges as Privilege[]} recit={p.recit as Recit | null}
        telephone={p.marque.telephone} taxeSejour={p.taxeSejour}
        carteRooftop="" nomBar=""
        couleur={p.marque.couleur} accent={p.marque.accent} logo={p.marque.logo ?? ""} policeTitre={p.marque.policeTitre ?? undefined}
        parcours="a"
      />
      {/* 🔴 LES CHAMBRES ET NOS PLUS, ÉCRITS DANS LE HTML — le moteur au-dessus est rendu en JavaScript,
          qu'aucun crawler IA n'exécute. Replié, pas caché (masquer en CSS serait du cloaking), discret,
          après le moteur : même règle que `/reserver` des Voiles. */}
      {b && b.chambres.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pb-16 pt-2">
          <details className="group">
            <summary className="cursor-pointer list-none text-xs uppercase tracking-[0.12em] text-slate-400 hover:text-slate-500">
              {en ? "The rooms" : "Les chambres"}
              <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
            </summary>
            <ul className="mt-3 space-y-2">
              {b.chambres.map((c) => (
                <li key={c.nom} className="text-xs leading-relaxed text-slate-400">
                  <span className="text-slate-500">{c.nom}</span>
                  {c.description ? <span className="block">{c.description}</span> : null}
                </li>
              ))}
              {b.bas ? (
                <li className="text-xs text-slate-400">
                  {en ? `From €${b.bas} per night, booked direct.` : `Dès ${b.bas} € la nuit, en direct.`}
                </li>
              ) : null}
              {b.plus.length > 0 && (
                <li className="text-xs text-slate-400">
                  <span className="text-slate-500">{en ? "Why you’ll love it" : "Nos plus"}</span>
                  <span className="block">{b.plus.join(" · ")}</span>
                </li>
              )}
            </ul>
          </details>
        </section>
      )}
    </>
  );
}
