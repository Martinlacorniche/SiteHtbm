"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Wine, UtensilsCrossed, Leaf, Check, Waves } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const VOILES_ID = "ded6e6fb-ff3c-4fa8-ad07-403ee316be53";

type Lang = "fr" | "en";

type BarItem = {
  id: string; categorie: string;
  nom: string; nom_en: string | null;
  description: string | null; description_en: string | null;
  prix: string; actif: boolean; ordre: number; quantite: number | null; local: boolean;
};

type PlatItem = {
  id: string; section: "sale" | "sucre";
  nom: string; nom_en: string | null;
  description: string | null; description_en: string | null;
  options: string | null; options_en: string | null;
  marque: string | null; prix: string | null;
  vege: boolean; photo_url: string | null; actif: boolean; ordre: number;
};

const T = {
  fr: {
    back: "Retour aux hôtels",
    hotel: "Les Voiles · Toulon",
    title: "Le Rooftop",
    tagline: "Eat · Drink & Enjoy — only.",
    usp: "L’unique rooftop vue mer de Toulon",
    subtitle: "Bar à ciel ouvert sur la rade. Ici, on ne boit jamais à sec : chaque verre arrive avec son assiette. Oui, même le café.",
    formula_title: "Le principe, sans langue de bois",
    formula_plate: "Une assiette",
    formula_drink: "Une boisson",
    formula_result: "Un seul prix",
    formula_rule: "Une boisson toute seule ? Elle s'ennuierait. Chez nous, le prix comprend toujours l'assiette qui va avec. Donc oui, le café est à 8 € — mais c'est un café + de quoi le rendre heureux. Vous nous remercierez.",
    compose: "Composez votre Rooftop",
    step1: "L'assiette",
    step1_sub: "Eh oui, on commence par là.",
    step2: "La boisson",
    step2_sub: "C'est elle qui affiche le prix — l'assiette voyage avec.",
    price_note: "Assiette comprise dans chaque prix. Promis, aucun supplément qui se cache.",
    sale: "Salé",
    sucre: "Sucré, tout en glace",
    reserve: "Réserver une table",
    empty: "La carte arrive très bientôt.",
    vege: "Végé",
  },
  en: {
    back: "Back to hotels",
    hotel: "Les Voiles · Toulon",
    title: "The Rooftop",
    tagline: "Eat · Drink & Enjoy — only.",
    usp: "Toulon’s only sea-view rooftop",
    subtitle: "Open-air bar over the bay. Here we never drink dry: every glass comes with its plate. Yes, even the coffee.",
    formula_title: "How it works, no small print",
    formula_plate: "A plate",
    formula_drink: "A drink",
    formula_result: "One price",
    formula_rule: "A drink on its own? It'd be lonely. Here, the price always includes the plate that goes with it. So yes, the coffee is €8 — but that's a coffee + something to make it happy. You'll thank us.",
    compose: "Build your Rooftop",
    step1: "The plate",
    step1_sub: "Yep, we start here.",
    step2: "The drink",
    step2_sub: "It shows the price — the plate travels with it.",
    price_note: "Plate included in every price. Promise, no sneaky surcharge.",
    sale: "Savoury",
    sucre: "Sweet, all frozen",
    reserve: "Book a table",
    empty: "The menu is coming very soon.",
    vege: "Veggie",
  },
} as const;

export default function RooftopCarteClient() {
  const [lang, setLang] = useState<Lang>("fr");
  const [plats, setPlats] = useState<PlatItem[]>([]);
  const [drinks, setDrinks] = useState<BarItem[]>([]);
  const [drinkCats, setDrinkCats] = useState<string[]>([]);
  const [catEn, setCatEn] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const t = T[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("wifi-lang") : null;
    if (saved === "en" || saved === "fr") setLang(saved);
    else if (typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("fr")) setLang("en");

    Promise.all([
      supabase.from("rooftop_plats").select("*").eq("hotel_id", VOILES_ID).eq("actif", true).order("ordre"),
      supabase.from("wifi_bar").select("*").eq("hotel_id", VOILES_ID).eq("actif", true).order("ordre"),
      supabase.from("wifi_tiles").select("config").eq("slug", "rooftop").eq("hotel_id", VOILES_ID).single(),
    ]).then(([{ data: platData }, { data: barData }, { data: tileData }]) => {
      if (platData) setPlats(platData);
      if (barData) {
        setDrinks(barData);
        const dbCats = [...new Set(barData.map((i: BarItem) => i.categorie))];
        let ordered = dbCats;
        if (tileData?.config?.categories_ordre) {
          const savedOrder = tileData.config.categories_ordre as string[];
          ordered = [...new Set([...savedOrder, ...dbCats])].filter(c => dbCats.includes(c));
        }
        const hidden = new Set((tileData?.config?.categories_masquees ?? []) as string[]);
        setDrinkCats(ordered.filter(c => !hidden.has(c)));
      }
      if (tileData?.config?.en?.categories) setCatEn(tileData.config.en.categories as Record<string, string>);
      setLoading(false);
    });
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    if (typeof window !== "undefined") localStorage.setItem("wifi-lang", next);
  };

  const nomP = (i: PlatItem) => (lang === "en" && i.nom_en) || i.nom;
  const descP = (i: PlatItem) => (lang === "en" && i.description_en) || i.description;
  const optP = (i: PlatItem) => (lang === "en" && i.options_en) || i.options;
  const nomB = (i: BarItem) => (lang === "en" && i.nom_en) || i.nom;
  const descB = (i: BarItem) => (lang === "en" && i.description_en) || i.description;
  const displayCat = (c: string) => (lang === "en" && catEn[c]) || c;

  const sale = plats.filter(p => p.section === "sale");
  const sucre = plats.filter(p => p.section === "sucre");
  const isEmpty = !loading && plats.length === 0 && drinks.length === 0;

  return (
    <main className="min-h-screen bg-[var(--sand)] text-slate-800">
      {/* ---------- HERO ---------- */}
      <header className="relative overflow-hidden bg-[#013a5c] text-white">
        <div className="absolute inset-0 opacity-60 slow-zoom"
          style={{ backgroundImage: "url('/images/package-rooftop.jpg')", backgroundSize: "cover", backgroundPosition: "center 72%" }} />
        {/* Voile dégradé pour garder le texte lisible par-dessus la photo */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#013a5c]/70 via-[#013a5c]/40 to-[#013a5c]/80" />
        <div className="relative mx-auto max-w-4xl px-4 pt-5 pb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition">
            <ArrowLeft size={15} /> {t.back}
          </Link>
          <p className="mt-5 text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">{t.hotel}</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl font-semibold drop-shadow">{t.title}</h1>
          <p className="mt-1.5 font-serif italic text-lg md:text-xl text-[var(--gold)]">{t.tagline}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/70 bg-black/15 px-4 py-1.5 backdrop-blur-sm">
            <Waves size={14} className="text-[var(--gold)]" />
            <span className="text-[12px] md:text-sm font-medium tracking-wide">{t.usp}</span>
          </div>
          <p className="mx-auto mt-3 max-w-md text-sm md:text-base text-white/85">{t.subtitle}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="h-px w-10 bg-[var(--gold)]/60" />
            <button onClick={toggleLang} className="text-[11px] font-semibold tracking-widest text-[var(--gold)] hover:text-white transition">
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <div className="h-px w-10 bg-[var(--gold)]/60" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* ---------- FORMULE — équation visuelle ---------- */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="glass gradient-border rounded-2xl px-6 py-6 text-center"
        >
          <h2 className="font-serif text-2xl md:text-3xl text-slate-900">{t.formula_title}</h2>
          <div className="mt-4 flex items-center justify-center gap-3 md:gap-5 flex-wrap">
            <FormulaBadge icon={<Wine size={22} />} label={t.formula_drink} />
            <span className="font-serif text-3xl md:text-4xl text-[var(--gold)]">+</span>
            <FormulaBadge icon={<UtensilsCrossed size={22} />} label={t.formula_plate} />
            <span className="font-serif text-3xl md:text-4xl text-[var(--gold)]">=</span>
            <FormulaBadge icon={<Check size={22} />} label={t.formula_result} highlight />
          </div>
          <p className="mx-auto mt-4 max-w-lg text-sm text-slate-500 leading-relaxed">{t.formula_rule}</p>
        </motion.section>

        {isEmpty && <p className="text-center text-slate-400">{t.empty}</p>}

        {/* ---------- COMPOSEZ — 2 colonnes couplées (assiette + boisson) ---------- */}
        {(plats.length > 0 || drinks.length > 0) && (
          <section className="space-y-8">
            <SectionTitle>{t.compose}</SectionTitle>

            <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 items-start">
              {/* Colonne gauche — l'assiette */}
              <div className="space-y-5">
                <StepHead num={1} title={t.step1} sub={t.step1_sub} />
                {sale.length > 0 && (
                  <div className="space-y-3">
                    <SubTitle>{t.sale}</SubTitle>
                    {sale.map(p => (
                      <PlatCard key={p.id} nom={nomP(p)} desc={descP(p)} opt={optP(p)}
                        marque={p.marque} prix={p.prix} vege={p.vege} photo={p.photo_url} vegeLabel={t.vege} />
                    ))}
                  </div>
                )}
                {sucre.length > 0 && (
                  <div className="space-y-3">
                    <SubTitle>{t.sucre}</SubTitle>
                    {sucre.map(p => (
                      <PlatCard key={p.id} nom={nomP(p)} desc={descP(p)} opt={optP(p)}
                        marque={p.marque} prix={p.prix} vege={p.vege} photo={p.photo_url} vegeLabel={t.vege} />
                    ))}
                  </div>
                )}
              </div>

              {/* Séparateur "+" — vertical sur desktop */}
              <div className="hidden lg:flex flex-col items-center self-stretch pt-8">
                <div className="flex-1 w-px bg-[var(--gold)]/30" />
                <span className="my-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)] text-white font-serif text-2xl shadow-lg shrink-0">+</span>
                <div className="flex-1 w-px bg-[var(--gold)]/30" />
              </div>
              {/* Séparateur "+" — horizontal sur mobile */}
              <div className="flex lg:hidden items-center justify-center gap-4">
                <div className="h-px flex-1 bg-[var(--gold)]/30" />
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold)] text-white font-serif text-2xl shadow-lg shrink-0">+</span>
                <div className="h-px flex-1 bg-[var(--gold)]/30" />
              </div>

              {/* Colonne droite — la boisson */}
              <div className="space-y-5">
                <StepHead num={2} title={t.step2} sub={t.step2_sub} />
                <p className="flex items-start gap-2 rounded-xl bg-[var(--gold)]/10 px-3 py-2.5 text-[12px] font-medium text-[var(--deep-blue)]">
                  <Check size={15} className="mt-0.5 shrink-0" /> {t.price_note}
                </p>
                {drinkCats.map(cat => {
                  const items = drinks.filter(d => d.categorie === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <h4 className="font-serif text-lg text-slate-900 border-b border-[var(--gold)]/40 pb-1.5 mb-3">
                        {displayCat(cat)}
                      </h4>
                      <ul className="space-y-2.5">
                        {items.map(d => {
                          const desc = descB(d);
                          return (
                            <li key={d.id}>
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm text-slate-700">{nomB(d)}</span>
                                {d.quantite != null && <span className="text-[11px] text-slate-400">{d.quantite} cl</span>}
                                <span className="flex-1 border-b border-dotted border-slate-300 translate-y-[-3px]" />
                                <span className="text-sm font-semibold tabular-nums text-slate-800">
                                  {d.prix?.includes("€") ? d.prix : `${d.prix} €`}
                                </span>
                              </div>
                              {desc && <p className="mt-0.5 text-[11px] italic text-slate-400 leading-snug">{desc}</p>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ---------- CTA RÉSERVATION ---------- */}
        <section className="text-center pt-4">
          <Link href="/reservation-table-voiles"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)] px-8 py-3 text-sm font-semibold tracking-wide text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-white">
            {t.reserve} <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-3">
        <span className="h-px w-8 bg-[var(--gold)]/60" />
        <h3 className="font-serif text-2xl md:text-3xl text-slate-900">{children}</h3>
        <span className="h-px w-8 bg-[var(--gold)]/60" />
      </div>
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{children}</p>;
}

function FormulaBadge({ icon, label, highlight }: { icon: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`flex h-16 w-16 items-center justify-center rounded-full shadow-md ${
        highlight ? "bg-[var(--gold)] text-white ring-2 ring-[var(--gold)]/40" : "bg-white text-[var(--deep-blue)] ring-1 ring-[var(--gold)]/30"
      }`}>
        {icon}
      </span>
      <span className={`text-sm ${highlight ? "font-semibold text-[var(--deep-blue)]" : "font-medium text-slate-700"}`}>{label}</span>
    </div>
  );
}

function StepHead({ num, title, sub }: { num: number; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] font-serif text-lg text-white shadow-sm">
        {num}
      </span>
      <div className="leading-tight">
        <p className="font-serif text-xl text-slate-900">{title}</p>
        <p className="text-[12px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function PlatCard({ nom, desc, opt, marque, prix, vege, photo, vegeLabel }: {
  nom: string; desc: string | null; opt: string | null; marque: string | null;
  prix: string | null; vege: boolean; photo: string | null; vegeLabel: string;
}) {
  return (
    <div className="card-luxe overflow-hidden !p-0 flex flex-col">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={nom} className="h-40 w-full object-cover" />
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h5 className="font-serif text-lg text-slate-900 leading-snug">{nom}</h5>
          {prix && (
            <span className="text-sm font-semibold tabular-nums text-slate-800 shrink-0">
              {prix.includes("€") ? prix : `${prix} €`}
            </span>
          )}
        </div>
        {desc && <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{desc}</p>}
        {opt && <p className="mt-2 text-[12px] italic text-[var(--deep-blue)]/80">{opt}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {vege && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Leaf size={11} /> {vegeLabel}
            </span>
          )}
          {marque && (
            <span className="text-[11px] font-medium text-[var(--gold)] bg-[var(--gold)]/10 px-2 py-0.5 rounded-full">
              {marque}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
