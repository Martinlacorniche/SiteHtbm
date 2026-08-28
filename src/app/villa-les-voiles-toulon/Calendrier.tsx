"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { EtatNuit } from "@/lib/villa";

/* Le calendrier de la privatisation.
 *
 * ⚠️ IL PEINT LES NUITS, PAS LES JOURS. Une case verte dit « cette NUIT est
 * libre ». C'est pour ça que le jour du départ n'a pas besoin d'être libre :
 * on dort du 12 au 14, les nuits vendues sont celles du 12 et du 13.
 * Confondre les deux ferait refuser un séjour parfaitement disponible parce
 * que quelqu'un arrive le jour où le groupe s'en va.
 *
 * ⚠️ DEUX COULEURS, ET C'EST UNE CORRECTION. Une version intermédiaire en
 * peignait trois, dont un ambre « demi-villa possible » quand huit chambres
 * restaient libres. Contresens : privatiser, c'est être seul dans les murs,
 * que le groupe ouvre huit chambres ou seize. Une nuit où quinze chambres sont
 * libres n'est pas à moitié vendable — elle est fermée.
 *
 * ⚠️ LA COULEUR NE PORTE JAMAIS SEULE. Chaque nuit libre porte aussi un point
 * sous le chiffre, et son état est écrit dans le `title`/`aria-label` : un
 * calendrier qui ne se lit qu'en couleur ne se lit pas du tout pour une partie
 * des visiteurs.
 */

export type Selection = { arrivee: string; depart: string | null };

type Jour = { jour: string; libres: number; etat: EtatNuit };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const auj = () => iso(new Date());

/** Le premier du mois, n mois plus loin. Passe par UTC : construire un mois en
 *  heure locale décale d'un jour la nuit du changement d'heure. */
function moisDebut(base: Date, n: number): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + n, 1));
}

const NOMS = {
  fr: {
    mois: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
    jours: ["L", "M", "M", "J", "V", "S", "D"],
    libre: "Maison entière libre",
    ferme: "Complet",
    aide: "Cliquez votre arrivée, puis votre départ.",
    passe: "Date passée",
  },
  en: {
    mois: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    jours: ["M", "T", "W", "T", "F", "S", "S"],
    libre: "Whole house free",
    ferme: "Full",
    aide: "Click your arrival, then your departure.",
    passe: "Past date",
  },
} as const;

/* Les deux dictionnaires ont la même forme mais pas les mêmes littéraux :
   `as const` fige « Janvier » et « January » en types distincts, et le mois
   anglais devient incompatible avec le français. On décrit donc la forme
   partagée, une fois. */
type Noms = {
  mois: readonly string[]; jours: readonly string[];
  libre: string; ferme: string; aide: string; passe: string;
};

export default function Calendrier({
  langue, arrivee, depart, onChange, mois = 2,
}: {
  langue: "fr" | "en";
  arrivee: string;
  depart: string;
  onChange: (s: Selection) => void;
  /** Combien de mois montrer d'un coup. Deux quand la carte est large, UN
   *  quand elle tient la colonne du milieu : à deux, les cases tombaient à
   *  trente pixels et on ne visait plus rien. La fenêtre demandée à Mews ne
   *  change pas pour autant — on charge toujours deux mois, pour que la
   *  flèche suivante n'attende rien. */
  mois?: 1 | 2;
}) {
  const N: Noms = NOMS[langue];
  // Le premier mois affiché. On part du mois de l'arrivée courante : rouvrir la
  // page sur un lien daté ne doit pas obliger à feuilleter jusqu'à ses dates.
  const [ancre, setAncre] = useState(() => {
    const d = arrivee ? new Date(`${arrivee}T00:00:00Z`) : new Date();
    return moisDebut(d, 0);
  });
  const [jours, setJours] = useState<Map<string, Jour>>(new Map());
  const [charge, setCharge] = useState(true);
  // La sélection en cours : une arrivée posée, un départ pas encore choisi.
  const [enCours, setEnCours] = useState<string | null>(null);

  // Deux mois de large sur PC, un sur téléphone — mais on charge toujours les
  // deux : feuilleter d'un mois ne doit pas rappeler Mews à chaque flèche.
  const fenetre = useMemo(() => {
    const debut = iso(ancre);
    const finMois = moisDebut(ancre, 2);
    const fin = iso(new Date(finMois.getTime() - 86_400_000));
    return { debut, fin };
  }, [ancre]);

  useEffect(() => {
    let vivant = true;
    setCharge(true);
    fetch(`/api/villa/calendrier?debut=${fenetre.debut}&fin=${fenetre.fin}`)
      .then((r) => r.json())
      .then((j: { nuits?: Jour[] }) => {
        if (!vivant) return;
        setJours(new Map((j.nuits ?? []).map((n) => [n.jour, n])));
        setCharge(false);
      })
      .catch(() => { if (vivant) setCharge(false); });
    return () => { vivant = false; };
  }, [fenetre]);

  const cliquer = (jour: string) => {
    // Premier clic, ou clic avant l'arrivée retenue : c'est une nouvelle
    // arrivée. Poser un départ antérieur à l'arrivée n'est pas une erreur du
    // visiteur, c'est qu'il a changé d'avis sur le début du séjour.
    if (!enCours || jour <= enCours) {
      setEnCours(jour);
      onChange({ arrivee: jour, depart: null });
      return;
    }
    setEnCours(null);
    onChange({ arrivee: enCours, depart: jour });
  };

  const debutSel = enCours ?? arrivee;
  const finSel = enCours ? null : depart;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setAncre(moisDebut(ancre, -1))}
          disabled={iso(ancre) <= auj().slice(0, 8) + "01"}
          className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label={langue === "en" ? "Previous month" : "Mois précédent"}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm text-slate-500 flex items-center gap-2">
          {charge && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {N.aide}
        </p>
        <button type="button" onClick={() => setAncre(moisDebut(ancre, 1))}
          className="p-2 rounded-full hover:bg-slate-100"
          aria-label={langue === "en" ? "Next month" : "Mois suivant"}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ⚠️ UN SEUL MOIS NE S'ÉTALE PAS SUR TOUTE LA CARTE. La page est passée
          en pleine largeur : sans cette borne, les sept colonnes s'écartaient
          jusqu'à faire des cases de quatre-vingts pixels — un calendrier de
          salle d'attente, où l'œil ne relie plus un chiffre à sa semaine. */}
      <div className={mois === 2 ? "grid gap-6 sm:grid-cols-2" : "max-w-[460px]"}>
        {[0, 1].slice(0, mois).map((k) => (
          <Mois key={k} debut={moisDebut(ancre, k)} noms={N} jours={jours}
            debutSel={debutSel} finSel={finSel} onJour={cliquer}
            // Le second mois ne s'affiche pas sur téléphone : il doublerait
            // la hauteur pour un mois qu'on atteint d'une flèche. Le seuil est
            // `sm` et non `md` — la carte occupe désormais deux tiers de la
            // largeur, les deux mois y tiennent bien plus tôt.
            classe={k === 1 ? "hidden sm:block" : ""} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        <Legende ton="libre" texte={N.libre} />
        <Legende ton="ferme" texte={N.ferme} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- un mois */

function Mois({ debut, noms, jours, debutSel, finSel, onJour, classe }: {
  debut: Date;
  noms: Noms;
  jours: Map<string, Jour>;
  debutSel: string; finSel: string | null;
  onJour: (j: string) => void;
  classe: string;
}) {
  const annee = debut.getUTCFullYear(), mois = debut.getUTCMonth();
  const nbJours = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
  // Lundi en tête : `getUTCDay()` rend 0 pour dimanche, d'où le décalage.
  const decalage = (new Date(Date.UTC(annee, mois, 1)).getUTCDay() + 6) % 7;
  const aujourdhui = auj();

  return (
    <div className={classe}>
      <p className="font-serif text-lg mb-2">{noms.mois[mois]} {annee}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {noms.jours.map((j, i) => (
          <span key={i} className="text-[10px] font-bold uppercase text-slate-400 pb-1">{j}</span>
        ))}
        {Array.from({ length: decalage }, (_, i) => <span key={`v${i}`} />)}
        {Array.from({ length: nbJours }, (_, i) => {
          const jour = iso(new Date(Date.UTC(annee, mois, i + 1)));
          const info = jours.get(jour);
          const passe = jour < aujourdhui;
          const etat = info?.etat;
          const dansPlage = !!finSel && jour > debutSel && jour < finSel;
          const borne = jour === debutSel || jour === finSel;
          const cliquable = !passe;

          const ton =
            passe ? "text-slate-300"
            : etat === "libre" ? "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
            : etat === "ferme" ? "bg-slate-100 text-slate-400 line-through"
            : "text-slate-600 hover:bg-slate-100";

          return (
            <button
              key={jour} type="button" disabled={!cliquable}
              onClick={() => onJour(jour)}
              title={passe ? noms.passe : etat ? noms[etat] : undefined}
              aria-label={`${i + 1} — ${passe ? noms.passe : etat ? noms[etat] : ""}`}
              className={[
                "relative aspect-square rounded-lg text-sm transition flex flex-col items-center justify-center",
                borne ? "ring-2 ring-[color:var(--color-gold)] font-bold" : "",
                dansPlage ? "bg-[color:var(--color-gold)]/15" : ton,
                cliquable ? "cursor-pointer" : "cursor-default",
              ].join(" ")}
            >
              <span>{i + 1}</span>
              {/* Le point double la couleur : un calendrier qui ne se lit
                  qu'au vert ne se lit pas pour tout le monde. */}
              {!passe && etat === "libre" && (
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
        {/* ⚠️ LES CASES VIDES DE LA FIN NE SONT PAS DÉCORATIVES.
            Un mois s'étale sur cinq ou six semaines selon le jour où il tombe.
            Sans ce remplissage, la carte change de hauteur d'un mois à
            l'autre — et comme elle fixe la hauteur du héros, la photo se
            recadrait sous les yeux à chaque coup de flèche. On réserve
            toujours six lignes. */}
        {Array.from({ length: Math.max(0, 42 - decalage - nbJours) }, (_, i) => (
          <span key={`f${i}`} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}

function Legende({ ton, texte }: { ton: EtatNuit; texte: string }) {
  const pastille = ton === "libre"
    ? "bg-emerald-100 border-emerald-400"
    : "bg-slate-100 border-slate-300";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3.5 h-3.5 rounded border ${pastille}`} />
      {texte}
    </span>
  );
}
