"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────
type Step      = "booking" | "cards" | "deal" | "payment" | "confirmed";
type CardState = "off" | "on" | "locked"; // off → on (tap) → locked (retap) → off
type DealPhase = "live" | "personalizing" | "ready";

interface LiveDeal {
  roomId:   string;
  roomName: string;
  price:    number;  // total (room × nights)
  otaPrice: number;  // mock booking.com
  perks:    string[];
  activeIds: string[];
}

interface PersonalizedDeal extends LiveDeal {
  dealPhrase: string;
  dealClose:  string;
  otaAddon:   string | null;
  otaMessage: string | null;
}

// ── Données ───────────────────────────────────────────────────
// Triées par intérêt potentiel client (les plus désirées en premier)
const CARDS = [
  { id: "petit_dej",         label: "Je ne zappe jamais un petit-déj",     sub: "Inclus chaque matin pour deux",     threshold: 30 },
  { id: "vue_mer",           label: "Jamais sans la vue mer",              sub: "Rooftop ou vue rade garantie",      threshold: 60 },
  { id: "late_checkout",     label: "Je pars à mon rythme",                sub: "Late checkout jusqu'à 13h",         threshold: 45 },
  { id: "paiement_immediat", label: "Je suis certain de venir",            sub: "Pas besoin d'assurance annulation", threshold:  0 },
  { id: "arrivee_tardive",   label: "J'arrive tard le soir",               sub: "Après 20h, pas de contrainte",      threshold:  0 },
  { id: "early_checkin",     label: "J'arrive tôt",                        sub: "Early check-in dès midi",           threshold: 50 },
  { id: "parking",           label: "J'ai besoin du parking",              sub: "Sécurisé, en sous-sol",             threshold: 20 },
  { id: "champagne",         label: "Champagne à l'arrivée",               sub: "Dans la chambre à votre check-in", threshold: 78 },
  { id: "fidelite",          label: "On se connaît déjà",                  sub: "J'ai déjà séjourné ici",            threshold:  0 },
  { id: "suite",             label: "La suite si elle est libre",          sub: "Upgrade max si disponible",         threshold: 85 },
];

// Labels d'affichage dans la card deal
const PERK_LABELS: Record<string, string> = {
  petit_dej:         "Petit-déjeuner inclus chaque matin",
  vue_mer:           "Vue rade garantie",
  late_checkout:     "Late checkout jusqu'à 13h",
  paiement_immediat: "Check-in express · code SMS la veille",
  arrivee_tardive:   "Bouteille de bienvenue à l'arrivée",
  early_checkin:     "Early check-in dès midi",
  parking:           "Parking sécurisé inclus",
  champagne:         "Champagne à l'arrivée",
  fidelite:          "Upgrade chambre si disponible",
  suite:             "Upgrade suite si disponible",
};

const ROOMS: Record<string, { name: string; price: number }> = {
  cosy:       { name: "Chambre Cosy",       price: 80  },
  superieure: { name: "Chambre Supérieure", price: 100 },
  rooftop:    { name: "Chambre Rooftop",    price: 150 },
};

const STEPS: Step[] = ["booking", "cards", "deal", "payment", "confirmed"];

// ── Helpers ───────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split("T")[0]; }
function addDays(d: string, n: number): string {
  const base = d?.length === 10 ? d : todayStr();
  const date = new Date(base + "T00:00:00");
  if (isNaN(date.getTime())) return todayStr();
  date.setDate(date.getDate() + n);
  return date.toISOString().split("T")[0];
}
function fmt(d: string) {
  if (!d || d.length < 10) return "";
  const date = new Date(d + "T00:00:00");
  return isNaN(date.getTime()) ? "" : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
// Parité tarifaire : Booking affiche le même prix au client
// Le différenciateur, c'est les inclus — pas le tarif
function mockOtaPrice(roomPrice: number, n: number) {
  return roomPrice * n;
}
function vibeLabel(v: number) {
  if (v < 25) return "Budget malin";
  if (v < 50) return "Raisonnable";
  if (v < 75) return "Confort +";
  return "Expérience totale";
}

// ── Calcul live du deal (sans API) ───────────────────────────
function computeLiveDeal(vibe: number, cardStates: Record<string, CardState>, nights: number): LiveDeal {
  const activeIds = CARDS
    .filter(c => {
      const s = cardStates[c.id] ?? "off";
      if (s === "off") return false;
      if (s === "locked") return true;
      return vibe >= c.threshold;
    })
    .map(c => c.id);

  // Chambre selon vibe + cartes
  let roomId: string;
  if (activeIds.includes("vue_mer") || activeIds.includes("suite")) {
    roomId = "rooftop";
  } else if (vibe >= 65) {
    roomId = "rooftop";
  } else if (vibe >= 28) {
    roomId = "superieure";
  } else {
    roomId = "cosy";
  }

  const room  = ROOMS[roomId];
  const perks = activeIds.filter(id => PERK_LABELS[id]).map(id => PERK_LABELS[id]).slice(0, 3);

  return {
    roomId,
    roomName:  room.name,
    price:     room.price * nights,
    otaPrice:  mockOtaPrice(room.price, nights),
    perks,
    activeIds,
  };
}

// ── Palette ───────────────────────────────────────────────────
const C = {
  bg:         "#F8F4EE",
  card:       "#FFFFFF",
  border:     "rgba(190,165,130,0.2)",
  borderAct:  "rgba(184,144,106,0.42)",
  borderLock: "rgba(74,120,110,0.4)",
  text:       "#1C1208",
  textSec:    "#7A6950",
  textMuted:  "#B5A58F",
  accent:     "#B8906A",
  accentBg:   "rgba(184,144,106,0.09)",
  locked:     "#4A7870",
  lockedBg:   "rgba(74,120,112,0.08)",
  inactive:   "rgba(28,18,8,0.18)",
};

// ── Composant Counter ─────────────────────────────────────────
function Counter({ value, min, max, onChange, label }: {
  value: number; min: number; max: number; onChange: (n: number) => void; label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs tracking-widest uppercase" style={{ color: C.textMuted }}>{label}</span>
      <div className="flex items-center gap-5">
        <button onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-base transition-all"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textSec }}>
          −
        </button>
        <span className="text-base w-5 text-center tabular-nums" style={{ color: C.text }}>{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-base transition-all"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textSec }}>
          +
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ReservationVoiles() {
  const t = todayStr();

  const [step,       setStep]      = useState<Step>("booking");
  const [checkIn,    setCheckIn]   = useState(addDays(t, 7));
  const [nights,     setNights]    = useState(2);
  const [guests,     setGuests]    = useState(2);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [vibe,       setVibe]       = useState(50);
  const [dealPhase,  setDealPhase]  = useState<DealPhase>("live");
  const [aiDeal,     setAiDeal]     = useState<PersonalizedDeal | null>(null);
  const [form,       setForm]       = useState({ name: "", email: "" });
  const [confirmed,  setConfirmed]  = useState(false);

  const checkOut   = addDays(checkIn, nights);
  const currentIdx = STEPS.indexOf(step);

  // Deal calculé en temps réel (local, sans API)
  const liveDeal = computeLiveDeal(vibe, cardStates, nights);
  // Deal final affiché (perso IA ou fallback live)
  const displayDeal = aiDeal ?? liveDeal;
  const total       = displayDeal.price;

  // Cycle : off → on → locked → off
  const cycleCard = useCallback((id: string) => {
    setCardStates(prev => {
      const cur  = prev[id] ?? "off";
      const next: CardState = cur === "off" ? "on" : cur === "on" ? "locked" : "off";
      return { ...prev, [id]: next };
    });
  }, []);

  const goBack = () => {
    if (step === "deal" && dealPhase === "ready") { setDealPhase("live"); return; }
    if (currentIdx > 0 && !confirmed) setStep(STEPS[currentIdx - 1]);
  };

  const personalizeDeal = async () => {
    setDealPhase("personalizing");
    try {
      const res  = await fetch("/api/recommande", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          checkIn, nights, guests, vibe,
          atouts:   liveDeal.activeIds,
          roomId:   liveDeal.roomId,      // confirmé localement
          otaPrice: liveDeal.otaPrice,
          ourPrice: liveDeal.price,
        }),
      });
      const data = await res.json();
      setAiDeal({
        ...liveDeal,
        dealPhrase: data.dealPhrase ?? "Notre meilleure option pour votre séjour.",
        dealClose:  data.dealClose  ?? "On a un deal ?",
        otaAddon:   data.otaAddon   ?? null,
        otaMessage: data.otaMessage ?? null,
      });
      setDealPhase("ready");
    } catch {
      setAiDeal({
        ...liveDeal,
        dealPhrase: "Notre meilleure option pour votre séjour.",
        dealClose:  "On a un deal ?",
        otaAddon:   null,
        otaMessage: "Meilleur prix direct garanti.",
      });
      setDealPhase("ready");
    }
  };

  const enterDeal = () => { setDealPhase("live"); setAiDeal(null); setStep("deal"); };

  const reset = () => {
    setStep("booking"); setConfirmed(false); setAiDeal(null);
    setCardStates({}); setVibe(50); setDealPhase("live"); setForm({ name: "", email: "" });
  };

  const slide = {
    initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 }, transition: { duration: 0.25 },
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.bg, fontFamily: "system-ui, sans-serif", color: C.text }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <button onClick={goBack} className="transition-opacity hover:opacity-60 min-w-[60px] text-left"
          style={{ fontSize: "10px", letterSpacing: "0.25em", color: C.textMuted, textTransform: "uppercase" }}>
          {currentIdx > 0 && !confirmed ? "← Retour" : <Link href="/">← Retour</Link>}
        </button>
        <div className="text-center">
          <p style={{ fontSize: "8px", letterSpacing: "0.4em", color: C.textMuted, textTransform: "uppercase" }}>Hôtel · Mourillon</p>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: C.text, letterSpacing: "0.08em", marginTop: "1px" }}>Les Voiles</p>
        </div>
        <div className="min-w-[60px] text-right" style={{ fontSize: "8px", letterSpacing: "0.3em", color: C.textMuted, textTransform: "uppercase" }}>
          Toulon
        </div>
      </header>

      {/* Progress */}
      <div className="flex justify-center gap-2 py-4">
        {(["booking", "cards", "deal"] as Step[]).map(s => {
          const idx = STEPS.indexOf(s);
          const active = idx <= currentIdx;
          return (
            <div key={s} className="rounded-full transition-all duration-400"
              style={{ height: "2px", width: idx === currentIdx ? "24px" : "8px",
                background: active ? C.accent : C.border }} />
          );
        })}
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col justify-center px-6 pb-16 max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* ── Booking ─────────────────────────── */}
          {step === "booking" && (
            <motion.div key="booking" {...slide} className="space-y-7">
              <p style={{ fontSize: "9px", letterSpacing: "0.35em", color: C.textMuted, textTransform: "uppercase" }}>Votre séjour</p>

              {/* Date */}
              <div>
                <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: C.textMuted, textTransform: "uppercase", marginBottom: "8px" }}>
                  Arrivée
                </p>
                <input type="date" value={checkIn} min={addDays(t, 1)}
                  onChange={e => setCheckIn(e.target.value || addDays(t, 7))}
                  className="outline-none cursor-pointer w-full bg-transparent"
                  style={{ fontFamily: "Georgia, serif", fontSize: "28px", color: C.text, fontWeight: 300 }} />
                {checkIn && (
                  <p className="mt-1" style={{ fontSize: "12px", color: C.textSec }}>
                    {fmt(checkIn)} — {fmt(checkOut)}
                  </p>
                )}
              </div>

              {/* Counters */}
              <div className="space-y-5 pt-5" style={{ borderTop: `1px solid ${C.border}` }}>
                <Counter value={nights} min={1} max={14} onChange={setNights} label={`Nuit${nights > 1 ? "s" : ""}`} />
                <Counter value={guests} min={1} max={4}  onChange={setGuests} label={`Personne${guests > 1 ? "s" : ""}`} />
              </div>

              <button onClick={() => setStep("cards")}
                className="w-full py-4 rounded-2xl text-sm font-medium transition-all"
                style={{ background: C.text, color: "#F8F4EE", letterSpacing: "0.02em" }}>
                Continuer
              </button>
            </motion.div>
          )}

          {/* ── Cartes ──────────────────────────── */}
          {step === "cards" && (
            <motion.div key="cards" {...slide} className="space-y-4">
              <div>
                <p style={{ fontSize: "9px", letterSpacing: "0.35em", color: C.textMuted, textTransform: "uppercase", marginBottom: "6px" }}>
                  Vos préférences
                </p>
                <p style={{ fontSize: "13px", color: C.textSec }}>
                  Tap · Retap = <span style={{ color: C.locked }}>prioritaire ⚑</span>
                </p>
              </div>

              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "56vh", scrollbarWidth: "none" }}>
                {CARDS.map(c => {
                  const state    = cardStates[c.id] ?? "off";
                  const isOn     = state === "on";
                  const isLocked = state === "locked";
                  const isActive = isOn || isLocked;
                  return (
                    <button key={c.id} onClick={() => cycleCard(c.id)}
                      className="w-full text-left px-4 py-3.5 rounded-2xl transition-all"
                      style={{
                        background: isLocked ? C.lockedBg : isOn ? C.accentBg : C.card,
                        border: `1px solid ${isLocked ? C.borderLock : isOn ? C.borderAct : C.border}`,
                      }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm leading-snug" style={{ color: isLocked ? C.locked : isOn ? C.accent : C.textSec }}>
                            {c.label}
                          </p>
                          <p className="mt-0.5 truncate" style={{ fontSize: "10px", color: C.textMuted }}>{c.sub}</p>
                        </div>
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-all"
                          style={{
                            background: isLocked ? "rgba(74,120,112,0.15)" : isOn ? C.accentBg : "transparent",
                            border: `1px solid ${isLocked ? C.borderLock : isOn ? C.borderAct : C.border}`,
                          }}>
                          {isLocked && <span style={{ color: C.locked, fontSize: "9px" }}>⚑</span>}
                          {isOn     && <span style={{ color: C.accent, fontSize: "9px" }}>✓</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button onClick={enterDeal}
                className="w-full py-4 rounded-2xl text-sm font-medium transition-all"
                style={{ background: C.text, color: "#F8F4EE", letterSpacing: "0.02em" }}>
                Construire mon séjour
              </button>
            </motion.div>
          )}

          {/* ── Deal ────────────────────────────── */}
          {step === "deal" && (
            <motion.div key="deal" {...slide} className="space-y-4">

              {/* ── LIVE + PERSONALIZING ── */}
              {(dealPhase === "live" || dealPhase === "personalizing") && (() => {
                const playedCards   = CARDS.filter(c => (cardStates[c.id] ?? "off") !== "off");
                const activeCards   = playedCards.filter(c => {
                  const s = cardStates[c.id]!;
                  return s === "locked" || vibe >= c.threshold;
                });
                const inactiveCards = playedCards.filter(c => {
                  const s = cardStates[c.id]!;
                  return s === "on" && vibe < c.threshold;
                });
                const gap    = liveDeal.price - liveDeal.otaPrice;
                const otaLine = gap < 0
                  ? { label: `${Math.abs(gap)}€ moins cher qu'en direct`, good: true,  addon: null }
                  : gap === 0 && liveDeal.perks.length > 0
                  ? { label: "Même prix, mais avec les inclus en plus",   good: true,  addon: null }
                  : gap === 0
                  ? { label: "Même prix — on ajoute un petit geste",      good: false, addon: "Bouteille de bienvenue offerte" }
                  : { label: `${gap}€ de plus — compensé par les inclus`, good: false, addon: "Petit-déjeuner J1 ou late checkout offert" };

                return (
                  <>
                    {/* Curseur */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: "9px", letterSpacing: "0.3em", color: C.textMuted, textTransform: "uppercase" }}>Budget</span>
                        <AnimatePresence mode="wait">
                          <motion.span key={vibeLabel(vibe)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }} style={{ fontSize: "11px", color: C.accent }}>
                            {vibeLabel(vibe)}
                          </motion.span>
                        </AnimatePresence>
                        <span style={{ fontSize: "9px", letterSpacing: "0.3em", color: C.textMuted, textTransform: "uppercase" }}>Expérience</span>
                      </div>
                      <input type="range" min={0} max={100} value={vibe}
                        onChange={e => { setVibe(Number(e.target.value)); setAiDeal(null); setDealPhase("live"); }}
                        className="w-full cursor-pointer"
                        style={{ appearance: "none", height: "2px", borderRadius: "2px", outline: "none",
                          background: `linear-gradient(to right, ${C.accent} ${vibe}%, ${C.border} ${vibe}%)` }}
                      />
                    </div>

                    {/* Deal card live */}
                    <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>

                      {/* Photo + room */}
                      <AnimatePresence mode="wait">
                        <motion.div key={liveDeal.roomId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }} className="relative h-32">
                          <Image src="/images/voiles.jpg" alt={liveDeal.roomName} fill className="object-cover" />
                          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(248,244,238,0.95) 0%, rgba(248,244,238,0.2) 55%, transparent 100%)" }} />
                          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                            <p style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: C.text, fontWeight: 300 }}>{liveDeal.roomName}</p>
                            <AnimatePresence mode="wait">
                              <motion.div key={liveDeal.price} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                transition={{ duration: 0.12 }} className="text-right">
                                <p style={{ fontSize: "17px", color: C.accent, lineHeight: 1 }}>{liveDeal.price}€</p>
                                <p style={{ fontSize: "9px", color: C.textMuted, marginTop: "2px" }}>{nights} nuit{nights > 1 ? "s" : ""}</p>
                              </motion.div>
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      </AnimatePresence>

                      {/* Cartes actives + inactives */}
                      {playedCards.length > 0 && (
                        <div className="px-4 py-3 space-y-1.5" style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
                          {activeCards.map(c => {
                            const isLocked = (cardStates[c.id] ?? "off") === "locked";
                            return (
                              <motion.div key={c.id} layout className="flex items-center gap-2">
                                <span style={{ color: isLocked ? C.locked : C.accent, fontSize: "9px", flexShrink: 0 }}>{isLocked ? "⚑" : "·"}</span>
                                <p style={{ fontSize: "12px", color: C.textSec }}>{PERK_LABELS[c.id] ?? c.label}</p>
                              </motion.div>
                            );
                          })}
                          {inactiveCards.map(c => (
                            <motion.div key={c.id} layout className="flex items-center gap-2">
                              <span style={{ color: C.textMuted, fontSize: "9px", flexShrink: 0 }}>−</span>
                              <p className="line-through" style={{ fontSize: "12px", color: C.textMuted, textDecorationColor: C.border }}>{c.label}</p>
                              <p className="ml-auto" style={{ fontSize: "9px", color: C.textMuted, flexShrink: 0 }}>curseur trop bas</p>
                            </motion.div>
                          ))}
                          {playedCards.length > 0 && activeCards.length === 0 && (
                            <p className="italic" style={{ fontSize: "12px", color: C.textMuted }}>Montez le curseur pour activer vos préférences</p>
                          )}
                        </div>
                      )}

                      {/* OTA compare */}
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <p style={{ fontSize: "9px", letterSpacing: "0.25em", color: C.textMuted, textTransform: "uppercase" }}>Booking.com</p>
                          <p style={{ fontSize: "12px", color: C.textMuted }}>{liveDeal.otaPrice}€</p>
                        </div>
                        <p style={{ fontSize: "11px", color: otaLine.good ? C.accent : C.textSec }}>{otaLine.label}</p>
                        {otaLine.addon && <p style={{ fontSize: "11px", color: C.accent, marginTop: "2px" }}>+ {otaLine.addon}</p>}
                      </div>
                    </div>

                    {dealPhase === "personalizing" ? (
                      <div className="flex items-center justify-center gap-3 py-3">
                        <div className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ border: `1.5px solid ${C.border}`, borderTopColor: C.accent, animation: "spin 0.8s linear infinite" }} />
                        <p style={{ fontSize: "13px", color: C.textSec }}>Personnalisation…</p>
                      </div>
                    ) : (
                      <button onClick={personalizeDeal}
                        className="w-full py-4 rounded-2xl text-sm font-medium transition-all"
                        style={{ background: C.text, color: "#F8F4EE", letterSpacing: "0.02em" }}>
                        Confirmer ce séjour — {liveDeal.price}€
                      </button>
                    )}
                  </>
                );
              })()}

              {/* ── READY : deal personnalisé ── */}
              {dealPhase === "ready" && aiDeal && (
                <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>

                    {/* Photo */}
                    <div className="relative h-36">
                      <Image src="/images/voiles.jpg" alt={aiDeal.roomName} fill className="object-cover" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(248,244,238,0.95) 0%, rgba(248,244,238,0.15) 55%, transparent 100%)" }} />
                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                        <p style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: C.text, fontWeight: 300 }}>{aiDeal.roomName}</p>
                        <div className="text-right">
                          <p style={{ fontSize: "18px", color: C.accent, lineHeight: 1 }}>{aiDeal.price}€</p>
                          <p style={{ fontSize: "9px", color: C.textMuted, marginTop: "2px" }}>{nights} nuit{nights > 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    </div>

                    {/* Phrase IA */}
                    <div className="px-4 py-3" style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
                      <p className="italic leading-relaxed" style={{ fontSize: "13px", color: C.textSec }}>« {aiDeal.dealPhrase} »</p>
                    </div>

                    {/* Perks */}
                    {aiDeal.perks.length > 0 && (
                      <div className="px-4 py-3 space-y-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                        {aiDeal.perks.map((p, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <span style={{ color: C.accent, fontSize: "9px", marginTop: "2px", flexShrink: 0 }}>·</span>
                            <p style={{ fontSize: "12px", color: C.textSec, lineHeight: 1.5 }}>{p}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Deal close */}
                    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <p style={{ fontSize: "13px", color: C.textMuted }}>{aiDeal.dealClose}</p>
                    </div>

                    {/* OTA compare */}
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p style={{ fontSize: "9px", letterSpacing: "0.25em", color: C.textMuted, textTransform: "uppercase" }}>vs Booking.com</p>
                        <p style={{ fontSize: "12px", color: C.textMuted, textDecoration: "line-through" }}>{aiDeal.otaPrice}€</p>
                      </div>
                      <p style={{ fontSize: "11px", color: C.accent }}>
                        {aiDeal.perks.length > 0
                          ? (aiDeal.otaMessage ?? "Même prix — avec les inclus en plus")
                          : aiDeal.otaAddon
                            ? `${aiDeal.otaAddon} offert`
                            : "Meilleur deal direct"}
                      </p>
                    </div>
                  </div>

                  <button onClick={() => setStep("payment")}
                    className="w-full py-4 rounded-2xl text-sm font-medium transition-all"
                    style={{ background: C.text, color: "#F8F4EE", letterSpacing: "0.02em" }}>
                    Réserver — {aiDeal.price}€
                  </button>
                  <button onClick={() => { setDealPhase("live"); setAiDeal(null); }}
                    className="w-full text-center transition-colors py-1 hover:opacity-60"
                    style={{ fontSize: "11px", color: C.textMuted }}>
                    Ajuster le curseur
                  </button>
                </motion.div>
              )}

            </motion.div>
          )}

          {/* ── Paiement ────────────────────────── */}
          {step === "payment" && !confirmed && (
            <motion.div key="payment" {...slide} className="space-y-6">
              <div>
                <p style={{ fontSize: "9px", letterSpacing: "0.35em", color: C.textMuted, textTransform: "uppercase", marginBottom: "6px" }}>
                  Dernière étape
                </p>
                <p style={{ fontSize: "13px", color: C.textSec }}>
                  {displayDeal.roomName} · {nights} nuit{nights > 1 ? "s" : ""} · {fmt(checkIn)}
                </p>
              </div>
              <div style={{ borderTop: `1px solid ${C.border}` }}>
                {[
                  { id: "name",  type: "text",  placeholder: "Prénom & Nom" },
                  { id: "email", type: "email", placeholder: "Email" },
                ].map(f => (
                  <div key={f.id} style={{ borderBottom: `1px solid ${C.border}` }} className="py-4">
                    <input type={f.type} placeholder={f.placeholder}
                      value={form[f.id as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.id]: e.target.value }))}
                      className="w-full outline-none text-sm"
                      style={{ background: "transparent", color: C.text }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={() => { if (form.name && form.email) setConfirmed(true); }}
                disabled={!form.name || !form.email}
                className="w-full py-4 rounded-2xl text-sm font-medium transition-all disabled:opacity-30"
                style={{ background: C.text, color: "#F8F4EE", letterSpacing: "0.02em" }}>
                Confirmer et payer — {total}€
              </button>
              <p className="text-center" style={{ fontSize: "9px", color: C.textMuted }}>Prototype · paiement simulé</p>
            </motion.div>
          )}

          {/* ── Confirmé ────────────────────────── */}
          {confirmed && (
            <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 py-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                style={{ background: C.accentBg, border: `1px solid ${C.borderAct}` }}>
                <span style={{ color: C.accent, fontSize: "18px" }}>✓</span>
              </motion.div>
              <div>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "24px", color: C.text, fontWeight: 300 }}>Votre séjour est confirmé.</p>
                <p className="mt-2" style={{ fontSize: "12px", color: C.textMuted }}>
                  {form.name} · {fmt(checkIn)} — {fmt(checkOut)}
                </p>
                {displayDeal.perks.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {displayDeal.perks.map((p, i) => (
                      <p key={i} style={{ fontSize: "12px", color: C.textSec }}>· {p}</p>
                    ))}
                  </div>
                )}
                <p className="mt-4" style={{ fontFamily: "Georgia, serif", fontSize: "24px", color: C.accent, fontWeight: 300 }}>{total}€</p>
              </div>
              <div className="space-y-1 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
                <p style={{ fontSize: "11px", color: C.textMuted }}>124 rue Gubler · 83000 Toulon</p>
                <p style={{ fontSize: "11px", color: C.textMuted }}>04 94 41 36 23 · contact-lesvoiles@htbm.fr</p>
              </div>
              <button onClick={reset} className="transition-opacity hover:opacity-50"
                style={{ fontSize: "11px", color: C.textMuted }}>
                Nouvelle réservation
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: #B8906A; cursor: pointer; border: 2px solid #F8F4EE;
          box-shadow: 0 1px 4px rgba(184,144,106,0.35);
        }
        input[type=range]::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%; background: #B8906A;
          cursor: pointer; border: 2px solid #F8F4EE;
        }
        input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.3; filter: invert(0.4); }
        input::placeholder { color: #B5A58F; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
