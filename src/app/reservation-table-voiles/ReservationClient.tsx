"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, CalendarCheck, Check, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const VOILES_ID = "ded6e6fb-ff3c-4fa8-ad07-403ee316be53";
const VOILES_PHONE = "04 94 41 36 23";

// Créneaux d'ouverture du Rooftop (modifiable ici) : 17h00 → 23h00, par 30 min.
const SLOTS = (() => {
  const out: string[] = [];
  for (let h = 17; h <= 23; h++) {
    out.push(`${String(h).padStart(2, "0")}h00`);
    if (h < 23) out.push(`${String(h).padStart(2, "0")}h30`);
  }
  return out;
})();

export default function ReservationClient() {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const [date, setDate] = useState("");
  const [heure, setHeure] = useState(SLOTS[2]); // 18h00 par défaut
  const [couverts, setCouverts] = useState(2);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [refused, setRefused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = date && heure && nom.trim() && !sending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError(null);

    // Blacklist : si le client a déjà posé un lapin, on refuse la résa en ligne
    // (la fonction ne renvoie qu'un booléen, elle n'expose pas la liste).
    try {
      const { data: blocked } = await supabase.rpc("is_rooftop_blacklisted", {
        p_hotel: VOILES_ID, p_email: email.trim(), p_nom: nom.trim(),
      });
      if (blocked === true) { setRefused(true); setSending(false); return; }
    } catch { /* en cas d'erreur de contrôle, on laisse passer (le trigger DB reste le filet) */ }

    // Disponibilité : jour fermé ou complet ?
    try {
      const { data: verdict } = await supabase.rpc("rooftop_can_book", {
        p_hotel: VOILES_ID, p_date: date, p_couverts: couverts,
      });
      if (verdict === "closed") {
        setError("Le rooftop est fermé ce jour-là — choisissez une autre date.");
        setSending(false); return;
      }
      if (verdict === "full") {
        setError(`Complet pour cette date ! Tentez un autre jour, ou appelez-nous au ${VOILES_PHONE}.`);
        setSending(false); return;
      }
    } catch { /* le trigger DB reste le filet */ }

    // Enregistrement en base (best-effort : la notification email reste l'essentiel).
    try {
      await supabase.from("rooftop_reservations").insert({
        hotel_id: VOILES_ID, date_resa: date, heure, couverts,
        nom: nom.trim(), telephone: telephone.trim() || null,
        email: email.trim() || null, message: message.trim() || null,
      });
    } catch { /* on n'échoue pas la demande si l'insert plante */ }

    try {
      const res = await fetch("/api/rooftop-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, telephone, email, date, heure, couverts, message }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("Une erreur est survenue. Réessayez ou appelez-nous directement.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--sand)] text-slate-800">
      <header className="relative overflow-hidden bg-[#013a5c] text-white">
        <div className="absolute inset-0 opacity-60 slow-zoom"
          style={{ backgroundImage: "url('/images/package-rooftop.jpg')", backgroundSize: "cover", backgroundPosition: "center 72%" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#013a5c]/70 via-[#013a5c]/40 to-[#013a5c]/80" />
        <div className="relative mx-auto max-w-2xl px-4 pt-5 pb-8 text-center">
          <Link href="/rooftop-les-voiles" className="inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white transition [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
            <ArrowLeft size={15} /> Retour à la carte
          </Link>
          <p className="mt-5 text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">Rooftop · Les Voiles</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl font-semibold drop-shadow">Réserver une table</h1>
          <p className="mx-auto mt-2 max-w-md text-sm md:text-base text-white/80">
            Un verre, une assiette, la vue sur la rade. Dites-nous juste quand — 30 secondes chrono.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {refused ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="card-luxe text-center py-12">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Phone size={24} />
            </span>
            <h2 className="font-serif text-2xl text-slate-900">On préfère vous parler de vive voix</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              La réservation en ligne n’est pas disponible pour cette demande. Un petit coup de fil et on s’occupe de vous&nbsp;:
            </p>
            <a href={`tel:${VOILES_PHONE.replace(/\s/g, "")}`}
              className="btn-luxe mt-6 inline-flex items-center gap-2">
              <Phone size={17} /> {VOILES_PHONE}
            </a>
          </motion.div>
        ) : sent ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="card-luxe text-center py-12">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={26} />
            </span>
            <h2 className="font-serif text-2xl text-slate-900">Demande envoyée&nbsp;!</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              On revient vers vous très vite pour confirmer votre table. À bientôt sur le rooftop&nbsp;!
            </p>
            <Link href="/rooftop-les-voiles" className="btn-luxe mt-6 inline-flex">Revoir la carte</Link>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="card-luxe space-y-5">
            {/* Date + Heure */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="C'est quel jour ?">
                <input type="date" required value={date} min={today}
                  onChange={e => setDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="À quelle heure ?">
                <select value={heure} onChange={e => setHeure(e.target.value)} className={inputCls}>
                  {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            {/* Couverts */}
            <Field label="On sera combien ?">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setCouverts(c => Math.max(1, c - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[var(--gold)] transition">
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center font-serif text-2xl text-slate-900 tabular-nums">{couverts}</span>
                <button type="button" onClick={() => setCouverts(c => Math.min(20, c + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[var(--gold)] transition">
                  <Plus size={16} />
                </button>
              </div>
            </Field>

            {/* Coordonnées */}
            <Field label="Votre p'tit nom">
              <input type="text" required value={nom} onChange={e => setNom(e.target.value)}
                placeholder="Nom (et prénom)" className={inputCls} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Téléphone">
                <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                  placeholder="06 …" className={inputCls} />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="vous@email.com" className={inputCls} />
              </Field>
            </div>
            <Field label="Un petit mot ? (facultatif)">
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                placeholder="Occasion spéciale, allergies, coin préféré…" className={`${inputCls} resize-none`} />
            </Field>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={!canSubmit}
              className="btn-luxe w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <CalendarCheck size={18} /> {sending ? "Envoi…" : "Envoyer ma demande"}
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Demande de réservation — nous vous recontactons pour confirmer.
            </p>
          </form>
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
