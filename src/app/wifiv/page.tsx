"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Playfair_Display, Inter } from "next/font/google";
import { Star, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

const VOILES_ID = "ded6e6fb-ff3c-4fa8-ad07-403ee316be53";

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

const DEFAULT_TILES: DbTile[] = [
  { id: "pdj-v",      slug: "pdj",      emoji: "☕", title: "", tagline: "", image_url: null, visible: true, ordre: 0, config: {} },
  { id: "checkin-v",  slug: "checkin",  emoji: "🔑", title: "", tagline: "", image_url: null, visible: true, ordre: 1, config: {} },
  { id: "checkout-v", slug: "checkout", emoji: "🚪", title: "", tagline: "", image_url: null, visible: true, ordre: 2, config: {} },
  { id: "rooftop-v",  slug: "rooftop",  emoji: "🌅", title: "", tagline: "", image_url: null, visible: true, ordre: 3, config: {} },
  { id: "urgences-v", slug: "urgences", emoji: "🆘", title: "", tagline: "", image_url: null, visible: true, ordre: 4, config: {} },
  { id: "regles-v",   slug: "regles",   emoji: "📋", title: "", tagline: "", image_url: null, visible: true, ordre: 5, config: {} },
];

const FALLBACK_GRADIENTS: Record<string, string> = {
  pdj:      "linear-gradient(145deg, #7a5010, #C6A972)",
  checkin:  "linear-gradient(145deg, #1a4a35, #52b788)",
  checkout: "linear-gradient(145deg, #334155, #64748b)",
  rooftop:  "linear-gradient(145deg, #7c2d12, #f97316)",
  urgences: "linear-gradient(145deg, #7f1d1d, #ef4444)",
  regles:   "linear-gradient(145deg, #1e3a5f, #3b82f6)",
};

function Row({ label, value, sep }: { label: string; value: string; sep?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${sep ? "border-t border-slate-100 pt-3" : ""}`} style={{ fontFamily: "var(--font-sans)" }}>
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function renderContent(tile: DbTile, lang: Lang): React.ReactNode {
  const { slug, config } = tile;
  const t = T[lang];
  const enCfg = config?.en as Record<string, string> | undefined;
  const pickTexte = () => (lang === "en" && enCfg?.texte) || config?.texte;

  switch (slug) {
    case "pdj":
      return (
        <div className="text-sm space-y-3">
          <Row label={t.rows.daily} value={cfgVal(config, lang, slug, "horaires") ?? ""} />
          {cfgVal(config, lang, slug, "prix") && <Row label={t.rows.price} value={cfgVal(config, lang, slug, "prix")!} sep />}
        </div>
      );
    case "checkin":
      return (
        <div className="text-sm space-y-3">
          <Row label={t.rows.arrival} value={cfgVal(config, lang, slug, "heure") ?? ""} />
          {cfgVal(config, lang, slug, "note") && <p className="text-slate-400 text-xs pt-1">{cfgVal(config, lang, slug, "note")}</p>}
        </div>
      );
    case "checkout":
      return (
        <div className="text-sm space-y-3">
          <Row label={t.rows.checkout_std} value={cfgVal(config, lang, slug, "standard") ?? ""} />
          {cfgVal(config, lang, slug, "note") && <p className="text-slate-400 text-xs">{cfgVal(config, lang, slug, "note")}</p>}
        </div>
      );
    case "rooftop":
      return (
        <p className="text-slate-600 text-sm leading-relaxed">
          {cfgVal(config, lang, slug, "description")}
        </p>
      );
    case "urgences":
      return (
        <div className="text-sm space-y-3">
          <p className="text-slate-600 leading-relaxed">{cfgVal(config, lang, slug, "message")}</p>
          {config?.telephone && <Row label={t.rows.reception} value={config.telephone} sep />}
        </div>
      );
    case "regles":
      return (
        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
          {cfgVal(config, lang, slug, "texte")}
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

const HREFS: Record<string, string> = { rooftop: "/wifiv/rooftop" };

type Translations = {
  welcome: string;
  location: string;
  concept_title: string;
  concept: string;
  tiles: Record<string, { title: string; tagline: string }>;
  rows: Record<string, string>;
  defaults: Record<string, Record<string, string>>;
  seeMap: string;
  urgent: string;
  info: string;
  ok: string;
  book: string;
  bookUrl: string;
};

const T: Record<"fr" | "en", Translations> = {
  fr: {
    welcome: "Bienvenue chez vous",
    location: "Toulon · Mourillon",
    concept_title: "Un hôtel pensé autrement.",
    concept: "Les Voiles est un petit hôtel de charme — confort soigné et mer à deux pas, au prix le plus juste. Pour tenir cet engagement, nous avons fait le choix de ne pas maintenir une réception 24h/24. Il y aura toujours quelqu'un de disponible en cas d'urgence, mais nous vivons l'hospitalité différemment : moins de formalités à l'accueil, plus d'attention aux moments qui font un séjour — le rooftop, la vue, le temps retrouvé.",
    tiles: {
      pdj:      { title: "Petit-déjeuner",       tagline: "Buffet inclus" },
      checkin:  { title: "Check-in",             tagline: "À partir de 15h" },
      checkout: { title: "Check-out",            tagline: "Avant 11h" },
      rooftop:  { title: "Rooftop",              tagline: "Bar & panorama" },
      urgences: { title: "Urgences",             tagline: "Réception 24h/24" },
      regles:   { title: "Règles de la maison",  tagline: "Pour votre séjour" },
    },
    rows: {
      daily: "Tous les jours",
      price: "Tarif",
      arrival: "Arrivée",
      checkout_std: "Départ standard",
      reception: "Réception",
    },
    defaults: {
      pdj:      { horaires: "7h00 – 10h00" },
      checkin:  { heure: "À partir de 15h", note: "Dépôt des bagages possible avant." },
      checkout: { standard: "avant 11h" },
      rooftop:  { description: "Vue panoramique sur Toulon et la rade. Boissons & petite restauration." },
      urgences: { message: "Contactez la réception immédiatement." },
      regles:   { texte: "Bienvenue aux Voiles ! Merci de respecter la tranquillité des autres clients et nos espaces communs." },
    },
    seeMap: "Voir la carte",
    urgent: "Urgent",
    info: "Les Voiles · Info",
    ok: "OK",
    book: "Réserver un séjour",
    bookUrl: "https://www.secure-hotel-booking.com/d-edge/Hotel-Les-Voiles/JJ8J/fr-FR",
  },
  en: {
    welcome: "Welcome home",
    location: "Toulon · Mourillon",
    concept_title: "A different kind of hotel.",
    concept: "Les Voiles is a small boutique hotel — thoughtful comfort and the sea just steps away, at the fairest price. To keep that promise, we've chosen not to staff the front desk around the clock. Someone is always reachable in an emergency, but we experience hospitality differently: fewer formalities at check-in, more attention to the moments that make a stay — the rooftop, the view, time rediscovered.",
    tiles: {
      pdj:      { title: "Breakfast",      tagline: "Buffet included" },
      checkin:  { title: "Check-in",       tagline: "From 15:00" },
      checkout: { title: "Check-out",      tagline: "Before 11:00" },
      rooftop:  { title: "Rooftop",        tagline: "Bar & view" },
      urgences: { title: "Emergencies",    tagline: "24/7 reception" },
      regles:   { title: "House rules",    tagline: "For your stay" },
    },
    rows: {
      daily: "Every day",
      price: "Price",
      arrival: "Arrival",
      checkout_std: "Standard departure",
      reception: "Reception",
    },
    defaults: {
      pdj:      { horaires: "7:00 – 10:00" },
      checkin:  { heure: "From 15:00", note: "Early luggage drop-off available." },
      checkout: { standard: "before 11:00" },
      rooftop:  { description: "Panoramic view over Toulon and the bay. Drinks & light fare." },
      urgences: { message: "Contact the front desk immediately." },
      regles:   { texte: "Welcome to Les Voiles! Please respect the peace of other guests and our shared spaces." },
    },
    seeMap: "See menu",
    urgent: "Urgent",
    info: "Les Voiles · Info",
    ok: "OK",
    book: "Book a stay",
    bookUrl: "https://www.secure-hotel-booking.com/d-edge/Hotel-Les-Voiles/JJ8J/en-US",
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

export default function WifiVPage() {
  const reduced = useReducedMotion();
  const [lang, setLang] = useState<Lang>("fr");
  const [tiles, setTiles] = useState<DbTile[]>([]);
  const [tilesReady, setTilesReady] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState<DbTile | null>(null);
  const t = T[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("wifi-lang") : null;
    if (saved === "en" || saved === "fr") setLang(saved);
    else if (typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("fr")) setLang("en");

    supabase
      .from("wifi_tiles")
      .select("*")
      .eq("hotel_id", VOILES_ID)
      .eq("visible", true)
      .order("ordre")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const ann = data.find((t: DbTile) => t.slug === "annonce") ?? null;
          setAnnonce(ann);
          setTiles(data.filter((t: DbTile) => t.slug !== "annonce"));
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

        {/* Header */}
        <motion.header
          className="w-full max-w-sm md:max-w-4xl text-center mb-6"
          initial={reduced ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex justify-center gap-1 mb-3">
            {Array.from({ length: 4 }).map((_, i) => <Star key={i} size={11} fill="#C6A972" stroke="none" />)}
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mb-2" style={{ fontFamily: "var(--font-sans)" }}>
            Les Voiles · Toulon
          </p>
          <h1 className="text-[2rem] font-semibold text-slate-900 leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
            {t.welcome}
          </h1>
          <p className="text-sm text-slate-400 mt-1 mb-4" style={{ fontFamily: "var(--font-sans)" }}>
            {t.location}
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-[#C6A972]/50" />
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
        </motion.header>

        {/* Bulle concept */}
        <motion.div
          className="w-full max-w-sm md:max-w-2xl mb-8"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        >
          <div className="relative bg-white rounded-3xl px-6 py-5 shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-slate-100">
            {/* Petite oreille de bulle */}
            <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-l border-t border-slate-100 rotate-45" />
            <AnimatePresence mode="wait">
              <motion.div
                key={lang}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-xs font-black tracking-[0.15em] uppercase text-[#C6A972] mb-2 text-center" style={{ fontFamily: "var(--font-sans)" }}>
                  {t.concept_title}
                </p>
                <p className="text-sm text-slate-600 leading-relaxed text-center" style={{ fontFamily: "var(--font-sans)" }}>
                  {t.concept}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Annonce popup */}
        <AnimatePresence>
          {annonce && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setAnnonce(null)} />
              <motion.div
                className="relative z-10 w-full max-w-[320px] bg-white overflow-hidden"
                style={{ borderRadius: "52% 48% 38% 42% / 58% 55% 42% 40%", boxShadow: "0 20px 60px rgba(180,200,230,0.5)" }}
                initial={{ opacity: 0, scale: 0.88, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
              >
                <div className="px-8 pt-10 pb-8 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ fontFamily: "var(--font-sans)", color: annonce.config?.type === "urgent" ? "#dc2626" : "#9CA3AF" }}>
                    {annonce.config?.type === "urgent" ? t.urgent : t.info}
                  </p>
                  <p className="text-slate-900 text-[15px] leading-[1.6] font-medium mb-6" style={{ fontFamily: "var(--font-sans)" }}>
                    {(lang === "en" && annonce.config?.en?.message) || annonce.config?.message}
                  </p>
                  <button
                    onClick={() => setAnnonce(null)}
                    className="px-8 py-2.5 rounded-full text-[13px] font-semibold transition-colors bg-slate-100 hover:bg-slate-200"
                    style={{ fontFamily: "var(--font-sans)", color: annonce.config?.type === "urgent" ? "#dc2626" : "#1a3a4a" }}
                  >
                    {t.ok}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grille */}
        <motion.div layout className="w-full max-w-sm md:max-w-4xl grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {!tilesReady
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square md:aspect-[4/3] rounded-[20px] bg-slate-100 animate-pulse" />
              ))
            : tiles.map((tile, i) => {
              const isOpen = openId === tile.id;
              const href = HREFS[tile.slug];
              const fallback = FALLBACK_GRADIENTS[tile.slug] ?? "linear-gradient(145deg, #1a3a4a, #2d6a8a)";

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
                            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
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
                          {renderContent(tile, lang)}
                          {href && (
                            <Link
                              href={href}
                              className="mt-4 inline-flex items-center gap-2 bg-white text-slate-900 text-xs font-semibold rounded-full px-4 py-2 shadow-sm border border-slate-200 hover:bg-slate-50 transition"
                              style={{ fontFamily: "var(--font-sans)" }}
                              onClick={() => setOpenId(null)}
                            >
                              {t.seeMap} <ArrowRight size={12} />
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

        {/* ── CTA réservation ── */}
        <motion.div
          className="w-full max-w-sm md:max-w-4xl mt-8 flex flex-col md:flex-row md:items-center gap-2.5"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <a
            href={t.bookUrl}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full md:flex-1 py-3.5 rounded-2xl font-semibold text-sm text-slate-900 bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {t.book} <ArrowRight size={14} />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
