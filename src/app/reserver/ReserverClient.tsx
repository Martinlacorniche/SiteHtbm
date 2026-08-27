"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CalendrierSejour from "./CalendrierSejour";
import Image from "next/image";
import Paiement, { type SejourAPayer } from "./Paiement";
import { reprendreVente } from "@/lib/reprise3ds";
import {
  PanneauRooftop, TableConfirmee, useSoirsRooftop, prendreTable, heureLisible,
  type TablePrise, type ChoixTable,
} from "./TableRooftop";
import {
  chercherDisponibilite, chargerCategories, reglementDe, urlPhoto, t,
  type CategorieChambre, type Disponibilite, type GroupeTarifaire, type Langue,
  type Offre, type Tarif,
} from "@/lib/mewsBooking";
import { PRIVILEGES, RECIT, type Recit } from "@/lib/site";

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

/* Deux reponses, pas trois. « En famille » a ete retire le 25/08 : chaque
 * chambre accueille au plus deux personnes, ni lit bebe ni lit d'appoint. Le
 * bouton promettait donc un sejour que l'hotel ne vend pas. */
type Voyage = "seul" | "deux";

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
    titre: "Hôtel-Rooftop Les Voiles",
    chapo: "Prix tout compris, aucune surprise à l'arrivée.",
    arrivee: "Arrivée", depart: "Départ",
    choisirDates: "Choisissez votre arrivée",
    puisDepart: "· puis votre départ",
    voyageLabel: "Vous voyagez",
    seul: "Seul", deux: "À deux",
    chercher: "Voir les chambres", recherche: "Recherche…",
    choisir: "Dites-nous qui voyage",
    nuits: (n: number) => `${n} nuit${n > 1 ? "s" : ""}`,
    pour1: "Pour une personne",
    aucune: "Aucune chambre disponible sur ces dates.",
    aucuneAide: "Essayez des dates voisines, ou appelez-nous au 04 94 41 36 23 — il reste parfois de la place.",
    parNuit: "la nuit",
    seulAussi: "Vous voyagez seul ?",
    seulAussiAction: "Voir le prix pour une personne",
    erreur: "La recherche n'a pas abouti.",
    erreurAide: "Réessayez dans un instant, ou appelez-nous au 04 94 41 36 23.",
    checkin: "Arrivée autonome à partir de 15 h · départ jusqu'à 12 h en direct",
    colDates: "Vos dates", colOffres: "Nos chambres", colRecap: "Votre séjour",
    attenteOffres: "Choisissez vos dates et dites-nous qui voyage : les chambres disponibles s'afficheront ici.",
    recapVide: "Choisissez une chambre pour voir le total.",
    tarifFlexible: "Tarif flexible", tarifPrepaye: "Prépayé, non remboursable",
    totalSejour: "Total du séjour",
    payer: "Réserver et payer",
    /* L'ecran de confirmation. Il ne promet QUE ce qu'on a verifie : la
     * reservation est enregistree, et voici son numero. Pas de « vous allez
     * recevoir un email » tant que le premier test n'aura pas montre que Mews
     * en envoie un — une promesse d'email qui n'arrive jamais coute plus cher
     * qu'un silence. */
    confirmeTitre: "C'est réservé.",
    confirmeSous: "Votre séjour est enregistré à l'hôtel.",
    confirmeNumero: "Votre numéro de confirmation",
    confirmeNumeroAide: "À citer si vous nous appelez. Notez-le quelque part.",
    confirmeQuestion: "Une question sur votre séjour ?",
    confirmeChambre: "Votre chambre",
    confirmeMail: "Un email de confirmation vient de vous être envoyé par l'hôtel.",
    agenda: "Ajouter à mon agenda",
    confirmeRetour: "Revenir à l'accueil",
    economisez: (m: string) => `Économisez ${m}`,
    annulableJusque: (d: string, h: number) => `Annulable sans frais jusqu'au ${d}, ${h} h`,
    modifier: "Modifier",
    voirRecap: "Voir le récapitulatif",
    simplicite: "Volontairement simples : pas de minibar dans les chambres — mais une cuisine en libre-service pour vos repas, et le rooftop au 4ᵉ étage, face à la mer, pour l'apéro.",
    exclusif: "Exclu direct",
    majPrix: "Mettre à jour les prix",
    // L'etat de repos du bouton de recherche. Il ne dit pas ce qu'on peut
    // faire — il dit qu'il n'y a rien a faire, et c'est justement pour ca
    // qu'il reste a l'ecran : un bouton qui disparait emporte sa ligne avec
    // lui, et tout ce qui est en dessous remonte d'un cran.
    aJour: "Prix à jour",
    /* Les deux reperes de confiance. Ils ne se placent pas au meme endroit
     * parce qu'ils ne repondent pas a la meme question, ni au meme moment :
     * « ou suis-je » se demande en arrivant, « a qui je donne ma carte » se
     * demande au dernier clic. */
    siteOfficiel: "Site officiel",
    /* La phrase se découpe pour que la marque et le montant soient des
     * éléments à part : « Booking » se cite en toutes lettres — l'usage
     * nominatif d'une marque pour comparer des prix est licite, son logo et
     * son identité visuelle ne le sont pas — et le montant se barre. */
    surBooking: ["Sur ", ", ce séjour est à ", "."] as const,
    rooftopAjouter: "Ajouter une table au rooftop",
    rooftopChoisie: (h: string) => `Table au rooftop · ${h}`,
    gainDirect: (m: string) => `Bien vu — vous gardez ${m} en réservant ici.`,
    /* Ce qui arrive a la carte. Court sur la carte de tarif — il y a deux
     * cartes cote a cote et la place est comptee — entier sur l'ecran de
     * paiement, ou le client a la sienne en main. Les montants sont calcules
     * depuis le groupe tarifaire Mews, jamais ecrits ici. */
    empreinteCourt: (m: string) => `Carte en garantie · ${m} préautorisés`,
    debitCourt: (m: string) => `Débit immédiat · ${m}`,
    empreinteLong: (m: string, pc: string) =>
      `Votre carte n'est pas débitée. Une préautorisation de ${m} (${pc} du séjour) garantit la chambre ; le séjour se règle à l'hôtel.`,
    debitLong: (m: string) =>
      `Votre carte est débitée de ${m} dès la confirmation, soit la totalité du séjour. Ce tarif n'est pas remboursable.`,
    debitLongPartiel: (m: string, pc: string) =>
      `Votre carte est débitée de ${m} (${pc} du séjour) dès la confirmation. Le solde se règle à l'hôtel.`,
    paiementSecurise: "Paiement sécurisé",
    repriseEnCours: "On finalise votre réservation…",
    repriseEchecTitre: "Un dernier pas nous manque",
    repriseEchec: "Votre banque a bien confirmé, mais nous n'avons pas pu terminer la réservation ici. Appelez-nous au 04 94 41 36 23 : nous la bouclons en deux minutes, rien n'a été débité.",
    repriseFermer: "Fermer",
    paiementSecuriseAide:
      "Votre carte est saisie chez notre prestataire de paiement : elle ne transite pas par ce site.",
    couchages: (n: number) => (n <= 1 ? "1 personne" : `${n} personnes`),
    surface: (n: number) => `${n} m²`,
    lit: (cm: number) => `lit ${cm} cm`,
    galerieOuvrir: (n: number) => `Voir les ${n} photos`,
    galerieCompteur: (i: number, n: number) => `Photo ${i} sur ${n}`,
    galerieFermer: "Fermer",
    galeriePrec: "Photo précédente",
    galerieSuiv: "Photo suivante",
    aideAvant: "Une question avant de réserver ?",
    dontTaxe: (m: string) => `dont ${m} de taxe de séjour`,
    voirDetails: "Détails",
    retour: "Retour",
    remiseDirecte: (pc: number) => `−${pc} % en direct`,
  },
  en: {
    titre: "Hôtel-Rooftop Les Voiles",
    chapo: "All-inclusive prices, no surprises on arrival.",
    arrivee: "Check-in", depart: "Check-out",
    choisirDates: "Choose your arrival",
    puisDepart: "· then your departure",
    voyageLabel: "You are travelling",
    seul: "Alone", deux: "As a couple",
    chercher: "See the rooms", recherche: "Searching…",
    choisir: "Tell us who is travelling",
    nuits: (n: number) => `${n} night${n > 1 ? "s" : ""}`,
    pour1: "For one person",
    aucune: "No rooms available on these dates.",
    aucuneAide: "Try nearby dates, or call us on +33 4 94 41 36 23 — we sometimes have space left.",
    parNuit: "per night",
    seulAussi: "Travelling alone?",
    seulAussiAction: "See the price for one person",
    erreur: "The search did not go through.",
    erreurAide: "Try again in a moment, or call us on +33 4 94 41 36 23.",
    checkin: "Self check-in from 3 pm · check-out until noon when booking direct",
    colDates: "Your dates", colOffres: "Our rooms", colRecap: "Your stay",
    attenteOffres: "Choose your dates and tell us who is travelling: available rooms will appear here.",
    recapVide: "Choose a room to see the total.",
    tarifFlexible: "Flexible rate", tarifPrepaye: "Prepaid, non-refundable",
    totalSejour: "Stay total",
    payer: "Book and pay",
    confirmeTitre: "You're booked.",
    confirmeSous: "Your stay is registered with the hotel.",
    confirmeNumero: "Your confirmation number",
    confirmeNumeroAide: "Quote it if you call us. Write it down somewhere.",
    confirmeQuestion: "A question about your stay?",
    confirmeChambre: "Your room",
    confirmeMail: "A confirmation email has just been sent to you by the hotel.",
    agenda: "Add to my calendar",
    confirmeRetour: "Back to the home page",
    economisez: (m: string) => `Save ${m}`,
    // Mews ne decrit ses tarifs qu'en francais : l'heure arrive en 24 h, il
    // faut la rendre en 12 h ici, sinon on affiche « 18 pm ».
    annulableJusque: (d: string, h: number) =>
      `Free cancellation until ${d}, ${h > 12 ? h - 12 : h === 0 ? 12 : h} ${h >= 12 ? "pm" : "am"}`,
    modifier: "Change",
    voirRecap: "See the summary",
    simplicite: "Deliberately simple: no minibar in the rooms — but a self-service kitchen for your meals, and the rooftop on the 4th floor, facing the sea, for a drink.",
    exclusif: "Direct only",
    majPrix: "Update prices",
    aJour: "Prices up to date",
    siteOfficiel: "Official website",
    surBooking: ["On ", ", this stay is ", "."] as const,
    rooftopAjouter: "Add a rooftop table",
    rooftopChoisie: (h: string) => `Rooftop table · ${h}`,
    gainDirect: (m: string) => `Nice move — you keep ${m} by booking direct.`,
    empreinteCourt: (m: string) => `Card as guarantee · ${m} held`,
    debitCourt: (m: string) => `Charged now · ${m}`,
    empreinteLong: (m: string, pc: string) =>
      `Your card is not charged. A ${m} hold (${pc} of the stay) secures the room; you settle at the hotel.`,
    debitLong: (m: string) =>
      `Your card is charged ${m} on confirmation — the full stay. This rate is non-refundable.`,
    debitLongPartiel: (m: string, pc: string) =>
      `Your card is charged ${m} (${pc} of the stay) on confirmation. The balance is settled at the hotel.`,
    paiementSecurise: "Secure payment",
    repriseEnCours: "Finalising your booking…",
    repriseEchecTitre: "One last step is missing",
    repriseEchec: "Your bank confirmed, but we couldn't complete the booking here. Call us on +33 4 94 41 36 23 and we'll finish it in two minutes — nothing has been charged.",
    repriseFermer: "Close",
    paiementSecuriseAide:
      "Your card is entered directly with our payment provider — it never passes through this site.",
    couchages: (n: number) => (n <= 1 ? "1 guest" : `${n} guests`),
    surface: (n: number) => `${n} m²`,
    lit: (cm: number) => `${cm} cm bed`,
    galerieOuvrir: (n: number) => `See all ${n} photos`,
    galerieCompteur: (i: number, n: number) => `Photo ${i} of ${n}`,
    galerieFermer: "Close",
    galeriePrec: "Previous photo",
    galerieSuiv: "Next photo",
    aideAvant: "A question before booking?",
    dontTaxe: (m: string) => `including ${m} city tax`,
    voirDetails: "Details",
    retour: "Back",
    remiseDirecte: (pc: number) => `−${pc}% direct`,
  },
} as const;

/* Les montants se formatent selon la langue, pas selon la France.
 *
 * « 119,00 € » a la francaise a cote de « Save €10 » a l'anglaise : la page
 * anglaise melangeait deux conventions dans la meme carte. `Intl` sait ou va le
 * symbole et quel separateur decimal employer — fr-FR « 119,00 € », en-GB
 * « €119.00 ». `montant` pour un prix, `montantCourt` pour un appoint — une
 * economie, une taxe — qui n'affiche ses centimes que s'il en a. */
const LOCALE: Record<Langue, string> = { fr: "fr-FR", en: "en-GB" };

const montant = (n: number, langue: Langue) =>
  new Intl.NumberFormat(LOCALE[langue], {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);

/** « 1 % » — `Intl` sait ou va l'espace insecable, elle n'y est pas en anglais. */
const pourcent = (part: number, langue: Langue) =>
  new Intl.NumberFormat(LOCALE[langue], { style: "percent", maximumFractionDigits: 0 }).format(part);

const montantCourt = (n: number, langue: Langue) =>
  new Intl.NumberFormat(LOCALE[langue], {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 0, maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);

/* Une pulsation tres breve quand on retient une chambre.
 *
 * Dix millisecondes : la duree d'un declic, pas d'une alerte. Le geste qui
 * engage de l'argent gagne a se sentir sous le doigt, comme un interrupteur.
 *
 * ⚠️ Android seulement. Safari sur iPhone n'implemente pas `vibrate` — la
 * moitie des clients n'aura rien, et c'est pour ca que ca ne porte AUCUNE
 * information : c'est un supplement, jamais le signal que la chambre est
 * retenue. Ce signal-la, c'est la carte qui passe en bleu.
 *
 * Le systeme peut aussi demander moins d'animations : on se tait alors. */
const pulse = () => {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  navigator.vibrate(10);
};

/* Le total roule au lieu de sauter.
 *
 * Le prix est le heros de la page : changer de chambre, de tarif ou de dates le
 * remplacait d'un coup, et rien ne disait que le chiffre venait de bouger. Il
 * court maintenant d'une valeur a l'autre en un tiers de seconde.
 *
 * `tabular-nums` est deja pose sur les deux emplacements — sans lui, les
 * chiffres n'ont pas la meme largeur et le montant tremblerait pendant la
 * course. La duree est courte a dessein : au-dela, on attend un prix.
 *
 * ⚠️ Un lecteur d'ecran ne doit pas entendre les valeurs intermediaires — il
 * annoncerait vingt montants faux. Le vrai total est pose en `aria-label` sur
 * l'element, et la course est masquee (`aria-hidden`). */
function TotalRoulant({ valeur, langue, court = false }: { valeur: number; langue: Langue; court?: boolean }) {
  const format = court ? montantCourt : montant;
  const [affiche, setAffiche] = useState(valeur);
  const depuis = useRef(valeur);
  const image = useRef<number | null>(null);

  useEffect(() => {
    /* Rien d'infini n'entre ici, et surtout rien ne s'y installe.
     *
     * Une valeur non finie traversait l'animation sans encombre — `NaN === 0`
     * est faux, donc la course partait — et la ligne `depuis.current = valeur`
     * la gravait dans la reference. Tout ecart calcule ensuite valait NaN :
     * le montant restait « NaN € » indefiniment, y compris apres le retour de
     * donnees parfaitement valides.
     * On garde le dernier montant connu. Un prix perime se corrige au rendu
     * suivant ; « NaN € » sous les yeux de quelqu'un qui sort sa carte, non. */
    if (!Number.isFinite(valeur)) return;
    const depart = depuis.current;
    const ecart = valeur - depart;
    if (ecart === 0) return;

    // Le systeme peut demander moins d'animations : on saute a la valeur.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      depuis.current = valeur;
      setAffiche(valeur);
      return;
    }

    const t0 = performance.now();
    const DUREE = 340;
    const avance = (t: number) => {
      const p = Math.min(1, (t - t0) / DUREE);
      // Sortie en douceur : le montant freine sur sa valeur au lieu de s'y cogner.
      const e = 1 - Math.pow(1 - p, 3);
      setAffiche(depart + ecart * e);
      if (p < 1) image.current = requestAnimationFrame(avance);
      else depuis.current = valeur;
    };
    image.current = requestAnimationFrame(avance);
    return () => { if (image.current) cancelAnimationFrame(image.current); };
  }, [valeur]);

  // Meme garde a l'affichage : `aria-label` lit `valeur` directement, il
  // annoncerait « NaN euros » a un lecteur d'ecran.
  const sur = Number.isFinite(valeur) ? valeur : affiche;
  return (
    <span aria-label={format(sur, langue)}>
      <span aria-hidden>{format(affiche, langue)}</span>
    </span>
  );
}

/** 'YYYY-MM-DD' local. Passer par toISOString décalerait d'un jour le soir venu. */
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dansNJours = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoLocal(d);
};

/* Un lien « ajouter à mon agenda », sans dépendance ni service tiers.
 *
 * ⚠️ AVEC DES HEURES, PAS EN JOURNÉE ENTIÈRE. La première version passait
 * `AAAAMMJJ/AAAAMMJJ`, que Google rend en événement « toute la journée » : le
 * séjour s'affichait comme un bandeau en haut de l'agenda, sans dire quand
 * arriver ni quand partir — or c'est exactement ce qu'on veut y retrouver.
 * On pose donc l'heure d'arrivée (15 h) et l'heure de départ (12 h), celles
 * que la page annonce partout ailleurs.
 *
 * Le format `AAAAMMJJTHHMMSS` sans `Z` est lu dans le fuseau de l'agenda du
 * client. C'est volontaire : quelqu'un qui note un voyage veut lire « 15 h »,
 * l'heure de l'hôtel, pas l'heure de chez lui convertie. */
const lienAgenda = (
  { titre, arrivee, depart, details }:
  { titre: string; arrivee: string; depart: string; details: string },
) => {
  const instant = (iso: string, heure: string) => `${iso.replace(/-/g, "")}T${heure}00`;
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: titre,
    dates: `${instant(arrivee, "1500")}/${instant(depart, "1200")}`,
    details,
    location: "Hôtel-Rooftop Les Voiles, 124 rue Gubler, 83000 Toulon",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
};

/** « 12 sept. » — court, parce qu'il partage la ligne avec le nombre de nuits. */
const joli = (iso: string, langue: Langue) => {
  if (!iso) return "";
  const [a, m, j] = iso.split("-").map(Number);
  // Meme fenetre que `nuitsEntre` : entre les deux clics du calendrier, une
  // date peut arriver tronquee. `new Date(NaN, …)` se rend en « Invalid Date »,
  // en toutes lettres, au milieu du recapitulatif.
  if (!Number.isFinite(a) || !Number.isFinite(m) || !Number.isFinite(j)) return "";
  return new Date(a, m - 1, j).toLocaleDateString(langue === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric", month: "short",
  });
};

/* ⚠️ `Math.max(0, NaN)` vaut NaN — il ne protege de rien.
 *
 * Entre les deux clics du calendrier, le sejour est a moitie choisi : l'arrivee
 * est posee, le depart vaut '' (voir `CalendrierSejour` → `onChange(jour, null)`).
 * `Date.parse('')` rend NaN, la soustraction aussi, et le garde-fou le laissait
 * passer. La taxe de sejour devenait NaN, le total avec — et `TotalRoulant`
 * memorisait ce NaN, donc le total restait mort meme une fois les dates
 * redevenues bonnes.
 * Un sejour incomplet, c'est zero nuit. Pas « pas un nombre ». */
const nuitsEntre = (a: string, b: string) => {
  const jours = (Date.parse(b) - Date.parse(a)) / 86_400_000;
  return Number.isFinite(jours) ? Math.max(0, Math.round(jours)) : 0;
};

// Taxe de séjour Toulon, 3 étoiles : 1,86 € par adulte et par nuit, taxes
// additionnelles comprises. Elle entre dans le total et son montant est dit :
// annoncée d'avance, jamais découverte à la fin.
const TAXE_PAR_ADULTE_NUIT = 1.86;

// La reception des Voiles. En direct, le telephone est l'autre chemin sans
// commission : il a sa place au pied du paiement, pas ailleurs. Un visiteur
// anglophone appelle depuis l'etranger : il lui faut l'indicatif.
const TELEPHONE: Record<Langue, string> = {
  fr: "04 94 41 36 23",
  en: "+33 4 94 41 36 23",
};

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

/** Le tarif debite la carte a la reservation (prepaye) ou la preautorise (flexible) ? */
const estPrepaye = (tarif: Tarif | undefined, groupes: GroupeTarifaire[]): boolean => {
  const groupe = groupes.find((g) => g.Id === tarif?.RateGroupId);
  if (groupe?.SettlementAction === "ChargeCreditCard") return true;
  if (groupe?.SettlementAction === "CreatePreauthorization") return false;
  return /non[\s-]*remboursable|non[\s-]*refundable|prépaiement|prepay/.test(
    `${String(tarif?.Name ?? "")} ${String(tarif?.Description ?? "")}`.toLowerCase(),
  );
};

/* La date reelle d'annulation gratuite.
 *
 * Mews ne la donne nulle part en clair : la seule trace est la phrase du tarif
 * (« Annulable sans frais jusqu'au jour d'arrivee 18h »). On ne la reformule
 * que si elle dit bien « jour d'arrivee » — sinon on se tait plutot que de
 * promettre une date fausse, qui se paierait au comptoir. */
const heureLimite = (tarif: Tarif | undefined, langue: Langue): number | null => {
  const texte = `${t(tarif?.Description, langue)}`.toLowerCase();
  if (!/jour d'arriv|day of arrival/.test(texte)) return null;
  const h = texte.match(/(\d{1,2})\s*h/) ?? texte.match(/(\d{1,2})\s*(?:pm|:00)/);
  const heure = h ? Number(h[1]) : NaN;
  return Number.isInteger(heure) && heure >= 1 && heure <= 23 ? heure : null;
};

/* La photo qui represente le mieux chaque chambre.
 *
 * Mews en heberge trois a cinq par categorie, mais la premiere de la liste est
 * une salle de bain sur deux categories sur trois. On designe donc la bonne par
 * son identifiant (stable : reordonner les photos dans Mews ne le change pas),
 * et on retombe sur la premiere si l'identifiant disparait. */
const PHOTO_DE_TETE: Record<string, string> = {
  // Chambre confort — le lit et le mur bordeaux, plutot que la salle de bain.
  "e34e45e7-8ce1-4b68-8547-aaa9008727ad": "b1361f7c-d12f-41f1-9665-ab2800fa84bd",
  // Chambre individuelle — la chambre, pas la douche.
  "a1f3a293-0567-49c7-81c6-aaa9008727ad": "a490108f-2cc2-41c6-b499-ab2800f699c0",
  // Chambre superieure — la porte-fenetre et la vue, c'est ce qu'on vend.
  "c60f97a0-8870-4c0e-8d1e-aaa9008727ad": "d30156f7-26bd-4abb-9695-ab2800f88143",
};

/* Ce qu'on ne voit pas sur la photo.
 *
 * Une photo montre un lit ; elle ne dit pas s'il y a un balcon, si la rue est
 * calme, si l'on peut avoir des lits jumeaux. Ces phrases viennent du descriptif
 * chambres de l'hotel (surfaces, balcons, specificites relevees chambre par
 * chambre) et de la description Mews de la categorie — pas d'un argumentaire.
 * Une phrase par categorie, jamais deux : c'est un tunnel, pas une brochure.
 *
 * Cle = identifiant de categorie Mews, stable. Une categorie inconnue n'affiche
 * rien plutot qu'une phrase generique.
 *
 * Le descriptif recense des lits bebe et des lits d'appoint dans plusieurs
 * chambres : l'hotel ne les propose PAS (tranche le 25/08/2026). Ces colonnes
 * du descriptif ne remontent donc jamais a l'ecran. Les lits jumeaux,
 * eux, sont une autre disposition des memes couchages, pas un lit de plus :
 * ils restent annonces sur la superieure.
 */
const DESCRIPTION_CATEGORIE: Record<string, Record<Langue, string>> = {
  // Individuelle — les quatre ont un balcon, toutes au niveau de l'ascenseur.
  "a1f3a293-0567-49c7-81c6-aaa9008727ad": {
    fr: "Toutes avec balcon, au niveau de l'ascenseur. Pensée pour une nuit ou deux, seul.",
    en: "All with a balcony, on the lift landing. Made for a night or two, on your own.",
  },
  // Confort — côté rue, quartier résidentiel. Une PMR, une avec baignoire.
  "e34e45e7-8ce1-4b68-8547-aaa9008727ad": {
    fr: "Côté rue, dans un quartier résidentiel très calme. Une chambre PMR et une avec baignoire, selon disponibilité.",
    en: "Street side, in a very quiet residential district. One accessible room and one with a bathtub, subject to availability.",
  },
  // Supérieure — vue mer ; cinq des sept ont un balcon, lits jumeaux possibles.
  "c60f97a0-8870-4c0e-8d1e-aaa9008727ad": {
    fr: "Vue sur la rade, balcon pour cinq des sept chambres. Lits jumeaux possibles, selon disponibilité.",
    en: "Looking out over the bay, with a balcony in five of the seven rooms. Twin beds subject to availability.",
  },
};

/* Les noms de chambres en anglais.
 *
 * Mews ne porte les noms de categories qu'en `fr-FR` : la page anglaise
 * affichait « Chambre supérieure - vue mer » a un visiteur qui lit « Flexible
 * rate » deux lignes plus bas.
 *
 * Ce repli ne s'applique QUE si Mews n'a pas de traduction — on le sait en
 * comparant le nom rendu au nom francais. Le jour ou l'hotel saisit les noms
 * anglais dans son back-office, ils passent devant et cette table cesse de
 * servir sans qu'on y touche.
 */
const NOM_ANGLAIS: Record<string, string> = {
  "a1f3a293-0567-49c7-81c6-aaa9008727ad": "Single Room",
  "e34e45e7-8ce1-4b68-8547-aaa9008727ad": "Comfort Room",
  "c60f97a0-8870-4c0e-8d1e-aaa9008727ad": "Superior Room — Sea View",
};

const nomChambre = (
  categorieId: string,
  cat: CategorieChambre | undefined,
  langue: Langue,
): string => {
  if (!cat) return "—";
  const traduitParMews = langue === "fr" || cat.nom !== cat.nomFr;
  return traduitParMews ? cat.nom : (NOM_ANGLAIS[categorieId] ?? cat.nom);
};

/* Tarif public et tarif direct, cote a cote sans rien inventer.
 *
 * Le plan : creer dans Mews deux tarifs derives a -10 %, actives sur la seule
 * configuration du moteur direct et NON mappes dans D-EDGE. Les OTA ne les
 * voient donc jamais.
 *
 * Si l'hotel laisse aussi les tarifs publics actives sur cette configuration,
 * Mews renvoie DEUX prix pour un meme mode d'encaissement : le public et le
 * direct. On affiche alors le public barre, le direct en grand, et le
 * pourcentage CALCULE sur les deux montants — jamais une remise ecrite ici, qui
 * mentirait le jour ou l'hotel change la derivation.
 *
 * Si seuls les tarifs directs sont actives, il n'y a qu'un prix par mode : la
 * carte s'affiche comme avant, sans barre ni pastille. Les deux configurations
 * marchent, aucune n'exige de toucher au code.
 */
type Prix = { tarifId: string; total: number; parNuit: number };
type Carte = { prepaye: boolean; direct: Prix; public: Prix | null };

const cartesDe = (
  prix: Prix[],
  tarifs: Tarif[],
  groupes: GroupeTarifaire[],
  /* ⚠️ Le prepaye ne se vend pas pour une arrivee du jour.
   *
   * Le flexible est annulable sans frais jusqu'a 18 h le jour d'arrivee. Passe
   * ce cap — et pour une arrivee du jour on y est ou presque — les deux tarifs
   * sont exactement le meme produit : une nuit qu'on ne peut plus annuler. Le
   * prepaye ne rachetait alors plus aucun risque, il offrait simplement 10 € de
   * moins pour une contrainte que le client subissait deja.
   * Tranche par Martin le 25/08/2026. Seul le flexible reste affiche. */
  sansPrepaye = false,
): Carte[] => {
  const par = new Map<boolean, Prix[]>();
  for (const p of prix) {
    const cle = estPrepaye(tarifs.find((r) => r.Id === p.tarifId), groupes);
    par.set(cle, [...(par.get(cle) ?? []), p]);
  }
  const cartes: Carte[] = [];
  // Flexible d'abord : c'est celui qui rassure, et le prepaye se lit ensuite
  // comme une economie consentie contre un engagement.
  for (const prepaye of [false, true]) {
    if (prepaye && sansPrepaye) continue;
    const lot = par.get(prepaye);
    if (!lot?.length) continue;
    const tries = [...lot].sort((a, b) => a.total - b.total);
    cartes.push({
      prepaye,
      direct: tries[0],
      public: tries.length > 1 && tries[tries.length - 1].total > tries[0].total
        ? tries[tries.length - 1]
        : null,
    });
  }
  return cartes;
};

/* La largeur du lit se deduit du couchage, elle ne se saisit pas.
 *
 * Aux Voiles : 140 dans les individuelles, 160 partout ailleurs. Mews donne le
 * couchage (`NormalBedCount`) ; la regle tient en une ligne et suivra une
 * categorie ajoutee demain sans qu'on y touche. Un lit de 140 dans une chambre
 * pour une personne, ce n'est pas un detail : c'est un vrai lit double, et
 * c'est precisement ce que la concurrence ne dit pas. */
const litDe = (couchages: number | null): number | null =>
  couchages === null ? null : couchages <= 1 ? 140 : 160;

/* Les photos du depot, en plus de celles de Mews.
 *
 * ⚠️ Les huit fichiers de `public/images/chambres/` portent le bandeau
 * « PETIT-DEJEUNER INCLUS / BREAKFAST INCLUDED » incruste en diagonale : ce sont
 * des exports OTA. Elles viennent donc APRES les photos Mews, qui sont les
 * seules propres — la vignette de la carte et la premiere image de la galerie
 * restent sans filigrane. A remplacer par les originaux quand l'hotel les aura.
 */
const PHOTOS_LOCALES: Record<string, string[]> = {
  // Individuelle — la 3e etait une douche et un lavabo, supprimee du depot.
  "a1f3a293-0567-49c7-81c6-aaa9008727ad": [
    "/images/chambres/single/1.jpg", "/images/chambres/single/2.jpg",
  ],
  // Confort
  "e34e45e7-8ce1-4b68-8547-aaa9008727ad": [
    "/images/chambres/confort/1.jpg", "/images/chambres/confort/2.jpg", "/images/chambres/confort/3.jpg",
  ],
  // Superieure vue mer
  "c60f97a0-8870-4c0e-8d1e-aaa9008727ad": [
    "/images/chambres/superieur/1.jpg", "/images/chambres/superieur/2.jpg", "/images/chambres/superieur/3.jpg",
  ],
};

/* ─────────────────────────── La galerie d'une chambre ───────────────────────
 * « On voit une photo, mais on a rien de plus. » Mews héberge trois à cinq
 * photos par catégorie : les montrer coûte un clic, et c'est exactement ce que
 * le client va chercher ailleurs quand la page ne le lui donne pas.
 *
 * Surcouche plutôt que carrousel dans la carte : le carrousel vole la place des
 * prix, la surcouche ne coûte rien tant qu'on ne l'ouvre pas. Au clavier :
 * Échap ferme, les flèches défilent, le focus part sur le bouton de fermeture
 * et n'en sort pas.
 */
type Photo = { src: string; alt?: string };

function Galerie({
  images, titre, debut, T, onFermer,
}: {
  /** Des sources completes : les chambres viennent du CDN Mews, les communs du
   *  depot. La galerie ne sait pas d'ou elles sortent, et n'a pas a le savoir. */
  images: Photo[];
  titre: string;
  /** La photo par laquelle ouvrir : celle de la carte, pour que le clic ne
   *  change pas d'image sous le doigt du client. */
  debut: number;
  T: (typeof TEXTES)[Langue];
  onFermer: () => void;
}) {
  const [index, setIndex] = useState(debut);
  const boite = useRef<HTMLDivElement | null>(null);
  const fermeture = useRef<HTMLButtonElement | null>(null);
  // Abscisse du doigt au poser : de quoi distinguer un glisse d'une tape.
  const depart = useRef<number | null>(null);

  const suivante = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);
  const precedente = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);

  useEffect(() => { fermeture.current?.focus(); }, []);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onFermer(); return; }
      if (e.key === "ArrowRight") suivante();
      if (e.key === "ArrowLeft") precedente();
      // Le focus ne quitte pas la surcouche : sans cela, la tabulation part
      // choisir une chambre derriere une image plein ecran.
      if (e.key === "Tab" && boite.current) {
        const cibles = boite.current.querySelectorAll<HTMLElement>("button");
        if (!cibles.length) return;
        const premier = cibles[0], dernier = cibles[cibles.length - 1];
        if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
        else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
      }
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [onFermer, suivante, precedente]);

  const plusieurs = images.length > 1;

  return (
    <div
      role="dialog" aria-modal="true" aria-label={titre}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/90 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}
    >
      {/* `h-full` et non `max-h-full` : sans hauteur definie, le `flex-1` de la
          photo se resout a zero et la surcouche s'affiche vide. */}
      <div ref={boite} className="flex h-full w-full max-w-4xl flex-col gap-3">
        <div className="flex shrink-0 items-center justify-between gap-4 text-cream">
          <p className="font-serif text-xl">{titre}</p>
          <button
            ref={fermeture} type="button" onClick={onFermer} aria-label={T.galerieFermer}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/15 text-cream backdrop-blur-sm transition hover:bg-cream/30"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Les commandes se posent SUR la photo.
            Rejetees sous elle, les fleches tombaient au bas de l'ecran, loin de
            ce qu'elles font defiler et par-dessus la page assombrie. Ici la
            photo elle-meme avance d'une image au clic, et le doigt la fait
            glisser : c'est le geste que tout le monde a deja. */}
        <div
          className="relative min-h-0 w-full flex-1"
          onTouchStart={(e) => { depart.current = e.touches[0]?.clientX ?? null; }}
          onTouchEnd={(e) => {
            const x0 = depart.current;
            depart.current = null;
            if (x0 === null || !plusieurs) return;
            const ecart = (e.changedTouches[0]?.clientX ?? x0) - x0;
            // 40 px : au-dela c'est un glisse, en deca c'est une tape qui vise.
            if (ecart <= -40) suivante();
            else if (ecart >= 40) precedente();
          }}
        >
          <button
            type="button"
            onClick={plusieurs ? suivante : onFermer}
            aria-label={plusieurs ? T.galerieSuiv : T.galerieFermer}
            className="absolute inset-0 h-full w-full cursor-pointer"
          >
            {/* `contain` et non `cover` : dans une galerie, recadrer revient a
                cacher la moitie de ce que le client est venu voir. */}
            <Image
              src={images[index].src}
              alt={images[index].alt ?? `${titre} — ${T.galerieCompteur(index + 1, images.length)}`}
              fill sizes="(max-width: 900px) 100vw, 900px" className="rounded-2xl object-contain" priority
            />
          </button>

          {plusieurs && (
            <>
              <button
                type="button" aria-label={T.galeriePrec}
                onClick={precedente}
                className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-navy-deep shadow-[0_4px_16px_rgba(0,0,0,0.28)] transition hover:bg-white active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <button
                type="button" aria-label={T.galerieSuiv}
                onClick={suivante}
                className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-navy-deep shadow-[0_4px_16px_rgba(0,0,0,0.28)] transition hover:bg-white active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {/* Des points plutot qu'un compteur : on voit d'un coup combien il
                  en reste, sans lire. */}
              <span className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-navy-deep/55 px-3 py-2 backdrop-blur-sm">
                {images.map((img, i) => (
                  <span
                    key={img.src}
                    className={[
                      "block rounded-full transition-all",
                      i === index ? "h-2 w-5 bg-cream" : "h-2 w-2 bg-cream/50",
                    ].join(" ")}
                  />
                ))}
                <span className="sr-only">{T.galerieCompteur(index + 1, images.length)}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Le recit de la maison.
 *
 * Sur PC il vit au bas de la colonne des dates, ou il occupe la place que le
 * calendrier a liberee. Sur telephone les colonnes s'empilent : mis au meme
 * endroit, il repousserait les chambres d'un ecran entier. Il passe donc APRES
 * elles — meme bloc, deux emplacements, un seul jeu de textes. */
function Maison({
  recit, T, variante, onGalerie,
}: {
  recit: Recit | null;
  T: (typeof TEXTES)[Langue];
  variante: "colonne" | "suite";
  onGalerie: () => void;
}) {
  // Le dos de la carte. Sur PC, la colonne ne defile pas : elle se retourne.
  const [dos, setDos] = useState(false);
  if (!recit) return null;
  const surPC = variante === "colonne";

  const bouton = (ouvrir: boolean) => (
    <button
      type="button"
      onClick={() => setDos(ouvrir)}
      aria-expanded={dos}
      className="flex w-full shrink-0 items-center justify-between gap-3 rounded-xl border border-[#e3e0d9] px-4 py-3 text-left text-[14px] font-semibold text-navy transition-colors hover:border-gold hover:bg-[#faf7f1]"
    >
      {ouvrir ? recit.compris.titre : recit.compris.titre}
      <svg
        aria-hidden viewBox="0 0 24 24"
        className={["h-4 w-4 shrink-0 text-gold-ink transition-transform", ouvrir ? "" : "rotate-180"].join(" ")}
        fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );

  const retour = (
    <button
      type="button"
      onClick={() => setDos(false)}
      className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e3e0d9] px-4 py-2.5 text-[14px] font-semibold text-navy transition-colors hover:border-gold hover:bg-[#faf7f1]"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-gold-ink" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {T.retour}
    </button>
  );

  const arrivee = (
    <div className="shrink-0">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
        {recit.arrivee.titre}
      </h2>
      <div className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-[#4a5a63]">
        {recit.arrivee.lignes.map((l) => <p key={l}>{l}</p>)}
      </div>
    </div>
  );

  /* La photo des communs, porte d'entree de la galerie.
   *
   * Sur PC elle prend la place qui reste au bas de la colonne (`flex-1`) ; sur
   * telephone la colonne n'a pas de hauteur a distribuer, et un `flex-1` dans
   * un flux normal se resout a la hauteur minimale — la photo tombait a 110 px
   * de haut. On lui donne donc un rapport de 16/9 sous `lg`, et la place
   * restante au-dela. */
  const photo = (enColonne: boolean) => recit.communs.length > 0 && (
    <button
      type="button"
      onClick={onGalerie}
      aria-label={T.galerieOuvrir(recit.communs.length)}
      className={[
        "group relative mt-4 w-full overflow-hidden rounded-xl bg-[#f0ece4]",
        enColonne ? "min-h-[110px] flex-1" : "aspect-[16/9]",
      ].join(" ")}
    >
      <Image
        src={recit.communs[0].src} alt={recit.communs[0].alt} fill sizes="(min-width: 1024px) 340px, 100vw"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <span className="absolute bottom-2 left-2 rounded-full bg-navy-deep/80 px-2.5 py-1 text-[11px] font-semibold text-cream backdrop-blur-sm">
        {T.galerieOuvrir(recit.communs.length)}
      </span>
    </button>
  );

  /* Les trois phrases de la maison, et la liste de ce que le sejour comprend.
   * Deux choses distinctes : sur PC elles partagent le dos de la carte, faute
   * de place ailleurs ; sur telephone le recit se lit a decouvert et seule la
   * liste se replie — elle etait cachee derriere un bouton « Ce qui est
   * compris » qui n'annoncait pas l'histoire qu'il contenait. */
  const histoire = (
    <div className="shrink-0 space-y-1.5 text-[12.5px] leading-relaxed text-[#4a5a63]">
      {recit.lignes.map((l) => <p key={l}>{l}</p>)}
    </div>
  );

  /* Deux colonnes : onze lignes empilees ne tenaient pas dans la face, et
     on avait retire le defilement precisement pour ca. */
  const inclus = (
    <ul className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 text-[12.5px] leading-snug text-[#4a5a63]">
      {recit.compris.items.map((i) => (
        <li key={i.texte} className="flex items-start gap-1.5">
          <span aria-hidden className={i.absent ? "text-[#b0b6ba]" : "text-gold-ink"}>
            {i.absent ? "—" : "✓"}
          </span>
          <span className={i.absent ? "text-[#8a9299]" : ""}>{i.texte}</span>
        </li>
      ))}
    </ul>
  );

  const compris = (
    <>
      {histoire}
      <div className="mt-2.5 border-t border-[#f0ece4] pt-2.5">{inclus}</div>
    </>
  );

  /* ── Telephone : la meme carte, qui se retourne elle aussi ─────────────────
   *
   * Ce bloc ne portait que l'arrivee et un bouton « Ce qui est compris ». Le
   * reste de la maison — la photo du rooftop, les trois phrases, la galerie des
   * communs — n'existait que sur PC : sur telephone, l'ecran ne decrivait
   * jamais l'hotel, et la seule porte vers les photos des communs etait dans la
   * colonne masquee. Or c'est le telephone qui reserve.
   *
   * Le depliage en accordeon a laisse la place a la bascule du PC : c'est le
   * meme carton, il se retourne pareil sur les deux ecrans. Devant, ce qu'on
   * achete (le nom, la photo, l'histoire) puis comment on y entre ; derriere,
   * le detail de ce qui est compris.
   *
   * Les faces se superposent en GRILLE, pas en `absolute` comme sur PC : ici la
   * colonne n'a pas de hauteur a distribuer, et `absolute inset-0` dans un flux
   * normal se resout a zero — la carte disparaissait. Meme cellule de grille
   * pour les deux faces : la boite prend la hauteur de la plus haute, et rien
   * ne saute quand on la retourne. */
  if (!surPC) {
    return (
      <div className="mt-6 border-t border-[#f0ece4] pt-5 lg:hidden">
        {/* La photo et le titre ne tournent pas : ce sont eux, la carte. Faire
            pivoter le bloc entier laissait le dos — huit lignes — sous une face
            haute d'une photo et de trois paragraphes, donc un trou de deux cent
            cinquante pixels sous la liste. Seul le texte se retourne, et le
            rooftop reste a l'ecran des deux cotes. */}
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
          {recit.titre}
        </h2>
        {photo(false)}

        {/* ⚠️ La bascule ne repose PAS sur `backface-visibility` seule.
            Sur le telephone de Martin (Android, 25/08/2026) elle n'etait pas
            honoree : les deux faces s'affichaient l'une sur l'autre et le
            devant apparaissait en miroir — la carte etait aplatie avant d'etre
            tournee. Chrome headless, lui, l'honorait : aucune capture ne
            montrait le defaut.
            Chaque face bascule donc aussi en `visibility`, commutee a 350 ms —
            la moitie des 700 ms de rotation, l'instant ou la carte est sur la
            tranche et ou l'on ne voit rien. L'echange est invisible la ou la
            propriete marche, et il sauve l'effet la ou elle ne marche pas.
            `visibility` et non `hidden` : une face retiree du flux ferait
            retomber la hauteur de la grille au milieu du mouvement. */}
        <div className="mt-3 [perspective:1200px]">
          <div
            className={[
              "grid transition-transform duration-700 ease-in-out [transform-style:preserve-3d]",
              dos ? "[transform:rotateY(180deg)]" : "",
            ].join(" ")}
          >
            <div
              inert={dos}
              className={[
                "col-start-1 row-start-1 flex flex-col [backface-visibility:hidden] [-webkit-backface-visibility:hidden]",
                "[transition:visibility_0s_linear_350ms]",
                dos ? "invisible" : "",
              ].join(" ")}
            >
              {histoire}
              <div className="mt-5">{arrivee}</div>
            </div>

            <div
              inert={!dos}
              className={[
                "col-start-1 row-start-1 flex flex-col [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]",
                "[transition:visibility_0s_linear_350ms]",
                dos ? "" : "invisible",
              ].join(" ")}
            >
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
                {recit.compris.titre}
              </h2>
              <div className="mt-3">{inclus}</div>
            </div>
          </div>
        </div>

        {/* Un seul bouton, toujours au meme endroit : il ouvre, puis il ferme.
            Deux boutons — un par face — auraient chacun bouge avec la hauteur
            de leur face, et la commande aurait saute d'un cote a l'autre. */}
        <div className="mt-4">{dos ? retour : bouton(true)}</div>
      </div>
    );
  }

  /* ── PC : la carte se retourne ─────────────────────────────────────────────
   * La colonne ne defile plus. Le bas de la carte porte deux faces de meme
   * taille — l'arrivee et la photo devant, ce qui est compris derriere — et le
   * bouton fait pivoter l'ensemble. On voit le carton tourner : le client sait
   * qu'il a retourne quelque chose, pas qu'il a change de page.
   *
   * `backface-visibility` en propriete arbitraire plutot qu'en utilitaire : la
   * regle est la meme depuis dix ans, l'utilitaire a change de nom deux fois. */
  return (
    <div className="mt-6 hidden min-h-0 flex-1 flex-col border-t border-[#f0ece4] pt-5 [perspective:1400px] lg:flex">
      <div
        className={[
          "relative min-h-0 flex-1 transition-transform duration-700 ease-in-out [transform-style:preserve-3d]",
          dos ? "[transform:rotateY(180deg)]" : "",
        ].join(" ")}
      >
        <div
          inert={dos}
          className={[
            "absolute inset-0 flex flex-col [backface-visibility:hidden] [-webkit-backface-visibility:hidden]",
            "[transition:visibility_0s_linear_350ms]",
            dos ? "invisible" : "",
          ].join(" ")}
        >
          {arrivee}
          {photo(true)}
          <div className="mt-4">{bouton(true)}</div>
        </div>

        <div
          inert={!dos}
          className={[
            "absolute inset-0 flex flex-col [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]",
            "[transition:visibility_0s_linear_350ms]",
            dos ? "" : "invisible",
          ].join(" ")}
        >
          <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
            {recit.compris.titre}
          </h2>
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto">{compris}</div>
          <div className="mt-3">{retour}</div>
        </div>
      </div>
    </div>
  );
}

/* Les photos qu'on ne montre pas.
 *
 * Trois images Mews sont des salles de bain pures — cuvette, lavabo, cabine.
 * Elles se defendent sur un comparateur, ou l'on verifie qu'il y a bien une
 * douche ; sur la page qui doit donner envie, elles font l'inverse. Ecartees par
 * identifiant, jamais par position : reordonner les photos dans Mews ne doit pas
 * ramener une cuvette en vitrine.
 */
const PHOTOS_ECARTEES = new Set([
  "9321c61b-003d-4c9c-bef8-ab2800f64697", // Individuelle — douche et lavabo au premier plan
  "f849455d-224d-41d8-a7ea-ab2800fa351d", // Confort — salle de bain entiere
  "5fac13c7-8365-4f6b-8c4a-ab2800f9bde8", // Superieure — cuvette et lavabo
]);

/* La photo de couverture, designee par l'hotel.
 *
 * Martin a choisi ces trois-la a l'ecran le 25/08/2026 : c'est le cadrage qui
 * decide, pas l'ordre de la configuration Mews ni le hasard du premier fichier.
 * Elle prime sur tout le reste, `PHOTO_DE_TETE` compris.
 *
 * ⚠️ Les trois viennent du depot, donc portent le bandeau OTA
 * « PETIT-DEJEUNER INCLUS » incruste en diagonale : il s'affiche desormais sur
 * la vignette de chaque chambre, ce qu'on evitait jusqu'ici en ne servant que
 * des photos Mews en couverture. Retirer une entree d'ici suffit a revenir a la
 * photo Mews, sans rien toucher d'autre.
 *
 * ⚠️ `superieur/3.jpg` est en portrait (512 x 768) quand la vignette est un
 * bandeau : le recadrage ne garde qu'une bande verticale centrale — la porte-
 * fenetre, le palmier et la mer. Verifie a l'ecran, mais c'est le fichier qu'il
 * faudra reprendre le jour ou l'hotel fournira ses originaux.
 */
const COUVERTURE: Record<string, string> = {
  "a1f3a293-0567-49c7-81c6-aaa9008727ad": "/images/chambres/single/2.jpg",    // Individuelle
  "e34e45e7-8ce1-4b68-8547-aaa9008727ad": "/images/chambres/confort/2.jpg",   // Confort
  "c60f97a0-8870-4c0e-8d1e-aaa9008727ad": "/images/chambres/superieur/3.jpg", // Superieure vue mer
};

/** L'image de la carte, prete a poser dans `src` : chemin du depot ou URL Mews. */
const couvertureDe = (
  categorieId: string,
  cat: CategorieChambre | undefined,
  largeur: number,
): string | null => {
  const choisie = COUVERTURE[categorieId];
  if (choisie) return choisie;
  const voulue = PHOTO_DE_TETE[categorieId];
  if (voulue && cat?.images.includes(voulue)) return urlPhoto(voulue, largeur);
  const repli = cat?.images.find((id) => !PHOTOS_ECARTEES.has(id));
  return repli ? urlPhoto(repli, largeur) : null;
};

/** Toutes les photos d'une chambre : Mews d'abord, le depot ensuite — mais la
 *  couverture en tete, d'ou qu'elle vienne, pour que la galerie s'ouvre sur
 *  l'image qu'on vient de toucher et non sur une autre. */
const photosDe = (categorieId: string, cat: CategorieChambre | undefined, nom: string): Photo[] => {
  const couverture = couvertureDe(categorieId, cat, 1400);
  const toutes = [
    ...(cat?.images ?? []).filter((id) => !PHOTOS_ECARTEES.has(id)).map((id) => urlPhoto(id, 1400)),
    ...(PHOTOS_LOCALES[categorieId] ?? []),
  ];
  const ordonnees = couverture
    ? [couverture, ...toutes.filter((src) => src !== couverture)]
    : toutes;
  return ordonnees.map((src) => ({ src, alt: nom }));
};

export default function ReserverClient({ langue }: { langue: Langue }) {
  const T = TEXTES[langue];
  const recit = RECIT.voiles[langue];

  // La nuit du jour, proposée d'emblée : c'est la demande la plus fréquente en
  // direct, et le calendrier étant posé dans la page, la changer coûte une tape
  // — pas besoin d'effacer quoi que ce soit d'abord.
  const [arrivee, setArrivee] = useState(() => dansNJours(0));
  const [depart, setDepart] = useState(() => dansNJours(1));
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [dispo, setDispo] = useState<Disponibilite | null>(null);
  const [categories, setCategories] = useState<Map<string, CategorieChambre>>(new Map());
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);
  // La chambre retenue, qui alimente la colonne de droite.
  const [choix, setChoix] = useState<Choix | null>(null);
  const dejaLance = useRef(false);
  const zoneOffres = useRef<HTMLElement | null>(null);
  const zoneRecap = useRef<HTMLElement | null>(null);
  const defilerApres = useRef(false);
  // La barre collante du telephone se tait quand le recapitulatif est a l'ecran.
  const [recapVisible, setRecapVisible] = useState(false);
  // Le calendrier ne s'ouvre qu'a la demande, sur telephone comme sur PC. Pose
  // dans la page, il mangeait 700 px de la colonne de gauche pour une date deja
  // choisie — de la place prise a ce que le client est venu voir.
  const [calendrierOuvert, setCalendrierOuvert] = useState(false);
  // La categorie dont on regarde les photos, s'il y en a une.
  const [galerie, setGalerie] = useState<string | null>(null);
  // La chambre dont on a demande les details. Une seule a la fois : la liste
  // reste courte, et c'est bien la longueur qui etait le reproche.
  const [detaille, setDetaille] = useState<string | null>(null);
  // Les criteres de la derniere recherche aboutie. Tant qu'ils correspondent a
  // l'ecran, le bouton or n'a rien a faire la : il pointerait vers une action
  // deja faite, alors que le seul bouton or de la page doit designer l'achat.
  const [cherche, setCherche] = useState<{ a: string; d: string; pax: number } | null>(null);
  /* Compte les recherches abouties. Sert d'unique declencheur a l'animation
   * d'entree des montants : le changer remonte les cartes de tarif, donc
   * rejoue leur animation. On ne peut pas s'appuyer sur le prix lui-meme —
   * passer de « seul » a « a deux » ne change pas seulement les montants,
   * il change les chambres proposees, et faire courir un chiffre d'une
   * chambre a l'autre annoncerait une hausse qui n'existe pas. */
  const [tour, setTour] = useState(0);

  /* Ce que le meme sejour coute sur Booking, par categorie.
   * Les tarifs OTA vivent dans le meme Mews mais ne sont pas publies sur la
   * configuration du moteur — et ne doivent pas l'etre, ils deviendraient
   * reservables en direct. Seul le Connector les lit, donc ca passe par notre
   * serveur, qui les garde quinze minutes en cache. */
  const [tarifPublic, setTarifPublic] = useState<Record<string, { flexible: number; prepaye: number }> | null>(null);

  /* La table du rooftop, choisie AVEC la chambre. `tablePrise` n'existe
   * qu'apres la reservation : une table tenue pour un paiement qui echoue est
   * une table perdue et une promesse en l'air. */
  const [tableChoix, setTableChoix] = useState<ChoixTable | null>(null);
  const [tablePrise, setTablePrise] = useState<TablePrise>(null);
  const [dosRooftop, setDosRooftop] = useState(false);

  /* Le reglement. Plus de cle marchande ni de jeton : depuis Mews Payments
   * Checkout, la carte est collectee par un iframe de Mews et le paiement se
   * joue entierement chez eux. L'ecran n'a plus qu'a s'ouvrir. */
  const [paiementOuvert, setPaiementOuvert] = useState(false);
  const [reserve, setReserve] = useState<{
    groupeId: string; numeros: string[];
    client: { prenom: string; nom: string; email: string; telephone: string };
  } | null>(null);
  /* La reprise au retour du 3-D Secure : « en-cours » pendant qu'on confirme,
     « echec » si on n'a pas pu. Un retour de banque qui n'aboutit a rien
     visible est la pire seconde du tunnel. */
  const [reprise, setReprise] = useState<"en-cours" | "echec" | null>(null);

  const nuits = nuitsEntre(arrivee, depart);
  const adultes = voyage === "seul" ? 1 : 2;
  const aJour = !!cherche && cherche.a === arrivee && cherche.d === depart && cherche.pax === adultes;

  // Le cœur de la recherche prend ses dates en argument : au montage, l'état
  // React n'est pas encore à jour quand on relit l'URL.
  const lancer = useCallback(async (
    { arrivee: a, depart: d, adultes: pax }: { arrivee: string; depart: string; adultes: number },
  ) => {
    setChargement(true);
    setErreur(false);
    try {
      const [dispos, cats] = await Promise.all([
        chercherDisponibilite({ arrivee: a, depart: d, adultes: pax, langue }),
        chargerCategories(langue),
      ]);
      setDispo(dispos);
      setCategories(cats);
      setChoix(null); // les prix changent avec les dates : on ne garde pas l'ancien choix
      setCherche({ a, d, pax });
      setTour((t) => t + 1);
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
    setCalendrierOuvert(false);
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

  /* La barre collante annonce le total et propose d'aller le voir. Arrivé au
   * récapitulatif, elle répétait mot pour mot le bloc juste au-dessus d'elle —
   * même nom de chambre, même montant — et son bouton menait à ce qu'on avait
   * déjà sous les yeux. Elle s'efface dès que le récapitulatif entre à l'écran.
   *
   * Le seuil est bas (10 %) : c'est l'entrée du bloc qui compte, pas sa lecture
   * complète — il fait plus d'un écran de haut sur téléphone. */
  useEffect(() => {
    const cible = zoneRecap.current;
    if (!cible) return;
    const oeil = new IntersectionObserver(
      ([e]) => setRecapVisible(e.isIntersecting),
      { threshold: 0.1 },
    );
    oeil.observe(cible);
    return () => oeil.disconnect();
  }, []);

  // Une recherche est partageable : /reserver?arrivee=…&depart=…&voyage=deux
  // renvoie exactement le même écran. Sert aux liens de la page d'accueil, au
  // partage entre deux personnes qui décident ensemble, et au retour arrière du
  // navigateur — trois moments où un tunnel classique perd le client.
  useEffect(() => {
    if (dejaLance.current) return;
    dejaLance.current = true;
    const p = new URLSearchParams(window.location.search);

    /* ⚠️ LE RETOUR DE LA BANQUE. Le 3-D Secure fait quitter la page : le client
       revient ici authentifie, et React est remonte de zero. Sans cette
       reprise, sa reservation reste `Optional` et Mews la relache vingt minutes
       plus tard — il croirait avoir reserve et n'aurait rien.
       Le relais ne porte aucune donnee bancaire, et il ne prouve rien : c'est
       `/api/reserver/carte` qui relit l'autorisation CHEZ MEWS avant de
       confirmer. Voir `reprise3ds.ts`. */
    if (p.get("apres3ds")) {
      // On efface le parametre tout de suite : un rechargement ne doit pas
      // rejouer la reprise, et l'URL partagee ne doit pas la porter.
      window.history.replaceState({}, "", window.location.pathname);
      const vente = reprendreVente();
      if (vente) {
        setReprise("en-cours");
        void fetch("/api/reserver/carte", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            langue: vente.langue,
            carteId: vente.carteId,
            reservationIds: vente.reservationIds,
            sejour: vente.sejour,
          }),
        })
          .then((r) => {
            if (!r.ok) { setReprise("echec"); return; }
            setReprise(null);
            setReserve({
              groupeId: vente.groupeId, numeros: vente.numeros, client: vente.client,
            });
          })
          .catch(() => setReprise("echec"));
      } else {
        // Onglet ferme, navigation privee, ou plus de trente minutes : on ne
        // sait plus de quelle vente il s'agit. Le telephone rattrape.
        setReprise("echec");
      }
    }

    const a = p.get("arrivee"), d = p.get("depart"), v = p.get("voyage") as Voyage | null;
    const datesValides =
      /^\d{4}-\d{2}-\d{2}$/.test(a ?? "") && /^\d{4}-\d{2}-\d{2}$/.test(d ?? "");
    const voyageValide = v === "seul" || v === "deux";

    if (datesValides && voyageValide) {
      setArrivee(a!); setDepart(d!); setVoyage(v);
      void lancer({ arrivee: a!, depart: d!, adultes: v === "seul" ? 1 : 2 });
      return;
    }

    // Rien dans l'URL : on cherche quand meme, sur la nuit du jour et pour deux.
    // Le client atterrit sur des chambres et des prix au lieu d'un formulaire
    // vide — c'est le changement qui pese le plus sur la conversion. La chambre
    // individuelle reste proposee juste en dessous (« Vous voyagez seul ? »).
    setVoyage("deux");
    void lancer({ arrivee, depart, adultes: 2 });
    // Volontairement au montage seul : ensuite, c'est l'utilisateur qui pilote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Les chambres qui logent le nombre de personnes demande, et elles seules.
   *
   * Mews renvoie aussi l'individuelle sur une recherche a deux, avec son prix
   * pour une personne. On l'a affichee un temps, etiquetee « Pour une personne » :
   * « si je suis a deux, pourquoi je vois l'individuelle ? ». La question est
   * juste — une chambre ou l'un des deux ne dort pas n'est pas une offre. Elle
   * reapparait entiere des qu'on repond « Seul ».
   *
   * Trie du moins cher au plus cher, sur le plus bas des tarifs de chaque
   * chambre. Mews les renvoie dans l'ordre de sa configuration ; un client qui
   * compare des prix les lit de bas en haut. */
  const { principales, offresAffichees } = useMemo(() => {
    const p = (dispo?.offres ?? []).filter((o) => o.pourPersonnes >= adultes);
    const bas = (o: Offre) => Math.min(...o.prix.map((x) => x.total));
    const tries = [...p].sort((a, b) => bas(a) - bas(b));
    return { principales: tries, offresAffichees: tries };
  }, [dispo, adultes]);

  // Memorises : sans cela, `?? []` fabrique un tableau neuf a chaque rendu et
  // relance l'effet qui pose le choix par defaut a chaque passage.
  const tarifs = useMemo(() => dispo?.tarifs ?? [], [dispo]);
  const groupes = useMemo(() => dispo?.groupes ?? [], [dispo]);

  // Arrivee du jour : le prepaye n'a plus de contrepartie (voir `cartesDe`).
  const arriveeCeJour = arrivee === dansNJours(0);

  /* La colonne de droite est remplie des le chargement.
   *
   * Elle disait « Choisissez une chambre pour voir le total » et laissait 400 px
   * de blanc sous un bouton gris : un tiers de l'ecran occupe a ne rien dire. On
   * y pose la chambre la moins chere, a son tarif FLEXIBLE — le total apparait
   * tout de suite, et le defaut propose est celui qui ne peut pas se retourner
   * contre le client. La carte correspondante s'allume dans la liste : c'est un
   * defaut visible, pas un choix fait a sa place. */
  useEffect(() => {
    if (choix) return;
    // `principales` est triee par prix croissant : la moins chere est en tete.
    const offre = principales[0];
    if (!offre) return;
    // Le moins cher des flexibles : avec un tarif direct derive, Mews peut en
    // renvoyer deux, et `find` aurait attrape le tarif public au plein prix.
    const cartes = cartesDe(offre.prix, tarifs, groupes, arriveeCeJour);
    const p = (cartes.find((c) => !c.prepaye) ?? cartes[0])?.direct;
    if (!p) return;
    setChoix({
      categorieId: offre.categorieId, tarifId: p.tarifId,
      total: p.total, parNuit: p.parNuit, pourPersonnes: offre.pourPersonnes,
    });
  }, [choix, principales, tarifs, groupes, arriveeCeJour]);
  // Annulation gratuite du tarif retenu — nulle si c'est un prepaye.
  /* Les soirs où le rooftop peut recevoir, sur toute la durée du séjour.
   * Vide = le bloc ne s'affiche pas du tout. */
  const soirsRooftop = useSoirsRooftop(arrivee, depart, choix?.pourPersonnes ?? adultes);

  const heureChoix = choix ? heureLimite(tarifs.find((r) => r.Id === choix.tarifId), langue) : null;
  /* Un seul nombre, et ce qu'il y a dedans.
   *
   * La taxe de sejour etait annoncee a part (« A regler sur place + 3,72 € »),
   * et une quatrieme ligne rappelait son montant par adulte et par nuit. C'est
   * exactement la mecanique qu'on reproche aux OTA : un prix, puis un autre.
   * Le total affiche est desormais celui qu'on paiera en tout, avec une ligne
   * qui dit ce qu'il contient.
   *
   * ⚠️ La page ne dit plus ou la taxe se regle (tranche le 25/08/2026 : « arrete
   * avec ce regle sur place »). Elle annonce donc un total, point — et c'est ce
   * total qu'il faudra encaisser en ligne, taxe comprise. Si l'encaissement
   * devait finalement laisser la taxe au comptoir, c'est cette ligne-ci qu'il
   * faudrait rouvrir, pas le montant. */
  const taxeDe = (pax: number) => TAXE_PAR_ADULTE_NUIT * pax * nuits;

  /* Voir l'écran de confirmation sans passer de carte.
   *
   * Il ne s'atteint autrement qu'au bout d'un vrai paiement — donc on ne peut
   * ni relire son texte, ni régler la table du rooftop, ni vérifier l'anglais
   * sans engager une réservation réelle. `/reserver?apercu=confirmation` le
   * monte avec un jeu de données factices.
   *
   * ⚠️ Coupé en production par `NODE_ENV`, et pas par une condition d'URL :
   * un écran qui annonce « c'est réservé » alors que rien ne l'est doit être
   * INATTEIGNABLE en ligne, pas seulement difficile à trouver. */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (new URLSearchParams(window.location.search).get("apercu") !== "confirmation") return;
    setReserve({
      groupeId: "apercu", numeros: ["29814"],
      client: { prenom: "Junio", nom: "Leboss", email: "contact-lesvoiles@htbm.fr", telephone: "0494413623" },
    });
  }, []);

  /* La comparaison suit la recherche, jamais le choix : elle porte sur toutes
   * les chambres d'un coup, et le client change d'avis plus souvent qu'il ne
   * change de dates. Un échec est sans conséquence — la comparaison est un
   * bonus, pas une pièce du tunnel. */
  useEffect(() => {
    if (!cherche) return;
    let annule = false;
    setTarifPublic(null);
    const q = new URLSearchParams({ arrivee: cherche.a, depart: cherche.d, adultes: String(cherche.pax) });
    fetch(`/api/tarif-public?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!annule && j?.prix) setTarifPublic(j.prix); })
      .catch(() => { /* on se tait : le tunnel n'en dépend pas */ });
    return () => { annule = true; };
  }, [cherche]);

  /* Ce que l'ecran de paiement doit redire au client avant de lui demander sa
   * carte. Le total est celui qu'il a sous les yeux depuis le debut — taxe de
   * sejour comprise — et le resume dit ou elle se trouve : afficher un montant
   * different de celui du recapitulatif au moment de payer est la meilleure
   * facon de perdre quelqu'un a la derniere seconde. */
  const sejourAPayer: SejourAPayer | null = useMemo(() => {
    if (!choix) return null;
    const taxe = TAXE_PAR_ADULTE_NUIT * choix.pourPersonnes * nuits;
    const tarif = tarifs.find((r) => r.Id === choix.tarifId);
    return {
      categorieId: choix.categorieId,
      tarifId: choix.tarifId,
      arrivee,
      depart,
      adultes: choix.pourPersonnes,
      resume: [
        nomChambre(choix.categorieId, categories.get(choix.categorieId), langue),
        libelleTarif(tarif, groupes, langue, T),
        T.nuits(nuits),
        T.dontTaxe(montantCourt(taxe, langue)),
      ].filter(Boolean).join(" · "),
      totalFormate: montant(choix.total + taxe, langue),
      /* ⚠️ C'EST CE BOOLEEN QUI CHOISIT LE MOTEUR DE PAIEMENT dans `Paiement`.
         Il vient de `SettlementAction` sur le groupe tarifaire Mews, jamais
         d'un identifiant de tarif ecrit en dur : le jour ou l'hotel ajoute un
         tarif, il prend le bon chemin sans qu'on touche a ce fichier.
         Un tarif dont Mews ne dit rien retombe sur le checkout, qui est celui
         des deux qui sait refuser proprement. */
      debite: reglementDe(tarif, groupes, choix.total + taxe)?.debite ?? true,
      reglementFormate: (() => {
        const reg = reglementDe(tarif, groupes, choix.total + taxe);
        return reg ? montant(reg.montant, langue) : montant(choix.total + taxe, langue);
      })(),
      reglement: (() => {
        const reg = reglementDe(tarif, groupes, choix.total + taxe);
        if (!reg) return "";
        const m = montant(reg.montant, langue);
        if (!reg.debite) return T.empreinteLong(m, reg.part === null ? "" : pourcent(reg.part, langue));
        // 100 % et un acompte ne se disent pas pareil : dans un cas il ne
        // restera rien a payer, dans l'autre si.
        return reg.part !== null && reg.part < 1
          ? T.debitLongPartiel(m, pourcent(reg.part, langue))
          : T.debitLong(m);
      })(),
    };
  }, [choix, categories, tarifs, groupes, arrivee, depart, nuits, langue, T]);

  return (
    /* Sur PC, l'écran EST la page : hauteur fixe, aucune barre de défilement
       générale, chaque colonne défile chez elle. Un tunnel qui oblige à
       remonter pour changer une date perd le client à chaque aller-retour.
       Sous 1024 px on retrouve le flux normal et les colonnes s'empilent. */
    <main className="bg-cream text-[#222] lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">

      <header className="mx-auto w-full max-w-[1600px] shrink-0 px-4 pt-5 lg:px-6 lg:pt-6">
        {/* « Site officiel » partage la ligne du lien de retour, et ne coute
            donc pas un pixel de hauteur — l'en-tete en prenait deja 460 sur
            telephone avant la premiere chambre, c'est la contrainte qui a fait
            disparaitre le chapo en dessous de `sm`.
            Il est ici et pas plus bas parce qu'il repond a « ou suis-je ? »,
            question qu'on se pose en arrivant, pas au moment de payer — et
            parce que c'est la reponse qui separe cette page d'une OTA. En
            navy sourd, jamais en or : l'or de cette page est reserve a ce qui
            se clique et a ce que le direct donne de plus. */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-[13px] tracking-wide text-navy hover:underline">
            ← Hôtels Toulon Bord de Mer
          </Link>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-navy/[0.07] px-2.5 py-1 text-[11.5px] font-semibold text-navy">
            <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.6l7.4 3v5.8c0 4.4-3 8.3-7.4 9.9-4.4-1.6-7.4-5.5-7.4-9.9V5.6z" />
              <path d="M9 12l2.1 2.1L15.3 10" />
            </svg>
            {T.siteOfficiel}
          </span>
        </div>
        {/* Titre et promesse sur la même ligne : chaque pixel pris en hauteur
            est un pixel de moins pour le calendrier et les chambres. */}
        {/* Sur telephone, l'en-tete occupait 460 px avant la premiere chambre.
            Le chapo y disparait : il redit ce que le total dit ensuite en
            chiffres, et il coutait deux lignes pleines. Il reste dans le
            document — donc lu par les moteurs — mais ne pousse plus les prix
            sous la ligne de flottaison. */}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <h1 className="font-serif text-[26px] leading-tight text-navy sm:text-3xl lg:text-[34px]">
            {T.titre}
          </h1>
          <p className="hidden text-[15px] text-[#4a5a63] sm:block">{T.chapo}</p>
        </div>

        {/* Ce que le direct donne de plus, et qui doit se voir de loin.
            Le bandeau etait en or a 12 % sur du creme, en 13 px : il disparaissait
            dans le fond, et repetait le petit-dejeuner deja annonce dans le chapo.
            Il porte maintenant DEUX promesses, en or plein, et dit laquelle des
            deux ne s'obtient qu'ici. Parametre par hotel dans lib/site.ts :
            « depart 12 h offert » est vrai aux Voiles, pas a la Corniche. */}
        {PRIVILEGES.voiles[langue].length > 0 && (
          // L'etiquette « Exclu direct » ne se repete pas : elle est posee UNE
          // fois, en tete, et couvre les avantages marques `exclusif` qui la
          // suivent. Un separateur la referme, et ce qui vient apres — le
          // petit-dejeuner — se lit comme ce qu'il est : compris partout.
          <div className="mx-auto mt-2.5 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-3xl bg-gold px-4 py-2 text-[12.5px] font-bold text-navy-deep sm:gap-x-5 sm:rounded-full lg:px-6 lg:py-3 lg:text-[15px]">
            <span className="rounded-full bg-navy-deep px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-gold lg:text-[11px]">
              {T.exclusif}
            </span>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:gap-x-5">
              {PRIVILEGES.voiles[langue].filter((p) => p.exclusif).map((p) => (
                <li key={p.texte}>{p.texte}</li>
              ))}
            </ul>
            {PRIVILEGES.voiles[langue].some((p) => !p.exclusif) && (
              <>
                {/* Le trait separe les exclus du reste tant que tout tient sur
                    une ligne. A 390 px le bandeau passe a la ligne de toute
                    facon : le trait se retrouvait alors seul en bout de premiere
                    ligne, a separer du vide. Le retour a la ligne separe deja,
                    et la graisse plus legere du petit-dejeuner acheve de le
                    distinguer — on retire le trait plutot qu'un orphelin. */}
                <span aria-hidden className="hidden h-4 w-px bg-navy-deep/30 sm:block" />
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-semibold text-navy-deep/75 sm:gap-x-5">
                  {PRIVILEGES.voiles[langue].filter((p) => !p.exclusif).map((p) => (
                    <li key={p.texte}>{p.texte}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </header>

      <div className="mx-auto grid w-full max-w-[1600px] gap-3 px-4 py-3 lg:gap-5 lg:px-6 lg:py-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[340px_minmax(0,1fr)_320px]">

        {/* ── Colonne 1 · Vos dates, et la maison ─────────────────────────── */}
        <section className="relative flex min-h-0 flex-col rounded-2xl bg-white p-4 shadow-[0_2px_20px_rgba(0,78,124,0.07)] lg:p-5">
          {/* Deux intitules en capitales pour deux champs qui se lisent seuls :
              60 px pris a la premiere chambre sur telephone. Ils restent sur
              grand ecran, ou ils titrent la colonne. */}
          <h2 className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299] lg:block">
            {T.colDates}
          </h2>

          {/* Une ligne, pas un calendrier. Les dates sont deja remplies sur la
              nuit du jour : les afficher en clair et les rendre modifiables d'une
              tape suffit. Le calendrier s'ouvre par-dessus la colonne, prend la
              hauteur dont il a besoin, et se referme des que le sejour est complet. */}
          <div className="relative lg:mt-3">
          <button
            type="button"
            onClick={() => setCalendrierOuvert((o) => !o)}
            aria-expanded={calendrierOuvert}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#e3e0d9] px-4 py-3.5 text-left transition-colors hover:border-gold"
          >
            <span className="min-w-0 text-[16px] text-[#3c4a52]">
              {arrivee && depart ? (
                <>
                  <span className="font-semibold text-navy">{joli(arrivee, langue)}</span>
                  <span className="mx-2 text-[#b0b6ba]">→</span>
                  <span className="font-semibold text-navy">{joli(depart, langue)}</span>
                  <span className="ml-2 text-[13px] text-[#8a9299]">· {T.nuits(nuits)}</span>
                </>
              ) : arrivee ? (
                <>
                  <span className="font-semibold text-navy">{joli(arrivee, langue)}</span>
                  <span className="ml-2 text-[#8a9299]">{T.puisDepart}</span>
                </>
              ) : (
                <span className="text-[#8a9299]">{T.choisirDates}</span>
              )}
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-gold-ink underline underline-offset-4">
              {T.modifier}
            </span>
          </button>

          {calendrierOuvert && (
            <>
              {/* Un clic a cote referme : sur telephone, un calendrier ouvert qui
                  ne se ferme que par son propre bouton est un cul-de-sac. */}
              <button
                type="button" aria-hidden tabIndex={-1}
                onClick={() => setCalendrierOuvert(false)}
                className="fixed inset-0 z-30 cursor-default bg-navy-deep/20"
              />
              <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-xl shadow-[0_18px_50px_rgba(0,78,124,0.22)]">
                <CalendrierSejour
                  arrivee={arrivee || null}
                  depart={depart || null}
                  langue={langue}
                  className="max-h-[52vh] lg:max-h-[58vh]"
                  onChange={(a, d) => {
                    setArrivee(a ?? "");
                    setDepart(d ?? "");
                    // Le sejour est complet : le calendrier n'a plus rien a dire.
                    if (d) setCalendrierOuvert(false);
                  }}
                />
              </div>
            </>
          )}
          </div>

          <fieldset className="mt-3 shrink-0 lg:mt-5">
            <legend className="mb-2.5 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299] lg:block">
              {T.voyageLabel}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(["seul", "deux"] as const).map((v) => (
                <button
                  key={v} type="button"
                  /* Choisir l'occupation RELANCE la recherche.
                     Sans cela, `dispo` restait celui de l'occupation
                     precedente pendant que le filtre `pourPersonnes >= adultes`
                     employait deja la nouvelle : a une personne, toutes les
                     offres portent `pourPersonnes: 1`, le filtre `>= 2` les
                     jetait toutes, et l'ecran annoncait « Aucune chambre
                     disponible a ces dates » — un hotel complet, alors qu'il
                     manquait seulement un clic sur « Mettre a jour les prix ».
                     Un mensonge, et le plus cher qu'une page de reservation
                     puisse dire. */
                  onClick={() => {
                    if (voyage === v) return;
                    pulse();
                    setVoyage(v);
                    void lancer({ arrivee, depart, adultes: v === "seul" ? 1 : 2 });
                  }}
                  aria-pressed={voyage === v}
                  className={[
                    "rounded-xl border px-2 py-2.5 text-[14px] font-semibold transition-colors lg:py-3",
                    voyage === v
                      ? "border-navy bg-navy text-white"
                      : "border-[#e3e0d9] bg-white text-[#3c4a52] hover:border-gold",
                  ].join(" ")}
                >
                  {T[v]}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Le bouton ne se demonte plus jamais : il change d'etat.
   *
   * Il n'existait qu'en cas de decalage entre l'ecran et la recherche
   * (`!aJour || chargement`) — pour ne pas laisser un bouton or permanent
   * designer une action deja faite, seul point or de la page, aimant a
   * regard. L'intention etait juste, le moyen coutait cher : choisir
   * l'occupation RELANCE la recherche (voir le `lancer` des pastilles
   * ci-dessus), donc `chargement` passait a vrai, le bouton se montait et
   * poussait la carte de l'hotel vers le bas ; la reponse revenait, il se
   * demontait, tout remontait. Deux sauts de mise en page pour une action
   * que personne n'avait demandee — le bouton servait de temoin de
   * chargement, pas d'appel a l'action.
   *
   * Il porte desormais les deux sens dans sa couleur, jamais dans sa
   * presence : or et actif quand quelque chose attend un clic, sourd et
   * inerte quand les prix sont a jour. L'or ne revient que s'il y a
   * vraiment a faire, donc il garde son role d'unique point or ; et rien
   * ne bouge plus d'un pixel sous lui.
   *
   * Le temoin de chargement, lui, a demenage dans la colonne des chambres :
   * c'est la que le resultat arrive, donc c'est la que l'oeil est deja. */}
          {(() => {
            const aFaire = !aJour && !chargement;
            return (
              <button
                type="button"
                disabled={!aFaire || !voyage || nuits < 1}
                onClick={() => chercher(adultes)}
                className={[
                  "mt-4 w-full shrink-0 rounded-full border px-6 py-3.5 text-[16px] font-bold",
                  "transition-[background-color,border-color,color] duration-300",
                  aFaire && voyage && nuits >= 1
                    ? "border-gold bg-gold text-navy-deep hover:brightness-105"
                    : "cursor-default border-[#e8e4dc] bg-[#f7f4ee] text-[#9aa2a8]",
                ].join(" ")}
              >
                {/* Le seul endroit de la page ou un lecteur d'ecran apprend
                    qu'une recherche est partie, puis qu'elle est revenue. */}
                <span aria-live="polite" className="inline-flex items-center justify-center gap-2">
                  {chargement ? (
                    <>
                      {/* Le disque tourne pendant que la colonne des chambres
                          se prepare : sans lui, l'etat de repos et l'etat
                          « en cours » se ressemblent trop. */}
                      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 animate-spin motion-reduce:animate-none" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                        <path d="M12 3a9 9 0 0 1 9 9" />
                      </svg>
                      {T.recherche}
                    </>
                  ) : !voyage ? (
                    T.choisir
                  ) : aJour ? (
                    <>
                      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12.5l5 5L20 6.5" />
                      </svg>
                      {T.aJour}
                    </>
                  ) : (
                    T.majPrix
                  )}
                </span>
              </button>
            );
          })()}

          <Maison recit={recit} T={T} variante="colonne" onGalerie={() => setGalerie("hotel")} />
        </section>

        {/* ── Colonne 2 · Nos chambres ────────────────────────────────────── */}
        <section
          ref={zoneOffres}
          className="flex min-h-0 scroll-mt-4 flex-col rounded-2xl bg-white p-4 shadow-[0_2px_20px_rgba(0,78,124,0.07)] lg:p-5"
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

            {dispo && !erreur && !chargement && aJour && offresAffichees.length === 0 && (
              <div>
                <p className="font-serif text-2xl text-navy">{T.aucune}</p>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[#6b7a82]">{T.aucuneAide}</p>
              </div>
            )}

            {dispo && !erreur && offresAffichees.length > 0 && (
              /* L'enveloppe du temoin de recherche.
                 Pendant l'appel a Mews, la colonne gardait les anciens prix a
                 pleine opacite et parfaitement cliquables : on pouvait retenir
                 un tarif qui n'existait deja plus. Elle s'estompe maintenant,
                 se fige, et un balayage la traverse. On ne vide pas l'ecran de
                 ce qu'on vient d'y mettre — les prix restent lisibles — mais on
                 voit qu'ils sont en train d'etre remplaces.
                 `aria-busy` le dit aussi a ceux qui ne voient pas le balayage. */
              <div
                aria-busy={chargement || undefined}
                className={[
                  "relative overflow-hidden transition-opacity duration-200",
                  chargement ? "balayage select-none opacity-40 [&_*]:pointer-events-none" : "",
                ].join(" ")}
              >
              {/* Lignes a hauteur libre.
                 Elles partageaient la hauteur de la colonne (`auto-rows-fr`), ce
                 qui etirait les photos pour remplir l'ecran — mais deployer les
                 details d'UNE chambre rallongeait alors les TROIS lignes, et les
                 trois photos grandissaient d'un coup. Chaque ligne fait
                 desormais sa taille, et la photo garde la sienne. */}
              <ul className="grid gap-5">
                {offresAffichees.map((o, rang) => {
                  const cat = categories.get(o.categorieId);
                  const photo = couvertureDe(o.categorieId, cat, 480);
                  const nbPhotos = photosDe(o.categorieId, cat, "").length;

                  return (
                  <li key={`${o.categorieId}-${o.pourPersonnes}`} className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                    {photo && (
                      /* La photo epouse la hauteur de SA ligne : figee a
                         158 px, elle depassait sous les cartes de tarif. Ce
                         n'est pas le `auto-rows-fr` d'avant — les lignes ont
                         chacune leur taille, donc deployer une chambre
                         n'agrandit que sa photo, pas les trois.
                         Le dimensionnement vit sur cette enveloppe : la photo
                         n'est plus seule dedans, elle a un dos. */
                      <div className="h-[150px] w-full shrink-0 [perspective:900px] sm:h-auto sm:min-h-[130px] sm:w-[164px] sm:self-stretch">
                        {/* La chambre se retourne comme la carte de l'hotel, et
                            SOUS `sm` seulement : au-dela, la photo n'est plus un
                            bandeau mais une bande de 164 px de large, ou deux
                            phrases de detail ne se lisent pas. Le depliage sous
                            le nom reste la reponse du grand ecran.
                            Une seule <Image> : monter la photo deux fois, une
                            par variante, la ferait charger deux fois par chambre. */}
                        <div
                          className={[
                            "grid h-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d]",
                            detaille === o.categorieId ? "max-sm:[transform:rotateY(180deg)]" : "",
                          ].join(" ")}
                        >
                          {/* La photo ouvre les autres. Mews en heberge trois a
                              cinq par categorie : n'en montrer qu'une, c'est
                              envoyer le client les chercher sur Booking. */}
                          <button
                            type="button"
                            onClick={() => setGalerie(o.categorieId)}
                            aria-label={T.galerieOuvrir(nbPhotos)}
                            inert={detaille === o.categorieId ? true : undefined}
                            className={[
                              "group relative col-start-1 row-start-1 h-full w-full overflow-hidden rounded-xl bg-[#f0ece4]",
                              "[backface-visibility:hidden] [-webkit-backface-visibility:hidden]",
                              // Au-dela de `sm` la carte ne tourne jamais : la
                              // photo doit rester visible quoi qu'il arrive.
                              "max-sm:[transition:visibility_0s_linear_350ms] sm:!visible",
                              detaille === o.categorieId ? "max-sm:invisible" : "",
                            ].join(" ")}
                          >
                            <Image
                              src={photo}
                              alt={nomChambre(o.categorieId, cat, langue)}
                              fill
                              sizes="(max-width: 640px) 100vw, 164px"
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            />
                            {nbPhotos > 1 && (
                              <span className="absolute bottom-2 left-2 rounded-full bg-navy-deep/80 px-2.5 py-1 text-[11px] font-semibold text-cream backdrop-blur-sm">
                                {T.galerieOuvrir(nbPhotos)}
                              </span>
                            )}
                          </button>

                          {/* Le dos : ce que la photo ne montre pas. Couchage et
                              surface viennent de la configuration Mews, jamais
                              d'ici — l'hotel corrige une surface dans son
                              back-office, l'ecran suit. */}
                          <div
                            inert={detaille === o.categorieId ? undefined : true}
                            className={[
                              "col-start-1 row-start-1 flex h-full flex-col justify-center gap-1.5 rounded-xl bg-navy px-4 py-3 text-cream sm:hidden",
                              "[backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]",
                              "[transition:visibility_0s_linear_350ms]",
                              detaille === o.categorieId ? "" : "invisible",
                            ].join(" ")}
                          >
                            <p className="text-[13px] font-semibold text-gold">
                              {[
                                cat?.couchages ? T.couchages(cat.couchages) : null,
                                litDe(cat?.couchages ?? null) ? T.lit(litDe(cat!.couchages)!) : null,
                                cat?.surface ? T.surface(cat.surface) : null,
                              ].filter(Boolean).join(" · ")}
                            </p>
                            {DESCRIPTION_CATEGORIE[o.categorieId] && (
                              <p className="text-[13.5px] leading-snug text-cream/85">
                                {DESCRIPTION_CATEGORIE[o.categorieId][langue]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col">
                    {/* Deux lignes de tete, toujours les memes, pour que les
                        cartes de tarif se retrouvent a la meme hauteur d'une
                        chambre a l'autre : le nom et le stock, puis ce que
                        vaut la chambre et ce qu'elle coute de plus. */}
                    <div>
                    {/* Le nom ouvre les details.
                        La liste portait quatre petites lignes par chambre —
                        stock, couchage, surface, description — soit douze lignes
                        de 13 px pour trois chambres. Ne reste visible que ce qui
                        sert a choisir : le nom et les tarifs. Le reste attend
                        qu'on le demande. Sont partis avec : le nombre de
                        chambres restantes, et l'ecart a la moins chere
                        (« + 24 € par rapport a la Chambre Individuelle »,
                        retire le 25/08/2026) — les prix sont l'un sous l'autre
                        et se comparent tout seuls. */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="font-serif text-2xl leading-tight text-navy">
                        {/* Le chevron gris seul ne se voyait pas : « j'ai plus
                            du tout le detail des chambres ». Une commande doit
                            RESSEMBLER a une commande — la pastille or dit qu'il
                            y a quelque chose derriere, et le nom reste cliquable
                            avec elle. */}
                        <button
                          type="button"
                          onClick={() => {
                            pulse();
                            setDetaille((d) => (d === o.categorieId ? null : o.categorieId));
                          }}
                          aria-expanded={detaille === o.categorieId}
                          // Pas d'aria-label : il remplacerait le nom de la
                          // chambre par « Détails », et un lecteur d'écran
                          // annoncerait trois boutons identiques. `aria-expanded`
                          // suffit a dire que le nom ouvre quelque chose.
                          className="group inline-flex items-baseline gap-2.5 text-left transition-colors hover:text-gold-ink"
                        >
                          {nomChambre(o.categorieId, cat, langue)}
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/18 px-2.5 py-1 font-sans text-[11.5px] font-semibold text-gold-ink transition-colors group-hover:bg-gold/30">
                            {T.voirDetails}
                            <svg
                              aria-hidden viewBox="0 0 24 24"
                              className={[
                                "h-3 w-3 transition-transform",
                                detaille === o.categorieId ? "rotate-180" : "",
                              ].join(" ")}
                              fill="none" stroke="currentColor" strokeWidth="2.4"
                              strokeLinecap="round" strokeLinejoin="round"
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </span>
                        </button>
                      </h3>
                    </div>

                    {/* Le depliage sous le nom est la reponse du grand ecran.
                        Sous `sm`, c'est le dos de la photo qui porte ces deux
                        phrases : les montrer aux deux endroits les dirait deux
                        fois. Sauf si la chambre n'a pas de photo — il n'y a
                        alors pas de dos ou les mettre, et le depliage reprend
                        du service a toutes les largeurs. */}
                    {detaille === o.categorieId && (
                      <div className={photo ? "mt-1.5 hidden sm:block" : "mt-1.5"}>
                        {/* Couchage et surface viennent de la configuration Mews,
                            jamais d'ici : l'hotel corrige une surface dans son
                            back-office, l'ecran suit. */}
                        <p className="text-[13px] text-[#8a9299]">
                          {[
                            cat?.couchages ? T.couchages(cat.couchages) : null,
                            litDe(cat?.couchages ?? null) ? T.lit(litDe(cat!.couchages)!) : null,
                            cat?.surface ? T.surface(cat.surface) : null,
                          ].filter(Boolean).join(" · ")}
                        </p>
                        {DESCRIPTION_CATEGORIE[o.categorieId] && (
                          <p className="mt-1 text-[13.5px] leading-snug text-[#5b6a72]">
                            {DESCRIPTION_CATEGORIE[o.categorieId][langue]}
                          </p>
                        )}
                      </div>
                    )}
                    </div>

                    {/* Une carte = un tarif, les deux cote a cote. Le prix EST
                        le bouton, et il se lit sous son libelle : en pleine
                        largeur, l'oeil traversait 600 px de vide entre le nom du
                        tarif et son montant, et comparer les deux demandait un
                        saut d'une ligne a l'autre.
                        Deux colonnes SI deux tarifs. Sur une arrivee du jour le
                        prepaye ne s'affiche plus : la carte seule restait plantee
                        a gauche avec la moitie droite vide, alors qu'il n'y a
                        plus rien a comparer. */}
                    {/* `key={tour}` remonte les cartes a chaque recherche
                        aboutie, et c'est tout ce qui rejoue l'animation. On ne
                        peut pas se fier au montant lui-meme : passer de « seul »
                        a « a deux » ne change pas que les prix, il change les
                        chambres, et faire courir un chiffre de l'une a l'autre
                        annoncerait une hausse qui n'a pas eu lieu.
                        L'echelonnement suit l'ordre de lecture : les prix se
                        posent de haut en bas, comme on les parcourt. */}
                    <div
                      key={tour}
                      style={{ animationDelay: `${rang * 45}ms` }}
                      className={[
                        "prix-entre mt-3 grid gap-2",
                        cartesDe(o.prix, tarifs, groupes, arriveeCeJour).length > 1 ? "sm:grid-cols-2" : "",
                      ].join(" ")}
                    >
                      {cartesDe(o.prix, tarifs, groupes, arriveeCeJour).map((carte) => {
                        const p = carte.direct;
                        const retenu = choix?.categorieId === o.categorieId
                          && choix?.tarifId === p.tarifId
                          && choix?.pourPersonnes === o.pourPersonnes;
                        const tarif = tarifs.find((r) => r.Id === p.tarifId);
                        // Les deux lignes affichaient le meme mot a l'euro pres.
                        // Ce qui se decide ici, c'est : je garde la main, ou je
                        // paie moins cher tout de suite. On chiffre l'ecart.
                        const economie = carte.prepaye
                          ? Math.max(...cartesDe(o.prix, tarifs, groupes, arriveeCeJour).map((c) => c.direct.total)) - p.total
                          : 0;
                        const heure = carte.prepaye ? null : heureLimite(tarif, langue);
                        // Le pourcentage se lit sur les deux montants renvoyes
                        // par Mews, il ne s'ecrit pas ici.
                        const remise = carte.public
                          ? Math.round((1 - p.total / carte.public.total) * 100)
                          : 0;
                        return (
                          <button
                            key={p.tarifId}
                            type="button"
                            aria-pressed={retenu}
                            onClick={() => {
                              pulse();
                              setChoix(retenu ? null : {
                                categorieId: o.categorieId,
                                tarifId: p.tarifId,
                                total: p.total,
                                parNuit: p.parNuit,
                                pourPersonnes: o.pourPersonnes,
                              });
                            }}
                            className={[
                              "flex w-full flex-col gap-1.5 rounded-xl border px-4 py-3.5 text-left transition-colors",
                              retenu
                                ? "border-navy bg-navy text-white"
                                : "border-[#e3e0d9] text-[#3c4a52] hover:border-gold hover:bg-[#faf7f1]",
                            ].join(" ")}
                          >
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold">
                                {libelleTarif(tarif, groupes, langue, T)}
                                {economie > 0 && (
                                  <span className={[
                                    "rounded-full px-2 py-0.5 text-[12px] font-bold",
                                    retenu ? "bg-white/20 text-white" : "bg-gold/20 text-gold-ink",
                                  ].join(" ")}>
                                    {T.economisez(montantCourt(economie, langue))}
                                  </span>
                                )}
                              </span>
                              {heure !== null && (
                                <span className={[
                                  "mt-0.5 block text-[12px] leading-snug",
                                  retenu ? "text-white/70" : "text-[#8a9299]",
                                ].join(" ")}>
                                  {T.annulableJusque(joli(arrivee, langue), heure)}
                                </span>
                              )}
                            </span>
                            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              {carte.public && remise > 0 && (
                                <span className={[
                                  "text-[14px] tabular-nums line-through",
                                  retenu ? "text-white/60" : "text-[#a9b1b6]",
                                ].join(" ")}>
                                  {montant(carte.public.total, langue)}
                                </span>
                              )}
                              <span className="text-[22px] font-bold tabular-nums">
                                {montant(p.total, langue)}
                              </span>
                              {carte.public && remise > 0 && (
                                <span className={[
                                  "rounded-full px-2 py-0.5 text-[12px] font-bold",
                                  retenu ? "bg-white/20 text-white" : "bg-gold text-navy-deep",
                                ].join(" ")}>
                                  {T.remiseDirecte(remise)}
                                </span>
                              )}
                              {nuits > 1 && (
                                <span className={[
                                  "text-[12px] tabular-nums",
                                  retenu ? "text-white/70" : "text-[#8a9299]",
                                ].join(" ")}>
                                  {montant(p.parNuit, langue)} {T.parNuit}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
              </div>
            )}

          </div>

          <Maison recit={recit} T={T} variante="suite" onGalerie={() => setGalerie("hotel")} />
        </section>

        {/* ── Colonne 3 · Votre séjour ────────────────────────────────────── */}
        <aside
          ref={zoneRecap}
          className="flex min-h-0 scroll-mt-4 flex-col rounded-2xl bg-white p-4 shadow-[0_2px_20px_rgba(0,78,124,0.07)] lg:p-5 lg:max-h-full lg:self-start"
        >
          {/* La COLONNE ENTIÈRE se retourne — pas un bloc posé dedans.
              Deux tentatives ont échoué avant : tout ce qu'on ajoute dans le
              flux de cette colonne la fait défiler, parce qu'elle n'a pas de
              place libre. Le blanc qu'on croit voir sous le nom de la chambre
              dépend de la hauteur de fenêtre et disparaît dès que le séjour
              fait deux lignes de plus. Un dos ne coûte rien.
              Les deux faces font `h-full` : à la première tentative le dos
              était court, `backface-visibility` ne suffisait pas, et on lisait
              le récapitulatif en miroir dessous. */}
          <div className="min-h-0 flex-1 [perspective:1600px]">
          <div className={[
            "grid h-full min-h-0 transition-transform duration-700 ease-in-out [transform-style:preserve-3d]",
            dosRooftop ? "[transform:rotateY(180deg)]" : "",
          ].join(" ")}>

          {/* ── Face avant : le séjour ─────────────────────────────────── */}
          <div
            inert={dosRooftop ? true : undefined}
            className={[
              "col-start-1 row-start-1 flex h-full min-h-0 flex-col",
              "[backface-visibility:hidden] [-webkit-backface-visibility:hidden]",
              "[transition:visibility_0s_linear_350ms]",
              dosRooftop ? "invisible" : "",
            ].join(" ")}
          >
          <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
            {T.colRecap}
          </h2>

          <div className="mt-3 min-h-0 flex-1 lg:overflow-y-auto">
            {/* Serré d'un cran : ces trois lignes se relisent d'un coup d'œil,
                on ne les étudie pas. Les pixels rendus vont au bas de la
                colonne, où le téléphone passait sous la ligne de flottaison. */}
            <dl className="grid gap-1 text-[14px]">
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
                  {nomChambre(choix.categorieId, categories.get(choix.categorieId), langue)}
                </p>
                <p className="mt-1 text-[13px] text-[#8a9299]">
                  {libelleTarif(tarifs.find((r) => r.Id === choix.tarifId), groupes, langue, T)}
                  {" · "}{T.nuits(nuits)}
                </p>

              </>
            ) : (
              <p className="mt-4 border-t border-[#f0ece4] pt-4 text-[15px] leading-relaxed text-[#8a9299]">
                {T.recapVide}
              </p>
            )}
          </div>

          <div className="mt-3 shrink-0">
            {/* Le total est SORTI de la zone qui defile.
                Sur PC la colonne a une hauteur fixe et son haut defile chez lui.
                Le total y etait le dernier element : sur une fenetre de 900 px,
                256 px de contenu dans 170 px de haut, il tombait sous la ligne
                de flottaison et le prix devenait invisible — alors que les
                garanties et le bouton, eux, restaient a l'ecran. Ce qui peut
                disparaitre, ce sont les dates et le nom de la chambre : on les
                a saisis, on s'en souvient. Pas le montant.
                Il vit desormais avec ce qu'il paie, juste au-dessus du bouton. */}
            {choix && (
              <>
                <div className="flex items-baseline justify-between gap-3 border-t border-[#f0ece4] pt-4">
                  <span className="text-[15px] font-semibold text-[#3c4a52]">{T.totalSejour}</span>
                  <span className="text-[26px] font-bold tabular-nums text-navy">
                    <TotalRoulant valeur={choix.total + taxeDe(choix.pourPersonnes)} langue={langue} />
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-[#8a9299]">
                  {T.dontTaxe(montantCourt(taxeDe(choix.pourPersonnes), langue))}
                </p>
                {/* Ce qu'il aurait payé ailleurs.
                 *
                 * Ici et nulle part ailleurs : dans la liste des chambres, on
                 * compare des chambres entre elles ; c'est en regardant SON
                 * total qu'on se demande si on a bien fait. Le chiffre est lu
                 * chez Mews, dans les tarifs que l'hôtel pousse lui-même sur
                 * les plateformes — il n'est pas fabriqué pour la démonstration.
                 *
                 * La taxe de séjour est ajoutée des deux côtés : elle se paie
                 * aussi quand on réserve sur Booking, et comparer un total taxe
                 * comprise à un total qui ne l'est pas gonflerait l'écart. */}
                {(() => {
                  const pub = tarifPublic?.[choix.categorieId];
                  // L'écart n'est juste que si la comparaison porte sur la même
                  // occupation que la recherche : le petit-déjeuner du prix
                  // public est compté par personne. Sinon on se tait.
                  if (!pub || !cherche || cherche.pax !== choix.pourPersonnes) return null;
                  const prepaye = estPrepaye(tarifs.find((r) => r.Id === choix.tarifId), groupes);
                  const taxe = taxeDe(choix.pourPersonnes);
                  const ailleurs = (prepaye ? pub.prepaye : pub.flexible) + taxe;
                  const gain = ailleurs - (choix.total + taxe);
                  // Sous un euro, l'écart ne vaut pas une ligne — et un « vous
                  // économisez 0,40 € » dessert plus qu'il ne sert.
                  if (gain < 1) return null;
                  return (
                    <div className="mt-2 rounded-lg bg-[#f4f8f5] px-3 py-2 text-[12.5px] leading-snug">
                      <p className="text-[#6b7a82]">
                        {T.surBooking[0]}
                        <span className="font-semibold text-navy">Booking</span>
                        {T.surBooking[1]}
                        {/* Pas de barré : la phrase dit déjà que ce prix est
                            ailleurs, et le gain juste en dessous dit ce qu'on
                            garde. Le rayer par-dessus ne fait que charger. */}
                        <span className="tabular-nums">{montant(ailleurs, langue)}</span>
                        {T.surBooking[2]}
                      </p>
                      <p className="mt-0.5 font-semibold text-[#2d6a4f]">
                        {T.gainDirect(montant(gain, langue))}
                      </p>
                    </div>
                  );
                })()}
                <div className="mb-3" />
              </>
            )}
            {/* Le moment ou se gagne ou se perd le dernier clic. Rien qui ne
                soit verifiable : pas de note inventee, pas de fausse rarete. */}
            <ul className="mb-2.5 grid gap-1 border-t border-[#f0ece4] pt-2.5 text-[12px] leading-snug text-[#6b7a82]">
              {/* Contextuel, pas une redite du bandeau : ce qui compte ici, c'est
                  la date d'annulation du tarif que le client vient de choisir. */}
              {heureChoix !== null && (
                <li className="flex items-start gap-1.5">
                  <span aria-hidden className="text-gold-ink">✓</span>
                  {T.annulableJusque(joli(arrivee, langue), heureChoix)}
                </li>
              )}
              {/* Ce qui sera pris sur la carte. Il vivait sur CHAQUE carte de
                  tarif, dans la liste des chambres : un troisieme chiffre a lire
                  par ligne, a un moment ou l'on compare des chambres et des prix,
                  pas des modalites de debit. Il se dit une fois, ici, ou l'on
                  regarde ce qu'on a choisi — puis en entier sur l'ecran de
                  paiement, carte en main.
                  Il prend la place de la ligne qui recopiait le premier avantage
                  du bandeau or de l'en-tete : la colonne vit sous
                  `lg:overflow-y-auto`, et deux lignes de plus la font scroller. */}
              {(() => {
                const reg = reglementDe(
                  tarifs.find((r) => r.Id === choix?.tarifId),
                  groupes,
                  choix ? choix.total + taxeDe(choix.pourPersonnes) : 0,
                );
                if (!choix || !reg) return null;
                return (
                  <li className="flex items-start gap-1.5">
                    <span aria-hidden className="text-gold-ink">✓</span>
                    {reg.debite
                      ? T.debitCourt(montant(reg.montant, langue))
                      : T.empreinteCourt(montant(reg.montant, langue))}
                  </li>
                );
              })()}
              <li className="flex items-start gap-1.5">
                <span aria-hidden className="text-gold-ink">✓</span>
                {T.checkin}
              </li>
            </ul>
            {/* L'entrée du dos. Une seule ligne, et elle dit son état : sans
                quoi on choisit un créneau, on revient, et on l'oublie.
                Elle n'apparaît que si le rooftop peut recevoir un des soirs du
                séjour — une porte qui mène à un refus vaut moins qu'aucune. */}
            {choix && soirsRooftop.length > 0 && (
              /* Un LIEN, pas un bouton. Encadré et posé juste au-dessus du
                 bouton de paiement, il en avait la taille et la couleur : deux
                 blocs dorés empilés, dont le secondaire pesait autant que le
                 principal. Le seul or de cette colonne appartient au règlement.
                 Sans boîte, la ligne s'efface derrière lui, et le texte peut
                 redevenir explicite — la place ne se paie plus. */
              <button
                type="button"
                onClick={() => { pulse(); setDosRooftop(true); }}
                className="mb-2 flex w-full items-center gap-2 py-0.5 text-left text-[13.5px] font-semibold text-navy transition-colors hover:text-gold-ink"
              >
                <span aria-hidden className="text-[15px] leading-none">🍸</span>
                <span className="min-w-0 flex-1 underline decoration-gold/60 underline-offset-4">
                  {tableChoix ? T.rooftopChoisie(heureLisible(tableChoix.heure, langue)) : T.rooftopAjouter}
                </span>
                <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-gold-ink" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            )}

            {/* Le bouton n'existe QUE si un tarif est retenu : un bouton de
                paiement sans rien a payer designe une action impossible, et
                c'est le seul or de cette colonne — il doit dire ou l'on va. */}
            {choix && (
              <>
                <button
                  type="button"
                  onClick={() => { pulse(); setPaiementOuvert(true); }}
                  className="w-full rounded-full bg-gold px-6 py-3.5 text-[16px] font-bold text-navy-deep transition hover:brightness-105"
                >
                  {T.payer}
                </button>
                {/* Colle au bouton, et a lui seul : c'est la, carte en main,
                    que la question se pose.
                    UNE ligne, et pas la phrase entiere. La colonne vit sous
                    `lg:overflow-y-auto` dans une page en `h-screen` : trois
                    lignes de plus ici, et elle se met a scroller de vingt
                    pixels — une barre de defilement pour rien, qui donne a la
                    colonne l'air cassee. L'explication complete existe deja
                    dans `Paiement.tsx`, au-dessus des iframes PciProxy, la ou
                    le client tape vraiment son numero : c'est le bon endroit
                    pour la phrase longue. Ici, il faut un repere, pas un cours. */}
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#6b7a82]">
                  <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#8a9299]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="10.5" width="16" height="10" rx="2" />
                    <path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3" />
                  </svg>
                  {T.paiementSecurise}
                </p>
              </>
            )}
            <p className="mt-2.5 border-t border-[#f0ece4] pt-2.5 text-[12.5px] text-[#6b7a82]">
              {T.aideAvant}{" "}
              <a href={`tel:${TELEPHONE.en.replace(/\s/g, "")}`} className="whitespace-nowrap font-semibold text-navy underline underline-offset-4 hover:text-gold-ink">
                {TELEPHONE[langue]}
              </a>
            </p>
          </div>
          </div>

          {/* ── Dos : la table du rooftop, pleine hauteur ──────────────── */}
          <div
            inert={dosRooftop ? undefined : true}
            className={[
              "col-start-1 row-start-1 h-full min-h-0",
              "[backface-visibility:hidden] [-webkit-backface-visibility:hidden]",
              "[transform:rotateY(180deg)] [transition:visibility_0s_linear_350ms]",
              dosRooftop ? "" : "invisible",
            ].join(" ")}
          >
            <PanneauRooftop
              soirs={soirsRooftop}
              choix={tableChoix}
              onChoix={setTableChoix}
              onFermer={() => { pulse(); setDosRooftop(false); }}
              nuits={nuits}
              langue={langue}
            />
          </div>

          </div>
          </div>
        </aside>

      </div>

      {/* Les photos de la chambre, en grand, a la demande. */}
      {galerie === "hotel" && recit && recit.communs.length > 0 && (
        <Galerie
          images={recit.communs}
          titre={recit.titre}
          debut={0}
          T={T}
          onFermer={() => setGalerie(null)}
        />
      )}

      {galerie && galerie !== "hotel" && photosDe(galerie, categories.get(galerie), "").length > 0 && (
        <Galerie
          images={photosDe(galerie, categories.get(galerie), nomChambre(galerie, categories.get(galerie), langue))}
          titre={nomChambre(galerie, categories.get(galerie), langue)}
          debut={0}
          T={T}
          onFermer={() => setGalerie(null)}
        />
      )}

      {/* Le retour du 3-D Secure. Il passe DEVANT tout le reste : le client
          revient de sa banque, et la seule chose qui l'interesse est de savoir
          si sa chambre est prise. */}
      {reprise && (
        <div
          role="dialog" aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-deep/92 p-4"
        >
          <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
            {reprise === "en-cours" ? (
              <>
                <svg aria-hidden viewBox="0 0 24 24" className="mx-auto h-8 w-8 animate-spin text-gold-ink" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M12 3a9 9 0 1 0 9 9" />
                </svg>
                <p className="mt-4 text-[15px] font-semibold text-navy">{T.repriseEnCours}</p>
              </>
            ) : (
              <>
                <p className="font-serif text-2xl text-navy">{T.repriseEchecTitre}</p>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[#5b6a72]">{T.repriseEchec}</p>
                <a
                  href="tel:+33494413623"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-[17px] font-bold text-navy-deep transition hover:brightness-105"
                >
                  04 94 41 36 23
                </a>
                <button
                  type="button" onClick={() => setReprise(null)}
                  className="mt-3 text-[13px] font-semibold text-[#6b7a82] underline underline-offset-4 hover:text-navy"
                >
                  {T.repriseFermer}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Le reglement, en surcouche.
          `Paiement` choisit son moteur tout seul, sur `sejour.debite` : champs
          securises PciProxy pour le flexible (Mews Payments Checkout ne sait
          pas conclure une preautorisation), checkout de Mews pour le prepaye.
          La cle marchande PciProxy n'est plus passee d'ici : l'ecran la lit
          lui-meme chez Mews, et seulement s'il en a besoin.
          La barre collante du bas, elle, se retire pendant ce temps : elle
          traversait deja les galeries pour la meme raison. */}
      {paiementOuvert && sejourAPayer && !reserve && (
        <Paiement
          sejour={sejourAPayer}
          langue={langue}
          onFermer={() => setPaiementOuvert(false)}
          onReserve={(r) => {
            setPaiementOuvert(false);
            setReserve(r);
            // La chambre est acquise : on peut poser la table. Un échec ici
            // n'annule rien, il s'affiche et donne le téléphone.
            if (tableChoix && choix) {
              void prendreTable({
                choix: tableChoix, pax: choix.pourPersonnes, client: r.client, langue,
              }).then(setTablePrise);
            }
          }}
        />
      )}

      {/* La confirmation.
       *
       * Elle ne promet QUE ce qu'on sait : la reservation est ecrite chez Mews,
       * et voici son numero. Pas de « vous allez recevoir un email » — on n'a
       * pas encore verifie que Mews en envoie un sur une creation Booking
       * Engine, et une promesse d'email qui n'arrive pas fait appeler l'hotel
       * le soir meme. La ligne s'ajoutera apres le premier test.
       *
       * Elle ne se ferme pas d'un clic dans le vide, contrairement aux
       * galeries et a l'ecran de paiement : le numero de confirmation est la
       * seule chose que le client aura a citer, et le faire disparaitre par
       * megarde n'a aucun rattrapage. On en sort par le lien, ou pas du tout. */}
      {reserve && (
        <div
          role="dialog" aria-modal="true" aria-label={T.confirmeTitre}
          className="fixed inset-0 z-50 overflow-y-auto bg-navy-deep/92 p-3 sm:p-6"
        >
          <div className="mx-auto w-full max-w-[520px] rounded-2xl bg-white p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/20">
              <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7 text-gold-ink" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            </span>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-navy">{T.confirmeTitre}</h2>
            <p className="mt-1.5 text-[15px] text-[#6b7a82]">{T.confirmeSous}</p>

            {/* Le numero avant le detail : c'est ce qu'on vient chercher ici,
                et ce qu'on recopie. En `tabular-nums` et espace, pour qu'il se
                lise a voix haute sans se perdre dans les chiffres. */}
            {reserve.numeros.length > 0 && (
              <div className="mt-5 rounded-xl border border-[#e3e0d9] bg-[#faf7f1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9299]">
                  {T.confirmeNumero}
                </p>
                <p className="mt-1.5 select-all font-mono text-[22px] font-bold tracking-wide text-navy">
                  {reserve.numeros.join(" · ")}
                </p>
                <p className="mt-1.5 text-[12px] text-[#8a9299]">{T.confirmeNumeroAide}</p>
                {/* Vérifié le 26/08/2026 sur la résa 29816 : Mews envoie bien
                    une confirmation au client, environ trois minutes après la
                    création. On peut donc l'annoncer — ce qu'on s'interdisait
                    tant qu'on ne l'avait pas constaté. */}
                <p className="mt-2 border-t border-[#e8e2d6] pt-2 text-[12px] leading-snug text-[#6b7a82]">
                  {T.confirmeMail}
                </p>
              </div>
            )}

            {sejourAPayer && (
              <dl className="mt-5 grid gap-2 border-t border-[#f0ece4] pt-4 text-left text-[14px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8a9299]">{T.arrivee}</dt>
                  <dd className="font-semibold text-[#3c4a52]">{joli(arrivee, langue)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#8a9299]">{T.depart}</dt>
                  <dd className="font-semibold text-[#3c4a52]">{joli(depart, langue)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  {/* `colOffres` titrait la COLONNE des chambres — repris ici,
                      il donnait « Nos chambres » en face de la chambre retenue. */}
                  <dt className="text-[#8a9299]">{T.confirmeChambre}</dt>
                  <dd className="text-right font-semibold text-[#3c4a52]">{sejourAPayer.resume}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-[#f0ece4] pt-2">
                  <dt className="font-semibold text-[#3c4a52]">{T.totalSejour}</dt>
                  <dd className="text-[22px] font-bold tabular-nums text-navy">{sejourAPayer.totalFormate}</dd>
                </div>
              </dl>
            )}

            {/* Ce qu'il est advenu de la table, si une table a été demandée. */}
            {tableChoix && <TableConfirmee prise={tablePrise} langue={langue} />}

            {/* Le séjour dans l'agenda du client.
                Un événement « journée entière » de l'arrivée au départ : c'est
                ainsi qu'on note un voyage, pas avec une heure de check-in. La
                table du rooftop, si elle a été prise, part dans la description
                — un second événement pour un apéro encombrerait l'agenda plus
                qu'il ne servirait. Nouvel onglet : on ne quitte pas la page qui
                porte le numéro de confirmation. */}
            {sejourAPayer && (
              <a
                href={lienAgenda({
                  titre: `${T.titre} — ${sejourAPayer.resume.split(" · ")[0]}`,
                  arrivee, depart,
                  details: [
                    `${T.confirmeNumero} : ${reserve.numeros.join(", ")}`,
                    sejourAPayer.resume,
                    `${T.totalSejour} : ${sejourAPayer.totalFormate}`,
                    tablePrise ? `🍸 ${heureLisible(tablePrise.heure, langue)}` : null,
                  ].filter(Boolean).join("\n"),
                })}
                target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e3e0d9] bg-white px-4 py-2 text-[13.5px] font-semibold text-navy transition-colors hover:border-gold hover:text-gold-ink"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-gold-ink" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" />
                </svg>
                {T.agenda}
              </a>
            )}

            <p className="mt-5 border-t border-[#f0ece4] pt-4 text-[13px] text-[#6b7a82]">
              {T.confirmeQuestion}{" "}
              <a href={`tel:${TELEPHONE.en.replace(/\s/g, "")}`} className="whitespace-nowrap font-semibold text-navy underline underline-offset-4 hover:text-gold-ink">
                {TELEPHONE[langue]}
              </a>
            </p>

            <Link
              href="/"
              className="mt-4 inline-block w-full rounded-full bg-navy px-6 py-3 text-[15px] font-bold text-white transition hover:brightness-110"
            >
              {T.confirmeRetour}
            </Link>
          </div>
        </div>
      )}

      {/* Mobile : le total suit le client. Le recapitulatif est la troisieme
          colonne — sur telephone elle arrive apres toute la liste des chambres,
          donc hors de vue au moment ou l'on choisit.

          Elle se retire dans trois cas. Quand le recapitulatif est a l'ecran :
          elle y repetait mot pour mot le bloc juste au-dessus. Quand le
          calendrier est ouvert : il descend jusqu'au bas de l'ecran, la barre
          lui mangeait ses derniers jours, et on choisit des dates a ce
          moment-la — pas un total. Et quand une galerie est ouverte : la
          surcouche ne couvre le fond qu'a 90 %, la barre transparaissait au
          bas d'une photo plein ecran avec un bouton qu'on ne pouvait pas
          atteindre. */}
      {choix && !recapVisible && !calendrierOuvert && !galerie && !paiementOuvert && !reserve && (
        <div className="sticky bottom-0 z-30 border-t border-[#e3e0d9] bg-white/95 px-5 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="block truncate text-[13px] text-[#8a9299]">
                {nomChambre(choix.categorieId, categories.get(choix.categorieId), langue)} · {T.nuits(nuits)}
              </span>
              <span className="block text-[20px] font-bold tabular-nums text-navy">
                <TotalRoulant valeur={choix.total + taxeDe(choix.pourPersonnes)} langue={langue} />
              </span>
            </span>
            <button
              type="button"
              onClick={() => zoneRecap.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="btn btn-or shrink-0 px-5 py-3 text-[14px]"
            >
              {T.voirRecap}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
