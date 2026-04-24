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
// Traductions (FR + EN)
// ─────────────────────────────────────────────────────────────
type Translations = {
  welcome: string;
  location: string;
  connected: string;
  book: string;
  visit: string;
  viewPage: string;
  seaTemp: string;
  mapLink: string;
  weekend: string;
  urgent: string;
  info: string;
  ok: string;
  tiles: Record<string, { title: string; tagline: string }>;
  rows: Record<string, string>;
  defaults: Record<string, Record<string, string>>;
};

const T: Record<"fr" | "en", Translations> = {
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
    urgent: "Urgent",
    info: "Hôtel · Info",
    ok: "OK",
    tiles: {
      reception:  { title: "Réception",      tagline: "24h / 24" },
      pdj:        { title: "Petit-déjeuner", tagline: "Buffet inclus" },
      checkout:   { title: "Check-out",      tagline: "Avant 12h" },
      plage:      { title: "La plage",       tagline: "2 min à pied" },
      menu:       { title: "Menu du jour",   tagline: "Restauration légère" },
      curiosites: { title: "Curiosités",     tagline: "Gratuit si dispo" },
      byca:       { title: "Soins Byca",     tagline: "Cosmétiques artisanaux" },
      bar:        { title: "Bar",            tagline: "Cocktails & boissons" },
    },
    rows: {
      weekdays: "Lundi – Vendredi",
      weekend: "Samedi & Dimanche",
      price: "Tarif",
      checkout_std: "Départ standard",
      late: "Late check-out",
    },
    defaults: {
      reception: { message: "On est là 24h/24 — pour n'importe quelle question ou problème, venez nous voir à la réception." },
      pdj:       { semaine: "6h30 – 10h00", weekend: "7h00 – 10h30", prix: "20 € / pers." },
      checkout:  { standard: "avant 12h", late: "jusqu'à 15h · 30 €", note: "Sur demande à la réception, sous réserve de disponibilité." },
      plage:     { description: "Les plages du Mourillon sont à 2 minutes à pied. Accès direct depuis l'hôtel.", plage1_nom: "Plage du Mourillon", plage2_nom: "Plage de la Mitre", plage3_nom: "Plage du Lido" },
      menu:      { description: "Restauration légère disponible à la réception." },
      curiosites:{ description: "SUP, vélos, masques, jeux de société…", note_prix: "Gratuit si disponible · 10 € pour réserver" },
      byca:      { description: "Cosmétiques artisanaux disponibles à la réception." },
      bar:       { description: "Softs, bières, vins et cocktails à la réception." },
    },
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
    urgent: "Urgent",
    info: "Hotel · Info",
    ok: "OK",
    tiles: {
      reception:  { title: "Front desk",     tagline: "24/7" },
      pdj:        { title: "Breakfast",      tagline: "Buffet included" },
      checkout:   { title: "Check-out",      tagline: "Before 12:00" },
      plage:      { title: "The beach",      tagline: "2 min walk" },
      menu:       { title: "Daily menu",     tagline: "Light dining" },
      curiosites: { title: "Curiosities",    tagline: "Free if available" },
      byca:       { title: "Byca care",      tagline: "Artisanal cosmetics" },
      bar:        { title: "Bar",            tagline: "Cocktails & drinks" },
    },
    rows: {
      weekdays: "Monday – Friday",
      weekend: "Saturday & Sunday",
      price: "Price",
      checkout_std: "Standard departure",
      late: "Late check-out",
    },
    defaults: {
      reception: { message: "We're here 24/7 — for any question or issue, come see us at the front desk." },
      pdj:       { semaine: "6:30 – 10:00", weekend: "7:00 – 10:30", prix: "€20 / person" },
      checkout:  { standard: "before 12:00", late: "until 15:00 · €30", note: "On request at the front desk, subject to availability." },
      plage:     { description: "The Mourillon beaches are a 2-minute walk away. Direct access from the hotel.", plage1_nom: "Mourillon Beach", plage2_nom: "La Mitre Beach", plage3_nom: "Lido Beach" },
      menu:      { description: "Light dining available at the front desk." },
      curiosites:{ description: "SUP, bikes, masks, board games…", note_prix: "Free if available · €10 to reserve" },
      byca:      { description: "Artisanal cosmetics available at the front desk." },
      bar:       { description: "Soft drinks, beers, wines and cocktails at the front desk." },
    },
  },
};
type Lang = keyof typeof T;

function cfgVal(config: TileConfig | undefined, lang: Lang, slug: string, key: string): string | undefined {
  const en = config?.en as Record<string, string> | undefined;
  if (lang === "en" && en?.[key]) return en[key];
  if (config?.[key]) return config[key];
  return T[lang].defaults?.[slug]?.[key];
}

function tileTitle(tile: DbTile, lang: Lang): string {
  const en = tile.config?.en as Record<string, string> | undefined;
  if (lang === "en" && en?.title) return en.title;
  if (tile.title) return tile.title;
  return T[lang].tiles?.[tile.slug]?.title ?? tile.slug;
}

function tileTagline(tile: DbTile, lang: Lang): string {
  const en = tile.config?.en as Record<string, string> | undefined;
  if (lang === "en" && en?.tagline) return en.tagline;
  if (tile.tagline) return tile.tagline;
  return T[lang].tiles?.[tile.slug]?.tagline ?? "";
}

// ─────────────────────────────────────────────────────────────
// Rendu du contenu par slug — utilise les valeurs de config (DB)
// ─────────────────────────────────────────────────────────────
function renderContent(tile: DbTile, weather: WeatherState, lang: Lang): React.ReactNode {
  const { slug, config } = tile;
  const t = T[lang];
  const enCfg = config?.en as Record<string, string> | undefined;
  const pickTexte = () => (lang === "en" && enCfg?.texte) || config?.texte;

  switch (slug) {
    case "reception":
      return (
        <p className="text-slate-600 text-sm leading-relaxed">
          {cfgVal(config, lang, slug, "message")}
        </p>
      );
    case "pdj": {
      const we = [0, 6].includes(new Date().getDay());
      return (
        <div className="text-sm space-y-3">
          <Row label={t.rows.weekdays} value={cfgVal(config, lang, slug, "semaine") ?? ""} />
          <Row label={t.rows.weekend} value={cfgVal(config, lang, slug, "weekend") ?? ""} sep />
          <Row label={t.rows.price} value={cfgVal(config, lang, slug, "prix") ?? ""} />
          {we && <p className="text-slate-400 text-xs pt-1">{t.weekend}</p>}
        </div>
      );
    }
    case "checkout":
      return (
        <div className="text-sm space-y-3">
          <Row label={t.rows.checkout_std} value={cfgVal(config, lang, slug, "standard") ?? ""} />
          <Row label={t.rows.late} value={cfgVal(config, lang, slug, "late") ?? ""} sep />
          {cfgVal(config, lang, slug, "note") && <p className="text-slate-400 text-xs">{cfgVal(config, lang, slug, "note")}</p>}
        </div>
      );
    case "plage": {
      const beaches = [
        { nom: cfgVal(config, lang, slug, "plage1_nom") ?? "", url: config?.plage1_url ?? "https://maps.google.com/?q=Plage+du+Mourillon,Toulon" },
        { nom: cfgVal(config, lang, slug, "plage2_nom") ?? "", url: config?.plage2_url ?? "https://maps.google.com/?q=Plage+de+la+Mitre,Toulon" },
        { nom: cfgVal(config, lang, slug, "plage3_nom") ?? "", url: config?.plage3_url ?? "https://maps.google.com/?q=Plage+du+Lido,Toulon" },
      ];
      return (
        <div className="text-sm space-y-3">
          <p className="text-slate-600 leading-relaxed">{cfgVal(config, lang, slug, "description")}</p>
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
      return <p className="text-slate-600 text-sm leading-relaxed">{cfgVal(config, lang, slug, "description")}</p>;
    case "curiosites":
      return (
        <p className="text-slate-600 text-sm leading-relaxed">{cfgVal(config, lang, slug, "description")}</p>
      );
    case "bar":
      return (
        <p className="text-slate-600 text-sm leading-relaxed">
          {cfgVal(config, lang, slug, "description")}
        </p>
      );
    case "byca":
      return (
        <p className="text-slate-600 text-sm leading-relaxed">
          {cfgVal(config, lang, slug, "description")}
        </p>
      );
    default: {
      const texte = pickTexte();
      return texte
        ? <p className="text-slate-600 text-sm leading-relaxed">{texte}</p>
        : null;
    }
  }
}

const HREFS: Record<string, string> = { menu: "/wifi/menu", curiosites: "/wifi/curiosites", bar: "/wifi/bar" };

const FALLBACK_GRADIENTS: Record<string, string> = {
  reception:  "linear-gradient(145deg, #004e7c, #0077b6)",
  pdj:        "linear-gradient(145deg, #7a5010, #C6A972)",
  checkout:   "linear-gradient(145deg, #1a4a35, #52b788)",
  plage:      "linear-gradient(145deg, #006d8f, #48cae4)",
  menu:       "linear-gradient(145deg, #a33000, #f4a261)",
  curiosites: "linear-gradient(145deg, #40015c, #c77dff)",
  byca:       "linear-gradient(145deg, #1c2e20, #81b29a)",
  bar:        "linear-gradient(145deg, #1a0030, #6b21a8)",
};

// Tuiles par défaut si la DB est vide ou inaccessible (titres/contenus résolus via T[lang])
const DEFAULT_TILES: DbTile[] = [
  { id: "reception",  slug: "reception",  emoji: "📞", title: "", tagline: "", image_url: null, visible: true, ordre: 0, config: {} },
  { id: "pdj",        slug: "pdj",        emoji: "☕", title: "", tagline: "", image_url: null, visible: true, ordre: 1, config: {} },
  { id: "checkout",   slug: "checkout",   emoji: "🔑", title: "", tagline: "", image_url: null, visible: true, ordre: 2, config: {} },
  { id: "plage",      slug: "plage",      emoji: "🏖️", title: "", tagline: "", image_url: null, visible: true, ordre: 3, config: {} },
  { id: "menu",       slug: "menu",       emoji: "🍽️", title: "", tagline: "", image_url: null, visible: true, ordre: 4, config: {} },
  { id: "curiosites", slug: "curiosites", emoji: "🎒", title: "", tagline: "", image_url: null, visible: true, ordre: 5, config: {} },
  { id: "byca",       slug: "byca",       emoji: "🌿", title: "", tagline: "", image_url: null, visible: true, ordre: 6, config: {} },
  { id: "bar",        slug: "bar",        emoji: "🍹", title: "", tagline: "", image_url: null, visible: true, ordre: 7, config: {} },
];

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function WifiPage() {
  const [weather, setWeather] = useState<WeatherState>({ air: null, sea: null, code: null });
  const [tiles, setTiles] = useState<DbTile[]>([]);
  const [tilesReady, setTilesReady] = useState(false);
  const [annonce, setAnnonce] = useState<DbTile | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("fr");
  const reduced = useReducedMotion();
  const t = T[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("wifi-lang") : null;
    if (saved === "en" || saved === "fr") setLang(saved);
    else if (!navigator.language.toLowerCase().startsWith("fr")) setLang("en");
    fetch("/api/meteo").then(r => r.json()).then(setWeather).catch(() => {});

    supabase
      .from("wifi_tiles")
      .select("*")
      .eq("hotel_id", "f9d59e56-9a2f-433e-bcf4-f9753f105f32")
      .eq("visible", true)
      .order("ordre")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const ann = data.find(t => t.slug === "annonce") ?? null;
          setAnnonce(ann);
          const regular = data.filter(t => t.slug !== "annonce");
          setTiles(regular.length > 0 ? regular : DEFAULT_TILES);
        } else {
          setTiles(DEFAULT_TILES);
        }
        setTilesReady(true);
      });
  }, []);

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-[#FDFCF8] md:bg-transparent`}>
      <div className="flex flex-col items-center px-4 md:px-10 pt-10 pb-12">

        {/* ── HEADER ── */}
        <motion.header
          className="w-full max-w-sm md:max-w-4xl text-center mb-8 md:mb-10"
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
              onClick={() => setLang(l => {
                const next = l === "fr" ? "en" : "fr";
                if (typeof window !== "undefined") localStorage.setItem("wifi-lang", next);
                return next;
              })}
              className="text-[10px] font-semibold tracking-widest text-[#C6A972]/80 hover:text-[#C6A972] transition px-1"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <div className="h-px w-8 bg-[#C6A972]/50" />
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {weather.air !== null && (
              <span className="text-[11px] text-slate-400" style={{ fontFamily: "var(--font-sans)" }}>
                {weatherEmoji(weather.code)} {Math.round(weather.air)}°C
                {weather.sea !== null && <> · 🌊 {Math.round(weather.sea)}°C</>}
              </span>
            )}
          </div>
        </motion.header>

        {/* ── ANNONCE (popup) ── */}
        <AnimatePresence>
          {annonce && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-md"
                onClick={() => setAnnonce(null)}
              />

              {/* Nuage */}
              <motion.div
                className="relative z-10 w-full max-w-[320px] bg-white overflow-hidden"
                style={{
                  borderRadius: "52% 48% 38% 42% / 58% 55% 42% 40%",
                  boxShadow: "0 20px 60px rgba(180,200,230,0.5), 0 8px 30px rgba(0,0,0,0.10)",
                }}
                initial={{ opacity: 0, scale: 0.88, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
              >
                <div className="px-8 pt-10 pb-8 text-center">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-3"
                    style={{
                      fontFamily: "var(--font-sans)",
                      color: annonce.config?.type === "urgent" ? "#dc2626" : "#9CA3AF",
                    }}
                  >
                    {annonce.config?.type === "urgent" ? t.urgent : t.info}
                  </p>
                  <p
                    className="text-slate-900 text-[15px] leading-[1.6] font-medium mb-6"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {(lang === "en" && annonce.config?.en?.message) || annonce.config?.message}
                  </p>
                  <button
                    onClick={() => setAnnonce(null)}
                    className="px-8 py-2.5 rounded-full text-[13px] font-semibold transition-colors bg-slate-100 hover:bg-slate-200 active:bg-slate-300"
                    style={{
                      fontFamily: "var(--font-sans)",
                      color: annonce.config?.type === "urgent" ? "#dc2626" : "#004e7c",
                    }}
                  >
                    {t.ok}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── GRILLE ── */}
        <motion.div layout className="w-full max-w-sm md:max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {!tilesReady
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square md:aspect-[4/3] rounded-[20px] bg-slate-100 animate-pulse" />
              ))
            : tiles.map((tile, i) => {
              const isOpen = openId === tile.id;
              const href = HREFS[tile.slug];
              const fallback = FALLBACK_GRADIENTS[tile.slug] ?? "linear-gradient(145deg,#004e7c,#009dc4)";

              return (
                <motion.div
                  key={tile.id}
                  layout
                  className={isOpen ? "col-span-2 md:col-span-2" : "col-span-1"}
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
                    className={`relative overflow-hidden cursor-pointer select-none ${isOpen ? "h-44 md:h-40 rounded-t-[20px]" : "aspect-square md:aspect-[4/3] rounded-[20px]"}`}
                    style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.10)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggle(tile.id)}
                  >
                    {tile.image_url ? (
                      <Image src={tile.image_url} alt={tileTitle(tile, lang)} fill className="object-cover transition-transform duration-700 hover:scale-105" sizes="(max-width:640px) 50vw,200px" />
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
                        {tileTitle(tile, lang)}
                      </p>
                      <AnimatePresence>
                        {!isOpen && (
                          <motion.p
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="text-white/60 text-[10px] mt-0.5"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            {tileTagline(tile, lang)}
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
                          {renderContent(tile, weather, lang)}
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
          className="w-full max-w-sm md:max-w-4xl mt-8 flex flex-col md:flex-row md:items-center gap-2.5"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <a
            href="https://www.secure-hotel-booking.com/d-edge/Hotels-Toulon-Bord-De-Mer/JJ8R/fr-FR"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full md:flex-1 py-3.5 rounded-2xl font-semibold text-sm text-slate-900 bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {t.book} <ArrowRight size={14} />
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
