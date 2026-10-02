"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

type MenuItem = {
  id: string;
  categorie: "base" | "garniture" | "dessert";
  nom: string;
  nom_en: string | null;
  actif: boolean;
  ordre: number;
};

type Lang = "fr" | "en";

const T = {
  fr: {
    back: "Retour",
    hotel: "Best Western Plus La Corniche",
    title: "Menu du jour",
    empty: "Aucun menu publié pour aujourd'hui.",
    plat: "Plat du jour",
    chooseBase: "Votre base",
    withSide: "accompagné de",
    sideOnly: "Votre accompagnement",
    sideWith: "Votre accompagnement",
    or: "ou",
    compose: "Composez votre assiette",
    desserts: "Desserts",
    prices: "Tarifs",
    platAlone: "Plat seul",
    dessertAlone: "Dessert",
    fullMenu: "Menu complet",
    note: "Commande à passer avant 19h à la réception.",
    cta_title: "Ça vous dit ?",
    cta_desc: "Passez à la réception — on s'occupe du reste.",
    cta_home: "Retour à l'accueil",
    dateLocale: "fr-FR",
  },
  en: {
    back: "Back",
    hotel: "Best Western Plus La Corniche",
    title: "Daily menu",
    empty: "No menu published for today.",
    plat: "Main course",
    chooseBase: "Your base",
    withSide: "served with",
    sideOnly: "Your topping",
    sideWith: "Your topping",
    or: "or",
    compose: "Build your plate",
    desserts: "Desserts",
    prices: "Prices",
    platAlone: "Main only",
    dessertAlone: "Dessert",
    fullMenu: "Full menu",
    note: "Order before 7 PM at the front desk.",
    cta_title: "Tempted?",
    cta_desc: "Come to the front desk — we'll handle the rest.",
    cta_home: "Back to home",
    dateLocale: "en-US",
  },
} as const;

export default function MenuPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [bases, setBases] = useState<MenuItem[]>([]);
  const [garnitures, setGarnitures] = useState<MenuItem[]>([]);
  const [desserts, setDesserts] = useState<MenuItem[]>([]);
  const [prixPlat, setPrixPlat] = useState<string | null>(null);
  const [prixDessert, setPrixDessert] = useState<string | null>(null);
  const [prixMenu, setPrixMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const t = T[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("wifi-lang") : null;
    if (saved === "en" || saved === "fr") setLang(saved);
    else if (typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("fr")) setLang("en");

    Promise.all([
      supabase.from("wifi_menu").select("*").eq("hotel_id", "f9d59e56-9a2f-433e-bcf4-f9753f105f32").eq("actif", true).order("ordre"),
      supabase.from("wifi_tiles").select("config").eq("slug", "menu").eq("hotel_id", "f9d59e56-9a2f-433e-bcf4-f9753f105f32").single(),
    ]).then(([{ data: items }, { data: tile }]) => {
      if (items) {
        setBases(items.filter((i: MenuItem) => i.categorie === "base"));
        setGarnitures(items.filter((i: MenuItem) => i.categorie === "garniture"));
        setDesserts(items.filter((i: MenuItem) => i.categorie === "dessert"));
      }
      if (tile?.config) {
        setPrixPlat(tile.config.prix_plat ?? null);
        setPrixDessert(tile.config.prix_dessert ?? null);
        setPrixMenu(tile.config.prix_menu ?? null);
      }
      setLoading(false);
    });
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    if (typeof window !== "undefined") localStorage.setItem("wifi-lang", next);
  };

  const nom = (i: MenuItem) => (lang === "en" && i.nom_en) || i.nom;
  const hasPlat = bases.length > 0 || garnitures.length > 0;

  return (
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-cream md:bg-transparent`}>
      <div className="flex flex-col items-center px-4 pt-10 pb-12">

        <div className="w-full max-w-sm md:max-w-4xl mb-8 text-center">
          <Link
            href="/wifi"
            className="inline-flex items-center gap-1.5 text-slate-400 text-sm mb-6 hover:text-slate-700 transition"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <ArrowLeft size={15} /> {t.back}
          </Link>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mb-2" style={{ fontFamily: "var(--font-sans)" }}>
            {t.hotel}
          </p>
          <h1 className="text-[2rem] font-semibold text-slate-900 leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
            {t.title}
          </h1>
          <p className="text-sm text-slate-400 mt-1 mb-4" style={{ fontFamily: "var(--font-sans)" }}>
            {new Date().toLocaleDateString(t.dateLocale, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-gold/50" />
            <button
              onClick={toggleLang}
              className="text-[10px] font-semibold tracking-widest text-gold-ink/90 hover:text-gold-ink transition px-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <div className="h-px w-8 bg-gold/50" />
          </div>
        </div>

        <div className="w-full max-w-sm md:max-w-4xl space-y-3">
          {loading ? (
            <div className="flex flex-col md:flex-row gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 h-32 animate-pulse md:flex-1" />
              ))}
            </div>
          ) : !hasPlat && desserts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
              <p className="text-slate-400 text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                {t.empty}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:gap-4">

              <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">

              {hasPlat && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 md:flex-[2]">
                  <div className="px-4 py-3 border-b border-slate-100 text-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-gold-ink" style={{ fontFamily: "var(--font-sans)" }}>
                      {t.plat}
                    </span>
                  </div>

                  {/* 🔑 L'ASSIETTE QUI SE COMPOSE. Deux colonnes et un « + » ne
                      disaient pas ce qu'il fallait faire : l'écran listait des
                      plats, le client lisait une carte. Ici l'assiette se
                      remplit sous ses yeux — la base se pose, puis
                      l'accompagnement — et « j'en prends un de chaque » se
                      comprend sans lire une ligne. */}
                  {bases.length > 0 && garnitures.length > 0 && (
                    <Composition legende={t.compose} />
                  )}

                  <div className="flex flex-col md:flex-row md:items-stretch">

                    {bases.length > 0 && (
                      <div className="md:flex-1 md:self-start py-2">
                        <Colonne n={1} titre={t.chooseBase} quoi="base" />
                        <ul className="px-4">
                          {bases.map((item, idx) => (
                            <li key={item.id}
                              className={`py-2.5 text-center text-sm text-slate-700 ${idx > 0 ? "border-t border-slate-100" : ""}`}
                              style={{ fontFamily: "var(--font-sans)" }}>
                              {nom(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {bases.length > 0 && garnitures.length > 0 && (
                      <>
                        <div className="md:hidden flex items-center gap-3 px-4 py-1">
                          <div className="h-px flex-1 bg-slate-100" />
                          <span className="text-xl font-light text-slate-300">+</span>
                          <div className="h-px flex-1 bg-slate-100" />
                        </div>
                        {/* ⚠️ LE « + » SE CALE EN HAUT. Centré sur la hauteur de
                            la rangée, il descendait au milieu du vide laissé par
                            la colonne la plus courte — et ne reliait plus rien. */}
                        <div className="hidden md:flex flex-col items-center self-start px-3 pt-[62px]">
                          <span className="text-3xl font-light text-slate-300">+</span>
                        </div>
                      </>
                    )}

                    {garnitures.length > 0 && (
                      <div className="md:flex-1 md:self-start py-2">
                        <Colonne n={bases.length === 0 ? 1 : 2}
                          titre={bases.length === 0 ? t.sideOnly : t.sideWith} quoi="accomp" />
                        <ul className="px-4 pb-2">
                          {garnitures.map((item, idx) => (
                            <li key={item.id}
                              className={`py-2.5 text-center text-sm text-slate-700 ${idx > 0 ? "border-t border-slate-100" : ""}`}
                              style={{ fontFamily: "var(--font-sans)" }}>
                              {nom(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {desserts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 md:flex-1">
                  <div className="px-4 py-3 border-b border-slate-100 text-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-gold-ink" style={{ fontFamily: "var(--font-sans)" }}>
                      {t.desserts}
                    </span>
                  </div>
                  <ul className="px-4 py-1">
                    {desserts.map((item, idx) => (
                      <li key={item.id}
                        className={`py-2.5 text-center text-sm text-slate-700 ${idx > 0 ? "border-t border-slate-100" : ""}`}
                        style={{ fontFamily: "var(--font-sans)" }}>
                        {nom(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              </div>

              {(prixPlat || prixDessert || prixMenu) && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 text-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-gold-ink" style={{ fontFamily: "var(--font-sans)" }}>
                      {t.prices}
                    </span>
                  </div>
                  <div className="md:flex md:divide-x md:divide-slate-50">
                    {prixPlat && <PrixRow label={t.platAlone} prix={prixPlat} />}
                    {prixDessert && <PrixRow label={t.dessertAlone} prix={prixDessert} />}
                    {prixMenu && <PrixRow label={t.fullMenu} prix={prixMenu} highlight />}
                  </div>
                </div>
              )}

            </div>
          )}

          <p className="text-center text-xs text-slate-400 py-2" style={{ fontFamily: "var(--font-sans)" }}>{t.note}</p>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center">
            <p className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "var(--font-serif)" }}>{t.cta_title}</p>
            <p className="text-xs text-slate-400 mt-1 mb-4" style={{ fontFamily: "var(--font-sans)" }}>
              {t.cta_desc}
            </p>
            <Link
              href="/wifi"
              className="btn btn-or px-5 py-2.5 text-xs"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {t.cta_home}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrixRow({ label, prix, highlight }: { label: string; prix: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 text-sm md:flex-1 md:flex-col md:gap-1 md:text-center ${highlight ? "bg-gold/5" : ""}`} style={{ fontFamily: "var(--font-sans)" }}>
      <span className={highlight ? "font-semibold text-slate-800" : "text-slate-500"}>{label}</span>
      <span className={`font-semibold ${highlight ? "text-gold-ink" : "text-slate-800"}`}>
        {prix.includes("€") ? prix : `${prix} €`}
      </span>
    </div>
  );
}

/* ── LES DEUX DESSINS ──────────────────────────────────────────────────────
 *
 * 🔑 LE MÊME DESSIN AUX TROIS ENDROITS. Il identifie la colonne, il fait le
 * trajet, il se pose dans l'assiette. C'est cette répétition — et elle seule —
 * qui dit « ce que tu choisis ici atterrit là ». Trois dessins différents pour
 * la même chose auraient demandé une légende. */
export function DessinBase({ t = 1 }: { t?: number }) {
  return (
    <svg viewBox="0 0 30 16" width={30 * t} height={16 * t} aria-hidden>
      <path d="M3,8 q6,-7 13,-2 q6,4 11,-1" fill="none" stroke="#C6A972" strokeWidth="3"
        strokeLinecap="round" opacity="0.9" />
      <path d="M3,13 q6,-6 13,-1 q6,4 11,-2" fill="none" stroke="#C6A972" strokeWidth="3"
        strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

export function DessinAccomp({ t = 1 }: { t?: number }) {
  return (
    <svg viewBox="0 0 26 16" width={26 * t} height={16 * t} aria-hidden>
      <path d="M2,6 q10,-5 18,2 q4,6 -4,8 q-11,2 -15,-4 q-2,-4 1,-6 Z" fill="#1f2937" opacity="0.72" />
      <path d="M8,9 q5,-2 8,1" fill="none" stroke="#ffffff" strokeWidth="1.2"
        strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

/* ── LA COLONNE, ET SON NUMÉRO ─────────────────────────────────────────────
 *
 * ⚠️ LE NUMÉRO FAIT PLUS QUE DÉCORER. Deux colonnes côte à côte se lisent comme
 * une alternative — l'une OU l'autre. Numérotées, elles se lisent comme une
 * suite : d'abord ceci, ensuite cela. C'est le même dessin et ce n'est plus le
 * même sens. */
function Colonne({ n, titre, quoi }: { n: number; titre: string; quoi?: 'base' | 'accomp' }) {
  return (
    /* ⛔ PLUS DE « UN AU CHOIX ». Le numéro, l'assiette qui se remplit d'une
       pièce de chaque et le « + » entre les colonnes le disent trois fois :
       l'écrire une quatrième, c'était ne faire confiance à aucune des trois. */
    <div className="px-4 pt-2 pb-3 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[11px] font-semibold text-gold-ink"
          style={{ fontFamily: "var(--font-sans)" }}>{n}</span>
        <span className="text-[10.5px] uppercase tracking-widest text-slate-500" style={{ fontFamily: "var(--font-sans)" }}>
          {titre}
        </span>
        {/* Le dessin, à la source du trajet. `data-source` est ce que mesure le
            script pour savoir d'où partir. */}
        {quoi ? (
          <span data-source={quoi} className="inline-flex shrink-0 items-center">
            {quoi === 'base' ? <DessinBase t={0.85} /> : <DessinAccomp t={0.85} />}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ── L'ASSIETTE, ET LE TRAJET ──────────────────────────────────────────────
 *
 * 🔑 LES DESSINS PARTENT DES EN-TÊTES. Martin : « il faudrait que les dessins
 * la base et l'accompagnement soient en en-tête des colonnes et aillent vers
 * l'assiette ». C'est la bonne idée, et c'est même toute l'idée : une forme qui
 * apparaît dans l'assiette ne dit rien de son origine ; une forme qui VIENT de
 * la colonne 1 dit que c'est la colonne 1 qui remplit l'assiette.
 *
 * ⚠️ LE TRAJET SE MESURE, IL NE S'ÉCRIT PAS. Les en-têtes ne sont pas au même
 * endroit selon la largeur de l'écran — côte à côte sur un ordinateur, l'un
 * sous l'autre sur un téléphone, et plus bas encore si la liste s'allonge.
 * Des décalages écrits à la main seraient justes sur une seule taille de
 * fenêtre. On mesure les deux positions réelles et on en déduit le départ.
 *
 * ⛔ ET SI LA MESURE ÉCHOUE, L'ASSIETTE SE REMPLIT QUAND MÊME : le vol part de
 * zéro, la forme apparaît sur place. On ne perd que le trajet.
 */
function Composition({ legende }: { legende: string }) {
  const boite = useRef<HTMLDivElement | null>(null);
  /* ⛔ ON NE LANCE RIEN AVANT D'AVOIR MESURÉ. L'animation ne joue QU'UNE FOIS :
   * si elle démarrait au rendu, avant que les positions des en-têtes soient
   * connues, le premier — et unique — trajet partirait de zéro, et la pièce
   * apparaîtrait sur place. Il n'y a pas de second tour pour rattraper. */
  const [pret, setPret] = useState(false);

  useLayoutEffect(() => {
    const mesurer = () => {
      const b = boite.current;
      if (!b) return;
      for (const quoi of ['base', 'accomp'] as const) {
        const source = document.querySelector<HTMLElement>(`[data-source="${quoi}"]`);
        const cible = b.querySelector<HTMLElement>(`[data-cible="${quoi}"]`);
        const vol = b.querySelector<HTMLElement>(`[data-vol="${quoi}"]`);
        if (!source || !cible || !vol) continue;
        const s = source.getBoundingClientRect();
        const c = cible.getBoundingClientRect();
        vol.style.setProperty('--dx', `${(s.x + s.width / 2) - (c.x + c.width / 2)}px`);
        vol.style.setProperty('--dy', `${(s.y + s.height / 2) - (c.y + c.height / 2)}px`);
      }
    };
    mesurer();
    setPret(true);
    /* Les polices changent les hauteurs après coup : on remesure quand la page
       bouge, pour que le trajet reste juste si l'animation n'a pas encore joué
       et que la pièce posée reste à sa place si elle a déjà joué. */
    const obs = new ResizeObserver(mesurer);
    if (boite.current?.parentElement) obs.observe(boite.current.parentElement);
    window.addEventListener('resize', mesurer);
    return () => { obs.disconnect(); window.removeEventListener('resize', mesurer); };
  }, []);

  return (
    <div ref={boite} data-pret={pret ? 'oui' : undefined}
      className="relative flex flex-col items-center pt-5 pb-1">
      <style>{`
/* 🔴 LE SÉLECTEUR VISAIT À CÔTÉ, ET LE SYMPTÔME RESSEMBLAIT À UNE ERREUR DE
   CALCUL. J'avais écrit un sélecteur imbriqué : or les pièces ne sont
   pas DANS le SVG de l'assiette, elles sont à côté, posées par-dessus en HTML
   (c'est ce qui permet de les mesurer). La règle ne s'appliquait donc jamais,
   les pièces restaient dans le flux — empilées SOUS l'assiette comme deux
   miettes tombées à côté — et j'ai d'abord corrigé des coordonnées qui étaient
   justes. Une position qui ne bouge pas quand on change le chiffre n'est pas
   une position fausse : c'est une règle qui ne s'applique pas. */
[data-cible], [data-vol]{ position:absolute }
/* 🔴 UNE SEULE HORLOGE POUR LES QUATRE PISTES, ET ELLE NE TOURNE QU'UNE FOIS.
   Première version : les deux pièces partageaient la même animation, décalée de
   deux secondes par un délai. Elles volaient bien toutes les deux — mesuré —
   mais leurs cycles ne se recouvraient plus : quand la base repartait pour un
   tour, l'accompagnement était ENCORE dans l'assiette du tour précédent. À
   l'œil, on ne voyait donc jamais l'accompagnement arriver, seulement
   l'assiette déjà servie. Martin : « la base ça fonctionne, pas
   l'accompagnement, il apparaît juste direct dans l'assiette ».
   ⚠️ Un décalage se met dans les POURCENTAGES, jamais dans un délai : une même
   durée, un même départ, et c'est la partition qui fait l'ordre.

   ⛔ ET ÇA S'ARRÊTE UNE FOIS L'ASSIETTE PLEINE. Une boucle qui vide et remplit
   sans fin finit par dire « ça recommence », pas « composez ». Le geste se
   montre une fois, et l'assiette reste servie — c'est l'image utile, et c'est
   celle qu'on veut avoir sous les yeux pendant qu'on lit les deux listes. */
[data-pret] [data-cible], [data-pret] [data-vol]{ animation-duration: 3.4s; animation-iteration-count: 1; animation-fill-mode: both }
[data-pret] [data-cible="base"]{ animation-name: pose-base; animation-timing-function: steps(1) }
[data-pret] [data-cible="accomp"]{ animation-name: pose-accomp; animation-timing-function: steps(1) }
@keyframes pose-base{ 0%,44%{ opacity:0 } 45%,100%{ opacity:1 } }
@keyframes pose-accomp{ 0%,89%{ opacity:0 } 90%,100%{ opacity:1 } }

/* La copie qui fait le trajet : elle part de l'en-tête (mesuré) et arrive dans
   l'assiette, où elle cède la place à la forme posée. */
[data-vol]{ opacity:0; transform: translate(var(--dx,0px), var(--dy,0px)) }
[data-pret] [data-vol="base"]{ animation-name: vole-base; animation-timing-function: cubic-bezier(.5,0,.2,1) }
[data-pret] [data-vol="accomp"]{ animation-name: vole-accomp; animation-timing-function: cubic-bezier(.5,0,.2,1) }
@keyframes vole-base{
  0%,8%{ opacity:0; transform: translate(var(--dx,0px), var(--dy,0px)) scale(.9) }
  14%{ opacity:1; transform: translate(var(--dx,0px), var(--dy,0px)) scale(1) }
  44%{ opacity:1; transform: translate(0,0) scale(1) }
  45%,100%{ opacity:0; transform: translate(0,0) scale(1) } }
@keyframes vole-accomp{
  0%,52%{ opacity:0; transform: translate(var(--dx,0px), var(--dy,0px)) scale(.9) }
  58%{ opacity:1; transform: translate(var(--dx,0px), var(--dy,0px)) scale(1) }
  89%{ opacity:1; transform: translate(0,0) scale(1) }
  90%,100%{ opacity:0; transform: translate(0,0) scale(1) } }

@media (prefers-reduced-motion: reduce){
  [data-vol]{ display:none }
  [data-cible]{ animation:none !important; opacity:1 !important } }
      `}</style>

      <svg data-assiette viewBox="0 0 120 64" width="188" height="100" aria-hidden
        style={{ overflow: 'visible' }}>
        {/* L'assiette : deux cercles, et le creux se voit. */}
        <ellipse cx="60" cy="40" rx="42" ry="17" fill="#ffffff" stroke="currentColor"
          className="text-slate-200" strokeWidth="1.4" />
        <ellipse cx="60" cy="39" rx="32" ry="12" fill="none" stroke="currentColor"
          className="text-slate-100" strokeWidth="1.2" />
      </svg>

      {/* Les deux emplacements, posés PAR-DESSUS l'assiette en HTML : c'est ce
          qui permet de les mesurer et de les viser depuis l'extérieur du SVG. */}
      {/* ⚠️ LA POSITION SE CALCULE DEPUIS LE CREUX DE L'ASSIETTE, pas au jugé.
          Le dessin fait 100 px de haut pour un cadre de 64 : le centre de
          l'assiette (cy = 40) tombe à 40/64 × 100 = 62 px dans le SVG, plus les
          20 px de marge haute du bloc, soit 82 px. Les pièces se posent autour
          de cette ligne — premier essai à 52, elles s'empilaient SOUS l'assiette
          comme deux miettes tombées à côté. */}
      {/* ⚠️ ET PLUS GRANDES QUE DANS L'EN-TÊTE. À la taille de l'icône, posées
          au milieu d'une assiette de cent pixels, les deux formes devenaient
          deux traces : on voyait une assiette vide. Une assiette se remplit. */}
      <span data-cible="base" style={{ left: 'calc(50% - 52px)', top: 70 }}><DessinBase t={1.6} /></span>
      <span data-cible="accomp" style={{ left: 'calc(50% + 6px)', top: 66 }}><DessinAccomp t={1.6} /></span>
      <span data-vol="base" style={{ left: 'calc(50% - 52px)', top: 70 }}><DessinBase t={1.6} /></span>
      <span data-vol="accomp" style={{ left: 'calc(50% + 6px)', top: 66 }}><DessinAccomp t={1.6} /></span>

      <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-400"
        style={{ fontFamily: "var(--font-sans)" }}>{legende}</p>
    </div>
  );
}
