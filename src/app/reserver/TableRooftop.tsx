"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Langue } from "@/lib/mewsBooking";

/* La table du rooftop, proposée AVANT de valider.
 *
 * Elle a d'abord vécu sur l'écran de confirmation, par crainte d'alourdir le
 * paiement. C'était mal la comprendre : le rooftop du 4ᵉ n'est pas un
 * accessoire qu'on vend une fois la chambre acquise, c'est ce que l'hôtel a et
 * que les plateformes ne montrent pas. Le proposer pendant qu'on hésite fait
 * pencher ; le proposer après, on ne vend qu'un supplément.
 *
 * Elle se loge dans le blanc sous le nom de la chambre — l'espace que la zone
 * défilante laisse vide quand le séjour tient en trois lignes. Elle ne coûte
 * donc pas un pixel : le total et le bouton de paiement sont déjà SORTIS de
 * cette zone, et ne bougent pas.
 *
 * La table se prend au MÊME clic que la chambre, mais APRÈS elle : une table
 * tenue pour un paiement qui échoue serait une table perdue pour l'hôtel et
 * une promesse en l'air pour le client.
 */

const VOILES_ID = "ded6e6fb-ff3c-4fa8-ad07-403ee316be53";

/** Service de 17 h à 22 h, dernière arrivée 21 h 30. On n'ouvre que le cœur de
 *  soirée : cinq pastilles tiennent sur deux lignes dans une colonne de 320 px,
 *  dix demandent un menu déroulant. */
export const CRENEAUX = ["19h00", "19h30", "20h00", "20h30", "21h00"];

/* Le créneau se STOCKE en « 19h30 » et s'AFFICHE selon la langue : la valeur
 * part telle quelle vers `rooftop_book` et vers le courriel de l'équipe, qui
 * lisent du français. Même règle que `annulableJusque` dans le tunnel, qui
 * convertit en 12 h pour ne pas afficher « 18 pm ». */
export const heureLisible = (creneau: string, langue: Langue) => {
  if (langue === "fr") return creneau;
  const [h, m] = creneau.split("h");
  const n = Number(h);
  return `${n > 12 ? n - 12 : n === 0 ? 12 : n}:${m || "00"} ${n >= 12 ? "pm" : "am"}`;
};

/** « mer. 28 » — assez pour distinguer deux soirs, assez court pour une pastille. */
const soirLisible = (iso: string, langue: Langue) => {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-GB", {
    weekday: "short", day: "numeric",
  });
};

const TEXTES = {
  fr: {
    ajouter: "Ajouter une table au rooftop",
    titrePanneau: "Votre table au rooftop",
    sous: "Le 4ᵉ étage, face à la rade, le soir de votre arrivée.",
    note: "La table est prise en même temps que votre chambre. Sans supplément.",
    carte: "Voir la carte du rooftop",
    soir: "Quel soir ?",
    heure: "Vers quelle heure ?",
    retirer: "Retirer la table",
    choisie: (h: string) => `Table réservée · ${h}`,
    faitTitre: "Table réservée",
    fait: (t: string | null) => (t ? `Table ${t}. On vous attend.` : "On vous attend."),
    rate: "La table n'a pas pu être prise — appelez-nous au 04 94 41 36 23, on vous place.",
  },
  en: {
    ajouter: "Add a rooftop table",
    titrePanneau: "Your rooftop table",
    sous: "The 4th floor facing the bay, on the night you arrive.",
    note: "The table is booked along with your room. No extra charge.",
    carte: "See the rooftop menu",
    soir: "Which evening?",
    heure: "What time?",
    retirer: "Remove the table",
    choisie: (h: string) => `Table booked · ${h}`,
    faitTitre: "Table booked",
    fait: (t: string | null) => (t ? `Table ${t}. See you there.` : "See you there."),
    rate: "The table could not be booked — call us on +33 4 94 41 36 23 and we'll seat you.",
  },
} as const;

export type ChoixTable = { date: string; heure: string };
export type TablePrise = { table: string | null; heure: string; date: string } | null;

/* Les soirs où le rooftop peut recevoir, sur toute la durée du séjour.
 *
 * Sur deux nuits, il y a deux soirs possibles — et le rooftop peut être ouvert
 * l'un et fermé l'autre. On interroge donc la plage entière, jamais la seule
 * date d'arrivée : proposer un soir qui se ferait refuser au clic est pire que
 * ne rien proposer. Le dernier soir exclu, c'est celui du départ : on ne dîne
 * pas le soir où l'on est déjà parti. */
export function useSoirsRooftop(arrivee: string, depart: string, pax: number): string[] {
  const [soirs, setSoirs] = useState<string[]>([]);
  useEffect(() => {
    let annule = false;
    setSoirs([]);
    const veille = new Date(Date.parse(depart) - 86_400_000);
    if (Number.isNaN(veille.getTime())) return;
    const fin = veille.toISOString().slice(0, 10);
    if (fin < arrivee) return;
    supabase
      .rpc("rooftop_day_availability", { p_hotel: VOILES_ID, p_pax: pax, p_start: arrivee, p_end: fin })
      .then(({ data, error }) => {
        if (annule || error) return;
        setSoirs(((data as { day: string; available: boolean }[]) || [])
          .filter((r) => r.available).map((r) => r.day));
      });
    return () => { annule = true; };
  }, [arrivee, depart, pax]);
  return soirs;
}

/* Prend la table, une fois la chambre acquise. Ne lève jamais : la chambre est
 * déjà réservée quand on arrive ici, et faire échouer la confirmation parce
 * qu'un apéro n'a pas pu se poser serait échanger un vrai problème contre un
 * bien pire. En cas de refus, l'écran le dit et donne le téléphone. */
export async function prendreTable(
  { choix, pax, client, langue }:
  { choix: ChoixTable; pax: number; langue: Langue;
    client: { prenom: string; nom: string; email: string; telephone: string } },
): Promise<TablePrise> {
  const nomComplet = `${client.prenom} ${client.nom}`.trim();
  try {
    const { data, error } = await supabase.rpc("rooftop_book", {
      p_hotel: VOILES_ID, p_date: choix.date, p_heure: choix.heure, p_pax: pax,
      p_nom: nomComplet, p_tel: client.telephone, p_email: client.email,
      p_message: langue === "fr"
        ? "Client de l'hôtel — pris avec la chambre"
        : "Hotel guest — booked with the room",
    });
    if (error || (data as { status?: string })?.status !== "ok") return null;
    const table = (data as { table?: string })?.table ?? null;

    /* ⚠️ PAS DEUX COURRIELS POUR UN MÊME SÉJOUR. `source: 'tunnel'` coupe la
     * confirmation client côté route : il vient d'en recevoir une pour sa
     * chambre. L'équipe, elle, est prévenue dans tous les cas. */
    void fetch("/api/rooftop-reservation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nomComplet, telephone: client.telephone, email: client.email,
        date: choix.date, heure: choix.heure, couverts: pax,
        message: "", table, source: "tunnel",
      }),
    }).catch(() => {});

    return { table, heure: choix.heure, date: choix.date };
  } catch {
    return null;
  }
}

/* Le dos de la colonne « Votre séjour ».
 *
 * C'est la COLONNE ENTIÈRE qui se retourne, pas un bloc posé dedans. Deux
 * tentatives ont échoué avant celle-là, et pour la même raison : tout ce qu'on
 * ajoute dans le flux de cette colonne la fait défiler. Elle n'a pas de place
 * libre — le blanc qu'on croit voir sous le nom de la chambre dépend de la
 * hauteur de fenêtre, et disparaît dès que le séjour fait deux lignes de plus.
 * Un dos, lui, ne coûte rien : il occupe la même surface que la face avant.
 *
 * ⚠️ LES DEUX FACES FONT LA MÊME HAUTEUR (`h-full`), et ce n'est pas
 * cosmétique. À la première tentative, le dos était court : `backface-
 * visibility` ne suffisait pas à masquer la face avant, et on lisait le
 * récapitulatif en miroir sous le panneau. Une face arrière pleine hauteur
 * couvre, quoi qu'il arrive.
 *
 * ⚠️ UN SEUL CLIC POUR CHOISIR. La version d'avant demandait d'ouvrir, puis
 * d'ajouter, puis de choisir l'heure : trois gestes pour un apéro. On tombe
 * directement sur les créneaux, et un créneau retenu referme le panneau.
 */
export function PanneauRooftop(
  { soirs, choix, onChoix, onFermer, nuits, langue }:
  { soirs: string[]; choix: ChoixTable | null; onChoix: (c: ChoixTable | null) => void;
    onFermer: () => void; nuits: number; langue: Langue },
) {
  const T = TEXTES[langue];
  const [soir, setSoir] = useState(soirs[0] ?? "");
  useEffect(() => { if (soirs.length && !soirs.includes(soir)) setSoir(soirs[0]); }, [soirs, soir]);

  const pastille = (actif: boolean) => [
    "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
    actif ? "border-navy bg-navy text-white" : "border-[#e3e0d9] bg-white text-[#3c4a52] hover:border-gold",
  ].join(" ");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <button
        type="button" onClick={onFermer}
        className="mb-3 flex shrink-0 items-center gap-2 self-start text-[13.5px] font-semibold text-navy hover:text-gold-ink"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-gold-ink" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {langue === "fr" ? "Retour" : "Back"}
      </button>

      {/* Centré dans les deux sens : le dos porte trois fois moins de matière
          que la face avant, et tout collé en haut il laissait la moitié de la
          colonne vide sous lui. `justify-center` le pose au milieu de la
          hauteur, `text-center` le tient. */}
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto text-center">
        <p className="font-serif text-[22px] leading-tight text-navy">🍸 {T.titrePanneau}</p>
        <p className="mx-auto mt-1 max-w-[34ch] text-[13.5px] leading-snug text-[#6b7a82]">{T.sous}</p>

        {nuits > 1 && soirs.length > 1 && (
          <>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">{T.soir}</p>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
              {soirs.map((d) => (
                <button key={d} type="button" onClick={() => setSoir(d)} aria-pressed={soir === d}
                  className={`${pastille(soir === d)} capitalize`}>
                  {soirLisible(d, langue)}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a9299]">{T.heure}</p>
        <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
          {CRENEAUX.map((c) => (
            <button
              key={c} type="button"
              aria-pressed={choix?.heure === c && choix?.date === soir}
              onClick={() => { onChoix({ date: soir, heure: c }); onFermer(); }}
              className={pastille(choix?.heure === c && choix?.date === soir)}
            >
              {heureLisible(c, langue)}
            </button>
          ))}
        </div>

        <p className="mx-auto mt-4 max-w-[34ch] text-[12.5px] leading-snug text-[#8a9299]">{T.note}</p>

        {/* La carte, dans un nouvel onglet — et pas autrement. On est au milieu
            d'une réservation : emporter le client hors du tunnel pour lui
            montrer un menu, c'est le perdre. */}
        <a
          href="/rooftop-les-voiles" target="_blank" rel="noopener noreferrer"
          className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#e3e0d9] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-navy transition-colors hover:border-gold hover:text-gold-ink"
        >
          {T.carte}
          <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h6v6" /><path d="M20 4l-8 8" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
        </a>
      </div>

      {choix && (
        <button
          type="button" onClick={() => { onChoix(null); onFermer(); }}
          className="mt-3 shrink-0 text-center text-[12.5px] text-[#8a9299] underline underline-offset-2 hover:text-[#a8571f]"
        >
          {T.retirer}
        </button>
      )}
    </div>
  );
}

/** Ce que l'écran de confirmation en dit. */
export function TableConfirmee({ prise, langue }: { prise: TablePrise; langue: Langue }) {
  const T = TEXTES[langue];
  if (!prise) {
    return (
      <p className="mt-4 rounded-xl bg-[#fdf6f1] px-4 py-3 text-left text-[13px] leading-snug text-[#8a4b2a]">
        {T.rate}
      </p>
    );
  }
  return (
    <div className="mt-4 rounded-xl border border-gold/50 bg-[#faf7f1] px-4 py-3 text-left">
      <p className="font-serif text-[17px] text-navy">
        🍸 {T.faitTitre} · <span className="capitalize">{soirLisible(prise.date, langue)}</span> {heureLisible(prise.heure, langue)}
      </p>
      <p className="mt-0.5 text-[13.5px] text-[#5b6a72]">{T.fait(prise.table)}</p>
    </div>
  );
}
