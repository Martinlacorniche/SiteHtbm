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
    chooseBase: "Au choix",
    withSide: "accompagné de",
    sideOnly: "Garniture au choix",
    sideWith: "Accompagnement",
    or: "ou",
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
    chooseBase: "Choose one",
    withSide: "served with",
    sideOnly: "Side choice",
    sideWith: "Side",
    or: "or",
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
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-[#FDFCF8] md:bg-transparent`}>
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
            <div className="h-px w-8 bg-[#C6A972]/50" />
            <button
              onClick={toggleLang}
              className="text-[10px] font-semibold tracking-widest text-[#C6A972]/80 hover:text-[#C6A972] transition px-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <div className="h-px w-8 bg-[#C6A972]/50" />
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
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#C6A972]" style={{ fontFamily: "var(--font-sans)" }}>
                      {t.plat}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-stretch">

                    {bases.length > 0 && (
                      <div className="md:flex-1 md:self-start py-2">
                        <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-slate-400 text-center" style={{ fontFamily: "var(--font-sans)" }}>
                          {t.chooseBase}
                        </p>
                        <ul>
                          {bases.map((item, idx) => (
                            <li key={item.id} className="text-center" style={{ fontFamily: "var(--font-sans)" }}>
                              <span className="block py-2.5 text-sm text-slate-700">{nom(item)}</span>
                              {idx < bases.length - 1 && (
                                <span className="block text-[10px] uppercase tracking-widest text-slate-300 -mt-1 mb-0.5">{t.or}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {bases.length > 0 && garnitures.length > 0 && (
                      <>
                        <div className="md:hidden flex items-center gap-3 px-4 py-2">
                          <div className="h-px flex-1 bg-slate-100" />
                          <span className="text-[10px] text-slate-300 font-medium" style={{ fontFamily: "var(--font-sans)" }}>{t.withSide}</span>
                          <div className="h-px flex-1 bg-slate-100" />
                        </div>
                        <div className="hidden md:flex flex-col items-center justify-center px-3">
                          <div className="w-px flex-1 bg-slate-100" />
                          <span className="text-3xl font-light text-slate-300 py-2">+</span>
                          <div className="w-px flex-1 bg-slate-100" />
                        </div>
                      </>
                    )}

                    {garnitures.length > 0 && (
                      <div className="md:flex-1 md:self-start py-2">
                        <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-slate-400 text-center" style={{ fontFamily: "var(--font-sans)" }}>
                          {bases.length === 0 ? t.sideOnly : t.sideWith}
                        </p>
                        <ul className="pb-2">
                          {garnitures.map((item, idx) => (
                            <li key={item.id} className="text-center" style={{ fontFamily: "var(--font-sans)" }}>
                              <span className="block py-2.5 text-sm text-slate-700">{nom(item)}</span>
                              {idx < garnitures.length - 1 && (
                                <span className="block text-[10px] uppercase tracking-widest text-slate-300 -mt-1 mb-0.5">{t.or}</span>
                              )}
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
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#C6A972]" style={{ fontFamily: "var(--font-sans)" }}>
                      {t.desserts}
                    </span>
                  </div>
                  <ul>
                    {desserts.map((item, idx) => (
                      <li key={item.id} className="text-center" style={{ fontFamily: "var(--font-sans)" }}>
                        <span className="block py-2.5 text-sm text-slate-700">{nom(item)}</span>
                        {idx < desserts.length - 1 && (
                          <span className="block text-[10px] uppercase tracking-widest text-slate-300 -mt-1 mb-0.5">{t.or}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              </div>

              {(prixPlat || prixDessert || prixMenu) && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 text-center">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#C6A972]" style={{ fontFamily: "var(--font-sans)" }}>
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
              className="inline-flex items-center gap-2 bg-[#C6A972] text-white text-xs font-semibold rounded-full px-5 py-2.5 hover:bg-[#b8975e] transition"
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
    <div className={`flex items-center justify-between px-4 py-3 text-sm md:flex-1 md:flex-col md:gap-1 md:text-center ${highlight ? "bg-[#C6A972]/5" : ""}`} style={{ fontFamily: "var(--font-sans)" }}>
      <span className={highlight ? "font-semibold text-slate-800" : "text-slate-500"}>{label}</span>
      <span className={`font-semibold ${highlight ? "text-[#C6A972]" : "text-slate-800"}`}>
        {prix.includes("€") ? prix : `${prix} €`}
      </span>
    </div>
  );
}
