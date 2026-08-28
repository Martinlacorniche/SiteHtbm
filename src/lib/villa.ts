/* La Villa Les Voiles — la privatisation de l'Hôtel-Rooftop.
 *
 * ⚠️ CE N'EST PAS UNE VILLA, C'EST L'HÔTEL.
 * « Villa Les Voiles » est un nom commercial : ce qui se vend, ce sont les
 * chambres des Voiles louées ensemble, avec les espaces communs et l'accès
 * autonome. Toute la logique en découle — et d'abord la disponibilité, qui n'a
 * rien à voir avec celle d'une chambre.
 *
 * ⚠️ IL Y A DEUX FORMULES, ET C'EST CE QUI REND LA RÈGLE INTÉRESSANTE.
 * Source : l'annonce leboncoin en ligne, relue par Martin le 28/08/2026.
 *
 *   · VILLA COMPLÈTE — 16 chambres, 28 personnes.
 *   · DEMI-VILLA — 8 chambres, 14 personnes, la moitié du prix.
 *
 * ⚠️ LA DEMI-VILLA NE CHANGE RIEN À LA DISPONIBILITÉ (Martin, 28/08/2026).
 * J'avais compris l'inverse et c'était faux : privatiser, c'est privatiser.
 * Que le groupe occupe huit chambres ou seize, il est SEUL dans l'hôtel — on ne
 * vend pas les huit autres à côté de lui. La demi-villa est une question de
 * prix et de chambres ouvertes, pas de place disponible.
 *
 * Il faut donc les SEIZE chambres libres dans les deux cas, et le verdict est
 * binaire : libre, ou fermé. Une seule chambre vendue — ou simplement tenue en
 * option — ferme la date, quelle que soit la formule.
 *
 * ⚠️ LES OPTIONS COMPTENT COMME DES VENTES, et on n'a rien eu à coder pour ça :
 * `hotels/getAvailability` décompte les réservations optionnelles de la
 * disponibilité offerte, exactement comme les confirmées. Mesuré le 28/08/2026
 * sur les données réelles : 10→13 novembre rend 16 chambres, 20→23 octobre n'en
 * rend que 15.
 */

/** La capacité de l'hôtel — et le seuil de disponibilité des DEUX formules.
 *  `CAPACITE_DEMI` ne dit que le nombre de chambres OUVERTES au groupe dans la
 *  formule demi ; il n'a jamais servi à juger si la date est prenable.
 *
 *  ⚠️ EN CONSTANTE, PARCE QUE MEWS NE LA DONNE PAS. La réponse de disponibilité
 *  ne porte que les chambres LIBRES : une catégorie tombée à zéro DISPARAÎT de
 *  la réponse au lieu d'y figurer à 0. La capacité totale ne s'en déduit pas.
 *  Si l'hôtel gagne ou perd une chambre, c'est ici — et nulle part ailleurs —
 *  qu'il faut le dire, sinon la privatisation se déclarerait libre alors qu'il
 *  resterait quelqu'un dans les murs. */
export const CAPACITE = 16;
export const CAPACITE_DEMI = 8;

/** Deux nuits minimum, sur les deux formules (annonce leboncoin). Une seule
 *  nuit ne paie pas la mise en place ni le ménage de fin de séjour. */
export const NUITS_MIN = 2;

/* ⚠️ IL N'Y A PLUS DE SAISON, ET C'ÉTAIT UNE ERREUR D'EN METTRE UNE.
 *
 * La première version refusait toute date de juin à septembre, en recopiant
 * l'annonce leboncoin (« d'octobre à mai, hors saison estivale »). Martin l'a
 * corrigé le 28/08/2026, et il a raison : puisque la disponibilité est lue dans
 * Mews en direct, la saison ne sert plus à rien. Elle ne protégeait de rien —
 * un été plein se ferme tout seul, il n'y a pas seize chambres libres un
 * samedi d'août — et elle coûtait cher : elle jetait les groupes qui cherchent
 * justement l'été, et les semaines creuses de juin ou de septembre où la
 * demi-villa se prend sans gêner personne.
 *
 * La règle est désormais la seule qui compte : ce que Mews rend libre.
 */

/* ─────────────────────────────── Les tarifs ───────────────────────────────
 *
 * ⚠️ LE DIRECT EST MOINS CHER QUE LEBONCOIN, ET C'EST LE POINT.
 * Décision de Martin, 28/08/2026 : sur notre page, on applique le tarif de LA
 * PLAQUETTE, pas celui de l'annonce. Envoyer les gens sur notre moteur pour
 * leur afficher le prix de la place de marché n'aurait aucun sens — c'est
 * exactement le piège qu'on vient d'éviter sur le flux Google.
 *
 *   plaquette (`public/docs/villa-les-voiles.pdf`) : « à partir de 80 € TTC »
 *   par chambre et par nuit.
 *
 * ⚠️ SANS PETIT-DÉJEUNER (Martin, 28/08/2026). La plaquette écrit qu'il est
 * « toujours inclus dans nos tarifs » : c'est vrai des chambres vendues à
 * l'unité, pas de la privatisation. Il se vend en option — et l'annoncer
 * inclus ferait la plus mauvaise des surprises à l'arrivée, sur le repas le
 * plus visible du séjour.
 *
 *   → villa complète  16 × 80 = 1 280 €/nuit   (leboncoin : 1 490 €)
 *   → demi-villa       8 × 80 =   640 €/nuit   (leboncoin :   745 €)
 *
 * ⚠️ LE PRIX DE LA PRIVATISATION N'EST PAS ÉCRIT DANS LA PLAQUETTE. Elle dit
 * « prestation sur devis » et ne chiffre que la chambre (80 €) et la soirée
 * rooftop (1 200 € à partir de vingt convives). Les deux montants ci-dessus
 * sont donc DÉDUITS du prix par chambre. Si Martin veut un forfait qui ne soit
 * pas un multiple, c'est ici et seulement ici que ça se change.
 *
 * Le prix est AFFICHÉ mais NÉGOCIABLE : la page l'annonce pour que le prospect
 * se situe au lieu d'écrire « c'est combien ? », et la vente se conclut au
 * téléphone. D'où « à partir de », et d'où l'absence de bouton « payer ».
 *
 * La caution (3 000 € minimum selon la durée, annonce leboncoin) est prise SUR
 * PLACE à l'arrivée, en carte. Elle n'entre pas dans le devis : l'afficher en
 * ligne de total ferait fuir sur un montant qui n'est pas un prix. */
export type Formule = 'complete' | 'demi';

/** Par chambre et par nuit, petit-déjeuner inclus (plaquette). Le seul chiffre
 *  à changer si le tarif direct bouge : tout le reste en découle. */
export const PRIX_CHAMBRE_NUIT = 80;

/** ⚠️ UN GROUPE COMPTE EN PERSONNES, PAS EN CHAMBRES (Martin, 28/08/2026).
 *  « 1 280 € la nuit » ne dit rien à quelqu'un qui organise une cousinade ; il
 *  veut savoir ce que ça coûte à chacun. La chambre double à 80 € fait donc
 *  40 € par personne, et c'est CE chiffre qui doit se lire en premier.
 *
 *  ⚠️ EN OCCUPATION DOUBLE, ET SEULEMENT LÀ. Quatre des seize chambres sont des
 *  individuelles — mesuré dans Mews le 28/08/2026 : la catégorie
 *  `a1f3a293…` ne s'ouvre qu'à une personne, ce qui donne bien les
 *  « 16 chambres – 28 personnes » de la plaquette et non les 32 de l'annonce
 *  leboncoin. Diviser le prix de la maison par le nombre d'occupants réels
 *  donnerait donc un autre chiffre : on annonce le prix par personne EN CHAMBRE
 *  DOUBLE, ce qui est vrai et vérifiable, plutôt qu'une moyenne qui ne
 *  correspond à personne. */
export const PRIX_PAX_DOUBLE = PRIX_CHAMBRE_NUIT / 2;

export const FORMULES = {
  /* ⚠️ 28 personnes, pas 32. La plaquette annonce « 16 chambres – 28
     personnes », l'annonce leboncoin « jusqu'à 32 ». La plaquette a raison, et
     Mews le confirme : quatre chambres ne s'ouvrent qu'à une personne
     (4 × 1 + 12 × 2 = 28). L'annonce leboncoin est à corriger. */
  complete: {
    chambres: CAPACITE, personnes: 28,
    parNuit: CAPACITE * PRIX_CHAMBRE_NUIT, parPersonne: PRIX_PAX_DOUBLE,
  },
  demi: {
    chambres: CAPACITE_DEMI, personnes: 14,
    parNuit: CAPACITE_DEMI * PRIX_CHAMBRE_NUIT, parPersonne: PRIX_PAX_DOUBLE,
  },
} as const satisfies Record<Formule, {
  chambres: number; personnes: number; parNuit: number; parPersonne: number;
}>;

/** ⚠️ LA CAUTION EST POSSIBLE, PAS SYSTÉMATIQUE (Martin, 28/08/2026).
 *  L'annonce leboncoin en impose une de 3 000 € minimum ; en direct elle se
 *  décide au devis, selon la durée et le type de séjour. On ne l'affiche donc
 *  plus comme une ligne de total — annoncer trois mille euros à quelqu'un qui
 *  découvre le prix, c'est le perdre sur un montant qui n'en est pas un. La
 *  page dit qu'elle peut être demandée, et le commercial tranche. */

/** Par personne et par nuit, aux Voiles. Facturée en plus : elle dépend du
 *  nombre d'occupants, qu'on ne connaît pas avant d'avoir la liste. */
export const TAXE_SEJOUR = 1.86;

/** L'état d'une nuit, pour peindre le calendrier.
 *
 *  ⚠️ DEUX ÉTATS, PAS TROIS. Une version intermédiaire peignait en ambre les
 *  nuits où huit chambres restaient libres, en croyant y vendre la demi-villa.
 *  C'était un contresens : la demi-villa exige l'hôtel vide comme la complète.
 *  Une nuit où quinze chambres sont libres n'est pas à moitié vendable, elle
 *  est fermée. */
export type EtatNuit = 'libre' | 'ferme';

export const etatDeLaNuit = (libres: number): EtatNuit =>
  libres >= CAPACITE ? 'libre' : 'ferme';

/** La formule qu'il faut pour un effectif donné, ou `null` si ça déborde.
 *
 *  ⚠️ C'EST L'EFFECTIF QUI CHOISIT, PAS LE VISITEUR. On lui demandait avant de
 *  cliquer « villa complète » ou « demi-villa » — deux mots qui ne veulent rien
 *  dire tant qu'on ne sait pas combien de chambres il faut. Il sait en revanche
 *  très bien combien ils sont. La formule en découle, et le prix par personne
 *  devient un chiffre EXACT au lieu d'une hypothèse de chambre double.
 *
 *  ⚠️ ET ÇA RÈGLE LE 1 280 / 28 = 45,71 QUI NE FAISAIT PAS 40 (Martin,
 *  28/08/2026). Une chambre coûte 80 € qu'un ou deux y dorment, et quatre des
 *  seize sont des individuelles : le « 40 € par personne » n'était vrai qu'en
 *  occupation double. Divisé par l'effectif réel, plus rien à interpréter. */
export function formulePourPax(pax: number): Formule | null {
  if (!Number.isFinite(pax) || pax < 1) return null;
  if (pax <= FORMULES.demi.personnes) return 'demi';
  if (pax <= FORMULES.complete.personnes) return 'complete';
  return null;
}

/** Ce que coûte la nuit à chacun, pour un effectif réel. Arrondi à l'euro :
 *  au centime près, ça se lit comme une facture alors que c'est un ordre de
 *  grandeur qui ouvre une conversation. */
export const parPersonneReel = (formule: Formule, pax: number): number =>
  Math.round(FORMULES[formule].parNuit / Math.max(pax, 1));

/** Le devis indicatif d'un séjour, pour une formule donnée. */
export function devis(formule: Formule, nuits: number) {
  const f = FORMULES[formule];
  return {
    formule, nuits,
    parNuit: f.parNuit,
    parPersonne: f.parPersonne,
    total: f.parNuit * nuits,
  };
}

/** Le nombre de nuits entre deux dates civiles.
 *  Passe par UTC : à Toulon, une soustraction en heure locale se trompe d'un
 *  jour deux fois par an, la nuit du changement d'heure. */
export function nuitsEntre(arrivee: string, depart: string): number {
  const j = (s: string) => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
  return Math.round((j(depart) - j(arrivee)) / 86400000);
}

/** Ce que la page a le droit d'annoncer.
 *
 *  `motif` porte la RAISON, pas seulement le résultat : « il reste six
 *  chambres » ne se dit pas comme « c'est l'été », et une page qui répond
 *  « indisponible » aux deux perd le client qui aurait décalé d'une semaine. */
export type Verdict = {
  /** L'hôtel est-il entièrement libre sur toute la période ? C'est la seule
   *  question : les deux formules ont le même seuil. */
  libre: boolean;
  /** Chambres réellement libres sur TOUTE la période. */
  libres: number;
  capacite: number;
  nuits: number;
  motif: 'libre' | 'chambres-prises' | 'trop-court' | 'dates-invalides';
  devis: {
    formule: Formule; nuits: number;
    parNuit: number; parPersonne: number; total: number;
  } | null;
};
