"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft, Waves, Footprints } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { weatherEmoji } from "@/lib/meteo";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

const HOTEL_ID = "f9d59e56-9a2f-433e-bcf4-f9753f105f32";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TileConfig = Record<string, any>;

type WeatherState = { air: number | null; sea: number | null; code: number | null };

type Lang = "fr" | "en";

const T = {
  fr: {
    back: "Retour",
    hotel: "Best Western Plus La Corniche",
    title: "La plage",
    subtitle: "Les plages du Mourillon, à quelques minutes à pied.",
    description: "Les plages du Mourillon sont à 2 minutes à pied. Accès direct depuis l'hôtel.",
    seaTemp: "Température de la mer",
    seaPending: "Mesure en cours…",
    seaOff: "Température indisponible pour le moment.",
    seaNote: "Relevé du jour à 12 h, au large de Toulon.",
    airLabel: "dans l'air",
    beaches: "Les plages",
    mapLink: "Y aller",
    tip_title: "Avant de partir",
    tip_desc: "Serviettes, masques de plongée et paddles s'empruntent à la réception.",
    tip_link: "Voir les curiosités",
    cta_title: "Une question ?",
    cta_desc: "Passez à la réception — on est là 24h/24.",
    cta_home: "Retour à l'accueil",
    names: ["Plage du Mourillon", "Plage de la Mitre", "Plage du Lido"] as const,
  },
  en: {
    back: "Back",
    hotel: "Best Western Plus La Corniche",
    title: "The beach",
    subtitle: "The Mourillon beaches, just a few minutes' walk away.",
    description: "The Mourillon beaches are a 2-minute walk away. Direct access from the hotel.",
    seaTemp: "Sea temperature",
    seaPending: "Measuring…",
    seaOff: "Temperature unavailable right now.",
    seaNote: "Today's reading at 12 pm, off the coast of Toulon.",
    airLabel: "in the air",
    beaches: "The beaches",
    mapLink: "Take me there",
    tip_title: "Before you go",
    tip_desc: "Towels, snorkelling masks and paddleboards can be borrowed at the front desk.",
    tip_link: "See the curiosities",
    cta_title: "Any questions?",
    cta_desc: "Come to the front desk — we're here 24/7.",
    cta_home: "Back to home",
    names: ["Mourillon Beach", "La Mitre Beach", "Lido Beach"] as const,
  },
} as const;

const FALLBACK_URLS = [
  "https://maps.google.com/?q=Plage+du+Mourillon,Toulon",
  "https://maps.google.com/?q=Plage+de+la+Mitre,Toulon",
  "https://maps.google.com/?q=Plage+du+Lido,Toulon",
] as const;

// Même résolution FR/EN que la page d'accueil : config.en surcharge config.
function cfgVal(config: TileConfig | undefined, lang: Lang, key: string): string | undefined {
  const en = config?.en as Record<string, string> | undefined;
  if (lang === "en" && en?.[key]) return en[key];
  if (config?.[key]) return config[key];
  return undefined;
}

export default function PlagePage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [config, setConfig] = useState<TileConfig>({});
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [seaFailed, setSeaFailed] = useState(false);
  const reduced = useReducedMotion();
  const t = T[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("wifi-lang") : null;
    if (saved === "en" || saved === "fr") setLang(saved);
    else if (typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("fr")) setLang("en");

    supabase
      .from("wifi_tiles")
      .select("config")
      .eq("slug", "plage")
      .eq("hotel_id", HOTEL_ID)
      .single()
      .then(({ data }) => { if (data?.config) setConfig(data.config); });

    fetch("/api/meteo")
      .then(r => r.json())
      .then(setWeather)
      .catch(() => setSeaFailed(true));
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    if (typeof window !== "undefined") localStorage.setItem("wifi-lang", next);
  };

  const beaches = [1, 2, 3].map((n, i) => ({
    nom: cfgVal(config, lang, `plage${n}_nom`) ?? t.names[i],
    url: (config?.[`plage${n}_url`] as string | undefined) ?? FALLBACK_URLS[i],
    // temps de marche optionnel : affiché seulement si renseigné côté admin
    marche: cfgVal(config, lang, `plage${n}_marche`),
  }));

  const sea = weather?.sea ?? null;
  const air = weather?.air ?? null;
  const seaUnavailable = seaFailed || (weather !== null && sea === null);

  return (
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-[#FDFCF8] md:bg-transparent`}>
      <div className="flex flex-col items-center px-4 pt-10 pb-12">

        {/* ── En-tête ── */}
        <div className="w-full max-w-sm mb-8 text-center">
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
            {t.subtitle}
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-[#C6A972]/50" />
            <button
              onClick={toggleLang}
              className="text-[10px] font-semibold tracking-widest text-[#8C6F39]/90 hover:text-[#8C6F39] transition px-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <div className="h-px w-8 bg-[#C6A972]/50" />
          </div>
        </div>

        <div className="w-full max-w-sm space-y-4">

          {/* ── Température de la mer ── */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="rounded-2xl shadow-sm overflow-hidden text-white"
            style={{ background: "linear-gradient(145deg, #006d8f, #48cae4)" }}
          >
            <div className="px-5 py-7 text-center">
              <div className="flex items-center justify-center gap-2">
                <Waves size={14} className="text-white/70" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/70" style={{ fontFamily: "var(--font-sans)" }}>
                  {t.seaTemp}
                </span>
              </div>

              {!seaUnavailable && sea === null ? (
                <div className="h-11 w-28 mx-auto mt-3 rounded-xl bg-white/20 animate-pulse" aria-label={t.seaPending} />
              ) : sea !== null ? (
                <p className="text-[3rem] leading-none font-semibold tabular-nums mt-3" style={{ fontFamily: "var(--font-serif)" }}>
                  {Math.round(sea)}
                  <span className="text-[1.5rem] align-super ml-0.5 font-normal text-white/70">°C</span>
                </p>
              ) : (
                <p className="text-sm text-white/80 mt-3" style={{ fontFamily: "var(--font-sans)" }}>
                  {t.seaOff}
                </p>
              )}

              {air !== null && (
                <p className="text-xs text-white/70 mt-3" style={{ fontFamily: "var(--font-sans)" }}>
                  {weatherEmoji(weather?.code ?? null)} {Math.round(air)}°C {t.airLabel}
                </p>
              )}

              {sea !== null && (
                <p className="text-[11px] text-white/50 mt-4 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>
                  {t.seaNote}
                </p>
              )}
            </div>
          </motion.div>

          {/* ── Accès ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>
              {cfgVal(config, lang, "description") ?? t.description}
            </p>
          </div>

          {/* ── Les trois plages ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <p
              className="px-5 pt-4 pb-2 text-[10px] uppercase tracking-[0.18em] text-slate-400"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {t.beaches}
            </p>
            <ul className="divide-y divide-slate-50">
              {beaches.map(b => (
                <li key={b.nom}>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 px-5 py-3.5 group hover:bg-slate-50/60 transition"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="h-1 w-1 rounded-full bg-[#C6A972]/60 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm text-slate-700 truncate">{b.nom}</span>
                        {b.marche && (
                          <span className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-400">
                            <Footprints size={11} /> {b.marche}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-[#009dc4] transition shrink-0">
                      {t.mapLink} →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Conseil pratique ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "var(--font-serif)" }}>
              {t.tip_title}
            </p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>
              {t.tip_desc}
            </p>
            <Link
              href="/wifi/curiosites"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-[#004e7c] hover:text-[#009dc4] transition"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              🎒 {t.tip_link} →
            </Link>
          </div>

          {/* ── Retour ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center">
            <p className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "var(--font-serif)" }}>
              {t.cta_title}
            </p>
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
