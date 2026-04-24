"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

const VOILES_ID = "ded6e6fb-ff3c-4fa8-ad07-403ee316be53";

type BarItem = {
  id: string; categorie: string;
  nom: string; nom_en: string | null;
  description: string | null; description_en: string | null;
  prix: string; actif: boolean; ordre: number; quantite: number | null; local: boolean;
};

type Lang = "fr" | "en";

const T = {
  fr: {
    back: "Retour",
    hotel: "Les Voiles · Toulon",
    title: "Rooftop",
    subtitle: "Commande à passer à la réception",
    empty: "La carte n'est pas encore disponible.",
    cta_title: "Ça vous tente ?",
    cta_desc: "Passez à la réception — on s'occupe du reste.",
    cta_home: "Retour à l'accueil",
    local: "local",
  },
  en: {
    back: "Back",
    hotel: "Les Voiles · Toulon",
    title: "Rooftop",
    subtitle: "Order at the front desk",
    empty: "The menu is not yet available.",
    cta_title: "Tempted?",
    cta_desc: "Come to the front desk — we'll handle the rest.",
    cta_home: "Back to home",
    local: "local",
  },
} as const;

export default function RooftopPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [items, setItems] = useState<BarItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catEn, setCatEn] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const t = T[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("wifi-lang") : null;
    if (saved === "en" || saved === "fr") setLang(saved);
    else if (typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("fr")) setLang("en");

    Promise.all([
      supabase.from("wifi_bar").select("*").eq("hotel_id", VOILES_ID).eq("actif", true).order("ordre"),
      supabase.from("wifi_tiles").select("config").eq("slug", "rooftop").eq("hotel_id", VOILES_ID).single(),
    ]).then(([{ data: barData }, { data: tileData }]) => {
      if (barData) {
        setItems(barData);
        const dbCats = [...new Set(barData.map((i: BarItem) => i.categorie))];
        let orderedCats = dbCats;
        if (tileData?.config?.categories_ordre) {
          const saved = tileData.config.categories_ordre as string[];
          orderedCats = [...new Set([...saved, ...dbCats])].filter(c => dbCats.includes(c));
        }
        const hidden = new Set((tileData?.config?.categories_masquees ?? []) as string[]);
        orderedCats = orderedCats.filter(c => !hidden.has(c));
        setCategories(orderedCats);
        if (orderedCats.length > 0) setActive(orderedCats[0]);
      }
      if (tileData?.config?.en?.categories) {
        setCatEn(tileData.config.en.categories as Record<string, string>);
      }
      setLoading(false);
    });
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    if (typeof window !== "undefined") localStorage.setItem("wifi-lang", next);
  };

  const displayCat = (cat: string) => (lang === "en" && catEn[cat]) || cat;
  const displayNom = (i: BarItem) => (lang === "en" && i.nom_en) || i.nom;
  const displayDesc = (i: BarItem) => (lang === "en" && i.description_en) || i.description;

  const catItems = items.filter(i => i.categorie === active);

  return (
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-[#FDFCF8] md:bg-transparent`}>
      <div className="flex flex-col items-center px-4 pt-10 pb-12">

        <div className="w-full max-w-sm mb-8 text-center">
          <Link
            href="/wifiv"
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
            {t.subtitle}
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

        <div className="w-full max-w-sm">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 h-16 animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
              <p className="text-slate-400 text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                {t.empty}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap justify-center gap-2 mb-5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActive(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                      active === cat
                        ? "bg-[#7c2d12] text-white shadow-sm"
                        : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                    }`}
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {displayCat(cat)}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                >
                  <ul className="divide-y divide-slate-50">
                    {catItems.map(item => {
                      const desc = displayDesc(item);
                      return (
                        <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3.5" style={{ fontFamily: "var(--font-sans)" }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="h-1 w-1 rounded-full bg-[#C6A972]/60 shrink-0" />
                              <span className="text-sm text-slate-700">{displayNom(item)}</span>
                              {item.local && (
                                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">
                                  🌿 {t.local}
                                </span>
                              )}
                            </div>
                            {(desc || item.quantite != null) && (
                              <p className="pl-3 mt-0.5 text-[11px] italic text-slate-400 leading-relaxed">
                                {desc}
                                {desc && item.quantite != null && " · "}
                                {item.quantite != null && <span className="text-slate-300">{item.quantite} cl</span>}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-slate-800 shrink-0 pt-0.5">
                            {item.prix.includes("€") ? item.prix : `${item.prix} €`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              </AnimatePresence>

              <div className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center">
                <p className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "var(--font-serif)" }}>
                  {t.cta_title}
                </p>
                <p className="text-xs text-slate-400 mt-1 mb-4" style={{ fontFamily: "var(--font-sans)" }}>
                  {t.cta_desc}
                </p>
                <Link
                  href="/wifiv"
                  className="inline-flex items-center gap-2 bg-[#C6A972] text-white text-xs font-semibold rounded-full px-5 py-2.5 hover:bg-[#b8975e] transition"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {t.cta_home}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
