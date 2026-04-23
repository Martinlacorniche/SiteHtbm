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
  { id: "pdj-v",      slug: "pdj",      emoji: "☕", title: "Petit-déjeuner",       tagline: "Buffet inclus",        image_url: null, visible: true, ordre: 0, config: { semaine: "7h00 – 10h00", weekend: "7h30 – 10h30" } },
  { id: "checkin-v",  slug: "checkin",  emoji: "🔑", title: "Check-in",              tagline: "À partir de 15h",      image_url: null, visible: true, ordre: 1, config: { heure: "À partir de 15h", note: "Dépôt des bagages possible avant." } },
  { id: "checkout-v", slug: "checkout", emoji: "🚪", title: "Check-out",             tagline: "Avant 11h",            image_url: null, visible: true, ordre: 2, config: { standard: "avant 11h", late: "jusqu'à 13h · 20 €", note: "Sur demande à la réception, sous réserve de disponibilité." } },
  { id: "rooftop-v",  slug: "rooftop",  emoji: "🌅", title: "Rooftop",               tagline: "Bar & panorama",       image_url: null, visible: true, ordre: 3, config: { description: "Vue panoramique sur Toulon et la rade. Boissons & petite restauration." } },
  { id: "urgences-v", slug: "urgences", emoji: "🆘", title: "Urgences",              tagline: "Réception 24h/24",     image_url: null, visible: true, ordre: 4, config: { message: "Contactez la réception immédiatement.", telephone: "" } },
  { id: "regles-v",   slug: "regles",   emoji: "📋", title: "Règles de la maison",   tagline: "Pour votre séjour",    image_url: null, visible: true, ordre: 5, config: { texte: "Bienvenue aux Voiles ! Merci de respecter la tranquillité des autres clients et nos espaces communs." } },
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

function renderContent(slug: string, config: TileConfig): React.ReactNode {
  switch (slug) {
    case "pdj":
      return (
        <div className="text-sm space-y-3">
          <Row label="Lundi – Vendredi" value={config.semaine ?? "7h00 – 10h00"} />
          <Row label="Samedi & Dimanche" value={config.weekend ?? "7h30 – 10h30"} sep />
          {config.prix && <Row label="Tarif" value={config.prix} sep />}
        </div>
      );
    case "checkin":
      return (
        <div className="text-sm space-y-3">
          <Row label="Arrivée" value={config.heure ?? "À partir de 15h"} />
          {config.note && <p className="text-slate-400 text-xs pt-1">{config.note}</p>}
        </div>
      );
    case "checkout":
      return (
        <div className="text-sm space-y-3">
          <Row label="Départ standard" value={config.standard ?? "avant 11h"} />
          <Row label="Late check-out" value={config.late ?? "jusqu'à 13h · 20 €"} sep />
          {config.note && <p className="text-slate-400 text-xs">{config.note}</p>}
        </div>
      );
    case "rooftop":
      return (
        <p className="text-slate-600 text-sm leading-relaxed">
          {config.description ?? "Vue panoramique sur Toulon et la rade. Boissons & petite restauration."}
        </p>
      );
    case "urgences":
      return (
        <div className="text-sm space-y-3">
          <p className="text-slate-600 leading-relaxed">{config.message ?? "Contactez la réception immédiatement."}</p>
          {config.telephone && <Row label="Réception" value={config.telephone} sep />}
        </div>
      );
    case "regles":
      return (
        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
          {config.texte ?? "Bienvenue aux Voiles !"}
        </p>
      );
    default:
      return config.texte
        ? <p className="text-slate-600 text-sm leading-relaxed">{config.texte}</p>
        : null;
  }
}

const HREFS: Record<string, string> = { rooftop: "/wifiv/rooftop" };

export default function WifiVPage() {
  const reduced = useReducedMotion();
  const [tiles, setTiles] = useState<DbTile[]>([]);
  const [tilesReady, setTilesReady] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState<DbTile | null>(null);

  useEffect(() => {
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
          className="w-full max-w-sm md:max-w-4xl text-center mb-8 md:mb-10"
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
            Bienvenue chez vous
          </h1>
          <p className="text-sm text-slate-400 mt-1 mb-4" style={{ fontFamily: "var(--font-sans)" }}>
            Toulon · Mourillon
          </p>
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-8 bg-[#C6A972]/50" />
            <span className="text-[#C6A972]/70 text-[10px]">✦</span>
            <div className="h-px w-8 bg-[#C6A972]/50" />
          </div>
        </motion.header>

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
                    {annonce.config?.type === "urgent" ? "Urgent" : "Les Voiles · Info"}
                  </p>
                  <p className="text-slate-900 text-[15px] leading-[1.6] font-medium mb-6" style={{ fontFamily: "var(--font-sans)" }}>
                    {annonce.config?.message}
                  </p>
                  <button
                    onClick={() => setAnnonce(null)}
                    className="px-8 py-2.5 rounded-full text-[13px] font-semibold transition-colors bg-slate-100 hover:bg-slate-200"
                    style={{ fontFamily: "var(--font-sans)", color: annonce.config?.type === "urgent" ? "#dc2626" : "#1a3a4a" }}
                  >
                    OK
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
                          {renderContent(tile.slug, tile.config)}
                          {href && (
                            <Link
                              href={href}
                              className="mt-4 inline-flex items-center gap-2 bg-white text-slate-900 text-xs font-semibold rounded-full px-4 py-2 shadow-sm border border-slate-200 hover:bg-slate-50 transition"
                              style={{ fontFamily: "var(--font-sans)" }}
                              onClick={() => setOpenId(null)}
                            >
                              Voir la carte <ArrowRight size={12} />
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
      </div>
    </div>
  );
}
