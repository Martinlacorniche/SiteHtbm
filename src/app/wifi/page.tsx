"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Playfair_Display, Inter } from "next/font/google";
import { Wifi, Instagram, Facebook, Star, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

function weatherEmoji(code: number | null) {
  if (code === null) return "🌊";
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

type WeatherState = { air: number | null; sea: number | null; code: number | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TileConfig = Record<string, any>;

type DbTile = {
  id: string;
  slug: string;
  emoji: string;
  title: string;
  tagline: string;
  image_url: string | null;
  visible: boolean;
  ordre: number;
  config: TileConfig;
};

// ─────────────────────────────────────────────────────────────
// Traductions UI (le contenu des tuiles reste en FR)
// ─────────────────────────────────────────────────────────────
const T = {
  fr: {
    welcome: "Bienvenue chez vous",
    location: "Toulon · Mourillon",
    connected: "WiFi connecté",
    book: "Réserver un séjour",
    visit: "Visiter notre site",
    viewPage: "Voir la page",
    seaTemp: "Température mer",
    mapLink: "Voir sur la carte",
    weekend: "C'est le weekend — une heure de plus ☕",
  },
  en: {
    welcome: "Welcome home",
    location: "Toulon · Mourillon",
    connected: "WiFi connected",
    book: "Book a stay",
    visit: "Visit our website",
    viewPage: "View page",
    seaTemp: "Sea temperature",
    mapLink: "View on map",
    weekend: "It's the weekend — one extra hour ☕",
  },
} as const;
type Lang = keyof typeof T;

// ─────────────────────────────────────────────────────────────
// Rendu du contenu par slug — utilise les valeurs de config (DB)
// ─────────────────────────────────────────────────────────────
function renderContent(slug: string, config: TileConfig, weather: WeatherState, t: typeof T[Lang]): React.ReactNode {
  switch (slug) {
    case "reception":
      return (
        <p className="text-slate-600 text-sm leading-relaxed">
          {config.message ?? "On est là 24h/24 — venez nous voir à la réception."}
        </p>
      );
    case "pdj": {
      const we = [0, 6].includes(new Date().getDay());
      return (
        <div className="text-sm space-y-3">
          <Row label="Lundi – Vendredi" value={config.semaine ?? "6h30 – 10h00"} />
          <Row label="Samedi & Dimanche" value={config.weekend ?? "7h00 – 10h30"} sep />
          <Row label="Tarif" value={config.prix ?? "20 € / pers."} />
          {we && <p className="text-slate-400 text-xs pt-1">{t.weekend}</p>}
        </div>
      );
    }
    case "checkout":
      return (
        <div className="text-sm space-y-3">
          <Row label="Départ standard" value={config.standard ?? "avant 12h"} />
          <Row label="Late check-out" value={config.late ?? "jusqu'à 15h · 30 €"} sep />
          {config.note && <p className="text-slate-400 text-xs">{config.note}</p>}
        </div>
      );
    case "plage": {
      const beaches = [
        { nom: config.plage1_nom ?? "Plage du Mourillon",  url: config.plage1_url ?? "https://maps.google.com/?q=Plage+du+Mourillon,Toulon" },
        { nom: config.plage2_nom ?? "Plage de la Mitre",   url: config.plage2_url ?? "https://maps.google.com/?q=Plage+de+la+Mitre,Toulon" },
        { nom: config.plage3_nom ?? "Plage du Lido",       url: config.plage3_url ?? "https://maps.google.com/?q=Plage+du+Lido,Toulon" },
      ];
      return (
        <div className="text-sm space-y-3">
          <p className="text-slate-600 leading-relaxed">{config.description ?? "Les plages du Mourillon sont à 2 minutes à pied."}</p>
          {weather.sea !== null && (
            <Row label={`🌊 ${t.seaTemp}`} value={`${Math.round(weather.sea)}°C`} sep />
          )}
          <div className="space-y-1.5 pt-1">
            {beaches.map(b => (
              <a key={b.nom} href={b.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 text-[#004e7c] hover:text-[#009dc4] transition group">
                <span className="font-medium">{b.nom}</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-[#009dc4] shrink-0">{t.mapLink} →</span>
              </a>
            ))}
          </div>
        </div>
      );
    }
    case "menu":
      return <p className="text-slate-600 text-sm leading-relaxed">{config.description ?? "Restauration légère disponible à la réception."}</p>;
    case "curiosites":
      return (
        <p className="text-slate-600 text-sm leading-relaxed">{config.description ?? "SUP, vélos, masques, jeux de société…"}</p>
      );
    case "byca":
      return (
        <p className="text-slate-600 text-sm leading-relaxed">
          {config.description ?? "Cosmétiques artisanaux disponibles à la réception."}
        </p>
      );
    default:
      return config.texte
        ? <p className="text-slate-600 text-sm leading-relaxed">{config.texte}</p>
        : null;
  }
}

const HREFS: Record<string, string> = { menu: "/wifi/menu", curiosites: "/wifi/curiosites" };

const FALLBACK_GRADIENTS: Record<string, string> = {
  reception:  "linear-gradient(145deg, #004e7c, #0077b6)",
  pdj:        "linear-gradient(145deg, #7a5010, #C6A972)",
  checkout:   "linear-gradient(145deg, #1a4a35, #52b788)",
  plage:      "linear-gradient(145deg, #006d8f, #48cae4)",
  menu:       "linear-gradient(145deg, #a33000, #f4a261)",
  curiosites: "linear-gradient(145deg, #40015c, #c77dff)",
  byca:       "linear-gradient(145deg, #1c2e20, #81b29a)",
};

// Tuiles par défaut si la DB est vide ou inaccessible
const DEFAULT_TILES: DbTile[] = [
  { id: "reception",  slug: "reception",  emoji: "📞", title: "Réception",       tagline: "24h / 24",              image_url: null, visible: true, ordre: 0, config: { message: "On est là 24h/24 — pour n'importe quelle question ou problème, venez nous voir à la réception." } },
  { id: "pdj",        slug: "pdj",        emoji: "☕", title: "Petit-déjeuner",  tagline: "Buffet inclus",          image_url: null, visible: true, ordre: 1, config: { semaine: "6h30 – 10h00", weekend: "7h00 – 10h30", prix: "20 € / pers." } },
  { id: "checkout",   slug: "checkout",   emoji: "🔑", title: "Check-out",       tagline: "Avant 12h",              image_url: null, visible: true, ordre: 2, config: { standard: "avant 12h", late: "jusqu'à 15h · 30 €", note: "Sur demande à la réception, sous réserve de disponibilité." } },
  { id: "plage",      slug: "plage",      emoji: "🏖️", title: "La plage",        tagline: "2 min à pied",           image_url: null, visible: true, ordre: 3, config: { description: "Les plages du Mourillon sont à 2 minutes à pied. Accès direct depuis l'hôtel." } },
  { id: "menu",       slug: "menu",       emoji: "🍽️", title: "Menu du jour",    tagline: "Restauration légère",    image_url: null, visible: true, ordre: 4, config: { description: "Restauration légère disponible à la réception." } },
  { id: "curiosites", slug: "curiosites", emoji: "🎒", title: "Curiosités",      tagline: "Gratuit si dispo",       image_url: null, visible: true, ordre: 5, config: { description: "SUP, vélos, masques, jeux de société…", note_prix: "Gratuit si disponible · 10 € pour réserver" } },
  { id: "byca",       slug: "byca",       emoji: "🌿", title: "Soins Byca",      tagline: "Cosmétiques artisanaux", image_url: null, visible: true, ordre: 6, config: { description: "Cosmétiques artisanaux disponibles à la réception.", produits: ["Huile de figue", "Crème hydratante", "Savon artisanal", "Sérum visage"] } },
];

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function WifiPage() {
  const [weather, setWeather] = useState<WeatherState>({ air: null, sea: null, code: null });
  const [tiles, setTiles] = useState<DbTile[]>(DEFAULT_TILES);
  const [annonce, setAnnonce] = useState<DbTile | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("fr");
  const reduced = useReducedMotion();
  const t = T[lang];

  useEffect(() => {
    const browser = navigator.language.toLowerCase();
    if (!browser.startsWith("fr")) setLang("en");
    fetch("/api/meteo").then(r => r.json()).then(setWeather).catch(() => {});

    supabase
      .from("wifi_tiles")
      .select("*")
      .eq("visible", true)
      .order("ordre")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const ann = data.find(t => t.slug === "annonce") ?? null;
          setAnnonce(ann);
          const regular = data.filter(t => t.slug !== "annonce");
          if (regular.length > 0) setTiles(regular);
        }
      });
  }, []);

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-[#FDFCF8]`}>
      <div className="flex flex-col items-center px-4 pt-10 pb-12">

        {/* ── HEADER ── */}
        <motion.header
          className="w-full max-w-sm text-center mb-8"
          initial={reduced ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex justify-center gap-1 mb-3">
            {Array.from({ length: 4 }).map((_, i) => <Star key={i} size={11} fill="#C6A972" stroke="none" />)}
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mb-2" style={{ fontFamily: "var(--font-sans)" }}>
            Best Western Plus La Corniche
          </p>
          <h1 className="text-[2rem] font-semibold text-slate-900 leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
            {t.welcome}
          </h1>
          <p className="text-sm text-slate-400 mt-1 mb-4" style={{ fontFamily: "var(--font-sans)" }}>
            {t.location}
          </p>
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-8 bg-[#C6A972]/50" />
            {/* Toggle langue */}
            <button
              onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
              className="text-[10px] font-semibold tracking-widest text-[#C6A972]/80 hover:text-[#C6A972] transition px-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <div className="h-px w-8 bg-[#C6A972]/50" />
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-sans)" }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              <Wifi size={11} className="text-slate-400" />
              <span className="text-[11px] text-slate-400 tracking-wide">{t.connected}</span>
            </span>
            {weather.air !== null && (
              <span className="text-[11px] text-slate-400" style={{ fontFamily: "var(--font-sans)" }}>
                {weatherEmoji(weather.code)} {Math.round(weather.air)}°C
                {weather.sea !== null && <> · 🌊 {Math.round(weather.sea)}°C</>}
              </span>
            )}
          </div>
        </motion.header>

        {/* ── ANNONCE ── */}
        {annonce && (
          <div className={`w-full max-w-sm mb-4 rounded-2xl border px-4 py-3 flex items-start gap-3 ${annonce.config?.type === "urgent" ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
            <span className="text-xl shrink-0 mt-0.5">{annonce.config?.type === "urgent" ? "⚠️" : "ℹ️"}</span>
            <p className={`text-sm leading-relaxed ${annonce.config?.type === "urgent" ? "text-red-700" : "text-blue-700"}`} style={{ fontFamily: "var(--font-sans)" }}>
              {annonce.config?.message}
            </p>
          </div>
        )}

        {/* ── GRILLE ── */}
        <motion.div layout className="w-full max-w-sm grid grid-cols-2 gap-3">
          {tiles.map((tile, i) => {
              const isOpen = openId === tile.id;
              const href = HREFS[tile.slug];
              const fallback = FALLBACK_GRADIENTS[tile.slug] ?? "linear-gradient(145deg,#004e7c,#009dc4)";

              return (
                <motion.div
                  key={tile.id}
                  layout
                  className={isOpen ? "col-span-2" : "col-span-1"}
                  style={{ borderRadius: 20 }}
                  initial={reduced ? false : { opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    layout: { type: "spring", stiffness: 360, damping: 32 },
                    opacity: { duration: 0.35, delay: reduced ? 0 : i * 0.05 },
                    scale:   { duration: 0.35, delay: reduced ? 0 : i * 0.05 },
                  }}
                >
                  {/* Vignette */}
                  <motion.div
                    layout
                    className={`relative overflow-hidden cursor-pointer select-none ${isOpen ? "h-44 rounded-t-[20px]" : "aspect-square rounded-[20px]"}`}
                    style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.10)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggle(tile.id)}
                  >
                    {tile.image_url ? (
                      <Image src={tile.image_url} alt={tile.title} fill className="object-cover transition-transform duration-700 hover:scale-105" sizes="(max-width:640px) 50vw,200px" />
                    ) : (
                      <div className="absolute inset-0" style={{ background: fallback }} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/55" />

                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between">
                      <span className="text-2xl drop-shadow">{tile.emoji}</span>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.18 }}
                            className="bg-black/30 backdrop-blur-sm text-white rounded-full p-1 hover:bg-black/50 transition"
                            onClick={(e) => { e.stopPropagation(); setOpenId(null); }}
                          >
                            <X size={14} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="absolute bottom-3.5 left-3.5 right-3.5">
                      <p className="font-semibold text-white text-sm leading-tight drop-shadow-md" style={{ fontFamily: "var(--font-sans)" }}>
                        {tile.title}
                      </p>
                      <AnimatePresence>
                        {!isOpen && (
                          <motion.p
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="text-white/60 text-[10px] mt-0.5"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            {tile.tagline}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>

                  {/* Contenu étendu */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: "easeInOut" }}
                        className="overflow-hidden bg-white rounded-b-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                      >
                        <div className="px-5 py-5">
                          {renderContent(tile.slug, tile.config, weather, t)}
                          {href && (
                            <Link
                              href={href}
                              className="mt-4 inline-flex items-center gap-2 bg-white text-slate-900 text-xs font-semibold rounded-full px-4 py-2 shadow-sm border border-slate-200 hover:bg-slate-50 transition"
                              style={{ fontFamily: "var(--font-sans)" }}
                              onClick={() => setOpenId(null)}
                            >
                              {t.viewPage} <ArrowRight size={12} />
                            </Link>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>

        {/* ── CTA ── */}
        <motion.div
          className="w-full max-w-sm mt-8 space-y-2.5"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <a
            href="https://www.secure-hotel-booking.com/d-edge/Hotels-Toulon-Bord-De-Mer/JJ8R/fr-FR"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm text-slate-900 bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {t.book} <ArrowRight size={14} />
          </a>
          <a
            href="/"
            className="block w-full text-center py-3 rounded-2xl text-sm text-slate-400 border border-slate-200 hover:bg-slate-50 transition"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {t.visit}
          </a>
        </motion.div>

        <div className="flex gap-6 mt-6">
          <a href="https://www.instagram.com/hotels_toulon_mer/" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-slate-600 transition"><Instagram size={16} /></a>
          <a href="https://www.facebook.com/hotelstbm" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-slate-600 transition"><Facebook size={16} /></a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, sep }: { label: string; value: string; sep?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${sep ? "border-t border-slate-100 pt-3" : ""}`} style={{ fontFamily: "var(--font-sans)" }}>
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
