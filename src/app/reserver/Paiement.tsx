"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Langue } from "@/lib/mewsBooking";

/* L'écran de règlement.
 *
 * ⚠️ LA CARTE NE PASSE PAS PAR NOUS. Le numéro et le cryptogramme sont saisis
 * dans deux iframes servies par PciProxy : ni cette page, ni notre serveur, ni
 * nos journaux ne les voient jamais. PciProxy rend un `transactionId` — un jeton
 * inutilisable ailleurs, valable trente minutes — et c'est lui seul qui part
 * vers `/api/reserver`, puis vers Mews. C'est la condition pour rester hors du
 * périmètre lourd de PCI-DSS, et c'est pour ça qu'on passe par la Booking
 * Engine plutôt que par le Connector.
 *
 * Les règles d'encaissement (préautorisation ou débit immédiat) sont portées
 * par les rate groups Mews et s'exécutent chez eux : rien ne se décide ici.
 */

const SCRIPT_PCIPROXY = "https://pay.datatrans.com/upp/payment/js/secure-fields-2.0.0.js";

type SecureFieldsApi = {
  initTokenize: (
    marchand: string,
    champs: Record<string, string | { placeholderElementId: string }>,
  ) => void;
  submit: (donnees: { expm: number; expy: number }) => void;
  on: (evenement: string, rappel: (donnees: Record<string, unknown>) => void) => void;
  destroy?: () => void;
  setStyle?: (champ: string, style: Record<string, string>) => void;
};

declare global {
  interface Window {
    SecureFields?: new () => SecureFieldsApi;
  }
}

const TEXTES = {
  fr: {
    titre: "Vos coordonnées",
    sousTitre: "Puis votre carte, pour garantir la chambre.",
    prenom: "Prénom",
    nom: "Nom",
    email: "Email",
    telephone: "Téléphone",
    telephoneAide: "Pour vous joindre le jour de votre arrivée.",
    mot: "Un mot pour l'hôtel (facultatif)",
    // Pas de « lits jumeaux » : une suggestion est une promesse implicite, et
    // celle-la se paie a la reception un soir de complet. On ne propose que ce
    // qu'on tient sans effort.
    motAide: "Heure d'arrivée prévue, occasion particulière…",
    carte: "Votre carte",
    porteur: "Nom sur la carte",
    numero: "Numéro de carte",
    expiration: "Expiration",
    crypto: "Cryptogramme",
    payer: (m: string) => `Réserver · ${m}`,
    envoi: "Nous réservons votre chambre…",
    fermer: "Fermer",
    retour: "Retour",
    sur: "Carte saisie directement chez notre prestataire de paiement : elle ne transite pas par ce site.",
    retractation:
      "Conformément à l'article L221-28 du code de la consommation, une réservation d'hébergement à date déterminée ne donne pas de droit de rétractation. Les conditions d'annulation de votre tarif s'appliquent.",
    champsManquants: "Il manque vos coordonnées : prénom, nom et email.",
    emailInvalide: "Cette adresse email ne semble pas valide.",
    expInvalide: "La date d'expiration n'est pas valide.",
    carteRefusee: "Votre carte n'a pas été acceptée. Vérifiez le numéro, la date et le cryptogramme.",
    echec: "La réservation n'a pas abouti. Rien n'a été débité — appelez-nous au 04 94 41 36 23 et nous la prenons avec vous.",
  },
  en: {
    titre: "Your details",
    sousTitre: "Then your card, to hold the room.",
    prenom: "First name",
    nom: "Last name",
    email: "Email",
    telephone: "Phone",
    telephoneAide: "So we can reach you on the day you arrive.",
    mot: "A word for the hotel (optional)",
    motAide: "Expected arrival time, a special occasion…",
    carte: "Your card",
    porteur: "Name on card",
    numero: "Card number",
    expiration: "Expiry",
    crypto: "Security code",
    payer: (m: string) => `Book · ${m}`,
    envoi: "Booking your room…",
    fermer: "Close",
    retour: "Back",
    sur: "Your card is entered directly with our payment provider — it never passes through this site.",
    retractation:
      "Under French consumer law (art. L221-28), accommodation booked for a set date carries no right of withdrawal. Your rate's cancellation terms apply.",
    champsManquants: "Your details are incomplete: first name, last name and email.",
    emailInvalide: "That email address doesn't look valid.",
    expInvalide: "That expiry date isn't valid.",
    carteRefusee: "Your card wasn't accepted. Check the number, the expiry date and the security code.",
    echec: "The booking didn't go through. Nothing was charged — call us on +33 4 94 41 36 23 and we'll take it with you.",
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
  /** Ce qui va arriver a la carte, en une phrase — calcule depuis le groupe
   *  tarifaire Mews (`SettlementAction` / `SettlementValue`), jamais ecrit en
   *  dur. Vide si Mews ne dit rien : on prefere le silence a une supposition. */
  reglement: string;
};

export default function Paiement({
  sejour, langue, publicKey, onFermer, onReserve,
}: {
  sejour: SejourAPayer;
  langue: Langue;
  /** La `PublicKey` de `hotels/getPaymentConfiguration` — l'identifiant marchand PciProxy. */
  publicKey: string;
  onFermer: () => void;
  /* `client` remonte avec la réservation : l'écran de confirmation propose une
   * table au rooftop, et il ne doit RIEN redemander de ce qui vient d'être
   * saisi ici. C'est toute la différence entre un bouton et un formulaire. */
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
  const [porteur, setPorteur] = useState("");
  const [exp, setExp] = useState("");

  const [pret, setPret] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const sf = useRef<SecureFieldsApi | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);
  // Les rappels de PciProxy vivent hors de React : ils liraient des valeurs
  // figées au montage. On leur donne une référence toujours à jour.
  const enCours = useRef(false);

  /* Le formulaire est-il complet ? Vérifié ici ET dans la route serveur : le
   * client mérite un message avant de donner sa carte, le serveur ne fait
   * jamais confiance au navigateur. */
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const moisAn = exp.match(/^(\d{2})\s*\/?\s*(\d{2})$/);
  const expOk = !!moisAn && Number(moisAn[1]) >= 1 && Number(moisAn[1]) <= 12;
  const complet = prenom.trim() && nom.trim() && emailOk && porteur.trim() && expOk && pret;

  // ── Envoi final, une fois la carte tokenisée ───────────────────────────────
  const finaliser = useCallback(async (jeton: string) => {
    if (!moisAn) return;
    try {
      const r = await fetch("/api/reserver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          langue,
          client: { prenom, nom, email, telephone },
          sejour: {
            categorieId: sejour.categorieId,
            tarifId: sejour.tarifId,
            arrivee: sejour.arrivee,
            depart: sejour.depart,
            adultes: sejour.adultes,
            notes: motHotel.trim() || undefined,
          },
          carte: {
            jeton,
            // Mews attend 'AAAA-MM' quand PciProxy raisonne en MM/AA.
            expiration: `20${moisAn[2]}-${moisAn[1]}`,
            porteur: porteur.trim(),
          },
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.groupeId) {
        setErreur(T.echec);
        setEnvoi(false);
        enCours.current = false;
        return;
      }
      // `numeros` porte les numeros de confirmation rendus par Mews. Ils
      // etaient lus par la route, puis jetes ici : c'est pourtant la seule
      // chose que le client aura a citer s'il appelle l'hotel.
      onReserve({
        groupeId: j.groupeId as string,
        numeros: Array.isArray(j.numeros) ? (j.numeros as string[]) : [],
        client: {
          prenom: prenom.trim(), nom: nom.trim(),
          email: email.trim(), telephone: telephone.trim(),
        },
      });
    } catch {
      setErreur(T.echec);
      setEnvoi(false);
      enCours.current = false;
    }
  }, [moisAn, langue, prenom, nom, email, telephone, motHotel, porteur, sejour, onReserve, T]);

  const finaliserRef = useRef(finaliser);
  useEffect(() => { finaliserRef.current = finaliser; }, [finaliser]);

  // ── Chargement de PciProxy et montage des deux iframes ─────────────────────
  useEffect(() => {
    let annule = false;

    const monter = () => {
      if (annule || !window.SecureFields) return;
      const api = new window.SecureFields();
      sf.current = api;
      api.initTokenize(publicKey, {
        cardNumber: "pciproxy-numero",
        cvv: "pciproxy-crypto",
      });
      api.on("ready", () => { if (!annule) setPret(true); });
      api.on("success", (d) => {
        const jeton = typeof d.transactionId === "string" ? d.transactionId : null;
        if (!jeton) { setErreur(T.carteRefusee); setEnvoi(false); enCours.current = false; return; }
        void finaliserRef.current(jeton);
      });
      api.on("error", () => {
        if (annule) return;
        setErreur(T.carteRefusee);
        setEnvoi(false);
        enCours.current = false;
      });
    };

    if (window.SecureFields) { monter(); return () => { annule = true; }; }

    const balise = document.createElement("script");
    balise.src = SCRIPT_PCIPROXY;
    balise.async = true;
    balise.onload = monter;
    balise.onerror = () => { if (!annule) setErreur(T.echec); };
    document.head.appendChild(balise);

    return () => {
      annule = true;
      try { sf.current?.destroy?.(); } catch { /* PciProxy n'expose pas toujours destroy */ }
    };
  }, [publicKey, T]);

  // Échap ferme, et le focus ne quitte pas la surcouche — même règle que la
  // galerie : un écran de paiement qu'on peut quitter au clavier sans le voir
  // est pire qu'inutile.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !envoi) { e.preventDefault(); onFermer(); }
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
  }, [onFermer, envoi]);

  const envoyer = () => {
    if (enCours.current) return;
    setErreur(null);
    if (!prenom.trim() || !nom.trim() || !email.trim()) { setErreur(T.champsManquants); return; }
    if (!emailOk) { setErreur(T.emailInvalide); return; }
    if (!moisAn) { setErreur(T.expInvalide); return; }
    enCours.current = true;
    setEnvoi(true);
    // À partir d'ici la main passe à PciProxy : la suite arrive dans `success`.
    sf.current?.submit({ expm: Number(moisAn[1]), expy: Number(moisAn[2]) });
  };

  const champ = "w-full rounded-xl border border-[#e3e0d9] bg-white px-3.5 py-2.5 text-[15px] text-navy outline-none transition-colors placeholder:text-[#b0b6ba] focus:border-gold";
  const etiquette = "block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a9299]";

  return (
    <div
      role="dialog" aria-modal="true" aria-label={T.titre}
      className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/92 p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget && !envoi) onFermer(); }}
    >
      <div ref={boite} className="mx-auto w-full max-w-[560px] rounded-2xl bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl leading-tight text-navy">{T.titre}</h2>
            <p className="mt-1 text-[13.5px] text-[#6b7a82]">{T.sousTitre}</p>
          </div>
          <button
            type="button" onClick={onFermer} disabled={envoi} aria-label={T.fermer}
            className="shrink-0 rounded-full border border-[#e3e0d9] px-3 py-1.5 text-[13px] font-semibold text-[#6b7a82] transition-colors hover:border-gold disabled:opacity-40"
          >
            {T.retour}
          </button>
        </div>

        {/* Ce qu'on achète, rappelé sous les yeux : on ne demande pas une carte
            sans redire pourquoi, ni combien. */}
        <div className="mt-4 flex items-baseline justify-between gap-3 rounded-xl bg-[#faf7f1] px-4 py-3">
          <span className="text-[13.5px] leading-snug text-[#3c4a52]">{sejour.resume}</span>
          <span className="shrink-0 text-[20px] font-bold tabular-nums text-navy">{sejour.totalFormate}</span>
        </div>

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

        <h3 className="mt-6 font-serif text-xl text-navy">{T.carte}</h3>
        {/* Ce qui va lui arriver, AVANT les champs et non apres le bouton.
            Les deux tarifs demandent une carte, et c'est tout ce que la page
            disait : l'un la debite en entier a la seconde ou l'on valide,
            l'autre y pose une preautorisation de 1 %. Un client qui decouvre
            un debit complet la ou il croyait laisser une empreinte appelle sa
            banque, pas l'hotel. La phrase est calculee depuis Mews, donc elle
            suit la regle reelle du tarif retenu. */}
        {sejour.reglement && (
          <p className="mt-2 flex items-start gap-2 rounded-xl border border-[#e3e0d9] bg-[#faf7f1] px-3.5 py-3 text-[13px] leading-snug text-[#3c4a52]">
            <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-gold-ink" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="10.5" width="16" height="10" rx="2" />
              <path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3" />
            </svg>
            {sejour.reglement}
          </p>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 sm:col-span-2">
            <span className={etiquette}>{T.porteur}</span>
            <input className={champ} value={porteur} onChange={(e) => setPorteur(e.target.value)} autoComplete="cc-name" />
          </label>
          <div className="grid gap-1.5 sm:col-span-2">
            <span className={etiquette}>{T.numero}</span>
            {/* PciProxy injecte son iframe ICI. Le conteneur porte la hauteur :
                l'iframe arrive sans dimensions et s'écraserait à zéro. */}
            <div id="pciproxy-numero" className={`${champ} h-[44px] py-0`} />
          </div>
          <label className="grid gap-1.5">
            <span className={etiquette}>{T.expiration}</span>
            <input
              className={champ} value={exp} placeholder="MM/AA" inputMode="numeric" autoComplete="cc-exp"
              onChange={(e) => {
                // On formate en saisissant : MMAA devient MM/AA sans que le
                // client ait à chercher la barre oblique sur un clavier mobile.
                const n = e.target.value.replace(/\D/g, "").slice(0, 4);
                setExp(n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n);
              }}
            />
          </label>
          <div className="grid gap-1.5">
            <span className={etiquette}>{T.crypto}</span>
            <div id="pciproxy-crypto" className={`${champ} h-[44px] py-0`} />
          </div>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-[#6b7a82]">{T.sur}</p>

        {erreur && (
          <p role="alert" className="mt-4 rounded-xl border border-[#e8c7b0] bg-[#fdf6f1] px-4 py-3 text-[13.5px] leading-relaxed text-[#a8571f]">
            {erreur}
          </p>
        )}

        <button
          type="button"
          onClick={envoyer}
          disabled={!complet || envoi}
          className="mt-5 w-full rounded-full bg-gold px-6 py-3.5 text-[16px] font-bold text-navy-deep transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#ddd8ce] disabled:text-[#9a9a95]"
        >
          {envoi ? T.envoi : T.payer(sejour.totalFormate)}
        </button>

        <p className="mt-3 text-[11.5px] leading-relaxed text-[#8a9299]">{T.retractation}</p>
      </div>
    </div>
  );
}
