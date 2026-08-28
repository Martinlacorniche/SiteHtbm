"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Loader2, Phone, Mail, Users, Moon, X } from "lucide-react";
import { CONTACT, type LangueVilla } from "@/lib/villaContenu";
import { nuitsEntre, type Formule, type Verdict } from "@/lib/villa";
import type { ContenuVilla, TarifsVilla } from "@/lib/villaDb";
import Calendrier, { type Selection } from "./Calendrier";

/* La page de la privatisation.
 *
 * ⚠️ ELLE NE VEND PAS, ELLE QUALIFIE. Il n'y a pas de bouton « payer » et
 * c'est délibéré : le prix se négocie (décision du 28/08/2026). Ce que la page
 * doit faire, c'est répondre en une seconde à la seule question qui bloque
 * aujourd'hui — « est-ce que mes dates sont possibles ? » — et récupérer de
 * quoi rappeler. Le reste se joue au téléphone.
 *
 * ⚠️ TROIS RÉPONSES, PAS DEUX. « Complète », « demi-villa seulement », et
 * « fermé » — avec la raison. Un « indisponible » sec sur des dates où il
 * restait huit chambres, c'est une vente perdue pour rien.
 */

/** « 27 septembre 2026 ». En toutes lettres parce que le rappel se LIT : un
 *  « 2026-09-27 » demande un effort pour vérifier qu'on ne s'est pas trompé,
 *  et c'est précisément ce qu'on demande au visiteur à cet endroit. */
const jourLong = (iso: string, langue: LangueVilla) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(langue === "en" ? "en-GB" : "fr-FR",
    { day: "numeric", month: "long", year: "numeric" });

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// Demain, après-demain : des dates de départ plausibles qui évitent au visiteur
// d'ouvrir un calendrier pour comprendre à quoi sert le champ.
const dansNJours = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const TEXTES = {
  fr: {
    quandTitre: "Vos dates sont-elles libres ?",
    quandSous: "Les nuits libres sont en couleur — nous lisons le planning de la maison en direct.",
    arrivee: "Arrivée", depart: "Départ",
    verifier: "Vérifier",
    chargement: "On regarde…",
    libre: "C'est libre : la maison entière est à vous",
    pris: "Ces dates ne sont pas disponibles",
    prisExplique:
      "Des chambres sont déjà réservées sur cette période, et une privatisation demande la maison entière. Écrivez-nous quand même : nous trouvons souvent une solution en décalant d'une nuit ou deux.",
    tropCourt: `Deux nuits minimum`,
    tropCourtExplique: "Ajoutez une nuit et nous regardons tout de suite.",
    invalide: "Choisissez une arrivée et un départ.",
    panne: "Nous n'arrivons pas à lire le planning à l'instant. Appelez-nous, on vous répond de vive voix.",
    parNuit: "par nuit",
    parPax: "par pers.",
    soitPour: (n: number) => `Soit, pour ${n} nuit${n > 1 ? "s" : ""} :`,
    pourLaMaison: "au total",
    mentionCourte: "Prix indicatif et négociable, taxe de séjour en sus. Quatre des seize chambres sont des individuelles : elles se facturent à la chambre.",
    chambres: "chambres", personnes: "personnes",
    demander: "Demander un devis",
    formTitre: "Parlez-nous de votre séjour",
    formSous: "Nous répondons dans la journée. Aucune chambre n'est bloquée tant que nous n'avons pas échangé.",
    nom: "Votre nom", email: "Email", tel: "Téléphone", societe: "Société (facultatif)",
    combien: "Combien serez-vous ?",
    votreMessage: "Votre projet en quelques mots",
    envoyer: "Envoyer la demande",
    envoi: "Envoi…",
    merci: "C'est envoyé. Nous vous rappelons dans la journée.",
    merciSous: "Si c'est urgent, appelez directement :",
    echec: "L'envoi n'a pas abouti. Écrivez-nous directement :",
    inclusTitre: "Compris dans le tarif",
    pourTitre: "Ils privatisent la maison",
    savoirTitre: "Bon à savoir",
    combienTitre: "Vous serez combien ?",
    direCombien: "Dites-nous combien vous serez pour voir le total.",
    pourquoiComplete: (n: number) =>
      `Toutes les chambres ouvertes : à ${n}, chacun la sienne, et tout l'espace de la maison.`,
    paxVide: "—",
    moins: "Un de moins",
    plus: "Un de plus",
    tropDeMonde: "Au-delà de 28 personnes, la maison ne suffit plus — mais nous avons un second hôtel à dix minutes, en bord de mer. Écrivez-nous, on compose.",
    jusqua: "jusqu'à",
    sejourTitre: "Votre séjour",
    modifier: "Modifier",
    prixTitre: "Le tarif",
    prixSous: "Petit-déjeuner en option, prix négociable.",
    prixAttente: "Choisissez vos dates à côté pour voir le total du séjour.",
    formuleComplete: "Villa complète",
    formuleDemi: "Demi-villa",
    choisir: "Formule souhaitée",
  },
  en: {
    quandTitre: "Are your dates free?",
    quandSous: "Free nights are shown in colour — we read the live planning.",
    arrivee: "Check-in", depart: "Check-out",
    verifier: "Check",
    chargement: "Checking…",
    libre: "It's free: the whole house is yours",
    pris: "Those dates aren't available",
    prisExplique:
      "Some rooms are already booked over that period, and a private rental needs the whole house. Write to us anyway: we often find a way by shifting a night or two.",
    tropCourt: "Two-night minimum",
    tropCourtExplique: "Add a night and we'll check straight away.",
    invalide: "Choose a check-in and a check-out date.",
    panne: "We can't read the planning right now. Call us and we'll answer in person.",
    parNuit: "per night",
    parPax: "per guest",
    soitPour: (n: number) => `That is, for ${n} night${n > 1 ? "s" : ""}:`,
    pourLaMaison: "in total",
    mentionCourte: "Indicative, negotiable price; city tax on top. Four of the sixteen rooms are singles: those are priced per room.",
    chambres: "rooms", personnes: "guests",
    demander: "Request a quote",
    formTitre: "Tell us about your stay",
    formSous: "We answer the same day. No room is held until we've spoken.",
    nom: "Your name", email: "Email", tel: "Phone", societe: "Company (optional)",
    combien: "How many of you?",
    votreMessage: "Your project in a few words",
    envoyer: "Send request",
    envoi: "Sending…",
    merci: "Sent. We'll call you back today.",
    merciSous: "If it's urgent, call us directly:",
    echec: "The request didn't go through. Write to us directly:",
    inclusTitre: "Included in the rate",
    pourTitre: "Who rents the house",
    savoirTitre: "Good to know",
    combienTitre: "How many of you?",
    direCombien: "Tell us how many you are to see the total.",
    pourquoiComplete: (n: number) =>
      `Every room open: with ${n} of you, one each, and the whole house to yourselves.`,
    paxVide: "—",
    moins: "One fewer",
    plus: "One more",
    tropDeMonde: "Beyond 28 guests the house isn't enough — but we have a second seafront hotel ten minutes away. Write to us and we'll put it together.",
    jusqua: "up to",
    sejourTitre: "Your stay",
    modifier: "Change",
    prixTitre: "The rate",
    prixSous: "Breakfast optional, price negotiable.",
    prixAttente: "Pick your dates alongside to see the total for the stay.",
    formuleComplete: "Whole villa",
    formuleDemi: "Half-villa",
    choisir: "Preferred option",
  },
} as const;

type Etat = "vierge" | "cherche" | "rendu" | "panne";

/* ⚠️ LE CONTENU ARRIVE DU SERVEUR, IL N'EST PLUS IMPORTÉ ICI.
 * Textes, photos et tarifs sont éditables depuis le back-office : les lire
 * dans une constante du dépôt les figerait au dernier déploiement. La page
 * serveur les charge (base par-dessus dépôt) et les passe en props. */
export default function VillaClient({ langue, contenu, tarifs }: {
  langue: LangueVilla;
  contenu: ContenuVilla;
  tarifs: TarifsVilla;
}) {
  const T = TEXTES[langue];
  const C = contenu[langue];
  const CONTENU = contenu;
  const FORMULES = tarifs.formules;
  const NUITS_MIN = tarifs.nuitsMin;

  /* Les deux règles qui dépendaient d'un import figé. Elles suivent maintenant
     ce que le back-office a posé : changer la capacité y change ici la formule
     proposée et le prix par personne, sans redéploiement. */
  /* Mémorisée : l'effet qui pré-remplit la formule en dépend, et une fonction
     recréée à chaque rendu le relancerait sans fin. Ses seules variables sont
     les deux capacités — quand le back-office les change, la règle suit. */
  const formulePourPax = useCallback((n: number): Formule | null =>
    !Number.isFinite(n) || n < 1 ? null
    : n <= FORMULES.demi.personnes ? "demi"
    : n <= FORMULES.complete.personnes ? "complete"
    : null,
  [FORMULES.demi.personnes, FORMULES.complete.personnes]);
  const parPersonneReel = (f: Formule, n: number) =>
    Math.round(FORMULES[f].parNuit / Math.max(n, 1));

  const [arrivee, setArrivee] = useState(() => dansNJours(30));
  const [depart, setDepart] = useState(() => dansNJours(33));
  const [etat, setEtat] = useState<Etat>("vierge");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  /* L'effectif. `null` tant que le visiteur n'a rien dit — on ne lui invente
     pas un groupe. */
  const [pax, setPax] = useState<number | null>(null);

  /* ⚠️ L'EFFECTIF PROPOSE, IL NE DÉCIDE PAS (Martin, 28/08/2026).
     La première version choisissait la formule toute seule : douze personnes,
     donc demi-villa, point. Mais douze personnes peuvent très bien vouloir les
     seize chambres — une chacun, ou simplement toute la place. Leur refuser
     de payer le double, c'est refuser une vente.
     La formule reste donc un choix, seulement pré-rempli par le plus économe
     de ceux qui logent le groupe. Elle se recalcule quand l'effectif change :
     passer de douze à vingt doit basculer sur la complète sans y penser. */
  const [formule, setFormule] = useState<Formule | null>(null);
  useEffect(() => { setFormule(pax === null ? null : formulePourPax(pax)); }, [pax, formulePourPax]);

  /* Les formules qui logent VRAIMENT ce monde-là. À vingt, la demi-villa
     n'est pas un choix moins cher : elle ne rentre pas. */
  const offertes = pax === null
    ? []
    : (["demi", "complete"] as Formule[]).filter((k) => pax <= FORMULES[k].personnes);
  const changerPax = (pas: number) =>
    setPax((n) => Math.max(1, Math.min((n ?? (pas > 0 ? 0 : 2)) + pas, 99)));

  // Le second clic du calendrier lance la recherche tout seul : demander un
  // bouton « vérifier » après avoir choisi ses dates, c'est un clic pour rien.
  const [aChercher, setAChercher] = useState(false);
  /* La photo agrandie, s'il y en a une — son RANG dans la galerie, et non son
     adresse. C'est ce qui manquait pour pouvoir passer à la suivante : avec
     une URL seule, la visionneuse ne savait pas où elle se trouvait. */
  const [zoom, setZoom] = useState<number | null>(null);
  // Le doigt, entre le poser et le lever. `null` quand il n'y a pas de geste
  // en cours — ce qui distingue un balayage d'un simple appui.
  const doigt = useRef<number | null>(null);
  // La bande de photos, que les deux flèches font défiler.
  const bande = useRef<HTMLDivElement | null>(null);
  const [envoi, setEnvoi] = useState<"repos" | "envoi" | "envoye" | "echec">("repos");
  const [form, setForm] = useState({ nom: "", email: "", telephone: "", societe: "", message: "" });

  const nuits = useMemo(
    () => (arrivee && depart && depart > arrivee ? nuitsEntre(arrivee, depart) : 0),
    [arrivee, depart],
  );

  /* Un départ qui précède l'arrivée n'est pas une erreur du visiteur, c'est le
     champ de gauche qui a bougé après celui de droite. On repousse le départ
     au lieu d'afficher un reproche. */
  useEffect(() => {
    if (depart <= arrivee) {
      const d = new Date(`${arrivee}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + NUITS_MIN);
      setDepart(d.toISOString().slice(0, 10));
    }
  }, [arrivee, depart, NUITS_MIN]);

  /* Feuilleter, dans les deux sens, en boucle.
     La boucle est volontaire : arrivé à la dernière photo, le geste suivant
     ramène à la première au lieu de ne rien faire — sur un téléphone, un
     balayage sans effet se lit comme un écran figé. */
  const feuilleter = useCallback((pas: number) => {
    setZoom((z) => (z === null ? z : (z + pas + CONTENU.galerie.length) % CONTENU.galerie.length));
  }, [CONTENU.galerie.length]);

  useEffect(() => {
    if (zoom === null) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      else if (e.key === "ArrowRight") feuilleter(1);
      else if (e.key === "ArrowLeft") feuilleter(-1);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [zoom, feuilleter]);

  const chercher = useCallback(async () => {
    setEtat("cherche");
    try {
      const r = await fetch(`/api/villa/dispo?arrivee=${arrivee}&depart=${depart}`);
      if (!r.ok) { setEtat("panne"); return; }
      const v: Verdict = await r.json();
      setVerdict(v);
      setEtat("rendu");
    } catch { setEtat("panne"); }
  }, [arrivee, depart]);

  useEffect(() => {
    if (!aChercher) return;
    setAChercher(false);
    void chercher();
  }, [aChercher, chercher]);

  const envoyer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi("envoi");
    try {
      const r = await fetch("/api/villa/demande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arrivee, depart, langue,
          formule: formule ?? undefined,
          // L'effectif vient du compteur de la colonne des prix, pas d'un
          // second champ ici : deux endroits pour dire le même nombre, c'est
          // un jour où ils se contredisent.
          personnes: pax ?? undefined,
          nom: form.nom, email: form.email, telephone: form.telephone,
          societe: form.societe, message: form.message,
          source: "page-villa",
        }),
      });
      setEnvoi(r.ok ? "envoye" : "echec");
    } catch { setEnvoi("echec"); }
  }, [arrivee, depart, formule, pax, langue, form]);

  /* Le total du séjour, quand on sait pour combien de monde. Sans effectif, il
     n'y a pas de formule, donc pas de total — et on ne va pas en inventer un. */
  const devisTotal = formule === null
    ? null
    : FORMULES[formule].parNuit * Math.max(nuits, NUITS_MIN);

  return (
    <div className="bg-cream text-slate-900">

      {/* ---------- TROIS COLONNES : LE RÉCIT, LES DATES, LE PRIX ----------
          Mise en page demandée par Martin le 28/08/2026, et elle règle d'un
          coup ce qu'on rafistolait depuis une heure — « c'est plus simple ».

          Chaque colonne répond à une question, dans l'ordre où on se les pose :
          où suis-je · est-ce libre · combien. Le prix ne surgit plus après le
          choix des dates en poussant le reste : il est là dès l'arrivée, et le
          séjour choisi vient seulement s'y inscrire.

          ⚠️ ET C'EST CE QUI RÈGLE LES SAUTS SUR TÉLÉPHONE. Empilées, les
          colonnes donnent récit → calendrier → prix. Le résultat s'écrit donc
          SOUS le calendrier, jamais au-dessus : avant, il s'insérait plus haut
          que le doigt et poussait toute la page vers le bas au moment du clic.
          La zone du résultat garde en plus une hauteur minimale, pour que même
          là rien ne bouge.

          ⚠️ LE CALENDRIER N'AFFICHE QU'UN MOIS ICI. À deux, dans la colonne du
          milieu, les cases tombaient à trente pixels : plus rien à viser. La
          flèche fait le reste, et les deux mois restent chargés d'avance.

          ⚠️ `items-start` ET UNE HAUTEUR FIXE. Le titre se déplaçait quand on
          choisissait ses dates : deux centrages verticaux se cumulaient, si
          bien que l'arrivée du résultat faisait remonter le titre — à
          l'instant précis où on le lit. Tout part du haut, rien ne bouge. */}
      <header className="relative overflow-hidden lg:h-[830px]">
        {/* Deux fichiers, un par forme d'écran — voir `photoMobile` : la vue
            mer est une bande, elle ne tient pas sur un écran vertical sans
            qu'on l'agrandisse quatre fois. `priority` sur les deux : c'est
            l'image du premier écran, celle qui doit être là avant tout le
            reste, et le navigateur ne télécharge que celle qui s'affiche. */}
        <Image src={CONTENU.photoMobile} alt="" fill priority sizes="100vw"
          className="object-cover lg:hidden" />
        <Image src={CONTENU.photo} alt="" fill priority sizes="100vw"
          className="object-cover hidden lg:block" />
        <div className="absolute inset-0 voile-villa" />

        <div className="relative z-10 mx-auto w-full max-w-[1900px] px-5 md:px-8 xl:px-12 py-24 lg:pt-24 lg:pb-10
                        grid gap-6 lg:gap-7 lg:items-start
                        lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)_minmax(0,0.9fr)]">

          {/* ---------- 1. LE RÉCIT ---------- */}
          <div className="text-white">
            <p className="uppercase tracking-[0.25em] text-[11px] md:text-xs font-bold text-amber-200 sur-photo">
              {C.surtitre}
            </p>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl lg:text-[2.5rem] xl:text-5xl leading-[1.05] sur-photo">
              {C.titre}
            </h1>
            <p className="mt-4 text-base text-white/95 sur-photo">{C.chapo}</p>
          </div>

          {/* ---------- 2. LES DATES ---------- */}
          <div id="dates" className="rounded-2xl bg-white shadow-2xl border border-slate-200/70 p-5 scroll-mt-6">
            <h2 className="font-serif text-2xl">{T.quandTitre}</h2>
            <p className="mt-1 text-sm text-slate-600">{T.quandSous}</p>
            <div className="mt-4">
              {/* ⚠️ PLUS DEUX CHAMPS `type="date"`. Ils marchaient, mais ils
                  obligeaient à CONNAÎTRE ses dates avant d'ouvrir la page —
                  or un groupe cherche d'abord QUAND c'est possible. */}
              <Calendrier
                langue={langue} arrivee={arrivee} depart={depart} mois={2}
                onChange={(sel: Selection) => {
                  setArrivee(sel.arrivee);
                  if (sel.depart) { setDepart(sel.depart); setAChercher(true); }
                  // Entre les deux clics le séjour est à moitié posé : on
                  // efface le verdict plutôt que de laisser une réponse qui ne
                  // concerne plus les dates affichées.
                  else { setEtat("vierge"); setVerdict(null); }
                }}
              />
            </div>
          </div>

          {/* ---------- 3. LE PRIX ----------
              Cette colonne ne se remplit PAS à la demande : les tarifs y sont
              dès l'arrivée sur la page. C'est la première question d'un groupe
              — avant même les dates — et la lui faire mériter par deux clics
              n'a jamais fait vendre. Le séjour choisi vient s'y ajouter. */}
          <div className="rounded-2xl bg-white shadow-2xl border border-slate-200/70 p-5">
            <h2 className="font-serif text-2xl">{T.prixTitre}</h2>
            <p className="mt-1 text-sm text-slate-600">{T.prixSous}</p>

            {/* ---------- L'EFFECTIF, QUI DÉCIDE DE TOUT ----------
                Deux boutons « Villa complète / Demi-villa » demandaient au
                visiteur de traduire son groupe en nombre de chambres — un
                travail qui est le nôtre. Il sait combien ils sont ; le reste
                se déduit. Et le prix par personne devient un chiffre exact au
                lieu d'une hypothèse de chambre double : c'est ce qui rendait
                « 40 € » faux dès qu'on divisait 1 280 par 28. */}
            <div className="mt-4">
              <label htmlFor="villa-pax" className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                {T.combienTitre}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => changerPax(-1)}
                  className="w-11 h-11 flex-none rounded-xl border-2 border-slate-200 hover:border-slate-300 text-xl leading-none"
                  aria-label={T.moins}>−</button>
                <input id="villa-pax" type="number" inputMode="numeric" min={1} max={40}
                  value={pax === null ? "" : pax}
                  placeholder={T.paxVide}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setPax(Number.isFinite(n) && n > 0 ? Math.min(n, 99) : null);
                  }}
                  className="flex-1 min-w-0 h-11 rounded-xl border-2 border-slate-200 px-3 text-center text-lg font-bold
                             focus:border-[color:var(--color-gold)] focus:outline-none" />
                <button type="button" onClick={() => changerPax(1)}
                  className="w-11 h-11 flex-none rounded-xl border-2 border-slate-200 hover:border-slate-300 text-xl leading-none"
                  aria-label={T.plus}>+</button>
              </div>
            </div>

            {/* Ce que ça donne. Tant qu'on n'a pas dit combien, on annonce les
                deux paliers : un tarif qu'il faut mériter par une saisie n'a
                jamais fait vendre. */}
            <div className="mt-4">
              {formule === null && (
                <div className="rounded-xl border-2 border-slate-200 px-4 py-3 text-sm text-slate-600 space-y-1">
                  {(["demi", "complete"] as Formule[]).map((k) => (
                    <p key={k} className="flex items-baseline justify-between gap-3">
                      <span>
                        {T.jusqua} {FORMULES[k].personnes} {T.personnes}
                        <span className="text-slate-400"> · {FORMULES[k].chambres} {T.chambres}</span>
                      </span>
                      <strong className="whitespace-nowrap text-slate-900">{euro(FORMULES[k].parNuit)}</strong>
                    </p>
                  ))}
                </div>
              )}

              {/* Les formules possibles, la plus économe pré-choisie. Quand
                  il n'y en a qu'une, elle s'affiche quand même — sélectionnée
                  et sans concurrente, c'est un rappel, pas un choix. */}
              {offertes.length > 0 && (
                <div className="space-y-2">
                  {offertes.map((k) => (
                    <button key={k} type="button" onClick={() => setFormule(k)}
                      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition ${
                        formule === k
                          ? "border-[color:var(--color-gold)] bg-amber-50/60"
                          : "border-slate-200 hover:border-slate-300"
                      }`}>
                      <p className="flex items-baseline justify-between gap-3">
                        <span className="font-serif text-lg">
                          {k === "complete" ? T.formuleComplete : T.formuleDemi}
                        </span>
                        <strong className="whitespace-nowrap">
                          {euro(FORMULES[k].parNuit)}
                          <span className="text-xs font-medium text-slate-500"> / {T.parNuit}</span>
                        </strong>
                      </p>
                      <p className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1"><Moon className="w-3 h-3" /> {FORMULES[k].chambres} {T.chambres}</span>
                        {/* Le prix par personne, EXACT : le total divisé par
                            ceux qui viennent, et non par la capacité. */}
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" /> {euro(parPersonneReel(k, pax ?? 1))} {T.parPax}
                        </span>
                      </p>
                      {/* Pourquoi on paierait le double à douze : parce qu'on
                          a alors une chambre chacun. Sans cette phrase, la
                          villa complète n'est qu'une ligne plus chère. */}
                      {k === "complete" && offertes.length > 1 && pax !== null && (
                        <p className="mt-1 text-[11px] text-slate-500">{T.pourquoiComplete(pax)}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Au-delà de vingt-huit, la maison ne suffit plus — mais on a un
                  second hôtel à dix minutes, et le dire vaut mieux que de
                  laisser partir le groupe. */}
              {pax !== null && pax > FORMULES.complete.personnes && (
                <p className="mt-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
                  {T.tropDeMonde}
                </p>
              )}
            </div>

            {/* Le séjour choisi, quand il y en a un. La hauteur est réservée :
                sans elle, le résultat pousserait la page au moment du clic. */}
            <div className="mt-4 mb-4 min-h-[52px]">
              {etat === "panne" && (
                <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                  {T.panne}
                </p>
              )}
              {etat === "rendu" && verdict?.motif === "libre" && (
                <>
                  <p className="text-sm font-semibold text-emerald-800">{T.libre}</p>
                  {/* Le total n'apparaît que si l'on sait pour combien de
                      monde : sans effectif il n'y a pas de formule, donc pas
                      de montant à annoncer. La date reste libre pour autant,
                      et c'est ça qu'il faut dire d'abord. */}
                  {devisTotal !== null ? (
                    <p className="mt-1 text-sm text-slate-700">
                      {T.soitPour(Math.max(nuits, NUITS_MIN))}{" "}
                      <strong className="font-serif text-lg">{euro(devisTotal)}</strong> {T.pourLaMaison}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-600">{T.direCombien}</p>
                  )}
                </>
              )}
              {etat === "rendu" && verdict && verdict.motif !== "libre" && (
                <>
                  <p className="text-sm font-semibold text-slate-800">
                    {verdict.motif === "chambres-prises" ? T.pris
                      : verdict.motif === "trop-court" ? T.tropCourt : T.invalide}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {verdict.motif === "chambres-prises" ? T.prisExplique
                      : verdict.motif === "trop-court" ? T.tropCourtExplique : ""}
                  </p>
                </>
              )}
              {etat !== "rendu" && etat !== "panne" && (
                <p className="text-xs text-slate-500">{T.prixAttente}</p>
              )}
            </div>

            {/* ⚠️ LE BOUTON EST LÀ MÊME SANS DATES. Un groupe qui n'a pas
                encore arrêté son week-end doit pouvoir écrire : le formulaire
                porte les dates affichées, et le commercial en discutera. */}
            <a href="#demande" className="btn btn-or w-full px-6 py-3.5 shadow-lg">
              {T.demander} <ArrowRight className="w-4 h-4" />
            </a>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">{T.mentionCourte}</p>
          </div>
        </div>
      </header>

      {/* ---------- CE QUE C'EST ----------
          ⚠️ CETTE SECTION AVAIT DISPARU. Elle a sauté le 28/08/2026 en
          remaniant la galerie : la page a tourné un moment sans ses trois
          arguments, c'est-à-dire sans dire ce qu'on vend. */}
      <section className="mx-auto max-w-[1900px] px-5 md:px-8 xl:px-12 py-16 grid gap-8 md:grid-cols-3">
        {C.forces.map((force) => (
          <div key={force.titre}>
            <h3 className="font-serif text-2xl">{force.titre}</h3>
            <p className="mt-2 text-slate-700 leading-relaxed">{force.texte}</p>
          </div>
        ))}
      </section>

      {/* ---------- LE COIN PHOTO ----------
          Une privatisation se vend à l'œil : personne ne loue seize chambres
          sur trois arguments et une seule image. Défilement horizontal plutôt
          que grille — on feuillette des photos, on ne les inventorie pas.

          ⚠️ IL FALLAIT ATTRAPER LA BARRE DE DÉFILEMENT. À la souris, une bande
          horizontale ne se fait pas défiler : la molette fait défiler LA PAGE,
          et il ne restait que la barre grise, à viser au pixel. Deux flèches
          par-dessus règlent ça, et le glissé au doigt continue de marcher tout
          seul sur téléphone. La barre elle-même disparaît : elle promettait un
          geste qui n'était pas le bon.

          ⚠️ TOUT TIENT DANS LE MÊME COULOIR QUE LE RESTE. La bande partait du
          bord de l'écran pendant que son titre restait rentré dans la colonne
          de texte : les deux ne s'alignaient sur rien. Titre et photos
          partagent maintenant la marge du héros. */}
      <section className="mx-auto max-w-[1900px] px-5 md:px-8 xl:px-12 py-16">
        <h2 className="font-serif text-3xl mb-5">{C.galerieTitre}</h2>

        <div className="relative">
          <div ref={bande}
            className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth
                       [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CONTENU.galerie.map((photo, i) => (
              <button key={photo.src} type="button" onClick={() => setZoom(i)}
                className="relative flex-none w-[78vw] sm:w-[340px] aspect-[4/3] rounded-2xl overflow-hidden
                           snap-start group">
                <Image src={photo.src} alt={photo.alt[langue]} fill
                  sizes="(max-width: 640px) 78vw, 340px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </button>
            ))}
          </div>

          {/* Cachées au doigt : sur téléphone on glisse, et deux ronds blancs
              par-dessus la photo ne feraient que la manger. */}
          <FlecheBande sens="gauche" bande={bande} langue={langue} />
          <FlecheBande sens="droite" bande={bande} langue={langue} />
        </div>
      </section>

      {/* ---------- LES QUATRE LISTES, SUR UNE SEULE LIGNE ----------
          Elles étaient trois d'un côté et une toute seule en dessous, dans sa
          propre section — la quatrième avait l'air oubliée là. Elles disent
          pourtant la même sorte de chose et se lisent ensemble : ce qui est
          compris, ce qui s'ajoute, ce qu'il faut savoir, et pour qui c'est.
          Quatre colonnes sur grand écran, deux sur tablette, une empilée sur
          téléphone. */}
      <section className="mx-auto max-w-[1900px] px-5 md:px-8 xl:px-12 pb-20 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        <Liste titre={T.inclusTitre} items={[...C.inclus]} coche />
        {/* Ce qui n'est PAS dans le tarif se dit à côté de ce qui y est, pas
            en petits caractères plus bas : le petit-déjeuner et le ménage de
            fin de séjour sont les deux choses qu'on croit toujours incluses. */}
        <Liste titre={C.optionsTitre} items={[...C.options]} />
        <Liste titre={T.savoirTitre} items={[...C.aSavoir]} />
        <Liste titre={T.pourTitre} items={[...C.pour]} />
      </section>

      {/* ---------- LA DEMANDE ---------- */}
      <section id="demande" className="bg-navy-deep text-white scroll-mt-8">
        <div className="mx-auto max-w-3xl px-5 md:px-8 xl:px-12 py-16 md:py-24">
          <h2 className="font-serif text-3xl md:text-4xl">{T.formTitre}</h2>
          <p className="mt-2 text-white/70">{T.formSous}</p>
          <p className="mt-4 text-white/80">{C.services}</p>

          {envoi === "envoye" ? (
            <div className="mt-8 rounded-2xl bg-white/10 border border-white/20 p-6">
              <p className="font-serif text-2xl">{T.merci}</p>
              <p className="mt-3 text-white/75 text-sm">{T.merciSous}</p>
              <p className="mt-2 flex flex-wrap gap-5 font-bold">
                <a href={`tel:${CONTACT.telephone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-white">
                  <Phone className="w-4 h-4" /> {CONTACT.telephone}
                </a>
                <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2 text-white">
                  <Mail className="w-4 h-4" /> {CONTACT.email}
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={envoyer} className="mt-8 grid gap-4 md:grid-cols-2">
              {/* Les dates viennent du moteur au-dessus : les redemander serait
                  faire retaper au visiteur ce qu'il vient de saisir. Elles
                  restent modifiables ici, pour celui qui arrive par un lien. */}
              {/* ⚠️ PLUS DE CHAMPS `type="date"` DANS LE FORMULAIRE.
                  Deux raisons, et la première suffisait. D'abord ils faisaient
                  ressaisir des dates DÉJÀ choisies au calendrier, en haut de la
                  page : le formulaire redemandait ce que le visiteur venait de
                  dire. Ensuite le navigateur y pose sa propre icône de
                  calendrier, qu'on ne peut pas habiller — un petit carré blanc
                  sur le bleu nuit, laid sur téléphone et hors de la charte.
                  Le séjour est donc RAPPELÉ, pas redemandé, et « Modifier »
                  renvoie au calendrier, seul endroit où l'on voit ce qui est
                  libre. Les dates partent bien avec la demande : elles sont
                  lues dans l'état, pas dans un champ. */}
              <div className="md:col-span-2 rounded-xl bg-white/10 border border-white/20 px-4 py-3
                              flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-widest text-white/60">
                    {T.sejourTitre}
                  </span>
                  <span className="block mt-0.5">
                    {jourLong(arrivee, langue)} → {jourLong(depart, langue)}
                    <span className="text-white/60">
                      {" · "}{Math.max(nuits, NUITS_MIN)}{" "}
                      {langue === "en" ? (nuits > 1 ? "nights" : "night") : (nuits > 1 ? "nuits" : "nuit")}
                      {pax === null ? "" : ` · ${pax} ${T.personnes}`}
                      {formule === null ? "" :
                        ` · ${formule === "complete" ? T.formuleComplete : T.formuleDemi}`}
                    </span>
                  </span>
                </div>
                <a href="#dates" className="text-sm font-bold underline underline-offset-4 text-white/90 hover:text-white">
                  {T.modifier}
                </a>
              </div>
              <Champ label={T.nom} value={form.nom} onChange={(v) => setForm({ ...form, nom: v })} requis />
              <Champ label={T.email} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} requis />
              <Champ label={T.tel} type="tel" value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} />
              <div className="md:col-span-2">
                <Champ label={T.societe} value={form.societe} onChange={(v) => setForm({ ...form, societe: v })} />
              </div>
              <label className="md:col-span-2">
                <span className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-1">{T.votreMessage}</span>
                <textarea rows={4} value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/40" />
              </label>

              {envoi === "echec" && (
                <p className="md:col-span-2 text-sm text-amber-200">
                  {T.echec}{" "}
                  <a href={`mailto:${CONTACT.email}`} className="underline">{CONTACT.email}</a>
                </p>
              )}

              <div className="md:col-span-2 flex flex-wrap items-center gap-4">
                <button type="submit" disabled={envoi === "envoi"}
                  className="btn btn-or px-8 py-4 text-base shadow-lg disabled:opacity-60">
                  {envoi === "envoi"
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {T.envoi}</>
                    : <>{T.envoyer} <ArrowRight className="w-4 h-4" /></>}
                </button>
                <a href={`tel:${CONTACT.telephone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-bold">
                  <Phone className="w-4 h-4" /> {CONTACT.telephone}
                </a>
              </div>
            </form>
          )}

          <p className="mt-10 text-sm text-white/50">
            <Link href={langue === "en" ? "/en" : "/"} className="underline underline-offset-2">
              {langue === "en" ? "Hôtels Toulon Bord de Mer" : "Hôtels Toulon Bord de Mer"}
            </Link>
          </p>
        </div>
      </section>

      {/* La photo en grand.
          Quatre façons d'en sortir — la croix, un clic à côté, Échap, et le
          bouton retour du téléphone n'y change rien puisqu'on ne navigue pas.
          Une visionneuse dont on ne sort pas est pire que pas de visionneuse.

          ⚠️ ET ON PEUT LA FEUILLETER. Elle ouvrait une photo et s'arrêtait
          là : il fallait fermer, viser la vignette suivante, rouvrir. Sur
          téléphone, où l'on ne voit qu'une vignette à la fois, ça revenait à
          regarder les photos une par une à l'aveugle. Balayage au doigt,
          flèches à la souris, flèches du clavier — trois gestes pour le même
          mouvement, chacun naturel sur son appareil. */}
      {zoom !== null && (
        <div role="dialog" aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoom(null)}>

          <button type="button" onClick={() => setZoom(null)} autoFocus
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label={langue === "en" ? "Close" : "Fermer"}>
            <X className="w-5 h-5" />
          </button>

          {/* Le rang, pour savoir où l'on en est : sans lui, on ne sait pas
              s'il reste deux photos ou dix, donc on arrête de chercher. */}
          <p className="absolute top-6 left-6 z-10 text-sm text-white/70 tabular-nums">
            {zoom + 1} / {CONTENU.galerie.length}
          </p>

          {[-1, 1].map((pas) => (
            <button key={pas} type="button"
              onClick={(e) => { e.stopPropagation(); feuilleter(pas); }}
              aria-label={pas === 1
                ? (langue === "en" ? "Next photo" : "Photo suivante")
                : (langue === "en" ? "Previous photo" : "Photo précédente")}
              className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 items-center justify-center
                          w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/25 transition
                          ${pas === 1 ? "right-4" : "left-4"}`}>
              {pas === 1 ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
            </button>
          ))}

          {/* ⚠️ LE BALAYAGE SE MESURE, IL NE SE DEVINE PAS. Sous quarante
              pixels, c'est un appui un peu tremblé et non un geste : le
              déclencher là ferait sauter la photo quand on voulait seulement
              fermer. Et `stopPropagation` empêche le clic de traverser
              jusqu'au fond, qui ferme. */}
          <div className="relative w-full max-w-5xl aspect-[4/3]"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { doigt.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              const depart = doigt.current;
              doigt.current = null;
              if (depart === null) return;
              const ecart = (e.changedTouches[0]?.clientX ?? depart) - depart;
              if (Math.abs(ecart) > 40) feuilleter(ecart < 0 ? 1 : -1);
            }}>
            <Image src={CONTENU.galerie[zoom].src} alt={CONTENU.galerie[zoom].alt[langue]}
              fill sizes="100vw" className="object-contain" />
          </div>

          <p className="absolute bottom-6 inset-x-0 text-center text-sm text-white/70 px-6">
            {CONTENU.galerie[zoom].alt[langue]}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- morceaux */

function Liste({ titre, items, coche }: { titre: string; items: string[]; coche?: boolean }) {
  return (
    <div>
      {/* Un cran plus petit qu'avant : à quatre colonnes, « Compris dans le
          tarif » se cassait en deux lignes et décalait toutes les listes. */}
      <h3 className="font-serif text-xl">{titre}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            {coche
              ? <Check className="w-4 h-4 mt-1 flex-shrink-0 text-emerald-600" />
              : <span className="mt-2 w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />}
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Champ({ label, value, onChange, type = "text", requis }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; requis?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-1">{label}</span>
      <input type={type} value={value} required={requis} min={type === "number" ? 1 : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/40" />
    </label>
  );
}

/** Une flèche qui pousse la bande d'une vignette et demie.
 *
 *  ⚠️ ELLE NE SE DÉSACTIVE PAS AUX EXTRÉMITÉS, ET C'EST VOLONTAIRE. Il aurait
 *  fallu écouter le défilement pour savoir où l'on en est, donc rendre à
 *  chaque pixel — pour un gain nul : arrivé au bout, un clic de plus ne fait
 *  simplement rien, ce que la bande immobile dit très bien toute seule. */
function FlecheBande({ sens, bande, langue }: {
  sens: "gauche" | "droite";
  bande: React.RefObject<HTMLDivElement | null>;
  langue: LangueVilla;
}) {
  const pousser = () => {
    const el = bande.current;
    if (!el) return;
    // Un peu plus que la largeur visible d'une vignette : on ne veut pas
    // s'arrêter pile sur une coupure, sinon on ne voit jamais rien de neuf.
    const pas = Math.min(el.clientWidth * 0.8, 520);
    el.scrollBy({ left: sens === "droite" ? pas : -pas, behavior: "smooth" });
  };
  const titre = sens === "droite"
    ? (langue === "en" ? "Next photos" : "Photos suivantes")
    : (langue === "en" ? "Previous photos" : "Photos précédentes");
  return (
    <button type="button" onClick={pousser} aria-label={titre} title={titre}
      className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 items-center justify-center
                  w-11 h-11 rounded-full bg-white/95 shadow-lg border border-slate-200
                  hover:bg-white transition ${sens === "droite" ? "-right-3" : "-left-3"}`}>
      {sens === "droite" ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
    </button>
  );
}
