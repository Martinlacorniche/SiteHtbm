"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  chercherDisponibilite, chargerCategories, t,
  type Disponibilite, type Langue, type Offre,
} from "@/lib/mewsBooking";

/* ─────────────────────────────────────────────────────────────────────────────
 * Écran 1 du tunnel : quand, et combien de personnes.
 *
 * Deux partis pris, tous deux fondés sur ce qu'on a mesuré :
 *
 *  1. « Vous voyagez… » remplace le compteur bloqué sur 2. Un compteur par
 *     défaut à 2 masque les chambres individuelles à ceux qui voyagent seuls —
 *     c'est ce qui les fait si peu vendre aujourd'hui. Ici, la question est
 *     posée, et « seul » est aussi visible que « à deux ».
 *
 *  2. Le prix affiché est le prix complet, taxe de séjour annoncée à côté. Les
 *     frais découverts à la fin sont la première cause d'abandon.
 * ────────────────────────────────────────────────────────────────────────── */

type Voyage = "seul" | "deux" | "famille";

const TEXTES = {
  fr: {
    titre: "Réserver aux Voiles",
    chapo: "Petit-déjeuner toujours inclus. Prix tout compris, sans surprise à l'arrivée.",
    arrivee: "Arrivée", depart: "Départ",
    voyageLabel: "Vous voyagez",
    seul: "Seul", deux: "À deux", famille: "En famille",
    familleAide: "Nous n'ajoutons ni lit bébé ni lit supplémentaire : chaque chambre accueille au plus deux personnes.",
    chercher: "Voir les chambres", recherche: "Recherche…",
    choisir: "Dites-nous qui voyage",
    nuits: (n: number) => `${n} nuit${n > 1 ? "s" : ""}`,
    restantes: (n: number) => (n === 1 ? "Dernière chambre" : `${n} chambres disponibles`),
    pour1: "Pour une personne",
    aucune: "Aucune chambre disponible sur ces dates.",
    aucuneAide: "Essayez des dates voisines, ou appelez-nous au 04 94 41 36 23 — il reste parfois de la place.",
    taxe: "taxe de séjour à régler sur place",
    parNuit: "la nuit",
    seulAussi: "Vous voyagez seul ?",
    seulAussiAction: "Voir le prix pour une personne",
    erreur: "La recherche n'a pas abouti.",
    erreurAide: "Réessayez dans un instant, ou appelez-nous au 04 94 41 36 23.",
    checkin: "Arrivée à partir de 15 h · départ jusqu'à 11 h · arrivée autonome possible à toute heure",
  },
  en: {
    titre: "Book at Les Voiles",
    chapo: "Breakfast always included. All-inclusive prices, no surprises on arrival.",
    arrivee: "Check-in", depart: "Check-out",
    voyageLabel: "You are travelling",
    seul: "Alone", deux: "As a couple", famille: "As a family",
    familleAide: "We do not add cots or extra beds: each room sleeps two at most.",
    chercher: "See the rooms", recherche: "Searching…",
    choisir: "Tell us who is travelling",
    nuits: (n: number) => `${n} night${n > 1 ? "s" : ""}`,
    restantes: (n: number) => (n === 1 ? "Last room" : `${n} rooms available`),
    pour1: "For one person",
    aucune: "No rooms available on these dates.",
    aucuneAide: "Try nearby dates, or call us on +33 4 94 41 36 23 — we sometimes have space left.",
    taxe: "city tax payable at the hotel",
    parNuit: "per night",
    seulAussi: "Travelling alone?",
    seulAussiAction: "See the price for one person",
    erreur: "The search did not go through.",
    erreurAide: "Try again in a moment, or call us on +33 4 94 41 36 23.",
    checkin: "Check-in from 3 pm · check-out until 11 am · self check-in available at any hour",
  },
} as const;

const jour = (decalage: number) => {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  return d.toISOString().slice(0, 10);
};

const nuitsEntre = (a: string, b: string) =>
  Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000));

// Taxe de séjour Toulon, 3 étoiles : 1,80 € par adulte et par nuit, taxes
// additionnelles comprises. Affichée à part parce qu'elle se règle sur place,
// jamais découverte à la fin.
const TAXE_PAR_ADULTE_NUIT = 1.8;

export default function ReserverClient({ langue }: { langue: Langue }) {
  const T = TEXTES[langue];

  const [arrivee, setArrivee] = useState(jour(1));
  const [depart, setDepart] = useState(jour(3));
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [dispo, setDispo] = useState<Disponibilite | null>(null);
  const [noms, setNoms] = useState<Map<string, string>>(new Map());
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);
  const dejaLance = useRef(false);

  const nuits = nuitsEntre(arrivee, depart);
  const adultes = voyage === "seul" ? 1 : 2;

  // Le cœur de la recherche prend ses dates en argument : au montage, l'état
  // React n'est pas encore à jour quand on relit l'URL.
  const lancer = useCallback(async (
    { arrivee: a, depart: d, adultes: pax }: { arrivee: string; depart: string; adultes: number },
  ) => {
    setChargement(true);
    setErreur(false);
    try {
      const [dispos, categories] = await Promise.all([
        chercherDisponibilite({ arrivee: a, depart: d, adultes: pax, langue }),
        chargerCategories(langue),
      ]);
      setDispo(dispos);
      setNoms(categories);
      const url = new URL(window.location.href);
      url.searchParams.set("arrivee", a);
      url.searchParams.set("depart", d);
      url.searchParams.set("voyage", pax === 1 ? "seul" : (voyage ?? "deux"));
      window.history.replaceState(null, "", url);
    } catch {
      setErreur(true);
      setDispo(null);
    } finally {
      setChargement(false);
    }
  }, [langue, voyage]);

  const chercher = useCallback(
    (pax: number) => lancer({ arrivee, depart, adultes: pax }),
    [lancer, arrivee, depart],
  );

  // Une recherche est partageable : /reserver?arrivee=…&depart=…&voyage=deux
  // renvoie exactement le même écran. Sert aux liens de la page d'accueil, au
  // partage entre deux personnes qui décident ensemble, et au retour arrière du
  // navigateur — trois moments où un tunnel classique perd le client.
  useEffect(() => {
    if (dejaLance.current) return;
    const p = new URLSearchParams(window.location.search);
    const a = p.get("arrivee"), d = p.get("depart"), v = p.get("voyage") as Voyage | null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(d ?? "")) return;
    if (v !== "seul" && v !== "deux" && v !== "famille") return;
    dejaLance.current = true;
    setArrivee(a!); setDepart(d!); setVoyage(v);
    void lancer({ arrivee: a!, depart: d!, adultes: v === "seul" ? 1 : 2 });
    // Volontairement au montage seul : ensuite, c'est l'utilisateur qui pilote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Une offre par catégorie : celle qui correspond à la demande. Les autres —
  // typiquement l'individuelle sur une recherche à deux — sont proposées à part.
  const { principales, pourUnePersonne } = useMemo(() => {
    const p: Offre[] = [];
    const seule: Offre[] = [];
    for (const o of dispo?.offres ?? []) {
      (o.pourPersonnes >= adultes ? p : seule).push(o);
    }
    return { principales: p, pourUnePersonne: adultes > 1 ? seule : [] };
  }, [dispo, adultes]);

  const tarifs = dispo?.tarifs ?? [];
  const taxeTotale = (pax: number) => (TAXE_PAR_ADULTE_NUIT * pax * nuits).toFixed(2).replace(".", ",");

  return (
    <main className="min-h-screen bg-[#f9f5ef] text-[#222]">
      <div className="mx-auto max-w-3xl px-5 py-12 md:py-20">

        <Link href="/" className="text-[13px] tracking-wide text-[#004e7c] hover:underline">
          ← Hôtels Toulon Bord de Mer
        </Link>

        <h1 className="mt-6 font-serif text-4xl leading-tight md:text-5xl text-[#004e7c]">
          {T.titre}
        </h1>
        <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-[#4a5a63]">{T.chapo}</p>

        {/* ── Écran 1 : les dates, puis qui voyage ─────────────────────── */}
        <section className="mt-10 rounded-2xl bg-white p-6 shadow-[0_2px_20px_rgba(0,78,124,0.07)] md:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
                {T.arrivee}
              </span>
              <input
                type="date" value={arrivee} min={jour(0)}
                onChange={(e) => {
                  setArrivee(e.target.value);
                  if (Date.parse(e.target.value) >= Date.parse(depart)) {
                    const d = new Date(e.target.value);
                    d.setDate(d.getDate() + 1);
                    setDepart(d.toISOString().slice(0, 10));
                  }
                }}
                className="w-full rounded-xl border border-[#e3e0d9] bg-white px-4 py-3.5 text-[16px] outline-none focus:border-[#C6A972] focus:ring-2 focus:ring-[#C6A972]/30"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
                {T.depart}
              </span>
              <input
                type="date" value={depart} min={arrivee}
                onChange={(e) => setDepart(e.target.value)}
                className="w-full rounded-xl border border-[#e3e0d9] bg-white px-4 py-3.5 text-[16px] outline-none focus:border-[#C6A972] focus:ring-2 focus:ring-[#C6A972]/30"
              />
            </label>
          </div>

          <fieldset className="mt-7">
            <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
              {T.voyageLabel}
            </legend>
            <div className="grid grid-cols-3 gap-2.5">
              {(["seul", "deux", "famille"] as const).map((v) => (
                <button
                  key={v} type="button" onClick={() => setVoyage(v)}
                  aria-pressed={voyage === v}
                  className={[
                    "rounded-xl border px-3 py-4 text-[15px] font-semibold transition-colors",
                    voyage === v
                      ? "border-[#004e7c] bg-[#004e7c] text-white"
                      : "border-[#e3e0d9] bg-white text-[#3c4a52] hover:border-[#C6A972]",
                  ].join(" ")}
                >
                  {T[v]}
                </button>
              ))}
            </div>
            {voyage === "famille" && (
              <p className="mt-3 text-[14px] leading-relaxed text-[#6b7a82]">{T.familleAide}</p>
            )}
          </fieldset>

          <button
            type="button"
            disabled={!voyage || nuits < 1 || chargement}
            onClick={() => chercher(adultes)}
            className="mt-7 w-full rounded-full bg-[#C6A972] px-8 py-4 text-[16px] font-bold text-white transition-colors hover:bg-[#b3955f] disabled:cursor-not-allowed disabled:bg-[#ddd8ce] disabled:text-[#9a9a95]"
          >
            {chargement ? T.recherche : voyage ? T.chercher : T.choisir}
            {voyage && nuits > 0 && !chargement && (
              <span className="font-normal opacity-80"> · {T.nuits(nuits)}</span>
            )}
          </button>

          <p className="mt-4 text-[13px] leading-relaxed text-[#8a9299]">{T.checkin}</p>
        </section>

        {/* ── Résultats ────────────────────────────────────────────────── */}
        {erreur && (
          <section className="mt-8 rounded-2xl border border-[#e0cfc0] bg-white p-6">
            <p className="font-semibold text-[#8a4b2a]">{T.erreur}</p>
            <p className="mt-1 text-[15px] text-[#6b7a82]">{T.erreurAide}</p>
          </section>
        )}

        {dispo && !erreur && (
          <section className="mt-10">
            {principales.length === 0 ? (
              <div className="rounded-2xl bg-white p-6">
                <p className="font-serif text-2xl text-[#004e7c]">{T.aucune}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#6b7a82]">{T.aucuneAide}</p>
              </div>
            ) : (
              <ul className="grid gap-4">
                {principales.map((o) => (
                  <li key={`${o.categorieId}-${o.pourPersonnes}`}
                      className="rounded-2xl bg-white p-6 shadow-[0_2px_20px_rgba(0,78,124,0.07)]">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h2 className="font-serif text-2xl text-[#004e7c]">
                        {noms.get(o.categorieId) || "—"}
                      </h2>
                      <span className={[
                        "text-[13px] font-semibold",
                        o.chambresRestantes === 1 ? "text-[#a8571f]" : "text-[#8a9299]",
                      ].join(" ")}>
                        {T.restantes(o.chambresRestantes)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {o.prix.map((p) => {
                        const tarif = tarifs.find((r) => r.Id === p.tarifId);
                        return (
                          <div key={p.tarifId}
                               className="flex flex-wrap items-start justify-between gap-4 border-t border-[#f0ece4] pt-4 first:border-0 first:pt-0">
                            <p className="max-w-sm text-[15px] leading-relaxed text-[#3c4a52]">
                              {t(tarif?.Description, langue) || t(tarif?.Name, langue)}
                            </p>
                            <p className="text-right">
                              <span className="block text-[22px] font-bold tabular-nums text-[#004e7c]">
                                {p.total.toFixed(2).replace(".", ",")} €
                              </span>
                              <span className="block text-[13px] text-[#8a9299]">
                                {p.parNuit.toFixed(2).replace(".", ",")} € {T.parNuit}
                              </span>
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <p className="mt-4 text-[13px] text-[#8a9299]">
                      + {taxeTotale(o.pourPersonnes)} € {T.taxe}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {/* La chambre individuelle, que les moteurs classiques masquent
                dès que la recherche porte sur deux personnes. */}
            {pourUnePersonne.length > 0 && (
              <div className="mt-5 rounded-2xl border border-dashed border-[#C6A972] bg-white/60 p-5">
                <p className="text-[15px] font-semibold text-[#004e7c]">{T.seulAussi}</p>
                <ul className="mt-2 grid gap-1.5">
                  {pourUnePersonne.map((o) => (
                    <li key={o.categorieId} className="text-[15px] text-[#3c4a52]">
                      {noms.get(o.categorieId) || "—"} · {T.pour1} ·{" "}
                      <span className="font-semibold tabular-nums">
                        {Math.min(...o.prix.map((p) => p.total)).toFixed(2).replace(".", ",")} €
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { setVoyage("seul"); chercher(1); }}
                  className="mt-3 text-[14px] font-semibold text-[#004e7c] underline underline-offset-4 hover:text-[#C6A972]"
                >
                  {T.seulAussiAction}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
