"use client";

import React, { useEffect, useState } from "react";
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
    unAuChoix: "un au choix",
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
    unAuChoix: "pick one",
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
                    <div className="flex flex-col items-center pt-5 pb-1">
                      <Assiette />
                      <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-400"
                        style={{ fontFamily: "var(--font-sans)" }}>{t.compose}</p>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-stretch">

                    {bases.length > 0 && (
                      <div className="md:flex-1 md:self-start py-2">
                        <Colonne n={1} titre={t.chooseBase} aide={t.unAuChoix} />
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
                          titre={bases.length === 0 ? t.sideOnly : t.sideWith} aide={t.unAuChoix} />
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

/* ── LA COLONNE, ET SON NUMÉRO ─────────────────────────────────────────────
 *
 * ⚠️ LE NUMÉRO FAIT PLUS QUE DÉCORER. Deux colonnes côte à côte se lisent comme
 * une alternative — l'une OU l'autre. Numérotées, elles se lisent comme une
 * suite : d'abord ceci, ensuite cela. C'est le même dessin et ce n'est plus le
 * même sens. */
function Colonne({ n, titre, aide }: { n: number; titre: string; aide: string }) {
  return (
    /* ⚠️ SUR DEUX LIGNES, PAS SUR UNE. « 2 · Votre accompagnement · un au choix »
       tenait sur une ligne en maquette et se cassait en trois à l'écran, le
       titre coupé au milieu d'un mot. Le titre d'un côté, l'aide en dessous. */
    <div className="px-4 pt-2 pb-3 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[11px] font-semibold text-gold-ink"
          style={{ fontFamily: "var(--font-sans)" }}>{n}</span>
        <span className="text-[10.5px] uppercase tracking-widest text-slate-500" style={{ fontFamily: "var(--font-sans)" }}>
          {titre}
        </span>
      </div>
      <p className="mt-1 text-[10.5px] text-slate-400" style={{ fontFamily: "var(--font-sans)" }}>{aide}</p>
    </div>
  );
}

/* ── L'ASSIETTE QUI SE COMPOSE ─────────────────────────────────────────────
 *
 * 🔑 CE QU'UN TEXTE N'ARRIVAIT PAS À DIRE. « Au choix » d'un côté,
 * « Accompagnement » de l'autre et un « + » au milieu : l'écran listait des
 * plats, et le client lisait une carte. Ici l'assiette se remplit sous ses yeux
 * — la base arrive par la gauche et se pose, l'accompagnement arrive par la
 * droite et se pose à côté — et « j'en prends un de chaque » se comprend sans
 * lire une ligne.
 *
 * ⚠️ ELLE SE VIDE AVANT DE SE REMPLIR À NOUVEAU. Une boucle qui recommence sur
 * une assiette pleine donne l'impression qu'on peut en prendre deux.
 *
 * ⛔ Tout est en CSS, et le réglage système « moins d'animations » montre
 * l'assiette déjà pleine : c'est l'état utile, pas le mouvement.
 */
function Assiette() {
  return (
    <svg data-assiette viewBox="0 0 120 64" width="188" height="100" aria-hidden>
      <style>{`
[data-assiette] .part{ transform-box:fill-box; transform-origin:center }
[data-assiette] .base{ animation: pose-base 7s cubic-bezier(.23,1,.32,1) infinite }
[data-assiette] .accomp{ animation: pose-accomp 7s cubic-bezier(.23,1,.32,1) infinite }
@keyframes pose-base{
  0%{ opacity:0; transform:translate(-30px,-16px) scale(.7) }
  16%,78%{ opacity:1; transform:none }
  88%,100%{ opacity:0; transform:translate(-30px,-16px) scale(.7) } }
@keyframes pose-accomp{
  0%,34%{ opacity:0; transform:translate(30px,-16px) scale(.7) }
  50%,78%{ opacity:1; transform:none }
  88%,100%{ opacity:0; transform:translate(30px,-16px) scale(.7) } }
@media (prefers-reduced-motion: reduce){
  [data-assiette] .part{ animation:none !important; opacity:1 !important; transform:none !important } }
      `}</style>
      {/* L'assiette : deux cercles, et le creux se voit. */}
      <ellipse cx="60" cy="40" rx="42" ry="17" fill="#ffffff" stroke="currentColor"
        className="text-slate-200" strokeWidth="1.4" />
      <ellipse cx="60" cy="39" rx="32" ry="12" fill="none" stroke="currentColor"
        className="text-slate-100" strokeWidth="1.2" />

      {/* La base : des rubans, à gauche. */}
      <g className="part base">
        <path d="M40,40 q6,-7 13,-2 q6,4 12,-1" fill="none" stroke="#C6A972" strokeWidth="3"
          strokeLinecap="round" opacity="0.9" />
        <path d="M40,45 q6,-6 13,-1 q6,4 12,-2" fill="none" stroke="#C6A972" strokeWidth="3"
          strokeLinecap="round" opacity="0.65" />
      </g>

      {/* L'accompagnement : une pièce posée dessus, à droite. */}
      <g className="part accomp">
        <path d="M62,36 q10,-5 18,2 q4,6 -4,8 q-11,2 -15,-4 q-2,-4 1,-6 Z"
          fill="#1f2937" opacity="0.72" />
        <path d="M68,39 q5,-2 8,1" fill="none" stroke="#ffffff" strokeWidth="1.2"
          strokeLinecap="round" opacity="0.35" />
      </g>
    </svg>
  );
}
