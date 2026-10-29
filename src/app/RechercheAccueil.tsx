"use client";

/* LA RECHERCHE DE L'ACCUEIL (29/10/2026) — des dates, et les deux maisons répondent sur place.
 *
 * Martin : « une pré-recherche avec dispo à partir de… et le lien vers l'hôtel ou les hôtels qui ont de
 * la dispo », sous « Bienvenue chez vous ». Ce que font les groupes boutique (Beaumier, Hoxton, Evok) :
 * un module qui renvoie vers le moteur. Ce que font les moteurs de groupe (Mirai, SiteMinder) : les
 * résultats hôtel par hôtel. Avec deux maisons, on fait le second, sur la page même.
 *
 * ⚠️ LES DEUX LIGNES SONT TOUJOURS LÀ, DE LA MÊME HAUTEUR. Avant la recherche elles disent « dès X € »,
 * après elles disent le prix du séjour : rien n'apparaît, rien ne pousse la page (règle de la maison :
 * un retour visuel ne décale jamais l'écran).
 *
 * ⚠️ FERMÉ N'EST PAS COMPLET, ET MUET N'EST PAS COMPLET. La saison des Voiles se dit avec sa date de
 * réouverture ; un moteur qui ne répond pas se dit aussi, et son lien reste. */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Calendar, Minus, Plus, X } from "lucide-react";
import CalendrierSejour from "./reserver/CalendrierSejour";
import { lienReservation } from "@/lib/site";

type Etat =
  | { etat: "libre"; parNuit: number; total: number }
  | { etat: "complet" }
  | { etat: "ferme"; rouvre: string }
  | { etat: "muet" }
  | { etat: "apercu"; des: number | null };
type Reponse = { corniche: Etat; voiles: Etat };
type Langue = "fr" | "en";
const MUETS: Reponse = { corniche: { etat: "muet" }, voiles: { etat: "muet" } };

const T = {
  fr: {
    dates: "Vos dates", vide: "Arrivée → départ", personnes: (n: number) => `${n} adulte${n > 1 ? "s" : ""}`,
    chercher: "Voir les disponibilités", recherche: "Recherche…",
    des: (p: number) => `dès ${p} €`, nuit: "la nuit",
    total: (t: number, n: number) => `${t} € pour ${n} nuit${n > 1 ? "s" : ""}`,
    complet: "Rien en ligne sur ces dates", muet: "Disponibilités indisponibles",
    ferme: (d: string) => `Fermé pour l'hiver · réouverture le ${d}`,
    reserver: "Réserver", voir: "Voir", choisir: "Choisissez vos dates",
    arrivee: "Arrivée", depart: "Départ", fermer: "Fermer", valider: "Valider",
    assurance: "Meilleur prix en direct · moins cher que Booking",
    mois: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  },
  en: {
    dates: "Your dates", vide: "Check-in → check-out", personnes: (n: number) => `${n} adult${n > 1 ? "s" : ""}`,
    chercher: "Check availability", recherche: "Searching…",
    des: (p: number) => `from €${p}`, nuit: "per night",
    total: (t: number, n: number) => `€${t} for ${n} night${n > 1 ? "s" : ""}`,
    complet: "Nothing online for these dates", muet: "Availability unavailable",
    ferme: (d: string) => `Closed for winter · reopens ${d}`,
    reserver: "Book", voir: "View", choisir: "Choose your dates",
    arrivee: "Check-in", depart: "Check-out", fermer: "Close", valider: "Done",
    assurance: "Best price booking direct · cheaper than Booking",
    mois: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
};

const MAISONS = [
  { cle: "corniche" as const, nom: "La Corniche", etoiles: 4, ligne: "Best Western Plus" },
  { cle: "voiles" as const, nom: "Les Voiles", etoiles: 3, ligne: "Hôtel-Rooftop" },
];

const jourCourt = (iso: string, l: Langue) => `${Number(iso.slice(8, 10))} ${T[l].mois[Number(iso.slice(5, 7)) - 1]}`;
const jourLong = (iso: string, l: Langue) => {
  const s = new Date(`${iso}T12:00:00`).toLocaleDateString(l === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return l === "fr" ? s.replace(/^1 /, "1er ") : s;
};
const nuitsEntre = (a: string, d: string) => Math.round((Date.parse(d) - Date.parse(a)) / 864e5);

export default function RechercheAccueil({ langue }: { langue: Langue }) {
  const t = T[langue];
  const [arrivee, setArrivee] = useState<string | null>(null);
  const [depart, setDepart] = useState<string | null>(null);
  const [adultes, setAdultes] = useState(2);
  const [feuille, setFeuille] = useState(false);
  const [apercu, setApercu] = useState<Reponse | null>(null);
  const [resultat, setResultat] = useState<{ r: Reponse; a: string; d: string; n: number } | null>(null);
  const [charge, setCharge] = useState(false);
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  /* Ce soir → demain, d'office, comme le moteur des Voiles (Martin, 29/10 : « pas de date
   * présélectionnée… ») : la recherche part dès l'ouverture et les lignes disent un vrai prix tout de
   * suite. Posé après le montage : la date du serveur n'est pas celle du visiteur. Le « dès » général ne
   * sert plus que si la recherche du jour n'a pas pu partir. */
  useEffect(() => {
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const auj = new Date(), dem = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + 1);
    setArrivee(iso(auj)); setDepart(iso(dem));
    fetch("/api/dispo-accueil").then((r) => (r.ok ? r.json() : null)).then((j) => j && setApercu(j)).catch(() => {});
  }, []);

  /* La feuille du calendrier fige la page derrière elle : sinon, sur mobile, le doigt qui fait défiler
   * les mois fait aussi défiler l'accueil. */
  useEffect(() => {
    if (!feuille) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setFeuille(false); };
    window.addEventListener("keydown", echap);
    return () => { document.body.style.overflow = avant; window.removeEventListener("keydown", echap); };
  }, [feuille]);

  const pret = !!arrivee && !!depart;
  const chercher = async () => {
    if (!arrivee || !depart) { setFeuille(true); return; }
    setCharge(true);
    try {
      const q = new URLSearchParams({ arrivee, depart, adultes: String(adultes) });
      const r = await fetch(`/api/dispo-accueil?${q}`);
      const j = r.ok ? ((await r.json()) as Reponse) : null;
      setResultat({ r: j ?? MUETS, a: arrivee, d: depart, n: adultes });
    } catch {
      /* Une recherche ratée se dit « muette » ; le lien vers chaque hôtel reste. */
      setResultat({ r: MUETS, a: arrivee, d: depart, n: adultes });
    }
    setCharge(false);
  };

  /* Les résultats ne valent que pour la recherche qui les a produits : changer les dates ou le nombre
   * de personnes relance la recherche, plutôt que de garder un prix qui ne correspond plus. */
  const actuel = resultat && resultat.a === arrivee && resultat.d === depart && resultat.n === adultes ? resultat : null;

  /* ⚠️ DES DATES CHOISIES NE MONTRENT JAMAIS LE « DÈS » GÉNÉRAL (Martin, 29/10 : « ça met toujours à
   * partir de 89 et c'est mensonger »). Le « dès X € » est le plus bas des semaines à venir : sous des
   * dates précises, il se lit comme le prix de CES dates. Dès que le séjour est complet, la recherche part
   * d'elle-même, et la ligne attend sa réponse au lieu de garder l'aperçu. */
  useEffect(() => {
    if (!arrivee || !depart) return;
    const minuteur = setTimeout(() => { void chercher(); }, 250);
    return () => clearTimeout(minuteur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivee, depart, adultes]);

  const lien = (cle: "corniche" | "voiles", e: Etat | undefined) => {
    const base = lienReservation(cle, langue);
    if (e?.etat === "ferme") {
      // Fermé : on ouvre le moteur à la réouverture, pour réserver le printemps.
      const a = e.rouvre, d = new Date(Date.parse(a) + 864e5).toISOString().slice(0, 10);
      return `${base}?${new URLSearchParams({ arrivee: a, depart: d, adultes: String(Math.min(adultes, 2)) })}`;
    }
    if (!actuel) return base;
    return `${base}?${new URLSearchParams({ arrivee: actuel.a, depart: actuel.d, adultes: String(actuel.n) })}`;
  };

  const champDates = useMemo(() => (
    pret ? `${jourCourt(arrivee!, langue)} → ${jourCourt(depart!, langue)}` : arrivee ? `${jourCourt(arrivee, langue)} → …` : t.vide
  ), [arrivee, depart, pret, langue, t.vide]);

  return (
    <div className="mx-auto mt-8 w-full max-w-3xl px-1 text-left md:mt-10">
      {/* La barre : une ligne sur ordinateur, une carte sur mobile. */}
      <div className="rounded-[28px] border border-[#ece6d8] bg-white/90 p-2 shadow-[0_18px_50px_-24px_rgba(0,58,92,0.35)] backdrop-blur md:flex md:items-center md:gap-2 md:rounded-full">
        <button
          type="button" onClick={() => setFeuille(true)}
          className="flex w-full items-center gap-3 rounded-full px-5 py-3.5 text-left transition-colors hover:bg-cream md:flex-1"
        >
          <Calendar className="h-4 w-4 shrink-0 text-gold-ink" aria-hidden />
          <span className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t.dates}</span>
            <span className={`text-[15px] ${pret ? "font-semibold text-navy" : "text-slate-500"}`}>{champDates}</span>
          </span>
        </button>
        <div className="mx-5 h-px bg-[#efe9dc] md:mx-0 md:h-9 md:w-px" aria-hidden />
        <div className="flex items-center justify-between gap-3 px-5 py-2.5 md:w-52 md:px-3">
          <span className="text-[15px] text-navy">{t.personnes(adultes)}</span>
          <span className="flex items-center gap-1.5">
            <button type="button" aria-label="−" disabled={adultes <= 1} onClick={() => setAdultes((n) => Math.max(1, n - 1))}
              className="grid h-8 w-8 place-items-center rounded-full border border-[#e3ddd0] text-navy transition hover:border-gold disabled:opacity-30">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="+" disabled={adultes >= 4} onClick={() => setAdultes((n) => Math.min(4, n + 1))}
              className="grid h-8 w-8 place-items-center rounded-full border border-[#e3ddd0] text-navy transition hover:border-gold disabled:opacity-30">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
        <button
          type="button" onClick={chercher} disabled={charge}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-navy px-7 py-4 text-[15px] font-semibold text-white transition hover:bg-navy-deep disabled:opacity-70 md:mt-0 md:w-auto"
        >
          {charge ? t.recherche : t.chercher}
          {!charge && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </div>

      {/* Les deux maisons. Toujours présentes, même hauteur avant et après la recherche. */}
      <div className="mt-3 grid gap-2 md:grid-cols-2" aria-live="polite">
        {MAISONS.map((m) => {
          const e = actuel ? actuel.r[m.cle] : pret ? undefined : apercu?.[m.cle];
          const nuits = actuel ? nuitsEntre(actuel.a, actuel.d) : 0;
          const libre = e?.etat === "libre";
          const terne = e?.etat === "complet" || e?.etat === "ferme";
          return (
            <a
              key={m.cle} href={lien(m.cle, e)}
              className={`group flex min-h-[76px] items-center justify-between gap-3 rounded-2xl border px-5 py-3 transition ${
                libre ? "border-gold/60 bg-white shadow-sm hover:shadow-md" : "border-[#ece6d8] bg-white/70 hover:bg-white"
              } ${charge || (pret && !actuel) ? "animate-pulse" : ""}`}
            >
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {m.ligne} <span className="text-gold">{"★".repeat(m.etoiles)}</span>
                </span>
                <span className={`block font-serif text-xl leading-tight ${terne ? "text-slate-400" : "text-navy"}`}>{m.nom}</span>
              </span>
              <span className="shrink-0 text-right">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={`${m.cle}-${e?.etat ?? "rien"}-${actuel?.a ?? ""}`}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
                    className="block"
                  >
                    {e?.etat === "libre" && (
                      <>
                        <span className="block text-[17px] font-semibold tabular-nums text-navy">{t.des(e.parNuit)} <span className="text-xs font-normal text-slate-400">{t.nuit}</span></span>
                        {nuits > 1 && <span className="block text-xs text-slate-500">{t.total(e.total, nuits)}</span>}
                      </>
                    )}
                    {e?.etat === "apercu" && e.des !== null && (
                      <span className="block text-[15px] font-semibold tabular-nums text-navy">{t.des(e.des)} <span className="text-xs font-normal text-slate-400">{t.nuit}</span></span>
                    )}
                    {e?.etat === "ferme" && <span className="block max-w-[11rem] text-xs leading-snug text-slate-500">{t.ferme(jourLong(e.rouvre, langue))}</span>}
                    {e?.etat === "complet" && <span className="block max-w-[10rem] text-xs leading-snug text-slate-500">{t.complet}</span>}
                    {e?.etat === "muet" && <span className="block max-w-[10rem] text-xs leading-snug text-slate-500">{t.muet}</span>}
                  </motion.span>
                </AnimatePresence>
                <span className={`mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold ${libre ? "text-gold-ink" : "text-slate-400"} group-hover:text-gold-ink`}>
                  {libre ? t.reserver : t.voir} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </span>
            </a>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-slate-400">{t.assurance}</p>

      {/* La feuille des dates : monte du bas sur mobile, fenêtre centrée sur ordinateur. Par-dessus la
          page, jamais dedans. */}
      {/* ⚠️ Dans le corps du document, pas dans l'en-tête : l'en-tête est animé (transform), et un
          `position: fixed` sous un parent transformé se cale sur lui, plus sur l'écran. */}
      {monte && createPortal(<AnimatePresence>
        {feuille && (
          <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 md:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFeuille(false)}>
            <motion.div
              role="dialog" aria-modal="true" aria-label={t.choisir}
              className="w-full max-w-lg rounded-t-[28px] bg-cream p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:rounded-[28px]"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 md:hidden" aria-hidden />
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="font-serif text-2xl text-navy">{t.choisir}</p>
                <button type="button" onClick={() => setFeuille(false)} aria-label={t.fermer}
                  className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-white"><X className="h-5 w-5" /></button>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-white px-3 py-2"><span className="block text-[10px] uppercase tracking-[0.18em] text-slate-400">{t.arrivee}</span><span className="font-semibold text-navy">{arrivee ? jourCourt(arrivee, langue) : "—"}</span></div>
                <div className="rounded-xl bg-white px-3 py-2"><span className="block text-[10px] uppercase tracking-[0.18em] text-slate-400">{t.depart}</span><span className="font-semibold text-navy">{depart ? jourCourt(depart, langue) : "—"}</span></div>
              </div>
              <CalendrierSejour
                arrivee={arrivee} depart={depart} langue={langue} className="h-[52vh] md:h-[420px]"
                onChange={(a, d) => { setArrivee(a); setDepart(d); }}
              />
              <button type="button" disabled={!pret}
                onClick={() => setFeuille(false)}
                className="mt-3 w-full rounded-full bg-navy py-4 text-[15px] font-semibold text-white transition hover:bg-navy-deep disabled:opacity-40">
                {t.chercher}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}
