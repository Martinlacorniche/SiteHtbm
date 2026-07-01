"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Minus, Plus, Check, Phone, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const VOILES_ID = "ded6e6fb-ff3c-4fa8-ad07-403ee316be53";
const VOILES_PHONE = "04 94 41 36 23";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const firstWeekdayMon = (y: number, m: number) => (new Date(y, m, 1).getDay() + 6) % 7; // 0 = lundi
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Créneaux d'arrivée au choix du client : 17h00 → 21h30 (fermeture 22h).
const SLOTS = (() => {
  const o: string[] = [];
  for (let h = 17; h <= 21; h++) { o.push(`${h}h00`); o.push(`${h}h30`); }
  return o;
})();

export default function ReservationClient() {
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => ymd(now.getFullYear(), now.getMonth(), now.getDate()), [now]);

  // Étape 1 — couverts
  const [pax, setPax] = useState(2);

  // Étape 2 — calendrier
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());
  const [avail, setAvail] = useState<Record<string, boolean>>({});
  const [loadingCal, setLoadingCal] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Étape 3 — contact
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [heure, setHeure] = useState("19h00");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [bookedTable, setBookedTable] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Disponibilité du mois affiché (selon le nombre de couverts)
  useEffect(() => {
    const start = ymd(viewY, viewM, 1);
    const end = ymd(viewY, viewM, daysInMonth(viewY, viewM));
    setLoadingCal(true);
    supabase.rpc("rooftop_day_availability", { p_hotel: VOILES_ID, p_pax: pax, p_start: start, p_end: end })
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        ((data as { day: string; available: boolean }[]) || []).forEach(r => { map[r.day] = r.available; });
        setAvail(map);
        setLoadingCal(false);
      });
  }, [viewY, viewM, pax, reloadKey]);

  const curY = now.getFullYear();
  const curM = now.getMonth();
  const canPrev = viewY > curY || (viewY === curY && viewM > curM);
  const monthLabel = new Date(viewY, viewM, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const goPrev = () => {
    if (!canPrev) return;
    if (viewM === 0) { setViewY(y => y - 1); setViewM(11); } else setViewM(m => m - 1);
  };
  const goNext = () => {
    if (viewM === 11) { setViewY(y => y + 1); setViewM(0); } else setViewM(m => m + 1);
  };

  const prettyDate = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });


  const book = async () => {
    if (!selectedDate || !nom.trim() || sending) return;
    setSending(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc("rooftop_book", {
      p_hotel: VOILES_ID, p_date: selectedDate, p_heure: heure, p_pax: pax,
      p_nom: nom.trim(), p_tel: telephone.trim(), p_email: email.trim(), p_message: message.trim(),
    });
    if (rpcErr) {
      setError(`Une erreur est survenue. Réessayez, ou appelez-nous au ${VOILES_PHONE}.`);
      setSending(false);
      return;
    }
    const status = (data as { status?: string; table?: string })?.status;
    if (status === "blacklisted") { setRefused(true); setSending(false); return; }
    if (status === "closed") {
      setError("Le rooftop est fermé ce jour-là — choisissez une autre date.");
      setSelectedDate(null); setReloadKey(k => k + 1); setSending(false); return;
    }
    if (status === "full") {
      setError("Oups, ce jour vient d'être complet — choisissez-en un autre.");
      setSelectedDate(null); setReloadKey(k => k + 1); setSending(false); return;
    }
    if (status === "ok") {
      const tbl = (data as { table?: string })?.table ?? null;
      setBookedTable(tbl);
      setSent(true);
      setSending(false);
      // Notifie l'équipe + confirmation client (sans bloquer l'écran de succès).
      fetch("/api/rooftop-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, telephone, email, date: selectedDate, heure, couverts: pax, message, table: tbl }),
      }).catch(() => {});
      return;
    }
    setError("Réservation impossible pour le moment. Réessayez plus tard.");
    setSending(false);
  };

  return (
    <main className="min-h-screen bg-[var(--sand)] text-slate-800">
      {/* ---------- HERO (réutilisé) ---------- */}
      <header className="relative overflow-hidden bg-[#013a5c] text-white">
        <div className="absolute inset-0 opacity-60 slow-zoom"
          style={{ backgroundImage: "url('/images/package-rooftop.jpg')", backgroundSize: "cover", backgroundPosition: "center 72%" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#013a5c]/70 via-[#013a5c]/40 to-[#013a5c]/80" />
        <div className="relative mx-auto max-w-2xl px-4 pt-5 pb-8 text-center">
          <Link href="/" aria-label="Hôtels Toulon Bord de Mer" className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/cigale-or-512.png" alt="Hôtels Toulon Bord de Mer" className="h-10 w-auto drop-shadow transition-opacity hover:opacity-80" />
          </Link>
          <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">Rooftop · Les Voiles</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl font-semibold drop-shadow">Réserver une table</h1>
          <p className="mx-auto mt-2 max-w-md text-sm md:text-base text-white/80">
            Choisissez un jour où il reste de la place, et c’est réservé. Vraiment.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {refused ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-luxe text-center py-12">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Phone size={24} />
            </span>
            <h2 className="font-serif text-2xl text-slate-900">On préfère vous parler de vive voix</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              La réservation en ligne n’est pas disponible pour cette demande. Un petit coup de fil et on s’occupe de vous&nbsp;:
            </p>
            <a href={`tel:${VOILES_PHONE.replace(/\s/g, "")}`} style={{ color: "#fff" }} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#C6A972] px-7 py-3 font-semibold text-white shadow-lg transition hover:bg-[#b8975e]">
              <Phone size={17} /> {VOILES_PHONE}
            </a>
          </motion.div>
        ) : sent ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-luxe text-center py-12">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={26} />
            </span>
            <h2 className="font-serif text-2xl text-slate-900">Table réservée&nbsp;!</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              {bookedTable ? <>La table <span className="font-semibold text-slate-700">{bookedTable}</span> vous attend </> : "Votre table vous attend "}
              le <span className="font-semibold text-slate-700">{selectedDate ? prettyDate(selectedDate) : ""}</span> à {heure}, pour {pax} personne{pax > 1 ? "s" : ""}. À très vite sur le rooftop&nbsp;!
            </p>
            <Link href="/rooftop-les-voiles" style={{ color: "#fff" }} className="mt-6 inline-flex rounded-full bg-[#C6A972] px-7 py-3 font-semibold text-white shadow-lg transition hover:bg-[#b8975e]">Revoir la carte</Link>
          </motion.div>
        ) : selectedDate ? (
          /* ---------- ÉTAPE 3 : CONTACT ---------- */
          <div className="space-y-5">
            <button onClick={() => { setSelectedDate(null); setError(null); }}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition">
              <ChevronLeft size={16} /> Changer de date
            </button>
            <div className="card-luxe space-y-5">
              <div className="rounded-xl bg-[var(--gold)]/10 px-4 py-3 text-center">
                <p className="font-serif text-lg text-slate-900 capitalize">{prettyDate(selectedDate)}</p>
                <p className="text-[12px] text-slate-500">{pax} personne{pax > 1 ? "s" : ""}</p>
              </div>

              <Field label="À quelle heure ?">
                <select value={heure} onChange={e => setHeure(e.target.value)} className={inputCls}>
                  {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">Service de 17h à 22h · dernière arrivée 21h30.</p>
              </Field>

              <Field label="Votre p'tit nom">
                <input type="text" required value={nom} onChange={e => setNom(e.target.value)}
                  placeholder="Nom (et prénom)" className={inputCls} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Téléphone">
                  <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 …" className={inputCls} />
                </Field>
                <Field label="Email">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" className={inputCls} />
                </Field>
              </div>
              <Field label="Un petit mot ? (facultatif)">
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                  placeholder="Occasion spéciale, allergies, coin préféré…" className={`${inputCls} resize-none`} />
              </Field>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button onClick={book} disabled={!nom.trim() || sending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#C6A972] px-7 py-3 font-semibold text-white shadow-lg transition hover:bg-[#b8975e] disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {sending ? "Réservation…" : "Réserver ma table"}
              </button>
            </div>
          </div>
        ) : (
          /* ---------- ÉTAPES 1 & 2 : COUVERTS + CALENDRIER ---------- */
          <div className="space-y-6">
            <div className="card-luxe">
              <p className="text-[12px] font-medium uppercase tracking-wider text-slate-500 mb-3">On sera combien&nbsp;?</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPax(c => Math.max(1, c - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[var(--gold)] transition">
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center font-serif text-2xl text-slate-900 tabular-nums">{pax}</span>
                <button type="button" onClick={() => setPax(c => Math.min(12, c + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[var(--gold)] transition">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="card-luxe">
              {/* En-tête mois */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={goPrev} disabled={!canPrev}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed transition">
                  <ChevronLeft size={18} />
                </button>
                <p className="font-serif text-lg text-slate-900 capitalize">{monthLabel}</p>
                <button onClick={goNext}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[var(--gold)] transition">
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Jours de la semaine */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map(w => (
                  <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 py-1">{w}</div>
                ))}
              </div>

              {/* Grille des jours */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstWeekdayMon(viewY, viewM) }).map((_, i) => <div key={`b${i}`} />)}
                {Array.from({ length: daysInMonth(viewY, viewM) }).map((_, i) => {
                  const d = i + 1;
                  const dateStr = ymd(viewY, viewM, d);
                  const isPast = dateStr < today;
                  const isAvailable = !isPast && avail[dateStr] === true;
                  const isComplet = !isPast && avail[dateStr] === false;
                  return (
                    <button
                      key={dateStr}
                      disabled={!isAvailable}
                      onClick={() => { setSelectedDate(dateStr); setError(null); }}
                      className={[
                        "aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition relative",
                        isAvailable
                          ? "bg-emerald-50 text-emerald-700 font-semibold hover:bg-[var(--gold)] hover:text-white cursor-pointer ring-1 ring-emerald-100"
                          : isComplet
                            ? "bg-slate-50 text-slate-300 line-through cursor-not-allowed"
                            : "text-slate-300 cursor-not-allowed",
                      ].join(" ")}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Légende */}
              <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-50 ring-1 ring-emerald-100" /> Libre</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-100" /> Complet</span>
                {loadingCal && <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> …</span>}
              </div>

              {error && <p className="mt-3 text-center text-sm text-amber-600">{error}</p>}
              <p className="mt-3 text-center text-[12px] text-slate-400 inline-flex items-center justify-center gap-1 w-full">
                Choisissez un jour en vert <ArrowRight size={13} /> réservation immédiate
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/40 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}
