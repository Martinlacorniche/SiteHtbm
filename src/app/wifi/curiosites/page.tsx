"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

type CurioItem = {
  id: string;
  nom: string;
  emoji: string | null;
  image_url: string | null;
  gratuit: boolean;
  dispo: boolean;
  ordre: number;
};

export default function CuriositesPage() {
  const [items, setItems] = useState<CurioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("wifi_curiosites")
      .select("*")
      .order("ordre")
      .then(({ data }) => {
        if (data) setItems(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-[#FDFCF8]`}>
      <div className="flex flex-col items-center px-4 pt-10 pb-12">

        {/* ── HEADER ── */}
        <div className="w-full max-w-sm mb-8">
          <Link href="/wifi" className="inline-flex items-center gap-1.5 text-slate-400 text-sm mb-6 hover:text-slate-700 transition" style={{ fontFamily: "var(--font-sans)" }}>
            <ArrowLeft size={15} /> Retour
          </Link>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mb-2" style={{ fontFamily: "var(--font-sans)" }}>
            Best Western Plus La Corniche
          </p>
          <h1 className="text-[2rem] font-semibold text-slate-900 leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
            Curiosités
          </h1>
          <p className="text-sm text-slate-400 mt-1 mb-4" style={{ fontFamily: "var(--font-sans)" }}>
            Des objets rien que pour vous faire plaisir.
          </p>
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-[#C6A972]/50" />
            <span className="text-[#C6A972]/70 text-[10px]">✦</span>
            <div className="h-px w-8 bg-[#C6A972]/50" />
          </div>
        </div>

        {/* ── EXPLAINER ── */}
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4 space-y-2" style={{ fontFamily: "var(--font-sans)" }}>
          {[
            { icon: "✅", text: <><strong>Gratuit</strong> si l&apos;objet est disponible — demandez à la réception.</> },
            { icon: "📅", text: <><strong>10 € pour réserver</strong> à l&apos;avance, pour être sûr de l&apos;avoir.</> },
            { icon: "🙏", text: <>On vous fait confiance — retournez l&apos;objet en bon état.</> },
          ].map((line, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
              <span className="shrink-0 text-base leading-snug">{line.icon}</span>
              <span>{line.text}</span>
            </div>
          ))}
        </div>

        {/* ── GRILLE ── */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-slate-100 h-36 animate-pulse" />
              ))
            : items.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="relative h-24 bg-[#f9f5ef]">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.nom} fill className="object-cover" sizes="(max-width:640px) 50vw,200px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl">
                        {item.emoji ?? "📦"}
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2.5" style={{ fontFamily: "var(--font-sans)" }}>
                    <p className="font-semibold text-sm text-slate-800 leading-tight">{item.nom}</p>
                  </div>
                </div>
              ))
          }
        </div>

        {/* ── CTA ── */}
        <div className="w-full max-w-sm mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
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
