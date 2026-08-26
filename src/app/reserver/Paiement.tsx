"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Langue } from "@/lib/mewsBooking";

/* L'écran de règlement, en deux temps.
 *
 * ⚠️ LA CARTE NE PASSE PLUS DU TOUT PAR NOUS — ni en clair, ni tokenisée.
 * L'écran a d'abord monté les iframes PciProxy et récolté un `transactionId`.
 * Ça marchait, mais le mode `TOKENIZE` ne fait que tokeniser : aucune
 * autorisation, donc aucun 3-D Secure, et la demande de préautorisation créée
 * par Mews expirait sans que personne ne la règle. Constaté le 26/08/2026 sur
 * les réservations 29816 et 29817.
 *
 * On passe à Mews Payments Checkout : un iframe servi par Mews, injecté dans
 * notre page. Il collecte la carte, joue le 3-D Secure, et poste le paiement
 * dans le PMS. Mews porte la certification PCI-DSS ; nous ne voyons plus rien.
 * Apple Pay et Google Pay viennent avec, sans rien coder — la configuration de
 * paiement de l'hôtel les annonce actifs depuis le début.
 *
 * Deux temps, parce que la demande de paiement a besoin d'un client et d'une
 * réservation pour exister :
 *   1. les coordonnées, chez nous ;
 *   2. le checkout, une fois l'option posée et la demande ouverte.
 */

const SCRIPT_CHECKOUT = "https://cdn.mews.com/payments/checkout-embed.js";

/* ⚠️ LE REGLEMENT EN LIGNE EST COUPE — 26/08/2026, fin de journee.
 *
 * Le checkout de Mews s'affiche et accepte la saisie, mais son bouton ne
 * soumet rien : aucune requete, aucun rappel, pas meme `onFailure`. Sur les
 * portefeuilles, Mews repond au moins « Only PaymentCard is supported for
 * preauthorizations » ; sur la carte, c'est le silence.
 *
 * Tant que ce n'est pas compris, laisser le formulaire ouvert coute plus qu'il
 * ne rapporte : le client remplit ses coordonnees, se heurte a un bouton mort,
 * et laisse derriere lui une option qui immobilise une chambre vingt minutes.
 * Aucune vente n'est perdue en coupant — aucune ne passait.
 *
 * `?diag=nu` continue de charger le checkout, pour pouvoir chercher.
 * A REMETTRE A `false` des que le paiement fonctionne. */
const REGLEMENT_COUPE = true;

type Checkout = {
  load: (c: Record<string, unknown>) => void;
  destroy?: () => void;
};
declare global {
  interface Window { Mews?: { PaymentCheckout?: Checkout } }
}

const TEXTES = {
  fr: {
    titre: "Vos coordonnées",
    sousTitre: "Puis le règlement, chez notre prestataire.",
    prenom: "Prénom", nom: "Nom", email: "Email", telephone: "Téléphone",
    telephoneAide: "Pour vous joindre le jour de votre arrivée.",
    mot: "Un mot pour l'hôtel (facultatif)",
    motAide: "Heure d'arrivée prévue, occasion particulière…",
    continuer: "Continuer vers le paiement",
    prepare: "On prépare votre réservation…",
    titrePaiement: "Votre règlement",
    empreinte: (m: string) => `Votre carte n'est pas débitée : une préautorisation de ${m} garantit la chambre. Le séjour se règle à l'hôtel.`,
    debit: (m: string) => `Votre carte est débitée de ${m}. Ce tarif n'est pas remboursable.`,
    fermer: "Fermer", retour: "Retour",
    sur: "Le paiement est traité par Mews, notre prestataire : vos données bancaires ne transitent pas par ce site.",
    retractation:
      "Conformément à l'article L221-28 du code de la consommation, une réservation d'hébergement à date déterminée ne donne pas de droit de rétractation. Les conditions d'annulation de votre tarif s'appliquent.",
    champsManquants: "Il manque vos coordonnées : prénom, nom et email.",
    emailInvalide: "Cette adresse email ne semble pas valide.",
    plusDispo: "Cette chambre vient d'être prise. Revenez en arrière pour en choisir une autre.",
    echec: "La réservation n'a pas abouti. Rien n'a été débité — appelez-nous au 04 94 41 36 23 et nous la prenons avec vous.",
    echecPaiement: "Le paiement n'est pas passé. Vous pouvez réessayer ci-dessus, ou nous appeler au 04 94 41 36 23.",
    tenue: "Votre chambre est tenue 20 minutes, le temps du règlement.",
    coupeTitre: "Réservons ensemble, par téléphone",
    coupe: "Le règlement en ligne est momentanément indisponible. Appelez-nous : nous prenons votre réservation avec vous en deux minutes, au même tarif et avec les mêmes avantages.",
  },
  en: {
    titre: "Your details",
    sousTitre: "Then payment, with our provider.",
    prenom: "First name", nom: "Last name", email: "Email", telephone: "Phone",
    telephoneAide: "So we can reach you on the day you arrive.",
    mot: "A word for the hotel (optional)",
    motAide: "Expected arrival time, a special occasion…",
    continuer: "Continue to payment",
    prepare: "Preparing your booking…",
    titrePaiement: "Your payment",
    empreinte: (m: string) => `Your card is not charged: a ${m} hold secures the room. You settle at the hotel.`,
    debit: (m: string) => `Your card is charged ${m}. This rate is non-refundable.`,
    fermer: "Close", retour: "Back",
    sur: "Payment is handled by Mews, our provider — your card details never pass through this site.",
    retractation:
      "Under French consumer law (art. L221-28), accommodation booked for a set date carries no right of withdrawal. Your rate's cancellation terms apply.",
    champsManquants: "Your details are incomplete: first name, last name and email.",
    emailInvalide: "That email address doesn't look valid.",
    plusDispo: "That room has just been taken. Go back to choose another one.",
    echec: "The booking didn't go through. Nothing was charged — call us on +33 4 94 41 36 23 and we'll take it with you.",
    echecPaiement: "The payment didn't go through. You can try again above, or call us on +33 4 94 41 36 23.",
    tenue: "Your room is held for 20 minutes while you pay.",
    coupeTitre: "Let's book it together, by phone",
    coupe: "Online payment is temporarily unavailable. Call us — we'll take your booking with you in two minutes, at the same rate and with the same benefits.",
  },
} as const;

export type SejourAPayer = {
  categorieId: string;
  tarifId: string;
  arrivee: string;
  depart: string;
  adultes: number;
  /** Ce que le client va lire : nom de la chambre, tarif, nuits. */
  resume: string;
  /** Le total, formaté dans la langue de la page. */
  totalFormate: string;
  /** Ce qui va arriver à la carte, en une phrase — calculé depuis le groupe
   *  tarifaire Mews, jamais écrit en dur. Vide si Mews ne dit rien. */
  reglement: string;
};

type Ouverte = {
  groupeId: string;
  numeros: string[];
  reservationIds: string[];
  demandeId: string;
  reglement: { debite: boolean; montant: number };
};

export default function Paiement({
  sejour, langue, onFermer, onReserve,
}: {
  sejour: SejourAPayer;
  langue: Langue;
  onFermer: () => void;
  onReserve: (resa: {
    groupeId: string; numeros: string[];
    client: { prenom: string; nom: string; email: string; telephone: string };
  }) => void;
}) {
  const T = TEXTES[langue];

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motHotel, setMotHotel] = useState("");

  const [ouverte, setOuverte] = useState<Ouverte | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const boite = useRef<HTMLDivElement | null>(null);
  // Les rappels du checkout vivent hors de React : ils liraient des valeurs
  // figées au montage. On leur donne une référence toujours à jour.
  const enCours = useRef(false);

  /* `?diag=nu` passe outre : c'est le seul chemin qui reste pour chercher. */
  const [diag] = useState(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("diag"));
  const coupe = REGLEMENT_COUPE && diag !== "nu" && diag !== "payment";

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const complet = prenom.trim() && nom.trim() && emailOk;

  /* Temps 1 — poser l'option et ouvrir la demande de paiement. */
  const ouvrir = async () => {
    if (enCours.current) return;
    setErreur(null);
    if (!prenom.trim() || !nom.trim() || !email.trim()) { setErreur(T.champsManquants); return; }
    if (!emailOk) { setErreur(T.emailInvalide); return; }
    enCours.current = true;
    setEnvoi(true);
    try {
      const r = await fetch("/api/reserver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          langue,
          client: { prenom: prenom.trim(), nom: nom.trim(), email: email.trim(), telephone: telephone.trim() },
          sejour: {
            categorieId: sejour.categorieId, tarifId: sejour.tarifId,
            arrivee: sejour.arrivee, depart: sejour.depart, adultes: sejour.adultes,
            notes: motHotel.trim() || undefined,
          },
          ...(diag === "payment" ? { diagPayment: true } : {}),
        }),
      });
      const j = await r.json().catch(() => null);
      if (r.status === 409) { setErreur(T.plusDispo); setEnvoi(false); enCours.current = false; return; }
      if (!r.ok || !j?.demandeId) { setErreur(T.echec); setEnvoi(false); enCours.current = false; return; }
      setOuverte(j as Ouverte);
      setEnvoi(false);
      enCours.current = false;
    } catch {
      setErreur(T.echec);
      setEnvoi(false);
      enCours.current = false;
    }
  };

  /* Temps 2 — la vente se ferme SEULEMENT quand le paiement a abouti. */
  const finaliser = useCallback(async () => {
    if (!ouverte) return;
    try {
      const r = await fetch("/api/reserver/confirmer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          langue,
          reservationIds: ouverte.reservationIds,
          demandeId: ouverte.demandeId,
          sejour: {
            categorieId: sejour.categorieId, tarifId: sejour.tarifId,
            arrivee: sejour.arrivee, depart: sejour.depart, adultes: sejour.adultes,
          },
        }),
      });
      if (!r.ok) { setErreur(T.echec); return; }
      onReserve({
        groupeId: ouverte.groupeId,
        numeros: ouverte.numeros,
        client: { prenom: prenom.trim(), nom: nom.trim(), email: email.trim(), telephone: telephone.trim() },
      });
    } catch {
      setErreur(T.echec);
    }
  }, [ouverte, langue, sejour, onReserve, prenom, nom, email, telephone, T]);

  const finaliserRef = useRef(finaliser);
  useEffect(() => { finaliserRef.current = finaliser; }, [finaliser]);

  /* Le checkout de Mews, injecté dans notre page.
   *
   * ⚠️ PAS DE `dataBaseUrl` ICI. Ce paramètre pointe le checkout sur
   * l'environnement de démonstration : laissé en production, le trafic réel y
   * partirait en silence et aucun paiement ne serait encaissé. */
  useEffect(() => {
    if (!ouverte) return;
    let annule = false;

    /* Mode diagnostic : `?diag=nu` charge le checkout SANS rien de ce qu'on lui
     * passe — ni styles, ni langue, ni restriction de moyens. Si le bouton
     * fonctionne ainsi, la cause est dans notre configuration ; sinon elle est
     * dans la demande de paiement ou chez Mews. Une seule manipulation au lieu
     * de trois allers-retours. */
    const nu = diag === "nu" || diag === "payment";

    const monter = () => {
      const api = window.Mews?.PaymentCheckout;
      if (annule || !api) return;
      if (nu) {
        console.warn("Mews checkout — mode nu (diag=nu), demande", ouverte.demandeId);
        api.load({
          containerId: "mews-checkout",
          requestId: ouverte.demandeId,
          onSuccess: (e?: unknown) => { console.warn("Mews checkout — succes", e); void finaliserRef.current(); },
          onFailure: (e?: { type?: string; error?: string }) => {
            console.error("Mews checkout —", e?.type, e?.error);
            if (!annule) setErreur(T.echecPaiement);
          },
        });
        return;
      }
      api.load({
        containerId: "mews-checkout",
        requestId: ouverte.demandeId,
        languageCode: langue === "fr" ? "fr-FR" : "en-GB",
        /* ⚠️ UNE PRÉAUTORISATION NE SE FAIT QU'À LA CARTE.
         *
         * Mews, mot pour mot : « Only PaymentCard is supported for
         * preauthorizations. Type Alternative is not supported. » Google Pay,
         * Apple Pay, iDEAL et SEPA sont des moyens « alternatifs » : sur le
         * tarif flexible, qui ne prend qu'une empreinte, ils sont refusés côté
         * serveur.
         *
         * On les affichait quand même. Le client voyait donc un bouton Google
         * Pay qui ne pouvait qu'échouer — et l'échec tombait APRÈS le clic, une
         * fois son empreinte digitale donnée. Sur le prépayé, qui est un vrai
         * paiement, ils restent offerts. */
        ...(ouverte.reglement.debite ? {} : { enabledPaymentMethods: ["paymentCard"] }),
        onSuccess: (e?: unknown) => {
          console.warn("Mews checkout — succes", e);
          if (!annule) void finaliserRef.current();
        },
        /* Mews donne la raison dans `event.error` — un texte lisible, pas un
         * code stable. On la journalise telle quelle : sans elle, un refus
         * ressemble à une panne et on cherche du mauvais côté. Le client, lui,
         * ne voit que la phrase utile et le téléphone. */
        onFailure: (e?: { type?: string; error?: string }) => {
          console.error("Mews checkout —", e?.type, e?.error);
          if (!annule) setErreur(T.echecPaiement);
        },
        // Aux couleurs de la maison. Mews ne laisse pas régler la typographie,
        // mais les couleurs et le rayon suffisent à ce que le cadre n'ait pas
        // l'air d'appartenir à quelqu'un d'autre au moment de payer.
        styles: {
          global: {
            textColorPrimary: "#20323d",
            textColorSecondary: "#6b7a82",
            backgroundColor: "#ffffff",
            borderRadius: 12,
          },
          button: {
            backgroundColor: "#c6a972",
            textColor: "#00263a",
            hover: { backgroundColor: "#d4bb8c" },
          },
          input: { borderColor: "#e3e0d9", focus: { borderColor: "#c6a972" } },
          spinner: { primaryColor: "#004e7c", secondaryColor: "#c6a972", tertiaryColor: "#e3e0d9" },
        },
      });
    };

    if (window.Mews?.PaymentCheckout) { monter(); }
    else {
      const balise = document.createElement("script");
      balise.src = SCRIPT_CHECKOUT;
      balise.async = true;
      balise.onload = monter;
      balise.onerror = () => { if (!annule) setErreur(T.echec); };
      document.head.appendChild(balise);
    }

    return () => {
      annule = true;
      try { window.Mews?.PaymentCheckout?.destroy?.(); } catch { /* déjà parti */ }
    };
  }, [ouverte, langue, T]);

  /* Fermer avant d'avoir payé : on renonce à la demande. L'option, elle,
   * s'éteint toute seule au bout de vingt minutes. */
  const fermer = () => {
    if (ouverte) {
      void fetch(`/api/reserver/confirmer?demande=${ouverte.demandeId}`, { method: "DELETE" }).catch(() => {});
    }
    onFermer();
  };

  // Échap ferme, et le focus ne quitte pas la surcouche.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !envoi) { e.preventDefault(); fermer(); }
      if (e.key === "Tab" && boite.current) {
        const cibles = boite.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input, textarea, a[href]",
        );
        if (!cibles.length) return;
        const premier = cibles[0], dernier = cibles[cibles.length - 1];
        if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
        else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
      }
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envoi, ouverte]);

  const champ = "w-full rounded-xl border border-[#e3e0d9] bg-white px-3.5 py-2.5 text-[15px] text-navy outline-none transition-colors placeholder:text-[#b0b6ba] focus:border-gold";
  const etiquette = "block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a9299]";

  return (
    <div
      role="dialog" aria-modal="true" aria-label={T.titre}
      className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/92 p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget && !envoi) fermer(); }}
    >
      <div ref={boite} className="mx-auto w-full max-w-[560px] rounded-2xl bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl leading-tight text-navy">
              {ouverte ? T.titrePaiement : T.titre}
            </h2>
            <p className="mt-1 text-[13.5px] text-[#6b7a82]">{ouverte ? T.tenue : T.sousTitre}</p>
          </div>
          <button
            type="button" onClick={fermer} disabled={envoi} aria-label={T.fermer}
            className="shrink-0 rounded-full border border-[#e3e0d9] px-3 py-1.5 text-[13px] font-semibold text-[#6b7a82] transition-colors hover:border-gold disabled:opacity-40"
          >
            {T.retour}
          </button>
        </div>

        {/* Ce qu'on achète, rappelé sous les yeux : on ne demande pas d'argent
            sans redire pourquoi, ni combien. */}
        <div className="mt-4 flex items-baseline justify-between gap-3 rounded-xl bg-[#faf7f1] px-4 py-3">
          <span className="text-[13.5px] leading-snug text-[#3c4a52]">{sejour.resume}</span>
          <span className="shrink-0 text-[20px] font-bold tabular-nums text-navy">{sejour.totalFormate}</span>
        </div>

        {coupe ? (
          /* Rien n'est cree cote Mews dans ce cas : le client n'a pas rempli de
             coordonnees et aucune option ne part. Il repart avec le telephone,
             qui est de toute facon le chemin sans commission. */
          <div className="mt-5">
            <p className="font-serif text-xl text-navy">{T.coupeTitre}</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[#5b6a72]">{T.coupe}</p>
            <a
              href="tel:+33494413623"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-[17px] font-bold text-navy-deep transition hover:brightness-105"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
              </svg>
              04 94 41 36 23
            </a>
          </div>
        ) : !ouverte ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className={etiquette}>{T.prenom}</span>
                <input className={champ} value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" />
              </label>
              <label className="grid gap-1.5">
                <span className={etiquette}>{T.nom}</span>
                <input className={champ} value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" />
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <span className={etiquette}>{T.email}</span>
                <input className={champ} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <span className={etiquette}>{T.telephone}</span>
                <input className={champ} type="tel" inputMode="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} autoComplete="tel" />
                <span className="text-[12px] text-[#8a9299]">{T.telephoneAide}</span>
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <span className={etiquette}>{T.mot}</span>
                <textarea className={`${champ} min-h-[64px] resize-y`} value={motHotel} onChange={(e) => setMotHotel(e.target.value)} maxLength={500} />
                <span className="text-[12px] text-[#8a9299]">{T.motAide}</span>
              </label>
            </div>

            {sejour.reglement && (
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-[#e3e0d9] bg-[#faf7f1] px-3.5 py-3 text-[13px] leading-snug text-[#3c4a52]">
                <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-gold-ink" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="10.5" width="16" height="10" rx="2" />
                  <path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3" />
                </svg>
                {sejour.reglement}
              </p>
            )}

            {erreur && <p className="mt-3 text-[13.5px] leading-snug text-[#a8571f]">{erreur}</p>}

            <button
              type="button" onClick={ouvrir} disabled={!complet || envoi}
              className="mt-4 w-full rounded-full bg-gold px-6 py-3.5 text-[16px] font-bold text-navy-deep transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#ddd8ce] disabled:text-[#9a9a95]"
            >
              {envoi ? T.prepare : T.continuer}
            </button>
          </>
        ) : (
          <>
            {/* Mews injecte son iframe ICI. Le conteneur porte une hauteur
                minimale : l'application arrive sans dimensions et le cadre
                sauterait au montage. */}
            <div id="mews-checkout" className="mt-5 min-h-[560px]" />
            {erreur && <p className="mt-3 text-[13.5px] leading-snug text-[#a8571f]">{erreur}</p>}
          </>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-[#8a9299]">{T.sur}</p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-[#a0a8ad]">{T.retractation}</p>
      </div>
    </div>
  );
}
