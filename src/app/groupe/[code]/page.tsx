"use client";

import { createContext, Fragment, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useModale } from "@/hooks/useModale";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BedDouble, Users, Check, Loader2, X, Calendar, Lock, Pencil, Trash2, KeyRound, ArrowLeft,
} from "lucide-react";
import { LANGS, LOCALE, T, detectLang, rememberLang, type Dict, type Lang } from "./i18n";
import { estGerable } from "@/lib/groupeStatuts";

// La langue traverse toute la page (une dizaine de composants) : un contexte évite
// de faire descendre `t` de props en props jusqu'au moindre bouton.
const LangCtx = createContext<{ lang: Lang; t: Dict }>({ lang: "fr", t: T.fr });
const useT = () => useContext(LangCtx).t;
const useLang = () => useContext(LangCtx).lang;

const NAVY = "var(--color-navy)";
const GOLD = "var(--color-gold)";
// Or lisible en texte sur fond clair (4.7:1). GOLD reste pour les aplats et bordures.
const GOLD_INK = "var(--color-gold-ink)";
// Mode 'plan' : une chambre dont le nom est posé passe au vert — la même teinte que
// les séjours occupés du calendrier, pour qu'un occupé se lise pareil partout.
const OCCUPE = "#5f9e7f";
const OCCUPE_INK = "#2f6b4f";
// Une teinte par catégorie de chambre, attribuée dans l'ordre alphabétique des
// libellés : stable d'un affichage à l'autre, et valable pour n'importe quel hôtel
// (aucun mot-clé « mer » ou « single » en dur, qui tomberait en anglais ou à La
// Corniche). Quatre suffisent — au-delà, on recommence.
//
// ⚠️ Ces teintes doivent être distinctes AU PREMIER COUP D'ŒIL, sur un filet de
// cinq pixels : un bleu marine et un bleu-vert, pourtant très différents en code
// hexadécimal, se confondaient (« confort et vue mer sont trop similaires »,
// Martin 31/08). D'où quatre familles franchement séparées — bleu, ocre, prune,
// terre — et surtout aucun VERT : il est pris par les chambres déjà remplies.
const TEINTES_CATEGORIE = ["#004e7c", "#8C6F39", "#7d4a78", "#b0563f"];
const SEA_BG = "/images/pagewifi.jpg";

// ---------- Types ----------
// Une nuit déjà prise sur une chambre (mode 'pro'). Bornes [from, to) : le jour du
// départ est libre pour l'arrivant suivant — même sémantique que la contrainte
// d'exclusion en base (migration 82).
interface Periode { from: string; to: string; pax?: number; occupant: string | null }
interface Room {
  id: string; numero: string; type: string | null; pax_max: number;
  // Libellé de catégorie traduit (migration 110). null → repli sur `type`.
  type_en?: string | null; type_es?: string | null;
  twinable: boolean; tarif: number; hotel: string | null; taken: boolean; occupant: string | null;
  periodes?: Periode[];
  // Nuits où cette chambre n'est PAS offerte au groupe (migration 86) : elle peut être
  // déjà vendue certaines nuits, y compris au milieu du séjour.
  nuitsExclues?: string[];
  // Tarif du petit-déjeuner pour l'hôtel de cette chambre (par personne et par
  // nuit), ou null s'il n'est pas proposé ici.
  pdjPrix?: number | null;
  // Taxe de séjour de l'hôtel de cette chambre (par personne et par nuit).
  // null → repli sur le montant du groupe, puis sur le barème par défaut.
  taxeMontant?: number | null;
  // La résa de cette chambre exige-t-elle un code ? (facultatif en mode 'pro')
  claimNeedsPin?: boolean;
  // Palier de la chambre (migration 133) : « 1er inter », « 2e étage »… Les Voiles est
  // un bâtiment en escalier, le numéro NE DIT PAS le niveau (11 et 12 sont au 1er
  // inter, pas au 1er étage avec 14/15/16). null → mode 'plan' indisponible.
  etage?: string | null;
  etageOrdre?: number | null;
}
interface GroupeMeta {
  nom: string; date_arrivee: string; date_depart: string; date_limite: string;
  conditions_annulation: string | null; plan_visible: boolean;
  cover_image_url: string | null; message_accueil: string | null; closed: boolean;
  mode_paiement?: string | null;
  // Réglages staff (migration 84).
  affichage_tarifs?: "complet" | "budget" | "masque";
  taxe_sejour_mode?: "incluse" | "ajoutee";
  taxe_sejour_montant?: number;
  // 'simple' : cartes de chambres sur les dates du groupe (mariages — la page reste
  // telle quelle). 'pro' : calendrier chambres × nuits, chaque invité pose ses dates
  // (tournages, séminaires, groupes longs). Choisi par groupe au back-office.
  mode_vue?: "simple" | "pro" | "plan";
}
type Filter = "all" | "free" | "taken";

// ---------- Helpers ----------
function fmt(d?: string, lang: Lang = "fr") {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric" });
}
// ⚠️ NE PAS ARRONDIR (Martin 2026-07-16) : `maximumFractionDigits: 0` affichait « 458 € »
// pour 458,49 € — invisible tant que les tarifs étaient ronds, faux dès que la taxe de
// séjour entre dans le total. On garde les centimes quand il y en a, sans les imposer
// aux montants ronds (« 150 € », pas « 150,00 € »).
function euro(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
// Barème par défaut, dernier filet si rien n'est saisi (par personne et par nuit).
function taxeSejour(hotel: string | null): number {
  return (hotel || "").toLowerCase().includes("voile") ? 1.86 : 2.83;
}
// Le libellé de catégorie dans la langue affichée. Saisi par l'hôtel, donc
// traduit en base et non par le dictionnaire : « Confort, étage, vue ville » n'a
// pas d'équivalent générique.
function typeDe(r: Room, lang: Lang): string | null {
  if (lang === "en") return r.type_en || r.type;
  if (lang === "es") return r.type_es || r.type;
  return r.type;
}

// La taxe qui s'applique à UNE chambre. Elle se lit hôtel par hôtel : un groupe
// bi-hôtel n'a pas un montant unique (1,86 € aux Voiles, 2,83 € à La Corniche).
function taxeDeChambre(r: Room, groupeMontant?: number | null): number {
  if (r.taxeMontant != null) return r.taxeMontant;
  return groupeMontant || taxeSejour(r.hotel ?? null);
}
function euro2(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
}
// Ordre d'affichage des catégories de chambres (du plus simple au plus prestigieux)
// ⚠️ `new Date("2026-10-18T00:00:00")` est du LOCAL (minuit à Paris = 22h00 UTC la veille)
// → `toISOString().slice(0,10)` rendait « 2026-10-17 » et décalait TOUT le calendrier d'un
// jour. On formate donc en heure locale, jamais via toISOString.
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Liste des nuits d'une plage : « 18/10 → 21/10 » = les nuits du 18, 19 et 20.
// Le départ n'est PAS une nuit (bornes [from, to)).
function nightsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (d < end) {
    out.push(ymd(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// « 2026-10-18 » → « 18/10 » (récap du panier).
function ddmm(d: string): string {
  const x = new Date(d + "T00:00:00");
  return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}`;
}

function nextDay(d: string): string {
  const x = new Date(d + "T00:00:00"); x.setDate(x.getDate() + 1);
  return ymd(x);
}
function prevDay(d: string): string {
  const x = new Date(d + "T00:00:00"); x.setDate(x.getDate() - 1);
  return ymd(x);
}

// Deux séjours se chevauchent-ils ? Bornes [from, to) → un départ le 28 et une arrivée
// le 28 NE se chevauchent pas (la chambre se libère le matin).
function overlaps(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom < bTo && bFrom < aTo;
}

// La chambre est-elle libre sur TOUTE la plage demandée ? (mode 'pro')
function roomFreeFor(room: Room, from: string, to: string): boolean {
  // Une seule nuit retirée du bloc suffit à interdire la plage.
  if (nightsBetween(from, to).some((n) => !nightInRoomWindow(room, n))) return false;
  return !(room.periodes || []).some((p) => overlaps(from, to, p.from, p.to));
}

// La nuit `n` est-elle offerte au groupe sur cette chambre ?
function nightInRoomWindow(room: Room, n: string): boolean {
  return !(room.nuitsExclues || []).includes(n);
}

function catRank(type: string | null): number {
  const t = (type || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (t.includes("single")) return 0;
  if (t.includes("classique")) return 1;
  if (t.includes("confort")) return 2;
  if (t.includes("superieur")) return 3;
  if (t.includes("exec")) return 4;
  if (t.includes("balcon")) return 6;   // vue mer balcon (après vue mer)
  if (t.includes("vue mer")) return 5;
  if (t.includes("loft")) return 7;
  if (t.includes("junior")) return 8;
  if (t.includes("prestige")) return 9;
  return 99;
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
  // Un mariage international, c'est la moitié des invités qui ne lit pas le
  // français. La langue se devine (?lang=, choix mémorisé, navigateur) et reste
  // changeable à tout moment — sans jamais recharger ni perdre la saisie en cours.
  const [lang, setLangState] = useState<Lang>("fr");
  useEffect(() => { setLangState(detectLang()); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); rememberLang(l); }, []);
  const value = useMemo(() => ({ lang, t: T[lang] }), [lang]);
  return (
    <LangCtx.Provider value={value}>
      <LangSwitch lang={lang} onChange={setLang} />
      {token ? <ManageView token={token} /> : <BookingView code={code} />}
    </LangCtx.Provider>
  );
}

// Sélecteur discret, en haut à droite et au-dessus de tout : il doit rester
// atteignable depuis la fiche de réservation comme depuis le calendrier.
function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="fixed top-3 right-3 z-[60] flex items-center gap-0.5 rounded-full bg-white/85 backdrop-blur px-1 py-1 shadow-sm border border-slate-200">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          aria-label={l.label}
          aria-pressed={lang === l.code}
          className="h-7 px-2 rounded-full text-[11px] font-semibold uppercase tracking-wide transition"
          style={lang === l.code
            ? { background: NAVY, color: "#fff" }
            : { color: "#94a3b8" }}
        >
          {l.code}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Réservation
// ============================================================================
function BookingView({ code }: { code: string }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [groupe, setGroupe] = useState<GroupeMeta | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Mode 'pro' : CHAQUE chambre porte SES dates (Martin 2026-07-16 — une plage globale
  // écrasait le 1er choix dès qu'on en posait un 2e, ou propageait ses dates aux autres
  // chambres : ingérable pour réserver 18 comédiens aux dates décalées).
  // Mode 'simple' : tout le monde a les dates du groupe → `selected` suffit, inchangé.
  const [picks, setPicks] = useState<Record<string, { from: string; to: string }>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [claim, setClaim] = useState<Room | null>(null);
  const [done, setDone] = useState<{ ref: string; pin: string } | null>(null);
  const [pay, setPay] = useState<{ hotel_id: string; hotelNom: string; amount: number; url: string }[] | null>(null);
  // Plage choisie par l'invité (mode 'pro' uniquement) — initialisée aux dates du groupe.
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

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

  // Mode 'pro' : l'invité choisit SES dates, et la disponibilité se calcule sur cette
  // plage (une chambre peut être libre la 1re semaine et prise la 2e). En mode 'simple'
  // tout le monde réserve la plage du groupe → `taken` suffit, rien ne change.
  const isPro = groupe?.mode_vue === "pro";
  // Mode 'plan' : l'hôtel vu en coupe, un clic par chambre. Pensé pour l'organisatrice
  // d'une privatisation qui place ses invités elle-même.
  const isPlan = groupe?.mode_vue === "plan";
  const voitPrixPage = (groupe?.affichage_tarifs || "complet") === "complet";
  useEffect(() => {
    if (groupe && !range) setRange({ from: groupe.date_arrivee, to: groupe.date_depart });
  }, [groupe, range]);

  // Mode 'plan' : la chambre dont on est en train de renseigner l'occupant.
  const [planRoom, setPlanRoom] = useState<Room | null>(null);

  const isFree = useCallback(
    (r: Room) => {
      if (isPro && range) return roomFreeFor(r, range.from, range.to);
      // Mode 'simple' : tout le monde réserve la plage ENTIÈRE du groupe → une seule nuit
      // retirée (migration 86) rend la chambre inutilisable. Sans ce contrôle, le client la
      // voyait « Disponible », remplissait tout le formulaire, et le SERVEUR le rejetait
      // à la fin (« n'est pas proposée sur ces dates »).
      if (!groupe) return !r.taken;
      return !r.taken && roomFreeFor(r, groupe.date_arrivee, groupe.date_depart);
    },
    [isPro, range, groupe],
  );

  const counts = useMemo(() => ({
    all: rooms.length,
    free: rooms.filter(r => isFree(r)).length,
    taken: rooms.filter(r => !isFree(r)).length,
  }), [rooms, isFree]);

  // Regroupement hôtel → catégorie
  const sections = useMemo(() => {
    const visible = rooms.filter(r => filter === "all" || (filter === "free" ? isFree(r) : !isFree(r)));
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
        const k = typeDe(r, lang) || "—";
        if (!byCat.has(k)) byCat.set(k, []);
        byCat.get(k)!.push(r);
      }
      const cats = [...byCat.entries()]
        .map(([name, rr]) => ({ name, tarif: rr[0]?.tarif ?? 0, rooms: rr }))
        .sort((a, b) => catRank(a.name) - catRank(b.name) || a.name.localeCompare(b.name, "fr"));
      out.push({ hotel, cats });
    }
    return out;
  }, [rooms, filter, isFree, lang]);

  // La coupe du bâtiment : les paliers empilés, LE PLUS HAUT EN PREMIER — on lit un
  // plan comme on regarde une façade. Null si une seule chambre n'a pas son palier :
  // mieux vaut retomber sur la liste par catégorie qu'afficher un plan troué.
  const paliers = useMemo(() => {
    if (!rooms.length || rooms.some(r => r.etageOrdre == null)) return null;
    const par = new Map<number, { nom: string; ordre: number; rooms: Room[] }>();
    for (const r of rooms) {
      const o = r.etageOrdre as number;
      if (!par.has(o)) par.set(o, { nom: r.etage || "", ordre: o, rooms: [] });
      par.get(o)!.rooms.push(r);
    }
    for (const p of par.values()) p.rooms.sort((a, b) => a.numero.localeCompare(b.numero, "fr", { numeric: true }));
    return [...par.values()].sort((a, b) => b.ordre - a.ordre);
  }, [rooms]);

  if (loading) return <FullLoader />;
  if (error || !groupe) return <Centered title="Oups" text={error || t.noGroup} />;
  if (pay) return <PaymentScreen payments={pay} groupe={groupe} />;
  if (done) return <Confirmation code={code} refId={done.ref} pin={done.pin} groupe={groupe} />;

  const selectedRooms = rooms.filter(r => (isPro ? picks[r.id] !== undefined : selected.has(r.id)));

  // Mode 'pro' : on a peint une plage sur la ligne d'une chambre. La plage devient LA plage
  // (l'API réserve toutes les chambres du panier sur les mêmes dates) et la chambre entre
  // dans la sélection. Les chambres déjà sélectionnées qui ne tiennent plus sur la nouvelle
  // plage en sortent — sinon on enverrait une résa que la base refuserait.
  function dragSelect(roomId: string, r: { from: string; to: string }) {
    if (groupe!.closed) return;
    setRange(r);                                   // mémorise la dernière plage (repère d'affichage)
    setPicks((prev) => ({ ...prev, [roomId]: r })); // ⚠️ n'affecte QUE cette chambre
  }
  function unpick(roomId: string) {
    setPicks((prev) => { const n = { ...prev }; delete n[roomId]; return n; });
  }

  // Clic sur une chambre déjà réservée. Avec un code → on le demande. SANS code → la résa
  // n'est pas verrouillée (choix assumé, Martin 2026-07-16) → on entre directement, sinon
  // on réclamerait un code que personne n'a jamais créé.
  async function openResa(r: Room) {
    if (r.claimNeedsPin !== false) { setClaim(r); return; }
    try {
      const res = await fetch(`/api/groupe/${code}/access`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupe_chambre_id: r.id }),
      });
      const d = await res.json();
      if (d.ok) router.push(`/groupe/${code}?r=${d.ref}`);
      else setClaim(r);
    } catch { setClaim(r); }
  }

  function toggle(r: Room) {
    // En 'pro', « retirer » sort simplement la chambre du panier.
    if (isPro) { unpick(r.id); return; }
    // Une chambre indisponible parce qu'elle n'est pas PROPOSÉE n'a pas d'occupant :
    // lui demander un code n'aurait aucun sens.
    if (r.taken) { openResa(r); return; }
    if (!isFree(r) || groupe!.closed) return;
    setSelected(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; });
  }

  return (
    <main className="pb-28">
      <Hero groupe={groupe} />

      <div className={`${isPlan ? "max-w-6xl" : "max-w-5xl"} mx-auto px-4 mt-6`}>
        {groupe.closed && <Banner>{t.closed}</Banner>}

        {/* Mode 'pro' : chacun pose ses dates, puis choisit une chambre libre SUR CES NUITS. */}
        {isPro && range && (
          <ProPlanner
            groupe={groupe} rooms={rooms} sections={sections} range={range} onRange={setRange}
            picks={picks} isFree={isFree} onToggle={toggle} onDragSelect={dragSelect}
            onClaim={openResa} counts={counts}
          />
        )}

        {/* Mode 'plan' : l'hôtel en coupe. Un clic sur une chambre libre demande QUI y
            dort — rien d'autre. C'est l'organisatrice qui remplit, pas seize invités. */}
        {isPlan && paliers && (
          <PlanCoupe paliers={paliers} planVisible={groupe.plan_visible} closed={groupe.closed}
            isFree={isFree} onPick={setPlanRoom} counts={counts} />
        )}

        {/* Filtre — mode 'simple' seulement : en mode 'pro' le calendrier montre déjà
            qui est libre et quand, les pastilles Toutes/Disponibles/Réservées n'ont plus
            de sens (une chambre est libre CERTAINES nuits). */}
        {!isPro && !(isPlan && paliers) && (<>
        <div className="flex items-center justify-center gap-2 mb-5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>{t.filterAll} <b>{counts.all}</b></FilterChip>
          <FilterChip active={filter === "free"} onClick={() => setFilter("free")}>{t.filterFree} <b>{counts.free}</b></FilterChip>
          <FilterChip active={filter === "taken"} onClick={() => setFilter("taken")}>{t.filterTaken} <b>{counts.taken}</b></FilterChip>
        </div>

        {sections.map((sec) => (
          <div key={sec.hotel || "_"} className="mb-7">
            {sec.hotel && <HotelHeader name={sec.hotel} />}
            {sec.cats.map((cat) => (
              <div key={cat.name} className="mb-5">
                <div className="flex items-baseline justify-between mb-2.5 px-0.5">
                  <div className="flex items-baseline gap-2.5 min-w-0">
                    <span aria-hidden className="self-stretch w-[3px] rounded-full shrink-0" style={{ background: GOLD }} />
                    <h3 className="font-serif font-semibold text-2xl leading-tight truncate" style={{ color: NAVY }}>{cat.name}</h3>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">{cat.rooms.filter(r => !r.taken).length} {t.availableShort}</span>
                  </div>
                  {voitPrixPage && <span className="text-sm font-semibold whitespace-nowrap shrink-0" style={{ color: GOLD_INK }}>{euro(cat.tarif)}<span className="text-[11px] text-slate-400 font-normal"> {t.perNight}</span></span>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {cat.rooms.map((r, i) => (
                    <RoomBubble key={r.id} room={r} index={i} selected={selected.has(r.id)} free={isFree(r)}
                      planVisible={groupe.plan_visible} disabled={groupe.closed && !r.taken} onClick={() => toggle(r)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        {sections.length === 0 && <p className="text-center text-slate-400 text-sm py-8">{t.noRoomInFilter}</p>}
        </>)}
      </div>

      {/* Mode 'plan' : « qui dort ici ? » sur la chambre cliquée. */}
      <AnimatePresence>
        {planRoom && (
          <PlanSheet code={code} groupe={groupe} room={planRoom}
            onClose={() => setPlanRoom(null)}
            onDone={() => { setPlanRoom(null); load(); }} />
        )}
      </AnimatePresence>

      {/* Barre de sélection */}
      <AnimatePresence>
        {selectedRooms.length > 0 && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={{ type: "spring", stiffness: 360, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-30 p-3">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-between pl-4 pr-2 py-2">
              <span className="text-sm text-slate-600"><b>{selectedRooms.length}</b> {selectedRooms.length > 1 ? t.roomsSelected : t.roomSelected}</span>
              <button onClick={() => setFormOpen(true)} className="h-10 px-5 rounded-full text-white font-semibold text-sm" style={{ background: NAVY }}>{t.book}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formOpen && (
          <BookingForm code={code} groupe={groupe} rooms={selectedRooms}
            // Mode 'pro' : les dates ont déjà été posées dans le calendrier — le formulaire
            // les reprend au lieu de repartir des dates du groupe.
            initRange={isPro ? range : null}
            picks={isPro ? picks : undefined}
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

// ---------- Mode 'pro' : le calendrier ----------
// Vue « PMS » : une ligne par chambre, une colonne par nuit du groupe. L'invité pose SES
// dates en haut, le calendrier grise les nuits déjà prises et n'ouvre à la sélection que
// les chambres libres sur TOUTE sa plage.
// Pensé pour les groupes longs (tournage CACTUS : 11 nuits, chacun arrive/repart quand il
// veut). La garantie anti-chevauchement vit en base (migration 82) : cette grille est un
// confort de lecture, pas le garde-fou.
function ProPlanner({ groupe, rooms, sections, range, onRange, picks, isFree, onToggle, onDragSelect, onClaim, counts }: {
  groupe: GroupeMeta;
  rooms: Room[];
  sections: { hotel: string; cats: { name: string; tarif: number; rooms: Room[] }[] }[];
  range: { from: string; to: string };
  onRange: (r: { from: string; to: string }) => void;
  picks: Record<string, { from: string; to: string }>;
  isFree: (r: Room) => boolean;
  onToggle: (r: Room) => void;
  onDragSelect: (roomId: string, r: { from: string; to: string }) => void;
  onClaim: (r: Room) => void;
  counts: { all: number; free: number; taken: number };
}) {
  const t = useT();
  const lang = useLang();
  // Sélection « à la PMS » : on peint sa plage directement sur la ligne de la chambre
  // (Martin 2026-07-16 : la vue allait, le parcours non — poser ses dates en haut PUIS
  // cliquer une ligne, c'est un formulaire déguisé en calendrier).
  // Un tap = 1 nuit · un glissé = la plage. Pointer events → marche à la souris ET au doigt.
  const [drag, setDrag] = useState<{ roomId: string; anchor: string; cur: string } | null>(null);

  // Le relâchement peut arriver hors de la grille → on écoute la fenêtre, sinon un drag
  // resterait collé au curseur.
  useEffect(() => {
    if (!drag) return;
    const commit = () => {
      const [a, c] = [drag.anchor, drag.cur];
      const from = a <= c ? a : c;
      const to = nextDay(a <= c ? c : a);   // la nuit cliquée est INCLUSE → départ le lendemain
      const room = rooms.find((r) => r.id === drag.roomId);
      if (room && roomFreeFor(room, from, to)) onDragSelect(drag.roomId, { from, to });
      setDrag(null);
    };
    window.addEventListener("pointerup", commit);
    window.addEventListener("pointercancel", commit);
    return () => {
      window.removeEventListener("pointerup", commit);
      window.removeEventListener("pointercancel", commit);
    };
  }, [drag, rooms, onDragSelect]);

  // Nuits survolées pendant le glissé, et validité (on ne peint pas à travers une résa).
  const dragNights = useMemo(() => {
    if (!drag) return null;
    const [a, c] = [drag.anchor, drag.cur];
    const from = a <= c ? a : c;
    const to = nextDay(a <= c ? c : a);
    const room = rooms.find((r) => r.id === drag.roomId);
    return { set: new Set(nightsBetween(from, to)), ok: !!room && roomFreeFor(room, from, to) };
  }, [drag, rooms]);
  // Toutes les nuits du groupe = les colonnes. La nuit du départ n'existe pas (bornes [)).
  // ⚠️ COLONNES = des JOURS (départ INCLUS), pas des nuits — c'est ce qui permet le rendu
  // « à cheval » d'un PMS (Martin 2026-07-16 : « les résa sont à cheval sur la date, les gens
  // comprennent mieux »). Chaque jour se coupe en 2 moitiés :
  //   · moitié DROITE du jour J = la nuit qui commence le J  → on arrive l'après-midi
  //   · moitié GAUCHE du jour J = la nuit J-1                → on repart le matin
  // Un séjour 18→21 remplit donc : droite du 18 · 19 et 20 pleins · gauche du 21.
  // Le dernier jour (= le départ du groupe) n'ouvre aucune nuit : il ne sert qu'à afficher
  // les départs.
  const jours = useMemo(
    () => [...nightsBetween(groupe.date_arrivee, groupe.date_depart), groupe.date_depart],
    [groupe],
  );
  const nuits = useMemo(() => nightsBetween(groupe.date_arrivee, groupe.date_depart), [groupe]);
  const nightsSel = useMemo(() => new Set(nightsBetween(range.from, range.to)), [range]);

  // Récap budget (Martin 2026-07-16 : « genre j'ai réservé 10000/32000 »).
  // · enveloppe = TOUT le bloc réservé à fond = Σ (tarif × nuits du groupe)
  // · engagé    = ce qui est déjà posé      = Σ (tarif × nuits de chaque séjour)
  // Hébergement seul (le tarif du bloc), hors taxe de séjour et extras : c'est un
  // repère de consommation du bloc, pas une facture.
  // La taxe de séjour n'entre dans le prix du bloc QUE si la réception l'a déclarée
  // « à rajouter » ; « incluse » = déjà dans le tarif/nuit → on n'ajoute rien.
  // (« sur place » a été supprimé, migration 89 : c'est mode_paiement qui dit OÙ
  //  l'on règle, pas le mode de taxe.)
  // La taxe se prend chambre par chambre (elle diffère d'un hôtel à l'autre).
  const tsDe = (r: Room) => groupe.taxe_sejour_mode === "ajoutee" ? taxeDeChambre(r, groupe.taxe_sejour_montant) : 0;
  // Interrupteur staff (migration 84) : complet = prix + budget · budget = budget seul
  // (vue organisateur) · masque = rien (groupe pris en charge, cf CACTUS).
  const aff = groupe.affichage_tarifs || "complet";
  const voitPrix = aff === "complet";
  const voitBudget = aff === "complet" || aff === "budget";
  const budget = useMemo(() => {
    const nGroupe = nuits.length || 1;
    let enveloppe = 0, engage = 0, moi = 0;
    for (const r of rooms) {
      // Enveloppe : le bloc rempli à fond. Une personne par chambre (single use) — c'est une
      // borne haute indicative, pas une facture.
      const ts = tsDe(r);
      enveloppe += (r.tarif + ts) * nGroupe;
      for (const p of r.periodes || []) {
        const n = nightsBetween(p.from, p.to).length;
        engage += r.tarif * n + ts * n * (p.pax || 1);
      }
      // Chaque chambre du panier compte SES propres nuits.
      const mine = picks[r.id];
      if (mine) moi += (r.tarif + ts) * nightsBetween(mine.from, mine.to).length;
    }
    return { enveloppe, engage, moi, pct: enveloppe ? Math.min(100, ((engage + moi) / enveloppe) * 100) : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, nuits, picks, groupe.taxe_sejour_mode, groupe.taxe_sejour_montant]);

  // Garde-fou de saisie : départ toujours après l'arrivée, et on reste dans les bornes.
  function setFrom(v: string) {
    const from = v < groupe.date_arrivee ? groupe.date_arrivee : v;
    onRange({ from, to: range.to <= from ? nextDay(from) : range.to });
  }
  function setTo(v: string) {
    const to = v > groupe.date_depart ? groupe.date_depart : v;
    onRange({ from: range.from >= to ? prevDay(to) : range.from, to });
  }

  // Le panier : une ligne par chambre choisie, avec SES dates.
  const mesPicks = useMemo(
    () => rooms.filter((r) => picks[r.id]).map((room) => ({ room, p: picks[room.id] })),
    [rooms, picks],
  );

  return (
    <div className="mb-7">
      {/* 1) La consigne. Le geste EST le calendrier : plus de champs de dates globaux —
             chaque chambre porte désormais ses propres nuits. */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-4 mb-4 shadow-sm">
        <p className="text-sm font-medium mb-1" style={{ color: NAVY }}>
          {t.dragHint}
        </p>
        <p className="text-xs text-slate-500">
          Un clic = une nuit. Vous pouvez enchaîner plusieurs chambres, chacune à ses dates.
          Les nuits grisées sont déjà prises.
        </p>
        {mesPicks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
            {mesPicks.map(({ room, p }) => (
              <span key={room.id} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ background: "rgba(0,78,124,.08)", color: NAVY }}>
                Ch. {room.numero} · {ddmm(p.from)} → {ddmm(p.to)}
                <button type="button" onClick={() => onToggle(room)} aria-label={t.remove}
                  className="opacity-50 hover:opacity-100">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2) Où en est le bloc — « j'ai réservé 10 000 / 32 000 ». */}
      {voitBudget && (
      <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-4 mb-4 shadow-sm">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: GOLD_INK }}>{t.block}</p>
          <p className="text-sm">
            <b style={{ color: NAVY }}>{euro(budget.engage + budget.moi)}</b>
            <span className="text-slate-400"> / {euro(budget.enveloppe)}</span>
          </p>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
          {/* déjà réservé par le groupe */}
          <div style={{ width: `${budget.enveloppe ? (budget.engage / budget.enveloppe) * 100 : 0}%`, background: NAVY }} />
          {/* ce que VOUS ajoutez à l'instant (avant validation) */}
          <div style={{ width: `${budget.enveloppe ? (budget.moi / budget.enveloppe) * 100 : 0}%`, background: GOLD }} />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          {groupe.taxe_sejour_mode === "incluse"
            ? "Hébergement du bloc, taxe de séjour incluse dans le tarif."
            : "Hébergement du bloc, taxe de séjour comprise."}
          {budget.moi > 0 && <> {t.ofWhich} <b style={{ color: GOLD_INK }}>{euro(budget.moi)}</b> {t.forYourSelection}</>}
        </p>
      </div>
      )}

      {/* 3) Le calendrier. Défile horizontalement si le séjour est long. */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-sm overflow-auto max-h-[70vh] [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-white text-left px-3 py-2 font-medium text-slate-400 text-xs">{t.room}</th>
              {jours.map((j) => {
                const d = new Date(j + "T00:00:00");
                const we = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <th key={j} className="sticky top-0 z-20 bg-white px-0 py-2 font-medium text-[10px] whitespace-nowrap min-w-[38px]"
                    style={{ color: we ? NAVY : "#94a3b8" }}>
                    <span className="block text-[9px] font-normal opacity-70">
                      {d.toLocaleDateString(LOCALE[lang], { weekday: "narrow" })}
                    </span>
                    {d.toLocaleDateString(LOCALE[lang], { day: "2-digit", month: "2-digit" })}
                  </th>
                );
              })}
            </tr>
          </thead>
          {sections.map((sec) => (
            <tbody key={sec.hotel || "_"}>
              {sec.hotel && (
                <tr><td colSpan={jours.length + 1} className="px-3 pt-4 pb-1 font-serif font-semibold text-lg" style={{ color: NAVY }}>{sec.hotel}</td></tr>
              )}
              {sec.cats.map((cat) => (
                <Fragment key={cat.name}>
                  <tr>
                    <td colSpan={jours.length + 1} className="px-3 pt-3 pb-1">
                      <span className="text-xs font-semibold" style={{ color: NAVY }}>{cat.name}</span>
                      {voitPrix && <span className="text-xs text-slate-400"> · {euro(cat.tarif)} / nuit</span>}
                    </td>
                  </tr>
                  {cat.rooms.map((r) => {
                    const libre = isFree(r);
                    const mine = picks[r.id];          // MA plage sur CETTE chambre
                    const sel = mine !== undefined;
                    return (
                      <tr key={r.id} className="border-t border-slate-100 select-none">
                        <td className="sticky left-0 z-10 bg-white/95 px-3 py-1.5 whitespace-nowrap">
                          <span className="font-semibold" style={{ color: sel ? NAVY : libre ? "#334155" : "#94a3b8" }}>{r.numero}</span>
                          {sel && (
                            <button type="button" onClick={() => onToggle(r)}
                              className="ml-2 text-[10px] font-medium underline decoration-dotted" style={{ color: NAVY }}>
                              retirer
                            </button>
                          )}
                        </td>
                        {jours.map((j) => {
                          // Ce qui remplit chaque MOITIÉ du jour J : la nuit J-1 à gauche, la nuit J
                          // à droite. Même fonction pour les deux → le séjour se dessine « à cheval ».
                          const etat = (nuit: string) => {
                            if (!nuit) return null;
                            // Hors de la fenêtre de CETTE chambre → hachuré, non réservable.
                            if (!nightInRoomWindow(r, nuit)) return { kind: "hors" as const, occ: null };
                            const occ = (r.periodes || []).find((p) => nuit >= p.from && nuit < p.to);
                            if (occ) return { kind: "occ" as const, occ };
                            if (drag?.roomId === r.id && dragNights?.set.has(nuit))
                              return { kind: dragNights.ok ? ("drag" as const) : ("bad" as const), occ: null };
                            if (mine && nuit >= mine.from && nuit < mine.to) return { kind: "moi" as const, occ: null };
                            return null;
                          };
                          const fill = (e: ReturnType<typeof etat>) =>
                            !e ? "transparent"
                              : e.kind === "hors" ? "repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 3px,#e2e8f0 3px,#e2e8f0 6px)"
                              : e.kind === "occ" ? "#5f9e7f"
                              : e.kind === "drag" ? GOLD
                              : e.kind === "bad" ? "#fca5a5"
                              : NAVY;

                          // Le dernier jour (départ du groupe) n'ouvre AUCUNE nuit : il ne sert
                          // qu'à afficher les départs sur sa moitié gauche.
                          const nuitDroite = j === groupe.date_depart || !nightInRoomWindow(r, j) ? "" : j;
                          const gauche = etat(prevDay(j));
                          const droite = etat(nuitDroite);
                          const occIci = gauche?.occ || droite?.occ;
                          // Deux moitiés appartiennent-elles au MÊME séjour ? Si oui elles se
                          // soudent (bords carrés) ; sinon chacune garde son bord arrondi — c'est
                          // ce qui dessine proprement un départ et une arrivée le même jour.
                          const runKey = (e: ReturnType<typeof etat>) =>
                            !e ? "" : e.occ ? `occ:${e.occ.from}:${e.occ.to}` : e.kind;
                          const sameRun = !!gauche && !!droite && runKey(gauche) === runKey(droite);

                          return (
                            <td key={j} className="p-0 align-middle"
                              // La cellule qui porte le nom passe au-dessus des suivantes,
                              // sinon leurs fonds recouvrent le texte qui déborde.
                              style={droite?.occ && !sameRun ? { position: "relative", zIndex: 5 } : undefined}
                              // Peinture de la plage : appui = ancre, survol = extension.
                              onPointerDown={(e) => {
                                // Séjour déjà posé ici : c'est peut-être LE VÔTRE → écran « retrouver
                                // ma réservation » (PIN), comme le mode simple sur une chambre prise.
                                if (occIci) { onClaim(r); return; }
                                if (groupe.closed || !nuitDroite) return;
                                e.preventDefault();               // sinon le navigateur lance une sélection de texte
                                setDrag({ roomId: r.id, anchor: nuitDroite, cur: nuitDroite });
                              }}
                              onPointerEnter={() => {
                                if (drag && drag.roomId === r.id && nuitDroite) setDrag((d) => (d ? { ...d, cur: nuitDroite } : d));
                              }}>
                              <div
                                title={occIci ? `${occIci.occupant || t.booked} · ${ddmm(occIci.from)} → ${ddmm(occIci.to)} — ${t.clickIfYours}`
                                  : !nightInRoomWindow(r, j) && j !== groupe.date_depart ? t.roomNotThatNight
                                  : !nuitDroite ? "Jour du départ" : "Cliquez ou glissez pour choisir vos nuits"}
                                className={`relative flex h-7 ${occIci || (!groupe.closed && nuitDroite) ? "cursor-pointer" : ""}`}
                              >

                                {/* gauche = nuit précédente (les DÉPARTS, on part le matin) ·
                                    droite = nuit qui commence (les ARRIVÉES, on arrive l'aprem).
                                    ⚠️ On n'arrondit QUE les extrémités du séjour : arrondir chaque
                                    moitié donnait un chapelet de gélules au lieu d'une barre. */}
                                <div className={`w-1/2 h-full transition-colors ${sameRun ? "" : "rounded-r-full"}`}
                                  style={{ background: fill(gauche) }} />
                                <div className={`relative w-1/2 h-full transition-colors ${sameRun ? "" : "rounded-l-full"}`}
                                  style={{ background: fill(droite) }}>
                                  {/* Le nom s'ancre sur la moitié DROITE : c'est là que la barre d'une
                                      arrivée commence. Ancré au bord de la CELLULE, « Martin » tombait
                                      sur la moitié gauche transparente et seul « V. » restait lisible.
                                      Il déborde ensuite sur les nuits suivantes (la barre est faite de
                                      demi-cellules réparties sur plusieurs colonnes). */}
                                  {droite?.occ && droite.occ.occupant && !sameRun && (
                                    <span className="absolute left-2 inset-y-0 flex items-center text-[10px] font-medium text-white whitespace-nowrap pointer-events-none">
                                      {droite.occ.occupant}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="text-[11px] text-slate-400 mt-2 px-1">
        Cliquez une chambre libre sur vos dates pour la sélectionner. Les nuits grisées sont déjà réservées.
      </p>
    </div>
  );
}

function Hero({ groupe }: { groupe: GroupeMeta }) {
  const lang = useLang();
  return (
    <div className="max-w-2xl mx-auto px-4 pt-9 md:pt-12 text-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="uppercase tracking-[0.18em] text-[11px] mb-2" style={{ color: GOLD_INK }}>Hôtels Toulon Bord de Mer</p>
        <h1 className="font-serif font-semibold text-3xl md:text-4xl leading-tight text-slate-800">{groupe.nom}</h1>
        <p className="mt-2 text-sm text-slate-500 inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {fmt(groupe.date_arrivee, lang)} → {fmt(groupe.date_depart, lang)}</p>
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

function RoomBubble({ room, index, selected, planVisible, disabled, free, onClick }: {
  room: Room; index: number; selected: boolean; planVisible: boolean; disabled: boolean; free: boolean; onClick: () => void;
}) {
  const t = useT();
  const muted = room.taken || disabled || !free;
  return (
    <motion.button type="button" onClick={onClick} disabled={disabled && !room.taken}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), type: "spring", stiffness: 380, damping: 30 }}
      whileTap={muted && !room.taken ? {} : { scale: 0.96 }}
      // Une chambre prise doit se voir SANS lire l'étiquette : fond gris, contenu
      // estompé et un TAMPON en travers. Le `opacity: .7` d'origine se distinguait
      // à peine d'une chambre libre, et le gris seul ne suffisait toujours pas —
      // on cliquait au hasard (Martin, 27/08).
      className="relative text-left rounded-2xl border p-3 transition shadow-sm overflow-hidden"
      style={{
        background: room.taken ? "#f1f5f9" : !free ? "#fafafa" : "#fff",
        borderColor: selected ? NAVY : room.taken ? "#cbd5e1" : "rgba(0,78,124,.16)",
        boxShadow: selected ? `0 0 0 2px ${NAVY}` : undefined,
        opacity: !room.taken && !free ? 0.6 : 1,
      }}>
      {selected && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white z-20" style={{ background: NAVY }}><Check className="w-3 h-3" /></span>}
      {room.taken && !selected && (
        // Le tampon du cachet : incliné, encadré, par-dessus tout le reste. Il
        // reste lisible en trois langues (t.booked), d'où le `whitespace-nowrap`.
        <span className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <span
            className="px-2 py-[3px] rounded-[3px] border-2 text-[10px] font-extrabold uppercase tracking-[0.12em] whitespace-nowrap"
            style={{
              transform: "rotate(-11deg)",
              borderColor: "rgba(100,116,139,.55)",
              color: "rgba(71,85,105,.85)",
              background: "rgba(255,255,255,.72)",
            }}>
            {t.booked}
          </span>
        </span>
      )}
      <p className={`font-serif font-semibold text-lg leading-none ${room.taken ? "text-slate-400" : "text-slate-800"}`}>{room.numero}</p>
      <div className={`flex items-center gap-1 mt-2 flex-wrap ${room.taken ? "opacity-40" : ""}`}>
        <Pill><Users className="w-3 h-3" /> {room.pax_max}</Pill>
        {room.twinable && <Pill><BedDouble className="w-3 h-3" /> {t.twin}</Pill>}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-200/70">
        {room.taken
          ? <span className="text-[11px] font-medium text-slate-500">{planVisible && room.occupant ? room.occupant : t.booked}</span>
          : !free
          // Ni réservée ni libre : le staff a retiré des nuits du bloc sur cette chambre.
          ? <span className="text-[11px] text-slate-400">{t.notOffered}</span>
          : <span className="text-[11px] font-medium" style={{ color: NAVY }}>{selected ? t.selected : t.available}</span>}
      </div>
    </motion.button>
  );
}



// La carte du mode 'plan'. Volontairement BASSE : un palier doit tenir sur une seule
// ligne, y compris à trois chambres sur un téléphone — sinon la 25 se retrouve sous
// la 24, loin de son libellé, et la coupe ne se lit plus. La grande carte du mode
// 'simple' (RoomBubble) fait deux fois cette hauteur : la page entière passait à
// 2 800 px, on ne voyait plus le bâtiment.
function PlanRoomCard({ room, free, planVisible, disabled, couleur, onClick }: {
  room: Room; free: boolean; planVisible: boolean; disabled: boolean; couleur: string; onClick: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const pris = room.taken;
  // La CATÉGORIE compte autant que le numéro quand on répartit des invités : on ne
  // place pas ses témoins dans une Single par mégarde (Martin, 31/08).
  const cat = typeDe(room, lang);
  return (
    <button type="button" onClick={onClick} disabled={pris || !free || disabled}
      className="relative w-full text-left rounded-xl border pl-3.5 pr-3 py-2.5 transition shadow-sm hover:shadow-md disabled:cursor-default disabled:hover:shadow-sm overflow-hidden"
      style={{
        background: pris ? "#f0f7f3" : !free ? "#fafafa" : "#fff",
        borderColor: pris ? "rgba(95,158,127,.45)" : "rgba(15,23,42,.10)",
        opacity: !pris && !free ? 0.55 : 1,
      }}>
      {/* Le filet de catégorie : c'est LUI qui fait lire le plan d'un coup d'œil —
          toutes les vues mer d'un côté, les singles de l'autre. Vert dès qu'un nom
          est posé : on voit ce qui reste à remplir sans lire une seule ligne. */}
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[5px]"
        style={{ background: pris ? OCCUPE : couleur }} />
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-serif font-semibold text-xl leading-none" style={{ color: pris ? OCCUPE_INK : "#0f172a" }}>{room.numero}</span>
        <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 shrink-0">
          <Users className="w-3 h-3" />{room.pax_max}
        </span>
      </div>
      {cat && (
        <p className="mt-1 text-[11px] leading-[1.2] line-clamp-2 font-medium"
          style={{ color: pris ? "#64748b" : couleur }}>{cat}</p>
      )}
      <p className="mt-1.5 text-[12px] font-semibold truncate"
        style={{ color: pris ? OCCUPE_INK : free ? "#94a3b8" : "#cbd5e1" }}>
        {pris ? (planVisible && room.occupant ? room.occupant : t.booked) : free ? t.available : t.notOffered}
      </p>
    </button>
  );
}

// ---------- Mode 'plan' : l'hôtel en coupe ----------
// Les paliers empilés, le plus haut en premier. Les Voiles monte en escalier — entre
// deux étages il y a un demi-palier (« inter ») — et c'est CE relief qui permet à une
// organisatrice de placer ses invités : les mariés et leurs témoins au même niveau,
// les familles groupées. Une liste par catégorie ne dit rien de tout ça.
function PlanCoupe({ paliers, planVisible, closed, isFree, onPick, counts }: {
  paliers: { nom: string; ordre: number; rooms: Room[] }[];
  planVisible: boolean; closed: boolean;
  isFree: (r: Room) => boolean;
  onPick: (r: Room) => void;
  counts: { all: number; free: number; taken: number };
}) {
  const t = useT();
  const lang = useLang();

  // Les catégories présentes, triées : leur rang fixe la teinte (cf. TEINTES_CATEGORIE).
  const categories = useMemo(() => {
    const noms = new Set<string>();
    for (const p of paliers) for (const r of p.rooms) { const c = typeDe(r, lang); if (c) noms.add(c); }
    return [...noms].sort((a, b) => a.localeCompare(b, "fr"));
  }, [paliers, lang]);
  const couleurDe = (r: Room) => {
    const c = typeDe(r, lang);
    const i = c ? categories.indexOf(c) : -1;
    return i >= 0 ? TEINTES_CATEGORIE[i % TEINTES_CATEGORIE.length] : "#94a3b8";
  };

  return (
    <div className="mb-8">
      {/* Compteur + légende des catégories : deux lignes qui suffisent à lire tout
          le reste sans notice. */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-3 text-sm">
        <span className="font-semibold" style={{ color: OCCUPE_INK }}>{counts.taken} <span className="font-normal text-slate-500">{t.planFilled}</span></span>
        <span aria-hidden className="w-px h-4 bg-slate-300" />
        <span className="font-semibold" style={{ color: NAVY }}>{counts.free} <span className="font-normal text-slate-500">{t.planToFill}</span></span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mb-5">
        {categories.map((c, i) => (
          <span key={c} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <span aria-hidden className="w-2.5 h-2.5 rounded-sm" style={{ background: TEINTES_CATEGORIE[i % TEINTES_CATEGORIE.length] }} />
            {c}
          </span>
        ))}
      </div>

      {/* Un panneau opaque : posées à même la photo de mer, les cartes blanches
          n'avaient plus aucun contraste et tout se noyait (Martin, 31/08). */}
      <div className="rounded-3xl bg-white/92 backdrop-blur-sm shadow-lg ring-1 ring-slate-900/5 px-3 sm:px-5 py-4">
        <div className="relative">
          {/* La cage d'escalier : un trait continu qui relie les paliers et donne à
              l'empilement sa lecture d'élévation. */}
          <span aria-hidden className="hidden sm:block absolute left-[92px] top-2 bottom-2 w-px bg-slate-200" />
          <div className="divide-y divide-slate-100">
            {paliers.map((p) => (
              // Sur téléphone le libellé passe AU-DESSUS de la rangée : gardé dans une
              // colonne de gauche, il ne restait plus que ~90 px par chambre et un
              // palier de trois se cassait en deux lignes — le bâtiment ne se lisait
              // plus. Sur écran large il reprend sa place, le long de la cage d'escalier.
              <div key={p.ordre} className="flex flex-col sm:flex-row sm:items-stretch gap-1.5 sm:gap-5 py-2.5 first:pt-0 last:pb-0">
                <div className="sm:w-[84px] shrink-0 sm:pt-2.5 pl-1 sm:pl-0 sm:text-right">
                  <span className="block text-[11px] sm:text-[13px] font-semibold leading-tight" style={{ color: NAVY }}>{p.nom}</span>
                </div>
                <span aria-hidden className="hidden sm:block relative shrink-0 w-0">
                  <span className="absolute -left-[5px] top-[13px] w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ background: GOLD }} />
                </span>
                {/* Centré et étiré plutôt qu'une grille fixe : cinq paliers sur sept
                    n'ont que deux chambres, et une grille de trois colonnes laissait
                    une colonne vide à droite à chaque fois — le bâtiment paraissait
                    amputé. Là, chaque palier occupe sa ligne et la silhouette se lit. */}
                <div className="flex-1 flex flex-wrap justify-center gap-2.5">
                  {p.rooms.map((r) => (
                    <div key={r.id} className="flex-1 basis-0 min-w-[100px] max-w-[300px] flex">
                      <PlanRoomCard room={r} free={isFree(r)} planVisible={planVisible}
                        disabled={closed} couleur={couleurDe(r)} onClick={() => onPick(r)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// La saisie du mode 'plan' : un nom, un nombre de personnes, c'est tout. Pas d'email
// (elle n'a pas seize adresses), pas de code à quatre chiffres (elle n'a pas seize
// codes à retenir), pas de conditions à recocher (son contrat est déjà signé). Le
// serveur applique les mêmes allègements — cf. reserve/route.ts.
function PlanSheet({ code, groupe, room, onClose, onDone }: {
  code: string; groupe: GroupeMeta; room: Room;
  onClose: () => void; onDone: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [pax, setPax] = useState(Math.min(2, room.pax_max));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    if (!nom.trim()) return setErr(t.errName);
    setBusy(true);
    try {
      const res = await fetch(`/api/groupe/${code}/reserve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rooms: [{ groupe_chambre_id: room.id, config_lit: "double", nb_personnes: pax, pdj_nuits: [] }],
          nom: nom.trim(), prenom: prenom.trim(), email: "", tel: "",
          date_arrivee: groupe.date_arrivee, date_depart: groupe.date_depart,
          pin: "", cgv: true,
        }),
      });
      const data = await res.json();
      if (!data.ok) { setErr(data.error || "Erreur."); return; }
      onDone();
    } catch { setErr(t.errConnection); }
    finally { setBusy(false); }
  }

  return (
    <Sheet onClose={onClose} title={`${t.room} ${room.numero}`} subtitle={[room.etage, typeDe(room, lang)].filter(Boolean).join(" · ") || t.planWho}>
      <div className="px-5 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FInput label={t.firstName} value={prenom} onChange={setPrenom} placeholder="Léa" />
          <FInput label={t.lastName} value={nom} onChange={setNom} placeholder="Dupont" />
        </div>

        <div>
          <Label>{t.planPeople}</Label>
          <div className="flex gap-2">
            {Array.from({ length: room.pax_max }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => setPax(n)}
                className="h-11 flex-1 rounded-xl border text-sm font-semibold transition"
                style={{
                  borderColor: pax === n ? NAVY : "rgba(0,78,124,.16)",
                  background: pax === n ? NAVY : "#fff",
                  color: pax === n ? "#fff" : "#334155",
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button type="button" onClick={submit} disabled={busy}
          className="w-full h-12 rounded-full text-white font-semibold disabled:opacity-60"
          style={{ background: NAVY }}>
          {busy ? "…" : t.save}
        </button>
      </div>
    </Sheet>
  );
}

// ---------- Formulaire (multi-chambres) ----------
function BookingForm({ code, groupe, rooms, initRange, picks, onClose, onDone, onPay, onConflict }: {
  code: string; groupe: GroupeMeta; rooms: Room[];
  initRange?: { from: string; to: string } | null;
  // Mode 'pro' : les dates de CHAQUE chambre, posées au calendrier.
  picks?: Record<string, { from: string; to: string }>;
  onClose: () => void; onDone: (ref: string, pin: string) => void;
  onPay: (payments: { hotel_id: string; hotelNom: string; amount: number; url: string }[]) => void;
  onConflict: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [nom, setNom] = useState(""); const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState(""); const [tel, setTel] = useState("");
  const [emailAck, setEmailAck] = useState(false);
  const isPro = groupe.mode_vue === "pro";
  // L'email n'est exigé qu'en mode simple, ou si un règlement en ligne l'attend (Stripe l'envoie).
  const emailRequis = !isPro || groupe.mode_paiement === "immediat" || groupe.mode_paiement === "differe";
  const [da, setDa] = useState(initRange?.from || groupe.date_arrivee);
  const [dd, setDd] = useState(initRange?.to || groupe.date_depart);
  const [pin, setPin] = useState(""); const [pin2, setPin2] = useState("");
  const [cgv, setCgv] = useState(false);
  const [cfg, setCfg] = useState<Record<string, { lit: "double" | "twin"; pax: number }>>(
    Object.fromEntries(rooms.map(r => [r.id, { lit: "double", pax: 1 }]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Petit-déjeuner : les nuits COCHÉES, chambre par chambre. Rien de coché au
  // départ — une option payante pré-cochée n'a rien à faire dans un tunnel de
  // réservation, et c'est aussi ce qu'impose le droit de la consommation.
  const [pdjNuits, setPdjNuits] = useState<Record<string, string[]>>({});

  function setRoomCfg(id: string, patch: Partial<{ lit: "double" | "twin"; pax: number }>) {
    setCfg(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  // Les nuits d'une chambre : celles du calendrier en 'pro', celles du couple
  // Arrivée/Départ du formulaire en 'simple'.
  function nuitsDe(r: Room): string[] {
    const p = picks?.[r.id];
    return p ? nightsBetween(p.from, p.to) : nightsBetween(da, dd);
  }

  // Nuits réellement facturables : l'intersection avec le séjour du moment. En
  // 'simple' l'invité peut reculer ses dates APRÈS avoir coché — sans ce filtre on
  // facturerait un petit-déjeuner une nuit qu'il ne passe plus à l'hôtel.
  function pdjDe(r: Room): string[] {
    if (r.pdjPrix == null) return [];
    const dispo = new Set(nuitsDe(r));
    return (pdjNuits[r.id] || []).filter(n => dispo.has(n));
  }

  function togglePdj(r: Room, nuit: string) {
    setPdjNuits(prev => {
      const cur = prev[r.id] || [];
      return { ...prev, [r.id]: cur.includes(nuit) ? cur.filter(n => n !== nuit) : [...cur, nuit] };
    });
  }

  function togglePdjTout(r: Room) {
    const toutes = nuitsDe(r);
    setPdjNuits(prev => ({ ...prev, [r.id]: (prev[r.id] || []).length >= toutes.length ? [] : toutes }));
  }

  const nights = Math.max(1, Math.round((new Date(dd + "T00:00:00").getTime() - new Date(da + "T00:00:00").getTime()) / 86400000));
  // En 'pro', chaque chambre a SA durée → le total se calcule chambre par chambre.
  const nightsOf = (r: Room) => {
    const p = picks?.[r.id];
    return p ? Math.max(1, Math.round((new Date(p.to).getTime() - new Date(p.from).getTime()) / 86400000)) : nights;
  };
  const totalHebergement = rooms.reduce((s, r) => s + r.tarif * nightsOf(r), 0);
  // Réglages staff (migration 84). Le montant tombe en repli sur l'ancien helper codé en
  // dur (1,86 Voiles / 2,83 Corniche) tant qu'un groupe n'a pas son propre montant saisi.
  const affF = groupe.affichage_tarifs || "complet";
  const voitPrixF = affF === "complet";
  const tsMode = groupe.taxe_sejour_mode || "ajoutee";
  // Montant indicatif pour la PHRASE d'explication (une seule ligne de texte) : on
  // prend celui de la première chambre. Les CALCULS, eux, sont par chambre.
  const tsMontant = taxeDeChambre(rooms[0], groupe.taxe_sejour_montant);
  const totalPax = rooms.reduce((s, r) => s + (cfg[r.id]?.pax ?? 1), 0);
  const totalTaxe = tsMode === "ajoutee"
    ? rooms.reduce((s, r) => s + taxeDeChambre(r, groupe.taxe_sejour_montant) * nightsOf(r) * (cfg[r.id]?.pax ?? 1), 0)
    : 0;
  // Petit-déjeuner : prix × personnes × nuits COCHÉES (pas la durée du séjour).
  const totalPdj = rooms.reduce((s, r) => s + (r.pdjPrix ?? 0) * pdjDe(r).length * (cfg[r.id]?.pax ?? 1), 0);

  async function submit() {
    setErr(null);
    // Mode 'pro' : le NOM suffit (Martin 2026-07-16). On ne fait pas remplir une fiche client
    // individuelle à 18 comédiens dont la production gère déjà tout. Email/tél/code facultatifs
    // — mais s'ils sont renseignés, ils restent validés.
    // Un paiement en ligne redemande l'email : Stripe le lui envoie.
    if (!nom.trim()) return setErr(t.errName);
    if (emailRequis && !email.trim()) return setErr(t.errNameEmail);
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr(t.errEmail);
    if (email.trim() && [...email].some(c => c.charCodeAt(0) > 127) && !emailAck) { setEmailAck(true); return setErr(t.errEmailAccent); }
    if (!isPro && !/^\d{4}$/.test(pin)) return setErr(t.errPin4);
    if (pin && !/^\d{4}$/.test(pin)) return setErr(t.errPinDigits);
    if (pin && pin !== pin2) return setErr(t.errPinMatch);
    if (!cgv) return setErr(t.errTerms);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/groupe/${code}/reserve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rooms: rooms.map(r => ({
            groupe_chambre_id: r.id, config_lit: cfg[r.id]?.lit, nb_personnes: cfg[r.id]?.pax,
            // 'pro' : dates propres à la chambre · 'simple' : le serveur retombe sur da/dd.
            date_arrivee: picks?.[r.id]?.from, date_depart: picks?.[r.id]?.to,
            // Nuits avec petit-déjeuner. Le serveur revalide le tarif et les nuits :
            // ce que le navigateur envoie ne fait jamais foi sur un montant.
            pdj_nuits: pdjDe(r),
          })),
          nom: nom.trim(), prenom: prenom.trim(), email: email.trim(), tel: tel.trim(),
          date_arrivee: da, date_depart: dd, pin, cgv,
        }),
      });
      const data = await res.json();
      if (!data.ok) { if (res.status === 409) { setErr(data.error); setTimeout(onConflict, 1600); return; } setErr(data.error || "Erreur."); return; }
      if (data.requirePayment && Array.isArray(data.payments) && data.payments.length) onPay(data.payments);
      else onDone(data.ref, pin);
    } catch { setErr(t.errConnection); }
    finally { setSubmitting(false); }
  }

  return (
    <Sheet onClose={onClose} title={`${rooms.length} chambre${rooms.length > 1 ? "s" : ""}`} subtitle="Réserver">
      <div className="px-5 py-5 space-y-4">
        {/* Récap type de chambre + prix */}
        <div className="rounded-xl border p-3.5 space-y-2" style={{ borderColor: "rgba(0,78,124,.14)", background: "rgba(0,78,124,.03)" }}>
          {rooms.map(r => (
            <div key={r.id} className="flex items-baseline justify-between gap-3">
              <span className="font-serif font-semibold text-base leading-tight truncate" style={{ color: NAVY }}>
                {typeDe(r, lang) || t.room}
                <span className="ml-1.5 text-xs font-normal text-slate-400">n° {r.numero}</span>
              </span>
              {voitPrixF && (
                <span className="text-sm font-semibold whitespace-nowrap shrink-0" style={{ color: GOLD_INK }}>
                  {euro(r.tarif)}<span className="text-[11px] text-slate-400 font-normal"> {t.perNight}</span>
                </span>
              )}
            </div>
          ))}
          {/* Prix masqués quand la réception l'a décidé (groupe pris en charge : personne ne
              règle, afficher un total n'a aucun sens). */}
          {voitPrixF && (
          <div className="flex items-baseline justify-between gap-3 pt-2 border-t" style={{ borderColor: "rgba(0,78,124,.1)" }}>
            <span className="text-sm font-semibold" style={{ color: NAVY }}>
              {tsMode === "ajoutee" ? t.totalStay : t.totalAccommodation}
              <span className="ml-1.5 text-[11px] font-normal text-slate-400">{nights} {nights > 1 ? t.nights : t.night}{rooms.length > 1 ? ` · ${rooms.length} ${t.rooms}` : ""}</span>
              {/* Le petit-déjeuner entre dans le total, donc il se dit dans le total :
                  un supplément qui n'apparaît qu'au moment de payer est une mauvaise
                  surprise. */}
              {totalPdj > 0 && (
                <span className="block text-[11px] font-normal text-slate-400 mt-0.5">{t.ofWhichBreakfast} {euro2(totalPdj)}</span>
              )}
            </span>
            <span className="text-base font-semibold whitespace-nowrap shrink-0" style={{ color: GOLD_INK }}>{euro(totalHebergement + totalTaxe + totalPdj)}</span>
          </div>
          )}
          {voitPrixF && (
          <div className="text-[11px] text-slate-500 leading-relaxed">
            <span className="font-medium text-slate-600">{t.taxeSejour}</span>{" "}
            {tsMode === "incluse"
              ? <>{t.taxeIncluded}</>
              : <>{t.taxeAdded} {euro2(tsMontant)}</>}
          </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FInput label={t.firstName} value={prenom} onChange={setPrenom} placeholder="Léa" />
          <FInput label={t.lastName} value={nom} onChange={setNom} placeholder="Dupont" />
        </div>
        <FInput label={emailRequis ? t.email : t.emailOptional} value={email} onChange={(v) => { setEmail(v); setEmailAck(false); }} placeholder="lea@exemple.fr" type="email" />
        <FInput label={t.phone} value={tel} onChange={setTel} placeholder="06 12 34 56 78" type="tel" />
        {!isPro && (
          <div className="grid grid-cols-2 gap-3">
            <FDate label={t.arrival} value={da} min={groupe.date_arrivee} max={groupe.date_depart} onChange={setDa} />
            <FDate label={t.departure} value={dd} min={groupe.date_arrivee} max={groupe.date_depart} onChange={setDd} />
          </div>
        )}

        {/* Détail par chambre */}
        <div className="space-y-2">
          <Label>{t.yourRooms}</Label>
          {rooms.map(r => (
            <div key={r.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-800">
                  {r.numero}{typeDe(r, lang) ? <span className="text-xs text-slate-400 font-normal"> · {typeDe(r, lang)}</span> : null}
                  {/* En 'pro' chaque chambre a SES nuits → on les montre ici, il n'y a plus de
                      couple Arrivée/Départ global qui vaudrait pour tout le monde. */}
                  {picks?.[r.id] && (
                    <span className="block text-[11px] font-normal mt-0.5" style={{ color: NAVY }}>
                      {fmt(picks[r.id].from, lang)} → {fmt(picks[r.id].to, lang)}
                      <span className="text-slate-400"> · {nightsOf(r)} nuit{nightsOf(r) > 1 ? "s" : ""}</span>
                    </span>
                  )}
                </span>
                {/* Le pas « − 1 + » n'avait AUCUN libellé (Martin : « c'est quoi le +1 ? »). */}
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400">{t.persons}</span>
                  <Stepper value={cfg[r.id]?.pax ?? 1} min={1} max={r.pax_max} onChange={(v) => setRoomCfg(r.id, { pax: v })} />
                </span>
              </div>
              {r.twinable && (
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  {(["double", "twin"] as const).map(opt => (
                    <button key={opt} type="button" onClick={() => setRoomCfg(r.id, { lit: opt })} className="h-9 rounded-lg border text-xs font-medium"
                      style={cfg[r.id]?.lit === opt ? { borderColor: NAVY, background: "rgba(0,78,124,.06)", color: NAVY } : { borderColor: "#e2e8f0", color: "#64748b" }}>
                      {opt === "double" ? t.oneBed : t.twoBeds}
                    </button>
                  ))}
                </div>
              )}
              {/* Petit-déjeuner : une case par NUIT, parce qu'on ne le prend pas
                  forcément tous les matins. La nuit du 25 vaut le petit-déjeuner du
                  matin du 26 — d'où le libellé en date de service. */}
              {r.pdjPrix != null && nuitsDe(r).length > 0 && (
                <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium text-slate-600">
                      {t.breakfast}
                      {voitPrixF && (r.pdjPrix > 0
                        ? <span className="text-slate-400 font-normal"> · {euro2(r.pdjPrix)} {t.perPerson}</span>
                        : <span className="text-slate-400 font-normal"> · {t.breakfastFree}</span>)}
                    </span>
                    <button type="button" onClick={() => togglePdjTout(r)} className="text-[11px] font-semibold shrink-0" style={{ color: NAVY }}>
                      {pdjDe(r).length >= nuitsDe(r).length ? t.removeAll : t.allMornings}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {nuitsDe(r).map(n => {
                      const on = pdjDe(r).includes(n);
                      return (
                        <button key={n} type="button" onClick={() => togglePdj(r, n)}
                          className="h-8 px-2.5 rounded-lg border text-[11px] font-medium transition"
                          style={on ? { borderColor: NAVY, background: "rgba(0,78,124,.08)", color: NAVY } : { borderColor: "#e2e8f0", color: "#94a3b8", background: "#fff" }}>
                          {ddmm(nextDay(n))}
                        </button>
                      );
                    })}
                  </div>
                  {pdjDe(r).length > 0 && voitPrixF && r.pdjPrix > 0 && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      {pdjDe(r).length} {pdjDe(r).length > 1 ? t.mornings : t.morning} × {cfg[r.id]?.pax ?? 1} · ={" "}
                      <span className="font-semibold text-slate-600">{euro2(r.pdjPrix * pdjDe(r).length * (cfg[r.id]?.pax ?? 1))}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>{isPro ? t.pinOptional : t.pinCreate}</Label><PinInput value={pin} onChange={setPin} /></div>
          <div><Label>{t.pinConfirm}</Label><PinInput value={pin2} onChange={setPin2} /></div>
        </div>
        <p className="text-[11px] text-slate-400 -mt-2">{isPro ? t.pinHintOptional : t.pinHintRequired}</p>

        {groupe.conditions_annulation && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 leading-relaxed">
            <span className="font-medium text-slate-600">{t.cancellationTerms} </span>{groupe.conditions_annulation}
          </div>
        )}
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={cgv} onChange={e => setCgv(e.target.checked)} className="w-5 h-5 mt-0.5" style={{ accentColor: NAVY }} />
          <span className="text-sm text-slate-600">{t.acceptTerms}</span>
        </label>

        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button onClick={submit} disabled={submitting} className="w-full h-12 rounded-full text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: NAVY }}>
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t.validate} <Check className="w-4 h-4" /></>}
        </button>
      </div>
    </Sheet>
  );
}

// ---------- Réclamer une chambre déjà réservée (depuis l'accueil) ----------
function ClaimModal({ code, room, onClose, onAccess }: { code: string; room: Room; onClose: () => void; onAccess: (ref: string) => void }) {
  const t = useT();
  const [pin, setPin] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function go() {
    if (!/^\d{4}$/.test(pin)) return setErr(t.enterPin);
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/groupe/${code}/access`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupe_chambre_id: room.id, pin }) });
      const d = await res.json();
      if (!d.ok) { setErr(d.error); return; }
      try { sessionStorage.setItem(`pin_${d.ref}`, pin); } catch {}
      onAccess(d.ref);
    } catch { setErr(t.errConnection); } finally { setBusy(false); }
  }
  return (
    <Sheet onClose={onClose} title={room.numero} subtitle="Gérer ma réservation">
      <div className="px-5 py-5 space-y-4">
        <p className="text-sm text-slate-600">{t.roomTakenEnterPin}</p>
        <PinInput value={pin} onChange={setPin} />
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button onClick={go} disabled={busy} className="w-full h-12 rounded-full text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: NAVY }}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound className="w-4 h-4" /> {t.access}</>}
        </button>
      </div>
    </Sheet>
  );
}

// ---------- Confirmation ----------
// Paiement obligatoire : écran « finalisez votre paiement » (1 bouton par hôtel).
function PaymentScreen({ payments, groupe }: { payments: { hotel_id: string; hotelNom: string; amount: number; url: string }[]; groupe: GroupeMeta }) {
  const t = useT();
  // Utilise le euro() global : ne pas redeclarer ici, cf. avertissement en haut du fichier.
  const multi = payments.length > 1;
  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-lg max-w-md w-full p-7 text-center">
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(0,78,124,.08)", color: NAVY }}><Check className="w-7 h-7" /></div>
        <h1 className="font-serif font-semibold text-2xl text-slate-800 mt-4">{t.payTitle}</h1>
        <p className="text-slate-500 text-sm mt-2">Votre réservation pour « {groupe.nom} » est en attente de paiement. Réglez pour la confirmer.</p>
        {multi && <p className="text-[11px] text-slate-400 mt-1">{t.payTwoHotels}</p>}
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
        <p className="text-[11px] text-slate-400 mt-4">{t.payStripeNote}</p>
      </motion.div>
    </main>
  );
}

function Confirmation({ code, refId, pin, groupe }: { code: string; refId: string; pin: string; groupe: GroupeMeta }) {
  const t = useT();
  const [link, setLink] = useState(""); const [copied, setCopied] = useState(false);
  useEffect(() => {
    setLink(`${window.location.origin}/groupe/${code}?r=${refId}`);
    try { sessionStorage.setItem(`pin_${refId}`, pin); } catch {}
  }, [code, refId, pin]);
  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-lg max-w-md w-full p-7 text-center">
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(0,78,124,.08)", color: NAVY }}><Check className="w-7 h-7" /></div>
        <h1 className="font-serif font-semibold text-2xl text-slate-800 mt-4">{t.roomTaken}</h1>
        <p className="text-slate-500 text-sm mt-2">Votre réservation pour « {groupe.nom} » est confirmée.</p>
        <div className="mt-5 rounded-2xl p-4" style={{ background: "rgba(0,78,124,.06)", border: "1px solid rgba(0,78,124,.15)" }}>
          <p className="text-xs text-slate-500">{t.yourPin}</p>
          <p className="font-serif font-bold text-3xl tracking-[0.3em] mt-1" style={{ color: NAVY }}>{pin}</p>
          <p className="text-[11px] text-slate-500 mt-1.5">{t.keepPin}</p>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">
          <p className="text-xs text-slate-500 mb-2">{t.yourLink}</p>
          <div className="flex items-center gap-2">
            <input readOnly value={link} className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 h-9 text-slate-600" />
            <button onClick={() => navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })} className="h-9 px-3 rounded-lg text-white text-xs font-medium" style={{ background: NAVY }}>{copied ? "Copié" : "Copier"}</button>
          </div>
        </div>
        <a href={link} className="inline-block mt-4 text-sm font-medium" style={{ color: NAVY }}>{t.manageLink}</a>
      </motion.div>
    </main>
  );
}

// ============================================================================
// Gestion (lien perso = booking_ref)
// ============================================================================
function ManageView({ token }: { token: string }) {
  const t = useT();
  const lang = useLang();
  // Retour de Stripe : success_url ajoute &paye=1. Ce parametre ne PROUVE rien
  // (n'importe qui peut l'ecrire), il sert juste a expliquer l'attente pendant que
  // le webhook bascule le statut. La verite reste ce que renvoie l'API.
  const justPaid = useSearchParams().get("paye") === "1";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resas, setResas] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [groupe, setGroupe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeKnown, setCodeKnown] = useState(false);
  // La résa a-t-elle un code ? Facultatif en mode 'pro' → on ne réclame pas un code que
  // l'invité n'a jamais créé (Martin 2026-07-16). Sans code, le lien magique fait foi.
  const [hasPin, setHasPin] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [da, setDa] = useState(""); const [dd, setDd] = useState(""); const [lit, setLit] = useState<"double" | "twin">("double");
  const [pax, setPax] = useState(1);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; numero?: string } | null>(null);
  const [pending, setPending] = useState<{ hotel_id: string; hotelNom: string; amount: number; url: string }[]>([]);
  const [canPay, setCanPay] = useState(false);
  const [payLinks, setPayLinks] = useState<{ hotelNom: string; amount: number; url: string }[] | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const fermerAnnulation = useCallback(() => { if (!busy) setCancelTarget(null); }, [busy]);
  const refAnnulation = useModale<HTMLDivElement>(cancelTarget !== null, fermerAnnulation);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/resa/${token}`);
      const d = await res.json();
      if (!d.ok) { setError(d.error || "Réservation introuvable"); return; }
      setResas(d.resas); setGroupe(d.groupe); setPending(d.pendingPayments || []); setCanPay(!!d.canPayOnline);
      setHasPin(d.hasPin !== false);   // repli : on garde l’ancien comportement si l’API est plus vieille
    } catch { setError("Connexion impossible."); } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  // Le webhook Stripe met quelques secondes a confirmer. Sans ces relances, le client
  // qui vient de payer voit « en attente de paiement » et croit avoir paye dans le vide.
  useEffect(() => {
    if (!justPaid) return;
    const timers = [2000, 5000, 9000].map((ms) => setTimeout(() => { load(); }, ms));
    return () => timers.forEach(clearTimeout);
  }, [justPaid, load]);
  useEffect(() => {
    try { const saved = sessionStorage.getItem(`pin_${token}`); if (saved && /^\d{4}$/.test(saved)) { setCode(saved); setCodeKnown(true); } } catch {}
  }, [token]);

  if (loading) return <FullLoader />;
  if (error || !groupe) return <Centered title="Lien invalide" text={error || t.noResa} />;

  // Le code n'est exigé que si la résa en a un (facultatif en mode 'pro'). Sans ce
  // garde-fou, la page bloquait AVANT même d'appeler l'API — le champ était masqué mais
  // « Enregistrer » réclamait quand même un code introuvable.
  function ensureCode() {
    if (!hasPin) return true;
    if (!/^\d{4}$/.test(code)) { setMsg("Entrez votre code à 4 chiffres."); return false; }
    return true;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function startEdit(r: any) { setEditingId(r.id); setDa(r.date_arrivee); setDd(r.date_depart); setLit(r.config_lit === "twin" ? "twin" : "double"); setPax(r.nb_personnes || 1); setMsg(null); }

  async function save(id: string) {
    if (!ensureCode()) return; setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/resa/${token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", resa_id: id, code, date_arrivee: da, date_depart: dd, config_lit: lit, nb_personnes: pax }) });
      const d = await res.json(); if (!d.ok) { setMsg(d.error); if (typeof d.error === "string" && d.error.includes("Code")) { setCodeKnown(false); try { sessionStorage.removeItem(`pin_${token}`); } catch {} } return; }
      setEditingId(null); await load(); setMsg(t.modified);
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
        <p className="uppercase tracking-[0.18em] text-[11px] text-center mb-1" style={{ color: GOLD_INK }}>{groupe.nom}</p>
        <h1 className="font-serif font-semibold text-2xl text-slate-800 text-center mb-5">{t.myResa}</h1>

        {!groupe.locked && hasPin && !codeKnown && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <CodeField value={code} onChange={setCode} />
            <p className="text-[11px] text-slate-400 mt-1.5">{t.pinAsked}</p>
          </div>
        )}
        {groupe.locked && <Banner>{t.deadlinePassed}</Banner>}

        {justPaid && pending.length === 0 && (
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 mb-4">
            <p className="font-serif font-semibold text-emerald-800">{t.payThanks}</p>
            <p className="text-xs text-emerald-700/80 mt-1">{t.payThanksNote}</p>
          </div>
        )}

        {pending.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border-2" style={{ borderColor: NAVY }}>
            <p className="font-serif font-semibold text-slate-800">{t.payTitle}</p>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">Vos chambres sont tenues 30 minutes.{pending.length > 1 ? " Un paiement par établissement." : ""}</p>
            <div className="space-y-2">
              {pending.map((p) => (
                <div key={p.hotel_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    {pending.length > 1 && <div className="text-[11px] text-slate-400 truncate">{p.hotelNom}</div>}
                    <div className="text-xl font-bold leading-none" style={{ color: NAVY }}>{euro(p.amount)}</div>
                  </div>
                  <a href={p.url} className="h-10 px-5 rounded-full font-semibold flex items-center shrink-0" style={{ background: NAVY, color: "#fff" }}>{t.pay}</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {canPay && pending.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border" style={{ borderColor: GOLD }}>
            {!payLinks ? (
              <>
                <p className="font-serif font-semibold text-slate-800">{t.payOnline}</p>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">{t.payOnlineNote}</p>
                <button onClick={startPay} disabled={payBusy} className="w-full h-11 rounded-full font-semibold text-white disabled:opacity-60" style={{ background: NAVY }}>
                  {payBusy ? "…" : "Payer en ligne"}
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <p className="font-serif font-semibold text-slate-800 mb-1">{t.payTitle}</p>
                {payLinks.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                      {payLinks.length > 1 && <div className="text-[11px] text-slate-400 truncate">{p.hotelNom}</div>}
                      <div className="text-xl font-bold leading-none" style={{ color: NAVY }}>{euro(p.amount)}</div>
                    </div>
                    <a href={p.url} className="h-10 px-5 rounded-full font-semibold flex items-center shrink-0" style={{ background: NAVY, color: "#fff" }}>{t.pay}</a>
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
                    {typeDe(r, lang) && <span className="text-xs text-slate-400"> · {typeDe(r, lang)}</span>}
                  </div>
                  {annulee
                    ? <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600 border border-rose-200">{t.statusCanceled}</span>
                    : r.statut === "en_attente_paiement"
                      ? <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">{t.statusPending}</span>
                      : <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{t.statusConfirmed}</span>}
                </div>
                {!annulee && (
                  <div className="px-5 py-4 space-y-3">
                    {!editing ? (
                      <>
                        <Row icon={<Calendar className="w-4 h-4" />} label={t.stay} value={`${fmt(r.date_arrivee, lang)} → ${fmt(r.date_depart, lang)}`} />
                        {r.twinable && <Row icon={<BedDouble className="w-4 h-4" />} label={t.beds} value={r.config_lit === "twin" ? "2 lits" : "1 grand lit"} />}
                        <Row icon={<Users className="w-4 h-4" />} label="Personnes" value={String(r.nb_personnes)} />
                        {r.statut === "en_attente_paiement" && (
                          <p className="text-[11px] text-amber-600 pt-1">{t.payToConfirm}</p>
                        )}
                        {!groupe.locked && estGerable(r.statut) && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => startEdit(r)} className="flex-1 h-10 rounded-full text-white font-medium text-sm inline-flex items-center justify-center gap-1.5" style={{ background: NAVY }}><Pencil className="w-4 h-4" /> {t.edit}</button>
                            <button onClick={() => { if (ensureCode()) setCancelTarget({ id: r.id, numero: r.numero }); }} disabled={busy} className="h-10 px-4 rounded-full border border-rose-200 text-rose-600 font-medium text-sm inline-flex items-center justify-center gap-1.5"><Trash2 className="w-4 h-4" /> {t.cancel}</button>
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
                            <Label>{t.beds}</Label>
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
                          <button onClick={() => setEditingId(null)} className="h-10 px-4 rounded-full border border-slate-200 text-slate-600 font-medium text-sm">{t.back}</button>
                          <button onClick={() => save(r.id)} disabled={busy} className="flex-1 h-10 rounded-full text-white font-medium text-sm inline-flex items-center justify-center gap-1.5" style={{ background: NAVY }}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> {t.save}</>}</button>
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
          <motion.div ref={refAnnulation} role="dialog" aria-modal="true" aria-label={t.cancelRoom} tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-rose-50 text-rose-600"><Trash2 className="w-6 h-6" /></div>
            <h2 className="font-serif font-semibold text-xl text-slate-800 mt-3">{t.cancelRoom}</h2>
            <p className="text-sm text-slate-500 mt-1.5">{t.room} <b>{cancelTarget.numero}</b> {t.cancelDefinitive}</p>
            {groupe.conditions_annulation && (
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{groupe.conditions_annulation}</p>
            )}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setCancelTarget(null)} disabled={busy} className="flex-1 h-11 rounded-full border border-slate-200 text-slate-600 font-medium text-sm">{t.back}</button>
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
  const t = useT();
  // La feuille n'est montée que lorsqu'elle est ouverte : Échap la ferme, le
  // focus y reste, et la page derrière ne défile plus sous les doigts.
  const ref = useModale<HTMLDivElement>(true, onClose);
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={`${subtitle} — ${title}`} tabIndex={-1}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 360, damping: 34 }}
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 py-4 flex items-center justify-between border-b border-slate-100 z-10">
          <div><p className="text-[11px] uppercase tracking-widest text-slate-400">{subtitle}</p><h2 className="font-serif font-semibold text-xl text-slate-800">{title}</h2></div>
          <button onClick={onClose} aria-label={t.close} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
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
        <span className="uppercase tracking-[0.22em] text-[12px]" style={{ color: GOLD_INK }}>{stars ? "★".repeat(stars) : "Hôtel"}</span>
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
  const t = useT();
  return <label className="block"><Label>{t.yourPinLabel}</Label><PinInput value={value} onChange={onChange} /></label>;
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

