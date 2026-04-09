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
  emoji: string | null;
  image_url: string | null;
  dispo: boolean;
  description: string | null;
  tags: string[];
  duree_heures: number;
  prix_reservation: number;
};

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

function formatDuree(h: number) {
  if (h < 24) return `${h}h max`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 nuit max" : `${d} nuits max`;
}

export default function CuriositesPage() {
  const [items, setItems] = useState<CurioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("wifi_curiosites").select("*").order("ordre")
      .then(({ data }) => {
        if (data) setItems(data);
        setLoading(false);
      });
  }, []);

  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

  return (
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-[#FDFCF8]`}>
      <div className="flex flex-col items-center px-4 pt-10 pb-12">

        {/* ── HEADER ── */}
        <div className="w-full max-w-sm mb-6">
          <Link href="/wifi" className="inline-flex items-center gap-1.5 text-slate-400 text-sm mb-6 hover:text-slate-700 transition" style={{ fontFamily: "var(--font-sans)" }}>
            <ArrowLeft size={15} /> Retour
          </Link>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mb-2" style={{ fontFamily: "var(--font-sans)" }}>
            Best Western Plus La Corniche
          </p>
          <h1 className="text-[2rem] font-semibold text-slate-900 leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
            Curiosités
          </h1>
          <p className="text-sm text-slate-500 mt-2" style={{ fontFamily: "var(--font-sans)" }}>
            Des objets un peu rares à découvrir — parce que voyager, c&apos;est aussi ça.
          </p>
        </div>

        {/* ── EXPLAINER ── */}
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 space-y-2.5" style={{ fontFamily: "var(--font-sans)" }}>
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="shrink-0">✅</span>
            <span><strong>Gratuit</strong> si disponible — demandez à la réception.</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="shrink-0">🔒</span>
            <span>Envie de le <strong>réserver</strong> ? Le prix est indiqué sur chaque objet.</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="shrink-0">🙏</span>
            <span>On vous fait confiance — retournez-le en bon état 🙌</span>
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
                return (
                  <motion.div
                    key={item.id}
                    layout
                    className={isOpen ? "col-span-2" : "col-span-1"}
                    style={{ borderRadius: 20 }}
                    transition={{ layout: { type: "spring", stiffness: 360, damping: 32 } }}
                  >
                    {/* Vignette cliquable */}
                    <motion.div
                      layout
                      className={`relative overflow-hidden cursor-pointer select-none ${isOpen ? "h-48 rounded-t-[20px]" : "aspect-square rounded-[20px]"} ${!item.dispo ? "opacity-60" : ""}`}
                      style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.10)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggle(item.id)}
                    >
                      {/* Image ou emoji */}
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.nom} fill className="object-cover" sizes="(max-width:640px) 50vw,200px" />
                      ) : (
                        <div className="absolute inset-0 bg-[#f9f5ef] flex items-center justify-center text-5xl">
                          {item.emoji ?? "📦"}
                        </div>
                      )}

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/50" />

                      {/* Badge dispo */}
                      <div className="absolute top-3 right-3">
                        {item.dispo
                          ? <span className="text-[10px] font-semibold bg-emerald-500 text-white rounded-full px-2 py-0.5">Dispo</span>
                          : <span className="text-[10px] font-semibold bg-black/40 text-white rounded-full px-2 py-0.5">Indispo</span>
                        }
                      </div>

                      {/* Bouton fermer */}
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

                      {/* Nom en bas */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="font-semibold text-white text-sm leading-tight drop-shadow-md" style={{ fontFamily: "var(--font-sans)" }}>
                          {item.nom}
                        </p>
                      </div>
                    </motion.div>

                    {/* Détails expandés */}
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
                            {/* Tags */}
                            {(item.tags ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {(item.tags ?? []).map(tag => (
                                  <span key={tag} className={`text-[10px] font-medium rounded-full px-2.5 py-0.5 ${tagColor(tag)}`}>{tag}</span>
                                ))}
                              </div>
                            )}

                            {/* Description */}
                            {item.description && (
                              <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>
                                {item.description}
                              </p>
                            )}

                            {/* Durée + prix */}
                            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1" style={{ fontFamily: "var(--font-sans)" }}>
                              <span className="flex items-center gap-1.5"><Clock size={12} />{formatDuree(item.duree_heures)}</span>
                              {item.prix_reservation > 0 && (
                                <span className="text-[#C6A972] font-semibold">Résa : {item.prix_reservation} €</span>
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
          <p className="font-semibold text-slate-900 text-sm" style={{ fontFamily: "var(--font-serif)" }}>Ça vous tente ?</p>
          <p className="text-xs text-slate-400 mt-1 mb-4" style={{ fontFamily: "var(--font-sans)" }}>Passez à la réception — on est là 24h/24.</p>
          <Link href="/wifi" className="inline-flex items-center gap-2 bg-[#C6A972] text-white text-xs font-semibold rounded-full px-5 py-2.5 hover:bg-[#b8975e] transition" style={{ fontFamily: "var(--font-sans)" }}>
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
