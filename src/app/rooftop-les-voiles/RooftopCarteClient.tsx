"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Wine, UtensilsCrossed, Leaf, ChevronDown } from "lucide-react";
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
    tagline: "Sunset · Eat & Drink",
    usp: "Rooftop vue mer",
    hours: "Ouvert tous les soirs · 17h – 22h",
    subtitle: "Bar à ciel ouvert sur la rade. Ici, chaque verre vient avec son accompagnement à picorer. Oui, même le café.",
    formula_title: "Formule unique",
    formula_plate: "Accompagnement",
    formula_drink: "Boisson",
    formula_result: "Un seul prix",
    formula_rule: "Une boisson toute seule ? Elle s'ennuierait. Chez nous, le prix comprend toujours un accompagnement à grignoter. Vous nous remercierez 😊",
    compose: "Composez votre moment",
    step1: "La boisson",
    step1_sub: "On commence par elle — c'est elle qui affiche le prix.",
    step2: "L'accompagnement",
    step2_sub: "Il vient avec, compris dans le prix.",
    price_note: "Accompagnement compris dans chaque prix. Promis, aucun supplément qui se cache.",
    sale: "Salé",
    sucre: "Sucré, tout en glace",
    reserve: "Réserver une table",
    faq_q: "Pourquoi on ne sert pas juste un verre ?",
    faq_a: "D'abord une histoire de licence : la nôtre est une licence restauration, donc chez nous une boisson s'accompagne toujours de quelque chose à manger. Et franchement, tant mieux — un verre tout seul n'a jamais rendu personne heureux. Chaque boisson arrive donc avec sa petite assiette à grignoter : pas un repas, juste ce qu'il faut pour accompagner le coucher de soleil. Le prix affiché, c'est le tout : rien à ajouter.",
    empty: "La carte arrive très bientôt.",
    vege: "Végé",
  },
  en: {
    back: "Back to hotels",
    hotel: "Les Voiles · Toulon",
    title: "The Rooftop",
    tagline: "Sunset · Eat & Drink",
    usp: "Sea-view rooftop",
    hours: "Open every evening · 5–10pm",
    subtitle: "Open-air bar over the bay. Here, every glass comes with its bite to nibble. Yes, even the coffee.",
    formula_title: "One simple set",
    formula_plate: "Bite",
    formula_drink: "Drink",
    formula_result: "One price",
    formula_rule: "A drink on its own? It'd be lonely. Here, the price always includes a little something to nibble. You'll thank us 😊",
    compose: "Build your moment",
    step1: "The drink",
    step1_sub: "Start here — it's the one that shows the price.",
    step2: "The bite",
    step2_sub: "It comes with, included in the price.",
    price_note: "A bite included in every price. Promise, no sneaky surcharge.",
    sale: "Savoury",
    sucre: "Sweet, all frozen",
    reserve: "Book a table",
    faq_q: "Why don't you just sell a single drink?",
    faq_a: "First, it's a licence thing: ours is a restaurant licence, so here a drink always comes with something to eat. And honestly, all the better — a drink on its own never made anyone happy. So every drink arrives with its own little plate to nibble: not a meal, just enough to go with the sunset. The listed price is the whole thing: nothing to add.",
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
  const [catPrix, setCatPrix] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [faqOpen, setFaqOpen] = useState(false);
  const [foodTab, setFoodTab] = useState<"sale" | "sucre">("sale");

  // Ouvre l'onglet sur la section qui a des plats (si pas de salé, montre le sucré).
  useEffect(() => {
    const hasSale = plats.some(p => p.section === "sale");
    const hasSucre = plats.some(p => p.section === "sucre");
    if (!hasSale && hasSucre) setFoodTab("sucre");
  }, [plats]);
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
      if (tileData?.config?.categories_prix) setCatPrix(tileData.config.categories_prix as Record<string, string>);
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
          <Link href="/" aria-label="Hôtels Toulon Bord de Mer" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/cigale-or-512.png" alt="Hôtels Toulon Bord de Mer" className="mx-auto h-11 w-auto drop-shadow transition-opacity hover:opacity-80" />
          </Link>
          <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">{t.hotel}</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl font-semibold drop-shadow">{t.title}</h1>
          <p className="mt-1.5 font-serif italic text-lg md:text-xl text-[var(--gold)]">{t.tagline}</p>
          <p className="mt-2 text-[12px] font-medium uppercase tracking-widest text-[var(--gold)]">{t.hours}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="h-px w-10 bg-[var(--gold)]/60" />
            <button onClick={toggleLang} className="text-[11px] font-semibold tracking-widest text-[var(--gold)] hover:text-white transition">
              {lang === "fr" ? "EN" : "FR"}
            </button>
            <div className="h-px w-10 bg-[var(--gold)]/60" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-8 pb-28 space-y-8">
        {/* ---------- FORMULE — équation visuelle ---------- */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="rounded-2xl border border-[var(--gold)]/30 bg-white/70 px-6 py-6 text-center shadow-sm backdrop-blur-sm"
        >
          <h2 className="font-serif text-2xl md:text-3xl text-slate-900">{t.formula_title}</h2>
          <div className="mx-auto mt-4 grid max-w-sm grid-cols-[1fr_auto_1fr] items-start justify-items-center gap-2">
            <FormulaBadge icon={<Wine size={22} />} label={t.formula_drink} />
            <span className="flex h-16 items-center font-serif text-3xl md:text-4xl text-[var(--gold)]">+</span>
            <FormulaBadge icon={<UtensilsCrossed size={22} />} label={t.formula_plate} />
          </div>
          <p className="mx-auto mt-4 max-w-lg text-sm text-slate-500 leading-relaxed">{t.formula_rule}</p>
        </motion.section>

        {/* ---------- CTA RÉSERVATION (sous la formule) ---------- */}
        <section className="text-center -mt-1">
          <Link href="/reservation-table-voiles"
            className="inline-flex items-center gap-2.5 rounded-full bg-[var(--gold)] px-10 py-4 text-base font-bold tracking-wide text-[#013a5c] shadow-xl shadow-[var(--gold)]/40 ring-1 ring-[var(--gold)]/50 transition-all hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98]">
            {t.reserve} <ArrowRight size={19} />
          </Link>
        </section>

        {isEmpty && <p className="text-center text-slate-400">{t.empty}</p>}

        {/* ---------- COMPOSEZ — 2 colonnes couplées (assiette + boisson) ---------- */}
        {(plats.length > 0 || drinks.length > 0) && (
          <section className="space-y-8">
            <SectionTitle>{t.compose}</SectionTitle>

            <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 items-start">
              {/* Colonne gauche — la boisson (on commence par elle) */}
              <div className="space-y-5">
                <StepHead num={1} title={t.step1} sub={t.step1_sub} />
                {drinkCats.map(cat => {
                  const items = drinks.filter(d => d.categorie === cat);
                  if (items.length === 0) return null;
                  const prixCat = (catPrix[cat] ?? "").trim();
                  return (
                    <div key={cat}>
                      <h4 className="flex items-baseline gap-2 font-serif text-lg text-slate-900 border-b border-[var(--gold)]/40 pb-1.5 mb-3">
                        <span>{displayCat(cat)}</span>
                        {prixCat && (
                          <span className="ml-auto text-base font-semibold tabular-nums text-[var(--deep-blue)]">
                            {prixCat.includes("€") ? prixCat : `${prixCat} €`}
                          </span>
                        )}
                      </h4>
                      <ul className="space-y-1.5">
                        {items.map(d => {
                          const desc = descB(d);
                          return (
                            <li key={d.id} className="flex flex-wrap items-baseline gap-x-2 leading-snug">
                              <span className="text-sm text-slate-700">{nomB(d)}</span>
                              {d.quantite != null && <span className="text-[11px] text-slate-400">{d.quantite} cl</span>}
                              {desc && <span className="text-[11px] italic text-slate-400">· {desc}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Séparateur "+" — vertical sur desktop (position figée, ne bouge pas quand on change salé/sucré) */}
              <div className="hidden lg:flex flex-col items-center self-start pt-10">
                <div className="h-16 w-px bg-[var(--gold)]/30" />
                <span className="my-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)] text-white font-serif text-2xl shadow-lg shrink-0">+</span>
                <div className="h-16 w-px bg-[var(--gold)]/30" />
              </div>
              {/* Séparateur "+" — horizontal sur mobile */}
              <div className="flex lg:hidden items-center justify-center gap-4">
                <div className="h-px flex-1 bg-[var(--gold)]/30" />
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold)] text-white font-serif text-2xl shadow-lg shrink-0">+</span>
                <div className="h-px flex-1 bg-[var(--gold)]/30" />
              </div>

              {/* Colonne droite — l'accompagnement (vient avec) */}
              <div className="space-y-5">
                <StepHead num={2} title={t.step2} sub={t.step2_sub} />
                {/* Sélecteur salé / sucré */}
                <div className="flex flex-wrap gap-2">
                  {sale.length > 0 && (
                    <button onClick={() => setFoodTab("sale")}
                      className={`rounded-full px-4 py-1.5 text-[13px] font-semibold tracking-wide transition ${foodTab === "sale" ? "bg-[var(--gold)] text-white shadow-sm" : "border border-[var(--gold)]/40 text-[var(--deep-blue)] hover:border-[var(--gold)]"}`}>
                      {t.sale}
                    </button>
                  )}
                  {sucre.length > 0 && (
                    <button onClick={() => setFoodTab("sucre")}
                      className={`rounded-full px-4 py-1.5 text-[13px] font-semibold tracking-wide transition ${foodTab === "sucre" ? "bg-[var(--gold)] text-white shadow-sm" : "border border-[var(--gold)]/40 text-[var(--deep-blue)] hover:border-[var(--gold)]"}`}>
                      {t.sucre}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {(foodTab === "sucre" ? sucre : sale).map(p => (
                    <PlatCard key={p.id} nom={nomP(p)} desc={descP(p)} opt={optP(p)}
                      marque={p.marque} prix={p.prix} vege={p.vege} photo={p.photo_url} vegeLabel={t.vege} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------- FAQ ---------- */}
        <section className="mx-auto max-w-lg">
          <button onClick={() => setFaqOpen(o => !o)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--gold)]/30 bg-white/70 px-5 py-4 text-left shadow-sm backdrop-blur-sm transition hover:border-[var(--gold)]/60 hover:shadow-md">
            <span className="font-serif text-base text-slate-900">{t.faq_q}</span>
            <ChevronDown size={18} className={`shrink-0 text-[var(--gold)] transition-transform ${faqOpen ? "rotate-180" : ""}`} />
          </button>
          {faqOpen && (
            <p className="mt-2 rounded-2xl border border-[var(--gold)]/20 bg-white/60 px-5 py-4 text-sm leading-relaxed text-slate-600 backdrop-blur-sm">{t.faq_a}</p>
          )}
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

function FormulaBadge({ icon, label, highlight }: { icon: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`flex h-16 w-16 items-center justify-center rounded-full shadow-md ${
        highlight ? "bg-[var(--gold)] text-white ring-2 ring-[var(--gold)]/40" : "bg-white text-[var(--deep-blue)] ring-1 ring-[var(--gold)]/30"
      }`}>
        {icon}
      </span>
      <span className={`text-center text-sm leading-tight ${highlight ? "font-semibold text-[var(--deep-blue)]" : "font-medium text-slate-700"}`}>{label}</span>
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
