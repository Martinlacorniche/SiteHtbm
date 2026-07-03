"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BedDouble, Users, Check, Loader2, X, Calendar, Lock, Pencil, Trash2, KeyRound, ArrowLeft,
} from "lucide-react";

const NAVY = "#004e7c";
const GOLD = "#C6A972";
const SEA_BG = "/images/pagewifi.jpg";

// ---------- Types ----------
interface Room {
  id: string; numero: string; type: string | null; pax_max: number;
  twinable: boolean; tarif: number; hotel: string | null; taken: boolean; occupant: string | null;
}
interface GroupeMeta {
  nom: string; date_arrivee: string; date_depart: string; date_limite: string;
  conditions_annulation: string | null; plan_visible: boolean;
  cover_image_url: string | null; message_accueil: string | null; closed: boolean;
}
type Filter = "all" | "free" | "taken";

// ---------- Helpers ----------
function fmt(d?: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function euro(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

// ============================================================================
export default function Page() {
  return (
    <Suspense fallback={<FullLoader />}>
      <SeaBg><GroupeInner /></SeaBg>
    </Suspense>
  );
}

function SeaBg({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-10" style={{ backgroundImage: `url('${SEA_BG}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="fixed inset-0 -z-10" style={{ background: "rgba(248,250,252,0.82)" }} />
      {children}
    </div>
  );
}

function FullLoader() {
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} /></div>;
}

function GroupeInner() {
  const params = useParams();
  const search = useSearchParams();
  const code = String(params.code || "");
  const token = search.get("r");
  if (token) return <ManageView token={token} />;
  return <BookingView code={code} />;
}

// ============================================================================
// Réservation
// ============================================================================
function BookingView({ code }: { code: string }) {
  const router = useRouter();
  const [groupe, setGroupe] = useState<GroupeMeta | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [claim, setClaim] = useState<Room | null>(null);
  const [done, setDone] = useState<{ ref: string; pin: string } | null>(null);
  const [pay, setPay] = useState<{ hotel_id: string; hotelNom: string; amount: number; url: string }[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groupe/${code}`);
      const data = await res.json();
      if (!data.ok) { setError(data.error || "Groupe introuvable"); return; }
      setGroupe(data.groupe); setRooms(data.rooms);
    } catch { setError("Connexion impossible."); }
    finally { setLoading(false); }
  }, [code]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    all: rooms.length,
    free: rooms.filter(r => !r.taken).length,
    taken: rooms.filter(r => r.taken).length,
  }), [rooms]);

  // Regroupement hôtel → catégorie
  const sections = useMemo(() => {
    const visible = rooms.filter(r => filter === "all" || (filter === "free" ? !r.taken : r.taken));
    const byHotel = new Map<string, Room[]>();
    for (const r of visible) {
      const h = r.hotel || "";
      if (!byHotel.has(h)) byHotel.set(h, []);
      byHotel.get(h)!.push(r);
    }
    const out: { hotel: string; cats: { name: string; tarif: number; rooms: Room[] }[] }[] = [];
    for (const [hotel, rs] of byHotel) {
      const byCat = new Map<string, Room[]>();
      for (const r of rs) {
        const k = r.type || "Autres";
        if (!byCat.has(k)) byCat.set(k, []);
        byCat.get(k)!.push(r);
      }
      const cats = [...byCat.entries()].map(([name, rr]) => ({ name, tarif: rr[0]?.tarif ?? 0, rooms: rr }));
      out.push({ hotel, cats });
    }
    return out;
  }, [rooms, filter]);

  if (loading) return <FullLoader />;
  if (error || !groupe) return <Centered title="Oups" text={error || "Ce lien ne correspond à aucun groupe."} />;
  if (pay) return <PaymentScreen payments={pay} groupe={groupe} />;
  if (done) return <Confirmation code={code} refId={done.ref} pin={done.pin} groupe={groupe} />;

  const selectedRooms = rooms.filter(r => selected.has(r.id));

  function toggle(r: Room) {
    if (r.taken) { setClaim(r); return; }
    if (groupe!.closed) return;
    setSelected(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; });
  }

  return (
    <main className="pb-28">
      <Hero groupe={groupe} />

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {groupe.closed && <Banner>Les inscriptions sont closes pour ce groupe.</Banner>}

        {/* Filtre */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Toutes <b>{counts.all}</b></FilterChip>
          <FilterChip active={filter === "free"} onClick={() => setFilter("free")}>Disponibles <b>{counts.free}</b></FilterChip>
          <FilterChip active={filter === "taken"} onClick={() => setFilter("taken")}>Réservées <b>{counts.taken}</b></FilterChip>
        </div>

        {sections.map((sec) => (
          <div key={sec.hotel || "_"} className="mb-7">
            {sec.hotel && <HotelHeader name={sec.hotel} />}
            {sec.cats.map((cat) => (
              <div key={cat.name} className="mb-5">
                <div className="flex items-baseline justify-between mb-2.5 px-0.5">
                  <h3 className="font-serif font-semibold text-xl" style={{ color: NAVY }}>{cat.name}</h3>
                  <span className="text-sm font-semibold" style={{ color: GOLD }}>{euro(cat.tarif)}<span className="text-[11px] text-slate-400 font-normal"> / nuit</span></span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {cat.rooms.map((r, i) => (
                    <RoomBubble key={r.id} room={r} index={i} selected={selected.has(r.id)}
                      planVisible={groupe.plan_visible} disabled={groupe.closed && !r.taken} onClick={() => toggle(r)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        {sections.length === 0 && <p className="text-center text-slate-400 text-sm py-8">Aucune chambre dans ce filtre.</p>}
      </div>

      {/* Barre de sélection */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: "spring", stiffness: 360, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-30 p-3">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-between pl-4 pr-2 py-2">
              <span className="text-sm text-slate-600"><b>{selected.size}</b> chambre{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}</span>
              <button onClick={() => setFormOpen(true)} className="h-10 px-5 rounded-full text-white font-semibold text-sm" style={{ background: NAVY }}>Réserver →</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formOpen && (
          <BookingForm code={code} groupe={groupe} rooms={selectedRooms}
            onClose={() => setFormOpen(false)}
            onConflict={() => { setFormOpen(false); setSelected(new Set()); load(); }}
            onDone={(ref, pin) => { setFormOpen(false); setSelected(new Set()); setDone({ ref, pin }); }}
            onPay={(payments) => { setFormOpen(false); setSelected(new Set()); setPay(payments); }} />
        )}
        {claim && (
          <ClaimModal code={code} room={claim} onClose={() => setClaim(null)}
            onAccess={(ref) => router.push(`/groupe/${code}?r=${ref}`)} />
        )}
      </AnimatePresence>
    </main>
  );
}

function Hero({ groupe }: { groupe: GroupeMeta }) {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-9 md:pt-12 text-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="uppercase tracking-[0.18em] text-[11px] mb-2" style={{ color: GOLD }}>Hôtels Toulon Bord de Mer</p>
        <h1 className="font-serif font-semibold text-3xl md:text-4xl leading-tight text-slate-800">{groupe.nom}</h1>
        <p className="mt-2 text-sm text-slate-500 inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {fmt(groupe.date_arrivee)} → {fmt(groupe.date_depart)}</p>
      </motion.div>

      {groupe.cover_image_url && (
        <motion.img
          // eslint-disable-next-line @next/next/no-img-element
          src={groupe.cover_image_url} alt=""
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-5 mx-auto rounded-3xl shadow-lg w-auto max-w-full sm:max-w-md max-h-[58vh] object-contain bg-white"
        />
      )}

      {groupe.message_accueil && (
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm mt-5 px-5 py-4 text-slate-600 text-[15px] leading-relaxed">{groupe.message_accueil}</div>
      )}
    </div>
  );
}

function RoomBubble({ room, index, selected, planVisible, disabled, onClick }: {
  room: Room; index: number; selected: boolean; planVisible: boolean; disabled: boolean; onClick: () => void;
}) {
  const muted = room.taken || disabled;
  return (
    <motion.button type="button" onClick={onClick} disabled={disabled && !room.taken}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), type: "spring", stiffness: 380, damping: 30 }}
      whileTap={muted && !room.taken ? {} : { scale: 0.96 }}
      className="relative text-left rounded-2xl border bg-white p-3 transition shadow-sm"
      style={{
        borderColor: selected ? NAVY : room.taken ? "#e2e8f0" : "rgba(0,78,124,.16)",
        boxShadow: selected ? `0 0 0 2px ${NAVY}` : undefined,
        opacity: room.taken ? 0.7 : 1,
      }}>
      {selected && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: NAVY }}><Check className="w-3 h-3" /></span>}
      <p className="font-serif font-semibold text-lg text-slate-800 leading-none">{room.numero}</p>
      <div className="flex items-center gap-1 mt-2 flex-wrap">
        <Pill><Users className="w-3 h-3" /> {room.pax_max}</Pill>
        {room.twinable && <Pill><BedDouble className="w-3 h-3" /> twin</Pill>}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100">
        {room.taken
          ? <span className="text-[11px] text-slate-400">{planVisible && room.occupant ? room.occupant : "Réservée"}</span>
          : <span className="text-[11px] font-medium" style={{ color: NAVY }}>{selected ? "Sélectionnée" : "Disponible"}</span>}
      </div>
    </motion.button>
  );
}

// ---------- Formulaire (multi-chambres) ----------
function BookingForm({ code, groupe, rooms, onClose, onDone, onPay, onConflict }: {
  code: string; groupe: GroupeMeta; rooms: Room[];
  onClose: () => void; onDone: (ref: string, pin: string) => void;
  onPay: (payments: { hotel_id: string; hotelNom: string; amount: number; url: string }[]) => void;
  onConflict: () => void;
}) {
  const [nom, setNom] = useState(""); const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState(""); const [tel, setTel] = useState("");
  const [emailAck, setEmailAck] = useState(false);
  const [da, setDa] = useState(groupe.date_arrivee); const [dd, setDd] = useState(groupe.date_depart);
  const [pin, setPin] = useState(""); const [pin2, setPin2] = useState("");
  const [cgv, setCgv] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [cfg, setCfg] = useState<Record<string, { lit: "double" | "twin"; pax: number }>>(
    Object.fromEntries(rooms.map(r => [r.id, { lit: "double", pax: 1 }]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setRoomCfg(id: string, patch: Partial<{ lit: "double" | "twin"; pax: number }>) {
    setCfg(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function submit() {
    setErr(null);
    if (!nom.trim() || !email.trim()) return setErr("Nom et email sont requis.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr("Adresse e-mail invalide.");
    if ([...email].some(c => c.charCodeAt(0) > 127) && !emailAck) { setEmailAck(true); return setErr("Votre e-mail contient un caractère accentué (ex. « é »). Vérifiez l'adresse, ou cliquez à nouveau pour confirmer."); }
    if (!/^\d{4}$/.test(pin)) return setErr("Choisissez un code à 4 chiffres.");
    if (pin !== pin2) return setErr("Les deux codes ne correspondent pas.");
    if (!cgv) return setErr("Merci d'accepter les conditions.");
    if (!signature) return setErr("Merci de signer.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/groupe/${code}/reserve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rooms: rooms.map(r => ({ groupe_chambre_id: r.id, config_lit: cfg[r.id]?.lit, nb_personnes: cfg[r.id]?.pax })),
          nom: nom.trim(), prenom: prenom.trim(), email: email.trim(), tel: tel.trim(),
          date_arrivee: da, date_depart: dd, pin, cgv, signature,
        }),
      });
      const data = await res.json();
      if (!data.ok) { if (res.status === 409) { setErr(data.error); setTimeout(onConflict, 1600); return; } setErr(data.error || "Erreur."); return; }
      if (data.requirePayment && Array.isArray(data.payments) && data.payments.length) onPay(data.payments);
      else onDone(data.ref, pin);
    } catch { setErr("Connexion impossible."); }
    finally { setSubmitting(false); }
  }

  return (
    <Sheet onClose={onClose} title={`${rooms.length} chambre${rooms.length > 1 ? "s" : ""}`} subtitle="Réserver">
      <div className="px-5 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FInput label="Prénom" value={prenom} onChange={setPrenom} placeholder="Léa" />
          <FInput label="Nom *" value={nom} onChange={setNom} placeholder="Dupont" />
        </div>
        <FInput label="Email *" value={email} onChange={(v) => { setEmail(v); setEmailAck(false); }} placeholder="lea@exemple.fr" type="email" />
        <FInput label="Téléphone" value={tel} onChange={setTel} placeholder="06 12 34 56 78" type="tel" />
        <div className="grid grid-cols-2 gap-3">
          <FDate label="Arrivée" value={da} min={groupe.date_arrivee} max={groupe.date_depart} onChange={setDa} />
          <FDate label="Départ" value={dd} min={groupe.date_arrivee} max={groupe.date_depart} onChange={setDd} />
        </div>

        {/* Détail par chambre */}
        <div className="space-y-2">
          <Label>Vos chambres</Label>
          {rooms.map(r => (
            <div key={r.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{r.numero}{r.type ? <span className="text-xs text-slate-400 font-normal"> · {r.type}</span> : null}</span>
                <Stepper value={cfg[r.id]?.pax ?? 1} min={1} max={r.pax_max} onChange={(v) => setRoomCfg(r.id, { pax: v })} />
              </div>
              {r.twinable && (
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  {(["double", "twin"] as const).map(opt => (
                    <button key={opt} type="button" onClick={() => setRoomCfg(r.id, { lit: opt })} className="h-9 rounded-lg border text-xs font-medium"
                      style={cfg[r.id]?.lit === opt ? { borderColor: NAVY, background: "rgba(0,78,124,.06)", color: NAVY } : { borderColor: "#e2e8f0", color: "#64748b" }}>
                      {opt === "double" ? "1 grand lit" : "2 lits séparés"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Créez un code à 4 chiffres</Label><PinInput value={pin} onChange={setPin} /></div>
          <div><Label>Confirmez le code</Label><PinInput value={pin2} onChange={setPin2} /></div>
        </div>
        <p className="text-[11px] text-slate-400 -mt-2">Ce code vous servira à modifier ou annuler votre réservation.</p>

        {groupe.conditions_annulation && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 leading-relaxed">
            <span className="font-medium text-slate-600">Conditions d'annulation : </span>{groupe.conditions_annulation}
          </div>
        )}
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={cgv} onChange={e => setCgv(e.target.checked)} className="w-5 h-5 mt-0.5" style={{ accentColor: NAVY }} />
          <span className="text-sm text-slate-600">J'accepte les conditions de réservation et d'annulation.</span>
        </label>
        <div><Label>Signature</Label><SignaturePad onChange={setSignature} /></div>

        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button onClick={submit} disabled={submitting} className="w-full h-12 rounded-full text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: NAVY }}>
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Valider ma réservation <Check className="w-4 h-4" /></>}
        </button>
      </div>
    </Sheet>
  );
}

// ---------- Réclamer une chambre déjà réservée (depuis l'accueil) ----------
function ClaimModal({ code, room, onClose, onAccess }: { code: string; room: Room; onClose: () => void; onAccess: (ref: string) => void }) {
  const [pin, setPin] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!/^\d{4}$/.test(pin)) return setErr("Entrez votre code à 4 chiffres.");
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/groupe/${code}/access`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupe_chambre_id: room.id, pin }) });
      const d = await res.json();
      if (!d.ok) { setErr(d.error); return; }
      try { sessionStorage.setItem(`pin_${d.ref}`, pin); } catch {}
      onAccess(d.ref);
    } catch { setErr("Connexion impossible."); } finally { setBusy(false); }
  }
  return (
    <Sheet onClose={onClose} title={room.numero} subtitle="Gérer ma réservation">
      <div className="px-5 py-5 space-y-4">
        <p className="text-sm text-slate-600">Cette chambre est réservée. Si c'est la vôtre, entrez votre code à 4 chiffres pour la gérer.</p>
        <PinInput value={pin} onChange={setPin} />
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button onClick={go} disabled={busy} className="w-full h-12 rounded-full text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: NAVY }}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound className="w-4 h-4" /> Accéder</>}
        </button>
      </div>
    </Sheet>
  );
}

// ---------- Confirmation ----------
// Paiement obligatoire : écran « finalisez votre paiement » (1 bouton par hôtel).
function PaymentScreen({ payments, groupe }: { payments: { hotel_id: string; hotelNom: string; amount: number; url: string }[]; groupe: GroupeMeta }) {
  const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const multi = payments.length > 1;
  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-lg max-w-md w-full p-7 text-center">
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(0,78,124,.08)", color: NAVY }}><Check className="w-7 h-7" /></div>
        <h1 className="font-serif font-semibold text-2xl text-slate-800 mt-4">Plus qu'une étape</h1>
        <p className="text-slate-500 text-sm mt-2">Votre réservation pour « {groupe.nom} » est en attente de paiement. Réglez pour la confirmer.</p>
        {multi && <p className="text-[11px] text-slate-400 mt-1">Deux établissements = deux paiements distincts.</p>}
        <div className="mt-5 space-y-2.5 text-left">
          {payments.map((p) => (
            <div key={p.hotel_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <div className="min-w-0">
                {multi && <div className="text-[11px] text-slate-400 truncate">{p.hotelNom}</div>}
                <div className="text-2xl font-bold leading-none" style={{ color: NAVY }}>{euro(p.amount)}</div>
              </div>
              <a href={p.url} className="h-11 px-6 rounded-full font-semibold flex items-center shrink-0 hover:opacity-95 transition" style={{ background: NAVY, color: "#fff" }}>
                Payer
              </a>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-4">Paiement sécurisé par Stripe. Vos chambres sont tenues 30 minutes ; passé ce délai sans paiement, elles sont relibérées.</p>
      </motion.div>
    </main>
  );
}

function Confirmation({ code, refId, pin, groupe }: { code: string; refId: string; pin: string; groupe: GroupeMeta }) {
  const [link, setLink] = useState(""); const [copied, setCopied] = useState(false);
  useEffect(() => {
    setLink(`${window.location.origin}/groupe/${code}?r=${refId}`);
    try { sessionStorage.setItem(`pin_${refId}`, pin); } catch {}
  }, [code, refId, pin]);
  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-lg max-w-md w-full p-7 text-center">
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(0,78,124,.08)", color: NAVY }}><Check className="w-7 h-7" /></div>
        <h1 className="font-serif font-semibold text-2xl text-slate-800 mt-4">C'est réservé !</h1>
        <p className="text-slate-500 text-sm mt-2">Votre réservation pour « {groupe.nom} » est confirmée.</p>
        <div className="mt-5 rounded-2xl p-4" style={{ background: "rgba(0,78,124,.06)", border: "1px solid rgba(0,78,124,.15)" }}>
          <p className="text-xs text-slate-500">Votre code personnel</p>
          <p className="font-serif font-bold text-3xl tracking-[0.3em] mt-1" style={{ color: NAVY }}>{pin}</p>
          <p className="text-[11px] text-slate-500 mt-1.5">Gardez-le : il est demandé pour modifier ou annuler.</p>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">
          <p className="text-xs text-slate-500 mb-2">Votre lien personnel :</p>
          <div className="flex items-center gap-2">
            <input readOnly value={link} className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 h-9 text-slate-600" />
            <button onClick={() => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })} className="h-9 px-3 rounded-lg text-white text-xs font-medium" style={{ background: NAVY }}>{copied ? "Copié" : "Copier"}</button>
          </div>
        </div>
        <a href={link} className="inline-block mt-4 text-sm font-medium" style={{ color: NAVY }}>Voir / gérer ma réservation →</a>
      </motion.div>
    </main>
  );
}

// ============================================================================
// Gestion (lien perso = booking_ref)
// ============================================================================
function ManageView({ token }: { token: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resas, setResas] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [groupe, setGroupe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeKnown, setCodeKnown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [da, setDa] = useState(""); const [dd, setDd] = useState(""); const [lit, setLit] = useState<"double" | "twin">("double");
  const [pax, setPax] = useState(1);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; numero?: string } | null>(null);
  const [pending, setPending] = useState<{ hotel_id: string; hotelNom: string; amount: number; url: string }[]>([]);
  const [canPay, setCanPay] = useState(false);
  const [payLinks, setPayLinks] = useState<{ hotelNom: string; amount: number; url: string }[] | null>(null);
  const [payBusy, setPayBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/resa/${token}`);
      const d = await res.json();
      if (!d.ok) { setError(d.error || "Réservation introuvable"); return; }
      setResas(d.resas); setGroupe(d.groupe); setPending(d.pendingPayments || []); setCanPay(!!d.canPayOnline);
    } catch { setError("Connexion impossible."); } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    try { const saved = sessionStorage.getItem(`pin_${token}`); if (saved && /^\d{4}$/.test(saved)) { setCode(saved); setCodeKnown(true); } } catch {}
  }, [token]);

  if (loading) return <FullLoader />;
  if (error || !groupe) return <Centered title="Lien invalide" text={error || "Cette réservation n'existe pas."} />;

  function ensureCode() { if (!/^\d{4}$/.test(code)) { setMsg("Entrez votre code à 4 chiffres."); return false; } return true; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function startEdit(r: any) { setEditingId(r.id); setDa(r.date_arrivee); setDd(r.date_depart); setLit(r.config_lit === "twin" ? "twin" : "double"); setPax(r.nb_personnes || 1); setMsg(null); }

  async function save(id: string) {
    if (!ensureCode()) return; setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/resa/${token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", resa_id: id, code, date_arrivee: da, date_depart: dd, config_lit: lit, nb_personnes: pax }) });
      const d = await res.json(); if (!d.ok) { setMsg(d.error); if (typeof d.error === "string" && d.error.includes("Code")) { setCodeKnown(false); try { sessionStorage.removeItem(`pin_${token}`); } catch {} } return; }
      setEditingId(null); await load(); setMsg("Modifié ✓");
    } finally { setBusy(false); }
  }
  async function doCancel() {
    if (!cancelTarget || !ensureCode()) return; setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/resa/${token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", resa_id: cancelTarget.id, code }) });
      const d = await res.json(); if (!d.ok) { setMsg(d.error); if (typeof d.error === "string" && d.error.includes("Code")) { setCodeKnown(false); try { sessionStorage.removeItem(`pin_${token}`); } catch {} } setCancelTarget(null); return; }
      setCancelTarget(null); await load();
    } finally { setBusy(false); }
  }
  async function startPay() {
    setPayBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/groupe/${groupe.code}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: token }) });
      const d = await res.json();
      if (!d.ok) { setMsg(d.error || "Paiement indisponible"); return; }
      if (d.payments.length === 1) { window.location.href = d.payments[0].url; return; }
      setPayLinks(d.payments);
    } catch { setMsg("Connexion impossible."); } finally { setPayBusy(false); }
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto">
        <a href={`/groupe/${groupe.code}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Retour aux chambres
        </a>
        <p className="uppercase tracking-[0.18em] text-[11px] text-center mb-1" style={{ color: GOLD }}>{groupe.nom}</p>
        <h1 className="font-serif font-semibold text-2xl text-slate-800 text-center mb-5">Ma réservation</h1>

        {!groupe.locked && !codeKnown && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <CodeField value={code} onChange={setCode} />
            <p className="text-[11px] text-slate-400 mt-1.5">Demandé pour modifier ou annuler vos chambres.</p>
          </div>
        )}
        {groupe.locked && <Banner>La date limite est passée. Pour toute modification, contactez l'hôtel.</Banner>}

        {pending.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border-2" style={{ borderColor: NAVY }}>
            <p className="font-serif font-semibold text-slate-800">Finalisez votre paiement</p>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">Vos chambres sont tenues 30 minutes.{pending.length > 1 ? " Un paiement par établissement." : ""}</p>
            <div className="space-y-2">
              {pending.map((p) => (
                <div key={p.hotel_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    {pending.length > 1 && <div className="text-[11px] text-slate-400 truncate">{p.hotelNom}</div>}
                    <div className="text-xl font-bold leading-none" style={{ color: NAVY }}>{euro(p.amount)}</div>
                  </div>
                  <a href={p.url} className="h-10 px-5 rounded-full font-semibold flex items-center shrink-0" style={{ background: NAVY, color: "#fff" }}>Payer</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {canPay && pending.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border" style={{ borderColor: GOLD }}>
            {!payLinks ? (
              <>
                <p className="font-serif font-semibold text-slate-800">Régler en ligne</p>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">Payez votre séjour dès maintenant, en toute sécurité (sinon, règlement à l&apos;hôtel).</p>
                <button onClick={startPay} disabled={payBusy} className="w-full h-11 rounded-full font-semibold text-white disabled:opacity-60" style={{ background: NAVY }}>
                  {payBusy ? "…" : "Payer en ligne"}
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <p className="font-serif font-semibold text-slate-800 mb-1">Finalisez votre paiement</p>
                {payLinks.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                      {payLinks.length > 1 && <div className="text-[11px] text-slate-400 truncate">{p.hotelNom}</div>}
                      <div className="text-xl font-bold leading-none" style={{ color: NAVY }}>{euro(p.amount)}</div>
                    </div>
                    <a href={p.url} className="h-10 px-5 rounded-full font-semibold flex items-center shrink-0" style={{ background: NAVY, color: "#fff" }}>Payer</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {resas.map((r) => {
            const annulee = r.statut === "annulee";
            const editing = editingId === r.id;
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-serif font-semibold text-lg text-slate-800">{r.numero}</span>
                    {r.type && <span className="text-xs text-slate-400"> · {r.type}</span>}
                  </div>
                  {annulee
                    ? <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600 border border-rose-200">Annulée</span>
                    : r.statut === "en_attente_paiement"
                      ? <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">En attente de paiement</span>
                      : <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmée</span>}
                </div>
                {!annulee && (
                  <div className="px-5 py-4 space-y-3">
                    {!editing ? (
                      <>
                        <Row icon={<Calendar className="w-4 h-4" />} label="Séjour" value={`${fmt(r.date_arrivee)} → ${fmt(r.date_depart)}`} />
                        {r.twinable && <Row icon={<BedDouble className="w-4 h-4" />} label="Lits" value={r.config_lit === "twin" ? "2 lits" : "1 grand lit"} />}
                        <Row icon={<Users className="w-4 h-4" />} label="Personnes" value={String(r.nb_personnes)} />
                        {r.statut === "en_attente_paiement" && (
                          <p className="text-[11px] text-amber-600 pt-1">Réglez ci-dessus pour confirmer cette chambre.</p>
                        )}
                        {!groupe.locked && r.statut === "confirmee" && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => startEdit(r)} className="flex-1 h-10 rounded-full text-white font-medium text-sm inline-flex items-center justify-center gap-1.5" style={{ background: NAVY }}><Pencil className="w-4 h-4" /> Modifier</button>
                            <button onClick={() => { if (ensureCode()) setCancelTarget({ id: r.id, numero: r.numero }); }} disabled={busy} className="h-10 px-4 rounded-full border border-rose-200 text-rose-600 font-medium text-sm inline-flex items-center justify-center gap-1.5"><Trash2 className="w-4 h-4" /> Annuler</button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <FDate label="Arrivée" value={da} min={groupe.date_arrivee} max={groupe.date_depart} onChange={setDa} />
                          <FDate label="Départ" value={dd} min={groupe.date_arrivee} max={groupe.date_depart} onChange={setDd} />
                        </div>
                        {r.twinable && (
                          <div>
                            <Label>Lits</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {(["double", "twin"] as const).map(opt => (
                                <button key={opt} type="button" onClick={() => setLit(opt)} className="h-10 rounded-lg border text-sm font-medium" style={lit === opt ? { borderColor: NAVY, background: "rgba(0,78,124,.06)", color: NAVY } : { borderColor: "#e2e8f0", color: "#64748b" }}>{opt === "double" ? "1 grand lit" : "2 lits"}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <Label>Personnes (max {r.pax_max})</Label>
                          <Stepper value={pax} min={1} max={r.pax_max} onChange={setPax} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(null)} className="h-10 px-4 rounded-full border border-slate-200 text-slate-600 font-medium text-sm">Retour</button>
                          <button onClick={() => save(r.id)} disabled={busy} className="flex-1 h-10 rounded-full text-white font-medium text-sm inline-flex items-center justify-center gap-1.5" style={{ background: NAVY }}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Enregistrer</>}</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {msg && <p className="text-sm text-center text-slate-500 mt-3">{msg}</p>}
      </div>

      {/* Modale de confirmation d'annulation (remplace le confirm() natif) */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(15,23,42,.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !busy) setCancelTarget(null); }}>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-rose-50 text-rose-600"><Trash2 className="w-6 h-6" /></div>
            <h2 className="font-serif font-semibold text-xl text-slate-800 mt-3">Annuler cette chambre ?</h2>
            <p className="text-sm text-slate-500 mt-1.5">Chambre <b>{cancelTarget.numero}</b> — cette action est définitive.</p>
            {groupe.conditions_annulation && (
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{groupe.conditions_annulation}</p>
            )}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setCancelTarget(null)} disabled={busy} className="flex-1 h-11 rounded-full border border-slate-200 text-slate-600 font-medium text-sm">Retour</button>
              <button onClick={doCancel} disabled={busy} className="flex-1 h-11 rounded-full text-white font-semibold text-sm inline-flex items-center justify-center gap-1.5" style={{ background: "#e11d48" }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}

// ============================================================================
// UI partagée
// ============================================================================
function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 360, damping: 34 }}
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 py-4 flex items-center justify-between border-b border-slate-100 z-10">
          <div><p className="text-[11px] uppercase tracking-widest text-slate-400">{subtitle}</p><h2 className="font-serif font-semibold text-xl text-slate-800">{title}</h2></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
function hotelStars(name: string) {
  const n = name.toLowerCase();
  if (n.includes("corniche")) return 4;
  if (n.includes("voiles")) return 3;
  return 0;
}
function HotelHeader({ name }: { name: string }) {
  const stars = hotelStars(name);
  return (
    <div className="text-center mb-4 mt-2">
      <div className="flex items-center justify-center gap-3">
        <span className="h-px w-10" style={{ background: "rgba(198,169,114,.5)" }} />
        <span className="uppercase tracking-[0.22em] text-[12px]" style={{ color: GOLD }}>{stars ? "★".repeat(stars) : "Hôtel"}</span>
        <span className="h-px w-10" style={{ background: "rgba(198,169,114,.5)" }} />
      </div>
      <h2 className="font-serif font-semibold text-2xl md:text-3xl text-slate-800 mt-1.5">{name}</h2>
    </div>
  );
}
function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="px-3.5 h-9 rounded-full text-sm font-medium transition border" style={active ? { background: NAVY, color: "#fff", borderColor: NAVY } : { background: "rgba(255,255,255,.7)", color: "#475569", borderColor: "#e2e8f0" }}>{children}</button>;
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">{children}</span>;
}
function Label({ children }: { children: React.ReactNode }) { return <span className="text-xs font-medium text-slate-500 mb-1.5 block">{children}</span>; }
function FInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <label className="block"><Label>{label}</Label><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-slate-200 rounded-xl px-3 h-11 text-sm bg-white outline-none focus:border-slate-400" /></label>;
}
function FDate({ label, value, onChange, min, max }: { label: string; value: string; onChange: (v: string) => void; min?: string; max?: string }) {
  return <label className="block"><Label>{label}</Label><input type="date" value={value} min={min} max={max} onChange={e => onChange(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 h-11 text-sm bg-white outline-none focus:border-slate-400" /></label>;
}
function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input inputMode="numeric" maxLength={4} value={value} onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" className="w-full border border-slate-200 rounded-xl px-3 h-11 text-center tracking-[0.4em] font-semibold text-slate-800 bg-white outline-none focus:border-slate-400 placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal" />;
}
function CodeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <label className="block"><Label>Votre code à 4 chiffres</Label><PinInput value={value} onChange={onChange} /></label>;
}
function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return <div className="inline-flex items-center rounded-xl border border-slate-200 overflow-hidden"><button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="w-9 h-10 text-lg text-slate-500">−</button><span className="w-8 text-center font-medium text-slate-800">{value}</span><button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="w-9 h-10 text-lg text-slate-500">+</button></div>;
}
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-sm text-slate-500 inline-flex items-center gap-2">{icon}{label}</span><span className="text-sm font-medium text-slate-800">{value}</span></div>;
}
function Banner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 mb-5 flex items-center gap-2"><Lock className="w-4 h-4 shrink-0" />{children}</div>;
}
function Centered({ title, text }: { title: string; text: string }) {
  return <main className="min-h-screen flex items-center justify-center px-6 text-center"><div><h1 className="font-serif font-semibold text-2xl text-slate-800">{title}</h1><p className="text-slate-500 mt-2 text-sm">{text}</p></div></main>;
}

// ---------- Signature (canvas, sans dépendance) ----------
function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false); const hasInk = useRef(false);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio; c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.scale(ratio, ratio); ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#1e293b";
  }, []);
  function pos(e: React.PointerEvent) { const c = canvasRef.current!; const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function down(e: React.PointerEvent) { drawing.current = true; const ctx = canvasRef.current!.getContext("2d")!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); canvasRef.current!.setPointerCapture(e.pointerId); }
  function move(e: React.PointerEvent) { if (!drawing.current) return; const ctx = canvasRef.current!.getContext("2d")!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasInk.current = true; }
  function up() { if (!drawing.current) return; drawing.current = false; if (hasInk.current) onChange(canvasRef.current!.toDataURL("image/png")); }
  function clear() { const c = canvasRef.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); hasInk.current = false; onChange(null); }
  return (
    <div>
      <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} className="w-full h-36 rounded-xl border border-slate-200 bg-white touch-none" style={{ touchAction: "none" }} />
      <button type="button" onClick={clear} className="text-xs text-slate-400 mt-1.5 hover:text-slate-600">Effacer</button>
    </div>
  );
}
