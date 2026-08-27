import Link from "next/link";
import { Instagram, Facebook, Phone, MapPin } from "lucide-react";
import { ETABLISSEMENTS, RESEAUX, lienReservation } from "@/lib/site";

// Pied de page commun a tout le site.
//
// Il existe pour deux raisons. La premiere est humaine : ou dormir, comment
// appeler, ou nous trouver — sur toutes les pages, pas seulement l'accueil.
// La seconde est le maillage : les cinq pages de contenu (hotel bord de mer,
// plages du Mourillon, seminaire, villa, guide) n'etaient liees depuis nulle
// part et ne vivaient que du sitemap.
//
// Les coordonnees viennent de lib/site.ts : les memes partout, c'est ce que
// Google recoupe.

// Les pages etrangeres pointent vers leurs equivalents quand ils existent :
// envoyer un lecteur anglophone sur une page francaise, c'est le perdre.
/* ⚠️ Cette colonne est le SEUL lien interne vers `/ou-dormir-a-toulon`, qui
 * alimente lui-meme la villa, le seminaire, le bord de mer et les plages. L'en
 * retirer orphelinerait cinq pages d'un coup — c'est precisement ce que le pied
 * de page a ete ecrit pour eviter. Verifie le 25/08/2026 avant d'y toucher :
 *   grep -rn '"/la-page"' src/ --include=*.tsx | grep -v PiedDePage
 * Le Journal et Le Rooftop en sont sortis ce jour-la, a la demande de Martin :
 * eux sont lies ailleurs (accueil pour l'un, trois endroits pour l'autre). */
const DECOUVRIR: Record<"fr" | "en", { href: string; libelle: string }[]> = {
  fr: [
    { href: "/hotel-bord-de-mer-toulon", libelle: "Hôtel bord de mer" },
    { href: "/hotel-plage-mourillon", libelle: "Hôtels plages du Mourillon" },
    { href: "/villa-les-voiles-toulon", libelle: "La Villa, privatisable" },
    { href: "/hotel-seminaire-toulon", libelle: "Séminaires & groupes" },
    { href: "/ou-dormir-a-toulon", libelle: "Où dormir à Toulon" },
  ],
  en: [
    { href: "/en/seafront-hotel-toulon", libelle: "Seafront hotel" },
    { href: "/en/mourillon-beach-hotels", libelle: "Mourillon beach hotels" },
    { href: "/en/villa-les-voiles-toulon", libelle: "The Villa, exclusive use" },
    { href: "/en/toulon-business-hotel", libelle: "Business & groups" },
    { href: "/en/where-to-stay-in-toulon", libelle: "Where to stay in Toulon" },
  ],
};

const MOTS = {
  fr: { decouvrir: "Découvrir", reserver: "Réserver", hotel: "Découvrir l'hôtel", ecrire: "Écrire", mentions: "Mentions légales", cgv: "CGV", site: "Le site" },
  en: { decouvrir: "Discover", reserver: "Book", hotel: "About the hotel", ecrire: "Email us", mentions: "Legal notice", cgv: "Terms", site: "The site" },
};

// La page « hotel » a une version anglaise ; ailleurs on retombe sur le francais.
const PAGES_EN: Record<string, string> = {
  "/hotel-bord-de-mer-toulon": "/en/seafront-hotel-toulon",
  "/hotel-plage-mourillon": "/en/mourillon-beach-hotels",
};
function pageDe(hotel: string, langue: "fr" | "en") {
  const fr = ETABLISSEMENTS.find(e => e.hotel === hotel)!.page;
  return langue === "en" ? PAGES_EN[fr] ?? fr : fr;
}

/**
 * @param langue  Les libelles et les liens du pied de page. Les pages ES, IT
 *                et DE prennent "en" : mieux vaut l'anglais que du francais
 *                pour un lecteur qui ne lit ni l'un ni l'autre.
 */
export default function PiedDePage({ langue = "fr" }: { langue?: "fr" | "en" }) {
  const mots = MOTS[langue];
  return (
    <footer className="border-t border-slate-200/70 bg-cream px-6 pt-14 pb-8 text-slate-600">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1fr_auto]">

        {/* Les deux maisons */}
        {ETABLISSEMENTS.map(e => (
          <section key={e.hotel} className="space-y-2">
            <h2 className="font-serif text-lg text-slate-900">
              {e.nom}
              <span className="ml-2 align-middle text-[11px] tracking-widest text-gold-ink">
                {"★".repeat(e.etoiles)}
              </span>
            </h2>
            <p className="flex items-start gap-2 text-sm leading-relaxed">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-ink" aria-hidden />
              {e.adresse}
            </p>
            <p className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 shrink-0 text-gold-ink" aria-hidden />
              <a href={`tel:${e.telephone.replace(/\s/g, "")}`} className="font-semibold text-slate-900 hover:text-gold-ink">
                {e.telephone}
              </a>
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
              <a href={lienReservation(e.hotel, langue)} className="font-semibold text-navy hover:text-gold-ink">
                {mots.reserver}
              </a>
              <span aria-hidden className="text-slate-300">·</span>
              <Link href={pageDe(e.hotel, langue)} className="hover:text-gold-ink">{mots.hotel}</Link>
              <span aria-hidden className="text-slate-300">·</span>
              <a href={`mailto:${e.email}`} className="hover:text-gold-ink">{mots.ecrire}</a>
            </p>
          </section>
        ))}

        {/* Le reste du site */}
        <nav aria-label={mots.site} className="space-y-2 md:min-w-[15rem]">
          <h2 className="font-serif text-lg text-slate-900">{mots.decouvrir}</h2>
          <ul className="space-y-1.5 text-sm">
            {DECOUVRIR[langue].map(l => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-gold-ink">{l.libelle}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center gap-4 border-t border-slate-200/70 pt-6 text-xs text-slate-500 md:flex-row md:justify-between">
        <div className="flex items-center gap-4">
          <a href={RESEAUX.instagram} target="_blank" rel="noopener noreferrer"
             aria-label="Instagram" className="text-slate-500 transition-colors hover:text-gold-ink">
            <Instagram className="h-4 w-4" />
          </a>
          <a href={RESEAUX.facebook} target="_blank" rel="noopener noreferrer"
             aria-label="Facebook" className="text-slate-500 transition-colors hover:text-gold-ink">
            <Facebook className="h-4 w-4" />
          </a>
          <Link href="/mentions" className="hover:text-slate-900">{mots.mentions}</Link>
          {/* Les CGV ne sont pas un ornement de pied de page : vendre une nuit
              a un consommateur francais sans conditions accessibles, c'est
              vendre sans conditions opposables. Elles doivent etre atteignables
              de partout, et Mews doit les pointer dans `TermsAndConditionsUrl`. */}
          <Link href="/cgv" className="hover:text-slate-900">{mots.cgv}</Link>
        </div>
        <p className="font-serif italic opacity-60">Designed in Toulon.</p>
      </div>
    </footer>
  );
}
