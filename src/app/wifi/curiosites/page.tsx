"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

type CurioItem = {
  id: string;
  nom: string;
  nom_en: string | null;
  emoji: string | null;
  image_url: string | null;
  dispo: boolean;
  description: string | null;
  description_en: string | null;
  tags: string[];
  duree_heures: number;
  prix_reservation: number;
};

type Lang = "fr" | "en";

const T = {
  fr: {
    back: "Retour",
    hotel: "Best Western Plus La Corniche",
    title: "Curiosités",
    subtitle: "Des objets un peu rares à découvrir — parce que voyager, c'est aussi ça.",
    explainerFree: ["Gratuit", " si disponible — demandez à la réception."] as const,
    explainerResa: ["Envie de le ", "réserver", " ? Le prix est indiqué sur chaque objet."] as const,
    explainerTrust: "On vous fait confiance — retournez-le en bon état 🙌",
    resa: "Résa",
    max: (h: number) => h < 24 ? `${h}h max` : (Math.floor(h/24) === 1 ? "1 nuit max" : `${Math.floor(h/24)} nuits max`),
    cta_title: "Ça vous tente ?",
    cta_desc: "Passez à la réception — on est là 24h/24.",
    cta_home: "Retour à l'accueil",
  },
  en: {
    back: "Back",
    hotel: "Best Western Plus La Corniche",
    title: "Curiosities",
    subtitle: "Unusual little things to discover — because that's part of traveling too.",
    explainerFree: ["Free", " if available — ask at the front desk."] as const,
    explainerResa: ["Want to ", "reserve", " one? The price is shown on each item."] as const,
    explainerTrust: "We trust you — please return it in good condition 🙌",
    resa: "Reserve",
    max: (h: number) => h < 24 ? `${h}h max` : (Math.floor(h/24) === 1 ? "1 night max" : `${Math.floor(h/24)} nights max`),
    cta_title: "Tempted?",
    cta_desc: "Come to the front desk — we're here 24/7.",
    cta_home: "Back to home",
  },
} as const;

const TAG_COLORS: Record<string, string> = {
  tech:        "bg-blue-50 text-blue-600",
  waterproof:  "bg-cyan-50 text-cyan-600",
  détente:     "bg-purple-50 text-purple-600",
  detente:     "bg-purple-50 text-purple-600",
  lecture:     "bg-amber-50 text-amber-600",
  sport:       "bg-green-50 text-green-600",
  musique:     "bg-pink-50 text-pink-600",
  photo:       "bg-orange-50 text-orange-600",
  "bien-être": "bg-rose-50 text-rose-600",
};

function tagColor(tag: string) {
  return TAG_COLORS[tag.toLowerCase()] ?? "bg-slate-100 text-slate-500";
}

export default function CuriositesPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [items, setItems] = useState<CurioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const t = T[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("wifi-lang") : null;
    if (saved === "en" || saved === "fr") setLang(saved);
    else if (typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("fr")) setLang("en");

    supabase.from("wifi_curiosites").select("*").order("ordre")
      .then(({ data }) => {
        if (data) setItems(data);
        setLoading(false);
      });
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    if (typeof window !== "undefined") localStorage.setItem("wifi-lang", next);
  };

  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);
  const nom = (i: CurioItem) => (lang === "en" && i.nom_en) || i.nom;
  const desc = (i: CurioItem) => (lang === "en" && i.description_en) || i.description;

  return (
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-[#FDFCF8]`}>
      <div className="flex flex-col items-center px-4 pt-10 pb-12">

        {/* ── HEADER ── */}
        <div className="w-full max-w-sm mb-6">
          <Link href="/wifi" className="inline-flex items-center gap-1.5 text-slate-400 text-sm mb-6 hover:text-slate-700 transition" style={{ fontFamily: "var(--font-sans)" }}>
            <ArrowLeft size={15} /> {t.back}
          </Link>
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400" style={{ fontFamily: "var(--font-sans)" }}>
              {t.hotel}
            </p>
            <button
              onClick={toggleLang}
              className="text-[10px] font-semibold tracking-widest text-[#C6A972]/80 hover:text-[#C6A972] transition px-2 py-0.5 border border-[#C6A972]/30 rounded-full shrink-0"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
          </div>
          <h1 className="text-[2rem] font-semibold text-slate-900 leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 mt-2" style={{ fontFamily: "var(--font-sans)" }}>
            {t.subtitle}
          </p>
        </div>

        {/* ── EXPLAINER ── */}
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 space-y-2.5" style={{ fontFamily: "var(--font-sans)" }}>
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="shrink-0">✅</span>
            <span><strong>{t.explainerFree[0]}</strong>{t.explainerFree[1]}</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="shrink-0">🔒</span>
            <span>{t.explainerResa[0]}<strong>{t.explainerResa[1]}</strong>{t.explainerResa[2]}</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="shrink-0">🙏</span>
            <span>{t.explainerTrust}</span>
          </div>
        </div>

        {/* ── GRILLE ── */}
        <motion.div layout className="w-full max-w-sm grid grid-cols-2 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-slate-100 aspect-square animate-pulse" />
              ))
            : items.map(item => {
                const isOpen = openId === item.id;
                const itemDesc = desc(item);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    className={isOpen ? "col-span-2" : "col-span-1"}
                    style={{ borderRadius: 20 }}
                    transition={{ layout: { type: "spring", stiffness: 360, damping: 32 } }}
                  >
                    <motion.div
                      layout
                      className={`relative overflow-hidden cursor-pointer select-none ${isOpen ? "h-48 rounded-t-[20px]" : "aspect-square rounded-[20px]"}`}
                      style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.10)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggle(item.id)}
                    >
                      {item.image_url ? (
                        <Image src={item.image_url} alt={nom(item)} fill className="object-cover" sizes="(max-width:640px) 50vw,200px" />
                      ) : (
                        <div className="absolute inset-0 bg-[#f9f5ef] flex items-center justify-center text-5xl">
                          {item.emoji ?? "📦"}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/50" />

                      <AnimatePresence>
                        {isOpen && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            className="absolute top-3 left-3 bg-black/30 backdrop-blur-sm text-white rounded-full p-1.5"
                            onClick={e => { e.stopPropagation(); setOpenId(null); }}
                          >
                            <X size={13} />
                          </motion.button>
                        )}
                      </AnimatePresence>

                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="font-semibold text-white text-sm leading-tight drop-shadow-md" style={{ fontFamily: "var(--font-sans)" }}>
                          {nom(item)}
                        </p>
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden bg-white rounded-b-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                        >
                          <div className="px-5 py-4 space-y-3">
                            {(item.tags ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {(item.tags ?? []).map(tag => (
                                  <span key={tag} className={`text-[10px] font-medium rounded-full px-2.5 py-0.5 ${tagColor(tag)}`}>{tag}</span>
                                ))}
                              </div>
                            )}

                            {itemDesc && (
                              <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>
                                {itemDesc}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1" style={{ fontFamily: "var(--font-sans)" }}>
                              <span className="flex items-center gap-1.5"><Clock size={12} />{t.max(item.duree_heures)}</span>
                              {item.prix_reservation > 0 && (
                                <span className="text-[#C6A972] font-semibold">{t.resa} : {item.prix_reservation} €</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
          }
        </motion.div>

        {/* ── CTA ── */}
        <div className="w-full max-w-sm mt-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <p className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "var(--font-serif)" }}>{t.cta_title}</p>
          <p className="text-xs text-slate-400 mt-1 mb-4" style={{ fontFamily: "var(--font-sans)" }}>{t.cta_desc}</p>
          <Link href="/wifi" className="inline-flex items-center gap-2 bg-[#C6A972] text-white text-xs font-semibold rounded-full px-5 py-2.5 hover:bg-[#b8975e] transition" style={{ fontFamily: "var(--font-sans)" }}>
            {t.cta_home}
          </Link>
        </div>
      </div>
    </div>
  );
}
