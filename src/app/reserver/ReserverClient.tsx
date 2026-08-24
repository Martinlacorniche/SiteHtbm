"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CalendrierSejour from "./CalendrierSejour";
import {
  chercherDisponibilite, chargerCategories, t,
  type Disponibilite, type GroupeTarifaire, type Langue, type Offre, type Tarif,
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

/** Ce que le client a retenu : de quoi remplir le récapitulatif sans re-chercher. */
type Choix = {
  categorieId: string;
  tarifId: string;
  total: number;
  parNuit: number;
  pourPersonnes: number;
};

const TEXTES = {
  fr: {
    titre: "Réserver aux Voiles",
    chapo: "Petit-déjeuner toujours inclus. Prix tout compris, sans surprise à l'arrivée.",
    arrivee: "Arrivée", depart: "Départ",
    choisirDates: "Choisissez votre arrivée",
    puisDepart: "· puis votre départ",
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
    colDates: "Vos dates", colOffres: "Nos chambres", colRecap: "Votre séjour",
    attenteOffres: "Choisissez vos dates et dites-nous qui voyage : les chambres disponibles s'afficheront ici.",
    recapVide: "Choisissez une chambre pour voir le total.",
    tarifFlexible: "Tarif flexible", tarifPrepaye: "Prépayé, non remboursable",
    taxeMention: (m: string) => `+ ${m} € de taxe de séjour par adulte et par nuit, à régler sur place`,
    totalSejour: "Total du séjour", surPlace: "À régler sur place",
    payer: "Réserver et payer",
    paiementAVenir: "Le règlement en ligne ouvre très bientôt sur cette page.",
  },
  en: {
    titre: "Book at Les Voiles",
    chapo: "Breakfast always included. All-inclusive prices, no surprises on arrival.",
    arrivee: "Check-in", depart: "Check-out",
    choisirDates: "Choose your arrival",
    puisDepart: "· then your departure",
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
    colDates: "Your dates", colOffres: "Our rooms", colRecap: "Your stay",
    attenteOffres: "Choose your dates and tell us who is travelling: available rooms will appear here.",
    recapVide: "Choose a room to see the total.",
    tarifFlexible: "Flexible rate", tarifPrepaye: "Prepaid, non-refundable",
    taxeMention: (m: string) => `+ €${m} city tax per adult per night, payable at the hotel`,
    totalSejour: "Stay total", surPlace: "Payable at the hotel",
    payer: "Book and pay",
    paiementAVenir: "Online payment opens on this page very soon.",
  },
} as const;

/** 'YYYY-MM-DD' local. Passer par toISOString décalerait d'un jour le soir venu. */
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dansNJours = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoLocal(d);
};

/** « 12 sept. » — court, parce qu'il partage la ligne avec le nombre de nuits. */
const joli = (iso: string, langue: Langue) => {
  if (!iso) return "";
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric", month: "short",
  });
};

const nuitsEntre = (a: string, b: string) =>
  Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000));

// Taxe de séjour Toulon, 3 étoiles : 1,86 € par adulte et par nuit, taxes
// additionnelles comprises. Affichée à part parce qu'elle se règle sur place,
// jamais découverte à la fin.
const TAXE_PAR_ADULTE_NUIT = 1.86;

/* Deux libellés, pas deux paragraphes.
 *
 * Mews décrit ses tarifs en trois lignes de conditions (« Annulable sans frais
 * jusqu'au jour d'arrivée 18h », « Prépaiement à la réservation de 100 % des
 * nuitées, hors extras »…). Le client, lui, arbitre entre DEUX choses : je garde
 * la main, ou je paie moins cher tout de suite. Le reste appartient aux CGV.
 *
 * La distinction est structurelle, pas textuelle : le groupe tarifaire dit si la
 * carte est débitée (`ChargeCreditCard` = prépayé) ou seulement préautorisée
 * (`CreatePreauthorization` = flexible). On ne retombe sur le texte que si le
 * groupe manque — un libellé faux sur une condition d'annulation se paierait au
 * comptoir. */
const libelleTarif = (
  tarif: Tarif | undefined,
  groupes: GroupeTarifaire[],
  langue: Langue,
  T: (typeof TEXTES)[Langue],
): string => {
  const groupe = groupes.find((g) => g.Id === tarif?.RateGroupId);
  if (groupe?.SettlementAction === "ChargeCreditCard") return T.tarifPrepaye;
  if (groupe?.SettlementAction === "CreatePreauthorization") return T.tarifFlexible;
  const texte = `${t(tarif?.Name, langue)} ${t(tarif?.Description, langue)}`.toLowerCase();
  return /non[\s-]*remboursable|non[\s-]*refundable|prépaiement|prepay/.test(texte)
    ? T.tarifPrepaye
    : T.tarifFlexible;
};

export default function ReserverClient({ langue }: { langue: Langue }) {
  const T = TEXTES[langue];

  // La nuit du jour, proposée d'emblée : c'est la demande la plus fréquente en
  // direct, et le calendrier étant posé dans la page, la changer coûte une tape
  // — pas besoin d'effacer quoi que ce soit d'abord.
  const [arrivee, setArrivee] = useState(() => dansNJours(0));
  const [depart, setDepart] = useState(() => dansNJours(1));
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [dispo, setDispo] = useState<Disponibilite | null>(null);
  const [noms, setNoms] = useState<Map<string, string>>(new Map());
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);
  // La chambre retenue, qui alimente la colonne de droite.
  const [choix, setChoix] = useState<Choix | null>(null);
  const dejaLance = useRef(false);
  const zoneOffres = useRef<HTMLElement | null>(null);
  const defilerApres = useRef(false);

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
      setChoix(null); // les prix changent avec les dates : on ne garde pas l'ancien choix
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

  const chercher = useCallback((pax: number) => {
    defilerApres.current = true;
    return lancer({ arrivee, depart, adultes: pax });
  }, [lancer, arrivee, depart]);

  // Sur mobile les trois colonnes sont empilées : les chambres apparaissent
  // sous le calendrier, hors écran. Sans ce défilement, le client tape « Voir
  // les chambres » et croit qu'il ne s'est rien passé. Sur grand écran les
  // colonnes sont côte à côte — le résultat est déjà visible, on ne bouge pas.
  useEffect(() => {
    if (!defilerApres.current || chargement) return;
    defilerApres.current = false;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    zoneOffres.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [chargement, dispo, erreur]);

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
  const groupes = dispo?.groupes ?? [];
  const taxeTotale = (pax: number) => (TAXE_PAR_ADULTE_NUIT * pax * nuits).toFixed(2).replace(".", ",");

  return (
    /* Sur PC, l'écran EST la page : hauteur fixe, aucune barre de défilement
       générale, chaque colonne défile chez elle. Un tunnel qui oblige à
       remonter pour changer une date perd le client à chaque aller-retour.
       Sous 1024 px on retrouve le flux normal et les colonnes s'empilent. */
    <main className="bg-cream text-[#222] lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">

      <header className="mx-auto w-full max-w-[1600px] shrink-0 px-6 pt-6">
        <Link href="/" className="text-[13px] tracking-wide text-navy hover:underline">
          ← Hôtels Toulon Bord de Mer
        </Link>
        {/* Titre et promesse sur la même ligne : chaque pixel pris en hauteur
            est un pixel de moins pour le calendrier et les chambres. */}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <h1 className="font-serif text-3xl leading-tight text-navy lg:text-[34px]">
            {T.titre}
          </h1>
          <p className="text-[15px] text-[#4a5a63]">{T.chapo}</p>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-6 py-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[340px_minmax(0,1fr)_320px]">

        {/* ── Colonne 1 · Vos dates ───────────────────────────────────────── */}
        <section className="flex min-h-0 flex-col rounded-2xl bg-white p-5 shadow-[0_2px_20px_rgba(0,78,124,0.07)]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
            {T.colDates}
          </h2>

          <div className="mt-3 mb-3 flex items-baseline justify-between gap-3">
            <p className="text-[15px] text-[#3c4a52]">
              {arrivee && depart ? (
                <>
                  <span className="font-semibold text-navy">{joli(arrivee, langue)}</span>
                  <span className="mx-2 text-[#b0b6ba]">→</span>
                  <span className="font-semibold text-navy">{joli(depart, langue)}</span>
                </>
              ) : arrivee ? (
                <>
                  <span className="font-semibold text-navy">{joli(arrivee, langue)}</span>
                  <span className="ml-2 text-[#8a9299]">{T.puisDepart}</span>
                </>
              ) : (
                <span className="text-[#8a9299]">{T.choisirDates}</span>
              )}
            </p>
            {nuits > 0 && (
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#8a9299]">
                {T.nuits(nuits)}
              </span>
            )}
          </div>

          <CalendrierSejour
            arrivee={arrivee || null}
            depart={depart || null}
            langue={langue}
            className="max-h-[340px] sm:max-h-[420px] lg:min-h-0 lg:max-h-none lg:flex-1"
            onChange={(a, d) => { setArrivee(a ?? ""); setDepart(d ?? ""); }}
          />

          <fieldset className="mt-5 shrink-0">
            <legend className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
              {T.voyageLabel}
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {(["seul", "deux", "famille"] as const).map((v) => (
                <button
                  key={v} type="button" onClick={() => setVoyage(v)}
                  aria-pressed={voyage === v}
                  className={[
                    "rounded-xl border px-2 py-3 text-[14px] font-semibold transition-colors",
                    voyage === v
                      ? "border-navy bg-navy text-white"
                      : "border-[#e3e0d9] bg-white text-[#3c4a52] hover:border-gold",
                  ].join(" ")}
                >
                  {T[v]}
                </button>
              ))}
            </div>
            {voyage === "famille" && (
              <p className="mt-2.5 text-[13px] leading-relaxed text-[#6b7a82]">{T.familleAide}</p>
            )}
          </fieldset>

          <button
            type="button"
            disabled={!voyage || nuits < 1 || chargement}
            onClick={() => chercher(adultes)}
            className="mt-4 w-full shrink-0 rounded-full bg-gold px-6 py-3.5 text-[16px] font-bold text-navy-deep transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#ddd8ce] disabled:text-[#9a9a95]"
          >
            {chargement ? T.recherche : voyage ? T.chercher : T.choisir}
          </button>
        </section>

        {/* ── Colonne 2 · Nos chambres ────────────────────────────────────── */}
        <section
          ref={zoneOffres}
          className="flex min-h-0 scroll-mt-4 flex-col rounded-2xl bg-white p-5 shadow-[0_2px_20px_rgba(0,78,124,0.07)]"
        >
          <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
            {T.colOffres}
          </h2>

          <div className="mt-3 min-h-0 flex-1 lg:overflow-y-auto">
            {erreur && (
              <div className="rounded-xl border border-[#e0cfc0] bg-[#fdfaf7] p-5">
                <p className="font-semibold text-[#8a4b2a]">{T.erreur}</p>
                <p className="mt-1 text-[15px] text-[#6b7a82]">{T.erreurAide}</p>
              </div>
            )}

            {!dispo && !erreur && (
              <p className="max-w-sm text-[15px] leading-relaxed text-[#8a9299]">{T.attenteOffres}</p>
            )}

            {dispo && !erreur && principales.length === 0 && (
              <div>
                <p className="font-serif text-2xl text-navy">{T.aucune}</p>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[#6b7a82]">{T.aucuneAide}</p>
              </div>
            )}

            {dispo && !erreur && principales.length > 0 && (
              <ul className="grid gap-5">
                {principales.map((o) => (
                  <li key={`${o.categorieId}-${o.pourPersonnes}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="font-serif text-2xl text-navy">
                        {noms.get(o.categorieId) || "—"}
                      </h3>
                      <span className={[
                        "text-[13px] font-semibold",
                        o.chambresRestantes === 1 ? "text-[#a8571f]" : "text-[#8a9299]",
                      ].join(" ")}>
                        {T.restantes(o.chambresRestantes)}
                      </span>
                    </div>

                    {/* Une ligne = un tarif. Le prix EST le bouton : c'est ce
                        que le client cherche, il n'a pas à viser autre chose. */}
                    <div className="mt-3 grid gap-2">
                      {o.prix.map((p) => {
                        const retenu = choix?.categorieId === o.categorieId && choix?.tarifId === p.tarifId;
                        return (
                          <button
                            key={p.tarifId}
                            type="button"
                            aria-pressed={retenu}
                            onClick={() => setChoix(retenu ? null : {
                              categorieId: o.categorieId,
                              tarifId: p.tarifId,
                              total: p.total,
                              parNuit: p.parNuit,
                              pourPersonnes: o.pourPersonnes,
                            })}
                            className={[
                              "flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors",
                              retenu
                                ? "border-navy bg-navy text-white"
                                : "border-[#e3e0d9] text-[#3c4a52] hover:border-gold hover:bg-[#faf7f1]",
                            ].join(" ")}
                          >
                            <span className="text-[15px] font-semibold">
                              {libelleTarif(tarifs.find((r) => r.Id === p.tarifId), groupes, langue, T)}
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-[20px] font-bold tabular-nums">
                                {p.total.toFixed(2).replace(".", ",")} €
                              </span>
                              {nuits > 1 && (
                                <span className={[
                                  "block text-[12px] tabular-nums",
                                  retenu ? "text-white/70" : "text-[#8a9299]",
                                ].join(" ")}>
                                  {p.parNuit.toFixed(2).replace(".", ",")} € {T.parNuit}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* La chambre individuelle, que les moteurs classiques masquent
                dès que la recherche porte sur deux personnes. */}
            {pourUnePersonne.length > 0 && (
              <div className="mt-5 rounded-xl border border-dashed border-gold p-4">
                <p className="text-[15px] font-semibold text-navy">{T.seulAussi}</p>
                <ul className="mt-1.5 grid gap-1">
                  {pourUnePersonne.map((o) => (
                    <li key={o.categorieId} className="text-[15px] text-[#3c4a52]">
                      {noms.get(o.categorieId) || "—"} ·{" "}
                      <span className="font-semibold tabular-nums">
                        {Math.min(...o.prix.map((p) => p.total)).toFixed(2).replace(".", ",")} €
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { setVoyage("seul"); chercher(1); }}
                  className="mt-2 text-[14px] font-semibold text-navy underline underline-offset-4 hover:text-gold-ink"
                >
                  {T.seulAussiAction}
                </button>
              </div>
            )}
          </div>

          {dispo && !erreur && principales.length > 0 && (
            <p className="mt-4 shrink-0 border-t border-[#f0ece4] pt-3 text-[12px] text-[#8a9299]">
              {T.taxeMention(TAXE_PAR_ADULTE_NUIT.toFixed(2).replace(".", ","))}
            </p>
          )}
        </section>

        {/* ── Colonne 3 · Votre séjour ────────────────────────────────────── */}
        <aside className="flex min-h-0 flex-col rounded-2xl bg-white p-5 shadow-[0_2px_20px_rgba(0,78,124,0.07)]">
          <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
            {T.colRecap}
          </h2>

          <div className="mt-3 min-h-0 flex-1 lg:overflow-y-auto">
            <dl className="grid gap-2 text-[15px]">
              <div className="flex justify-between gap-3">
                <dt className="text-[#8a9299]">{T.arrivee}</dt>
                <dd className="font-semibold text-[#3c4a52]">{joli(arrivee, langue) || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#8a9299]">{T.depart}</dt>
                <dd className="font-semibold text-[#3c4a52]">{joli(depart, langue) || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#8a9299]">{T.voyageLabel}</dt>
                <dd className="font-semibold text-[#3c4a52]">{voyage ? T[voyage] : "—"}</dd>
              </div>
            </dl>

            {choix ? (
              <>
                <p className="mt-4 border-t border-[#f0ece4] pt-4 font-serif text-xl text-navy">
                  {noms.get(choix.categorieId) || "—"}
                </p>
                <p className="mt-1 text-[13px] text-[#8a9299]">
                  {libelleTarif(tarifs.find((r) => r.Id === choix.tarifId), groupes, langue, T)}
                  {" · "}{T.nuits(nuits)}
                </p>

                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-semibold text-[#3c4a52]">{T.totalSejour}</span>
                  <span className="text-[26px] font-bold tabular-nums text-navy">
                    {choix.total.toFixed(2).replace(".", ",")} €
                  </span>
                </div>
                <p className="mt-1 flex justify-between gap-3 text-[13px] text-[#8a9299]">
                  <span>{T.surPlace}</span>
                  <span className="tabular-nums">+ {taxeTotale(choix.pourPersonnes)} €</span>
                </p>
              </>
            ) : (
              <p className="mt-4 border-t border-[#f0ece4] pt-4 text-[15px] leading-relaxed text-[#8a9299]">
                {T.recapVide}
              </p>
            )}
          </div>

          <div className="mt-4 shrink-0">
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-full bg-[#ddd8ce] px-6 py-3.5 text-[16px] font-bold text-[#9a9a95]"
            >
              {T.payer}
            </button>
            <p className="mt-2 text-[12px] leading-relaxed text-[#a8571f]">{T.paiementAVenir}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-[#b0b6ba]">{T.checkin}</p>
          </div>
        </aside>

      </div>
    </main>
  );
}
