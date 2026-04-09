"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft, Clock } from "lucide-react";
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

  useEffect(() => {
    supabase.from("wifi_curiosites").select("*").order("ordre")
      .then(({ data }) => {
        if (data) setItems(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-[#FDFCF8]`}>
      <div className="flex flex-col items-center px-4 pt-10 pb-12">

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

        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 space-y-2.5" style={{ fontFamily: "var(--font-sans)" }}>
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="shrink-0 text-base">✅</span>
            <span><strong>Gratuit</strong> si l&apos;objet est disponible — demandez à la réception.</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="shrink-0 text-base">🔒</span>
            <span>Envie de le <strong>réserver à l&apos;avance</strong> ? C&apos;est possible — le prix est indiqué sur chaque objet.</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <span className="shrink-0 text-base">🙏</span>
            <span>On vous fait confiance — retournez l&apos;objet en bon état 🙌</span>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-slate-100 h-40 animate-pulse" />
              ))
            : items.map(item => (
                <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${item.dispo ? "border-slate-100" : "border-slate-100 opacity-60"}`}>
                  <div className="flex gap-4 p-4">
                    <div className="w-20 h-20 rounded-xl bg-[#f9f5ef] flex items-center justify-center shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.nom} width={80} height={80} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-3xl">{item.emoji ?? "📦"}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900 text-sm leading-tight" style={{ fontFamily: "var(--font-serif)" }}>{item.nom}</p>
                        <span className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 ${item.dispo ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                          {item.dispo ? "Dispo" : "Indispo"}
                        </span>
                      </div>

                      {(item.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(item.tags ?? []).map(tag => (
                            <span key={tag} className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${tagColor(tag)}`}>{tag}</span>
                          ))}
                        </div>
                      )}

                      {item.description && (
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>{item.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-400" style={{ fontFamily: "var(--font-sans)" }}>
                        <span className="flex items-center gap-1"><Clock size={11} />{formatDuree(item.duree_heures)}</span>
                        {item.prix_reservation > 0 && (
                          <span className="text-[#C6A972] font-medium">Résa : {item.prix_reservation} €</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
          }
        </div>

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
