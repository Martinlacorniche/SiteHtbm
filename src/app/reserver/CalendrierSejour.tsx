"use client";

import { useMemo } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
 * Calendrier de séjour — deux tapes, pas six.
 *
 * Le champ `<input type="date">` natif coûte, sur mobile : ouvrir l'arrivée,
 * choisir, valider, ouvrir le départ, choisir, valider. Six gestes et deux
 * modales pour une information que le client a déjà en tête.
 *
 * Ici le calendrier est POSÉ dans la page, jamais en surcouche. Première tape =
 * arrivée, seconde = départ. Aucune validation : le choix EST la validation.
 *
 * Les mois défilent verticalement plutôt que par flèches précédent/suivant —
 * un client qui cherche « fin octobre » fait défiler, il ne compte pas les mois.
 * ────────────────────────────────────────────────────────────────────────── */

type Props = {
  arrivee: string | null;
  depart: string | null;
  onChange: (arrivee: string | null, depart: string | null) => void;
  langue: "fr" | "en";
  moisAffiches?: number;
  /** Hauteur laissée à l'appelant : bornée sur mobile, pleine colonne sur PC. */
  className?: string;
};

const JOURS = {
  fr: ["L", "M", "M", "J", "V", "S", "D"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
};

const MOIS = {
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

/** 'YYYY-MM-DD' sans passer par UTC : un décalage d'un jour se voit tout de suite. */
const cle = (a: number, m: number, j: number) =>
  `${a}-${String(m + 1).padStart(2, "0")}-${String(j).padStart(2, "0")}`;

export default function CalendrierSejour({
  arrivee, depart, onChange, langue, moisAffiches = 12, className = "",
}: Props) {
  const aujourdhui = useMemo(() => {
    const d = new Date();
    return cle(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const mois = useMemo(() => {
    const d = new Date();
    return Array.from({ length: moisAffiches }, (_, i) => {
      const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
      const annee = m.getFullYear();
      const indexMois = m.getMonth();
      const premierJour = (new Date(annee, indexMois, 1).getDay() + 6) % 7; // lundi = 0
      const nbJours = new Date(annee, indexMois + 1, 0).getDate();
      return { annee, indexMois, premierJour, nbJours };
    });
  }, [moisAffiches]);

  const choisir = (jour: string) => {
    // Une seule règle : s'il n'y a pas d'arrivée, ou si le séjour est déjà
    // complet, ou si l'on tape avant l'arrivée, on repart de cette date.
    if (!arrivee || depart || jour <= arrivee) {
      onChange(jour, null);
      return;
    }
    onChange(arrivee, jour);
  };

  // Le calendrier défile dans sa boîte plutôt que d'allonger la page : sur grand
  // écran il occupe toute la hauteur de la colonne de gauche, à côté des
  // propositions. Deux mois de front en pleine largeur, un seul en colonne.
  return (
    <div
      className={`overflow-y-auto overscroll-contain rounded-xl border border-[#e3e0d9] bg-white p-1 ${className}`}
      role="group"
      aria-label={langue === "fr" ? "Choisir les dates du séjour" : "Choose your dates"}
    >
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-1">
        {mois.map(({ annee, indexMois, premierJour, nbJours }) => (
          <div key={`${annee}-${indexMois}`} className="px-2 pb-1">
            <p className="sticky top-0 z-10 -mx-2 bg-white px-2 pb-2 pt-3 font-serif text-[17px] capitalize text-[#004e7c]">
              {MOIS[langue][indexMois]} {annee}
            </p>

            <div className="grid grid-cols-7 gap-y-1">
              {JOURS[langue].map((j, i) => (
                <span key={i} className="pb-1 text-center text-[11px] font-semibold text-[#b0b6ba]">
                  {j}
                </span>
              ))}

              {Array.from({ length: premierJour }, (_, i) => <span key={`v${i}`} />)}

              {Array.from({ length: nbJours }, (_, i) => {
                const jour = cle(annee, indexMois, i + 1);
                const passe = jour < aujourdhui;
                const estArrivee = jour === arrivee;
                const estDepart = jour === depart;
                const dansSejour = !!(arrivee && depart && jour > arrivee && jour < depart);
                const bord = estArrivee || estDepart;

                return (
                  <button
                    key={jour}
                    type="button"
                    disabled={passe}
                    onClick={() => choisir(jour)}
                    aria-pressed={bord || dansSejour}
                    aria-label={`${i + 1} ${MOIS[langue][indexMois]} ${annee}`}
                    className={[
                      // 44 px de haut : la cible tactile passe le pouce.
                      "relative h-11 text-[15px] tabular-nums transition-colors",
                      passe ? "cursor-not-allowed text-[#d6dade]" : "cursor-pointer",
                      bord ? "z-10 rounded-full bg-[#004e7c] font-bold text-white" : "",
                      dansSejour ? "bg-[#C6A972]/20 text-[#004e7c]" : "",
                      !passe && !bord && !dansSejour ? "rounded-full text-[#3c4a52] hover:bg-[#f0ece4]" : "",
                      estArrivee && depart ? "rounded-r-none" : "",
                      estDepart ? "rounded-l-none" : "",
                    ].join(" ")}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
