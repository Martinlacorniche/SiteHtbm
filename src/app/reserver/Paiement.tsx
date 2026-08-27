"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chargerConfigPaiement, autoriserCarte, infosNavigateur, lien3DSecure, type Langue,
} from "@/lib/mewsBooking";
import { poserVente } from "@/lib/reprise3ds";

/* L'écran de règlement — DEUX CHEMINS, un par tarif.
 *
 * ⚠️ CE N'EST PAS UNE HÉSITATION D'ARCHITECTURE, C'EST UNE LIMITE DE MEWS.
 * Mews Payments Checkout ne sait pas conclure une préautorisation. Mesuré le
 * 27/08/2026 sur `paymentRequests/getAll` : des 28 demandes de type
 * `Preauthorization` créées par le tunnel le 26/08, AUCUNE n'est passée
 * `Completed`. La seule demande de type `Payment` de la journée est
 * `Completed`, débitée puis remboursée en quatre-vingt-onze secondes. Le bouton
 * du checkout ne soumettait rien parce qu'il ne savait pas quoi faire d'une
 * préautorisation, et sa documentation le confirme en creux : trois événements
 * de succès, aucun pour la préautorisation.
 *
 *  · FLEXIBLE — préautorisation de 1 %. Champs sécurisés PciProxy, ici même,
 *    en UN écran. Le numéro et le cryptogramme sont saisis dans deux iframes
 *    servies par PciProxy : ni cette page, ni notre serveur, ni nos journaux ne
 *    les voient jamais. Ce qui part vers Mews est un `transactionId` — un jeton
 *    inutilisable ailleurs, valable trente minutes. Mews préautorise ensuite
 *    lui-même, à la confirmation.
 *
 *  · PRÉPAYÉ — débit de 100 %. Mews Payments Checkout, en DEUX temps, parce que
 *    la demande de paiement a besoin d'un client et d'une réservation pour
 *    exister. Le 3-D Secure vient avec, et Apple Pay et Google Pay aussi, sans
 *    rien coder. C'est ce qu'il faut sur le tarif où l'argent part vraiment.
 *
 * Le client, lui, n'en voit qu'un : un tarif ne peut pas être les deux.
 *
 * Le jour où Mews ouvrira `paymentMethodRequests/add` — 401 « No permission »
 * au 27/08/2026, donc l'opération existe et c'est un droit qui manque — le
 * checkout saura faire les deux et PciProxy pourra partir d'ici.
 */

const SCRIPT_CHECKOUT = "https://cdn.mews.com/payments/checkout-embed.js";
const SCRIPT_PCIPROXY = "https://pay.datatrans.com/upp/payment/js/secure-fields-2.0.0.js";

type Checkout = {
  load: (c: Record<string, unknown>) => void;
  destroy?: () => void;
};
type ChampSecurise = string | {
  placeholderElementId: string;
  /** « tel » ouvre le pave numerique sur telephone. */
  inputType?: "tel" | "number" | "text";
  placeholder?: string;
};
type SecureFieldsApi = {
  initTokenize: (
    marchand: string,
    champs: Record<string, ChampSecurise>,
    options?: { styles?: Record<string, string>; focus?: string; paymentMethods?: string[] },
  ) => void;
  submit: (donnees: { expm: number; expy: number }) => void;
  on: (evenement: string, rappel: (donnees: Record<string, unknown>) => void) => void;
  destroy?: () => void;
};
declare global {
  interface Window {
    Mews?: { PaymentCheckout?: Checkout };
    SecureFields?: new () => SecureFieldsApi;
  }
}

const TEXTES = {
  fr: {
    titre: "Vos coordonnées",
    sousTitreCarte: "Puis votre carte, pour garantir la chambre.",
    sousTitrePaiement: "Puis le règlement, chez notre prestataire.",
    prenom: "Prénom", nom: "Nom", email: "Email", telephone: "Téléphone",
    telephoneAide: "Pour vous joindre le jour de votre arrivée.",
    mot: "Un mot pour l'hôtel (facultatif)",
    motAide: "Heure d'arrivée prévue, occasion particulière…",
    continuer: "Continuer vers le paiement",
    prepare: "On prépare votre réservation…",
    titrePaiement: "Votre règlement",
    carte: "Votre carte",
    porteur: "Nom sur la carte",
    numero: "Numéro de carte",
    expiration: "Expiration",
    crypto: "Cryptogramme",
    chargement: "On prépare le formulaire sécurisé…",
    garantir: (m: string) => `Réserver — empreinte de ${m}`,
    envoi: "On enregistre votre réservation…",
    fermer: "Fermer", retour: "Retour",
    surCarte: "Votre numéro de carte est saisi dans un cadre sécurisé de notre prestataire bancaire : il ne transite jamais par ce site.",
    surCheckout: "Le paiement est traité par Mews, notre prestataire : vos données bancaires ne transitent pas par ce site.",
    retractation:
      "Conformément à l'article L221-28 du code de la consommation, une réservation d'hébergement à date déterminée ne donne pas de droit de rétractation. Les conditions d'annulation de votre tarif s'appliquent.",
    champsManquants: "Il manque vos coordonnées : prénom, nom et email.",
    emailInvalide: "Cette adresse email ne semble pas valide.",
    expInvalide: "La date d'expiration doit s'écrire MM/AA.",
    carteRefusee: "Votre carte n'a pas été acceptée. Vérifiez le numéro, la date et le cryptogramme.",
    plusDispo: "Cette chambre vient d'être prise. Revenez en arrière pour en choisir une autre.",
    echec: "La réservation n'a pas abouti. Rien n'a été débité — appelez-nous au 04 94 41 36 23 et nous la prenons avec vous.",
    echecPaiement: "Le paiement n'est pas passé. Vous pouvez réessayer ci-dessus, ou nous appeler au 04 94 41 36 23.",
    tenue: "Votre chambre est tenue 20 minutes, le temps du règlement.",
    auth3ds: "On vérifie votre carte auprès de votre banque…",
    redirige: "Votre banque demande une confirmation. On vous y emmène…",
    refusee3ds: "Votre banque a refusé l'authentification de cette carte. Essayez-en une autre, ou appelez-nous au 04 94 41 36 23.",
  },
  en: {
    titre: "Your details",
    sousTitreCarte: "Then your card, to secure the room.",
    sousTitrePaiement: "Then payment, with our provider.",
    prenom: "First name", nom: "Last name", email: "Email", telephone: "Phone",
    telephoneAide: "So we can reach you on the day you arrive.",
    mot: "A word for the hotel (optional)",
    motAide: "Expected arrival time, a special occasion…",
    continuer: "Continue to payment",
    prepare: "Preparing your booking…",
    titrePaiement: "Your payment",
    carte: "Your card",
    porteur: "Name on card",
    numero: "Card number",
    expiration: "Expiry",
    crypto: "Security code",
    chargement: "Preparing the secure form…",
    garantir: (m: string) => `Book — ${m} hold`,
    envoi: "Saving your booking…",
    fermer: "Close", retour: "Back",
    surCarte: "Your card number is typed into a secure frame hosted by our payment provider — it never passes through this site.",
    surCheckout: "Payment is handled by Mews, our provider — your card details never pass through this site.",
    retractation:
      "Under French consumer law (art. L221-28), accommodation booked for a set date carries no right of withdrawal. Your rate's cancellation terms apply.",
    champsManquants: "Your details are incomplete: first name, last name and email.",
    emailInvalide: "That email address doesn't look valid.",
    expInvalide: "The expiry date should read MM/YY.",
    carteRefusee: "Your card wasn't accepted. Check the number, the expiry date and the security code.",
    plusDispo: "That room has just been taken. Go back to choose another one.",
    echec: "The booking didn't go through. Nothing was charged — call us on +33 4 94 41 36 23 and we'll take it with you.",
    echecPaiement: "The payment didn't go through. You can try again above, or call us on +33 4 94 41 36 23.",
    tenue: "Your room is held for 20 minutes while you pay.",
    auth3ds: "Checking your card with your bank…",
    redirige: "Your bank needs to confirm. Taking you there…",
    refusee3ds: "Your bank declined the authentication for this card. Try another one, or call us on +33 4 94 41 36 23.",
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
  /** ⚠️ C'EST LUI QUI CHOISIT LE MOTEUR DE PAIEMENT.
   *  `true` : le tarif débite (prépayé) → Mews Payments Checkout.
   *  `false` : le tarif prend une empreinte (flexible) → champs PciProxy.
   *  Lu de `SettlementAction` sur le groupe tarifaire, jamais écrit en dur. */
  debite: boolean;
  /** Le montant réellement porté à la carte, formaté. */
  reglementFormate: string;
};

type Client = { prenom: string; nom: string; email: string; telephone: string };
type Ouverte = { groupeId: string; numeros: string[]; reservationIds: string[]; demandeId: string };

export default function Paiement({
  sejour, langue, onFermer, onReserve,
}: {
  sejour: SejourAPayer;
  langue: Langue;
  onFermer: () => void;
  onReserve: (resa: { groupeId: string; numeros: string[]; client: Client }) => void;
}) {
  const T = TEXTES[langue];

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motHotel, setMotHotel] = useState("");
  const [porteur, setPorteur] = useState("");
  const [exp, setExp] = useState("");

  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [pret, setPret] = useState(false);
  const [ouverte, setOuverte] = useState<Ouverte | null>(null);
  const [envoi, setEnvoi] = useState(false);
  /* Ce qui se passe en ce moment, en une phrase. Le 3-D Secure ajoute plusieurs
     secondes d'attente muette entre le clic et la banque : sans ce mot, le
     client croit que rien ne part et reclique. */
  const [etape, setEtape] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const sf = useRef<SecureFieldsApi | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);
  // Les rappels de PciProxy et du checkout vivent hors de React : ils liraient
  // des valeurs figées au montage. On leur donne une référence toujours à jour.
  const enCours = useRef(false);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const moisAn = exp.match(/^(\d{2})\s*\/?\s*(\d{2})$/);
  const expOk = !!moisAn && Number(moisAn[1]) >= 1 && Number(moisAn[1]) <= 12;
  const coordonneesOk = !!(prenom.trim() && nom.trim() && emailOk);
  const client = (): Client => ({
    prenom: prenom.trim(), nom: nom.trim(), email: email.trim(), telephone: telephone.trim(),
  });

  const relacher = () => { setEnvoi(false); setEtape(null); enCours.current = false; };

  /* ══════════════════ Chemin FLEXIBLE — champs sécurisés PciProxy ═══════════
   *
   * La clé marchande se lit chez Mews : la coder en dur ici la figerait le jour
   * où l'hôtel change de contrat, et les deux iframes ne monteraient plus sans
   * que rien ne le dise. */
  useEffect(() => {
    if (sejour.debite) return;
    let annule = false;
    chargerConfigPaiement(langue)
      .then((c) => { if (!annule) setPublicKey(c.publicKey); })
      .catch(() => { if (!annule) setErreur(T.echec); });
    return () => { annule = true; };
  }, [sejour.debite, langue, T]);

  /* L'envoi final, une fois la carte tokenisée par PciProxy.
   *
   * ⚠️ TROIS TEMPS, ET L'ORDRE EST LA CORRECTION DU 27/08/2026 :
   *   1. poser la réservation avec la carte — elle sort `Optional` ;
   *   2. AUTHENTIFIER la carte (3-D Secure) ;
   *   3. seulement ensuite, confirmer — c'est la confirmation qui déclenche la
   *      préautorisation chez Mews, et elle échoue en silence sur une carte
   *      non authentifiée. Constaté sur la résa 29841, `Confirmed` avec sa
   *      carte et sans le moindre euro préautorisé.
   *
   * Beaucoup de cartes passent « sans friction » : `autoriserCarte` répond
   * `Authorized` du premier coup et le client ne voit aucune redirection. */
  const finaliserCarte = useCallback(async (jeton: string) => {
    if (!moisAn) return;
    const donneesSejour = {
      categorieId: sejour.categorieId, tarifId: sejour.tarifId,
      arrivee: sejour.arrivee, depart: sejour.depart, adultes: sejour.adultes,
    };
    try {
      // ── Temps 1 : la réservation, avec la carte ────────────────────────────
      const r = await fetch("/api/reserver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          langue,
          client: client(),
          sejour: { ...donneesSejour, notes: motHotel.trim() || undefined },
          carte: {
            jeton,
            // Mews attend 'AAAA-MM' quand PciProxy raisonne en MM/AA.
            expiration: `20${moisAn[2]}-${moisAn[1]}`,
            porteur: porteur.trim(),
          },
        }),
      });
      const j = await r.json().catch(() => null);
      if (r.status === 409) { setErreur(T.plusDispo); relacher(); return; }
      if (!r.ok || !j?.carteId || !j?.reservationIds?.length) {
        setErreur(T.echec); relacher(); return;
      }

      // ── Temps 2 : l'authentification de la carte ───────────────────────────
      setEtape(T.auth3ds);
      let etat: string | null = null;
      try {
        etat = await autoriserCarte({
          carteId: j.carteId, navigateur: infosNavigateur(), langue,
        });
      } catch {
        // Mews n'a pas répondu. On ne confirme pas : la chambre se relâchera
        // toute seule, et mieux vaut un client au téléphone qu'une réservation
        // que personne ne garantit.
        setErreur(T.echec); relacher(); return;
      }

      if (etat === "Declined") { setErreur(T.refusee3ds); relacher(); return; }

      if (etat !== "Authorized") {
        /* La banque veut voir le client. On dépose de quoi reprendre le fil au
         * retour — sans rien de bancaire — et on l'emmène. */
        setEtape(T.redirige);
        poserVente({
          carteId: j.carteId,
          groupeId: j.groupeId,
          numeros: j.numeros ?? [],
          reservationIds: j.reservationIds,
          sejour: donneesSejour,
          client: client(),
          langue,
        });
        const retour = `${window.location.origin}${window.location.pathname}?apres3ds=1`;
        window.location.href = lien3DSecure(j.carteId, retour);
        return;
      }

      // ── Temps 3 : la vente se ferme ────────────────────────────────────────
      await conclureCarte({
        carteId: j.carteId, reservationIds: j.reservationIds,
        groupeId: j.groupeId, numeros: j.numeros ?? [], sejour: donneesSejour,
      });
    } catch {
      setErreur(T.echec);
      relacher();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moisAn, langue, prenom, nom, email, telephone, motHotel, porteur, sejour, onReserve, T]);

  /* La confirmation du flexible. Le serveur revérifie l'autorisation chez Mews
   * avant de confirmer : ce que dit le navigateur ne fait pas foi. */
  const conclureCarte = async (
    { carteId, reservationIds, groupeId, numeros, sejour: s3 }:
    {
      carteId: string; reservationIds: string[]; groupeId: string; numeros: string[];
      sejour: { categorieId: string; tarifId: string; arrivee: string; depart: string; adultes: number };
    },
  ) => {
    const r = await fetch("/api/reserver/carte", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ langue, carteId, reservationIds, sejour: s3 }),
    });
    if (!r.ok) { setErreur(T.echec); relacher(); return; }
    onReserve({ groupeId, numeros, client: client() });
  };

  const finaliserCarteRef = useRef(finaliserCarte);
  useEffect(() => { finaliserCarteRef.current = finaliserCarte; }, [finaliserCarte]);

  // Le chargement de PciProxy et le montage des deux iframes.
  useEffect(() => {
    if (sejour.debite || !publicKey) return;
    let annule = false;

    const monter = () => {
      if (annule || !window.SecureFields) return;
      const api = new window.SecureFields();
      sf.current = api;
      /* ⚠️ LA FORME OBJET, PAS LA CHAÎNE NUE — et pour deux raisons.
       *
       * `inputType: "tel"` fait ouvrir le pavé numérique sur téléphone. Sans
       * lui, PciProxy sert un champ texte et le client se retrouve devant un
       * clavier alphabétique pour taper seize chiffres. C'est le genre de
       * friction qui se paie à l'endroit exact où l'on demande une carte.
       *
       * Et c'est la forme documentée (`docs.datatrans.ch/docs/secure-fields-
       * options`) : la chaîne nue marche, mais ne laisse rien régler. Le doute
       * noté le 25/08 sur `placeholderElementId` se tranche ici, dans le bon
       * sens.
       *
       * Les styles s'appliquent DEDANS l'iframe : notre CSS ne l'atteint pas,
       * et sans eux la saisie du client n'a ni la taille ni la police du reste
       * du formulaire. */
      api.initTokenize(
        publicKey,
        {
          cardNumber: {
            placeholderElementId: "pciproxy-numero",
            inputType: "tel",
            placeholder: "1234 5678 9012 3456",
          },
          cvv: {
            placeholderElementId: "pciproxy-crypto",
            inputType: "tel",
            placeholder: "123",
          },
        },
        {
          styles: {
            "*": "font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;"
              + "font-size: 15px; color: #20323d; border: 0; outline: 0;"
              + "width: 100%; height: 100%; background: transparent;",
            "*::placeholder": "color: #b0b6ba;",
          },
        },
      );
      api.on("ready", () => { if (!annule) setPret(true); });
      api.on("success", (d) => {
        const jeton = typeof d.transactionId === "string" ? d.transactionId : null;
        if (!jeton) { setErreur(T.carteRefusee); relacher(); return; }
        void finaliserCarteRef.current(jeton);
      });
      api.on("error", () => {
        if (annule) return;
        setErreur(T.carteRefusee);
        relacher();
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
  }, [sejour.debite, publicKey, T]);

  const envoyerCarte = () => {
    if (enCours.current) return;
    setErreur(null);
    if (!coordonneesOk) { setErreur(prenom.trim() && nom.trim() ? T.emailInvalide : T.champsManquants); return; }
    if (!moisAn) { setErreur(T.expInvalide); return; }
    enCours.current = true;
    setEnvoi(true);
    // À partir d'ici la main passe à PciProxy : la suite arrive dans `success`.
    sf.current?.submit({ expm: Number(moisAn[1]), expy: Number(moisAn[2]) });
  };

  /* ══════════════════ Chemin PRÉPAYÉ — Mews Payments Checkout ═══════════════
   * Temps 1 : poser l'option, et récupérer la demande de paiement que Mews a
   * fabriquée lui-même en créant la réservation. */
  const ouvrir = async () => {
    if (enCours.current) return;
    setErreur(null);
    if (!coordonneesOk) { setErreur(prenom.trim() && nom.trim() ? T.emailInvalide : T.champsManquants); return; }
    enCours.current = true;
    setEnvoi(true);
    try {
      const r = await fetch("/api/reserver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          langue,
          client: client(),
          sejour: {
            categorieId: sejour.categorieId, tarifId: sejour.tarifId,
            arrivee: sejour.arrivee, depart: sejour.depart, adultes: sejour.adultes,
            notes: motHotel.trim() || undefined,
          },
        }),
      });
      const j = await r.json().catch(() => null);
      if (r.status === 409) { setErreur(T.plusDispo); relacher(); return; }
      if (!r.ok || !j?.demandeId) { setErreur(T.echec); relacher(); return; }
      setOuverte(j as Ouverte);
      relacher();
    } catch {
      setErreur(T.echec);
      relacher();
    }
  };

  /* Temps 2 : la vente ne se ferme QUE quand le paiement a abouti. */
  const finaliserPaiement = useCallback(async () => {
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
      onReserve({ groupeId: ouverte.groupeId, numeros: ouverte.numeros, client: client() });
    } catch {
      setErreur(T.echec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouverte, langue, sejour, onReserve, prenom, nom, email, telephone, T]);

  const finaliserPaiementRef = useRef(finaliserPaiement);
  useEffect(() => { finaliserPaiementRef.current = finaliserPaiement; }, [finaliserPaiement]);

  /* Le checkout de Mews, injecté dans notre page.
   *
   * ⚠️ PAS DE `dataBaseUrl` ICI. Ce paramètre pointe le checkout sur
   * l'environnement de démonstration : laissé en production, le trafic réel y
   * partirait en silence et aucun paiement ne serait encaissé. */
  useEffect(() => {
    if (!ouverte) return;
    let annule = false;

    const monter = () => {
      const api = window.Mews?.PaymentCheckout;
      if (annule || !api) return;
      api.load({
        containerId: "mews-checkout",
        requestId: ouverte.demandeId,
        languageCode: langue === "fr" ? "fr-FR" : "en-GB",
        onSuccess: () => { if (!annule) void finaliserPaiementRef.current(); },
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

  // Les coordonnées : les mêmes des deux côtés, elles ne se dupliquent pas.
  const coordonnees = (
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
  );

  const bandeauReglement = sejour.reglement ? (
    <p className="mt-4 flex items-start gap-2 rounded-xl border border-[#e3e0d9] bg-[#faf7f1] px-3.5 py-3 text-[13px] leading-snug text-[#3c4a52]">
      <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-gold-ink" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="10.5" width="16" height="10" rx="2" />
        <path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3" />
      </svg>
      {sejour.reglement}
    </p>
  ) : null;

  const messageErreur = erreur ? (
    <p role="alert" className="mt-4 rounded-xl border border-[#e8c7b0] bg-[#fdf6f1] px-4 py-3 text-[13.5px] leading-relaxed text-[#a8571f]">
      {erreur}
    </p>
  ) : null;

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
            <p className="mt-1 text-[13.5px] text-[#6b7a82]">
              {ouverte ? T.tenue : sejour.debite ? T.sousTitrePaiement : T.sousTitreCarte}
            </p>
          </div>
          <button
            type="button" onClick={fermer} disabled={envoi} aria-label={T.fermer}
            className="shrink-0 rounded-full border border-[#e3e0d9] px-3 py-1.5 text-[13px] font-semibold text-[#6b7a82] transition-colors hover:border-gold disabled:opacity-40"
          >
            {T.retour}
          </button>
        </div>

        {/* Ce qu'on achète, rappelé sous les yeux : on ne demande ni carte ni
            argent sans redire pourquoi, ni combien. */}
        <div className="mt-4 flex items-baseline justify-between gap-3 rounded-xl bg-[#faf7f1] px-4 py-3">
          <span className="text-[13.5px] leading-snug text-[#3c4a52]">{sejour.resume}</span>
          <span className="shrink-0 text-[20px] font-bold tabular-nums text-navy">{sejour.totalFormate}</span>
        </div>

        {!sejour.debite ? (
          /* ── FLEXIBLE : coordonnées et carte, en un seul écran ───────────── */
          <>
            {coordonnees}

            <h3 className="mt-6 font-serif text-xl text-navy">{T.carte}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 sm:col-span-2">
                <span className={etiquette}>{T.porteur}</span>
                <input className={champ} value={porteur} onChange={(e) => setPorteur(e.target.value)} autoComplete="cc-name" />
              </label>
              <div className="grid gap-1.5 sm:col-span-2">
                <span className={etiquette}>{T.numero}</span>
                {/* PciProxy injecte son iframe ICI. Le conteneur porte la
                    hauteur : l'iframe arrive sans dimensions et s'écraserait
                    à zéro. */}
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

            {bandeauReglement}
            <p className="mt-3 text-[12px] leading-relaxed text-[#6b7a82]">{T.surCarte}</p>
            {messageErreur}

            <button
              type="button" onClick={envoyerCarte}
              disabled={!coordonneesOk || !expOk || !porteur.trim() || !pret || envoi}
              className="mt-5 w-full rounded-full bg-gold px-6 py-3.5 text-[16px] font-bold text-navy-deep transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#ddd8ce] disabled:text-[#9a9a95]"
            >
              {envoi ? (etape ?? T.envoi) : pret ? T.garantir(sejour.reglementFormate) : T.chargement}
            </button>
          </>
        ) : !ouverte ? (
          /* ── PRÉPAYÉ, temps 1 : les coordonnées ──────────────────────────── */
          <>
            {coordonnees}
            {bandeauReglement}
            {messageErreur}
            <button
              type="button" onClick={ouvrir} disabled={!coordonneesOk || envoi}
              className="mt-4 w-full rounded-full bg-gold px-6 py-3.5 text-[16px] font-bold text-navy-deep transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#ddd8ce] disabled:text-[#9a9a95]"
            >
              {envoi ? T.prepare : T.continuer}
            </button>
            <p className="mt-4 text-[12px] leading-relaxed text-[#8a9299]">{T.surCheckout}</p>
          </>
        ) : (
          /* ── PRÉPAYÉ, temps 2 : le checkout de Mews ──────────────────────── */
          <>
            {/* Mews injecte son iframe ICI. Le conteneur porte une hauteur
                minimale : l'application arrive sans dimensions et le cadre
                sauterait au montage. */}
            <div id="mews-checkout" className="mt-5 min-h-[560px]" />
            {messageErreur}
            <p className="mt-4 text-[12px] leading-relaxed text-[#8a9299]">{T.surCheckout}</p>
          </>
        )}

        <p className="mt-2 text-[11.5px] leading-relaxed text-[#a0a8ad]">{T.retractation}</p>
      </div>
    </div>
  );
}
