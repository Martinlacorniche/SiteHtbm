/* Ce qu'on emporte à travers le 3-D Secure, et comment on le récupère.
 *
 * ⚠️ LE 3-D SECURE FAIT QUITTER LA PAGE. Quand la banque du client réclame un
 * challenge, on l'envoie sur la page hébergée par Mews et il revient par une
 * URL de retour. Entre-temps, React est remonté de zéro : la vente en cours —
 * la réservation posée, sa carte, le séjour — a disparu avec l'état du
 * composant. Sans ce relais, le client revient authentifié devant un tunnel qui
 * ne sait plus qui il est, et la chambre se relâche vingt minutes plus tard.
 *
 * On passe par `sessionStorage` plutôt que par l'URL :
 *  · l'URL de retour est fabriquée par nous mais transite par Mews et par la
 *    banque, et y écrire des identifiants de réservation les sème dans des
 *    journaux qui ne nous appartiennent pas ;
 *  · `sessionStorage` est lié à l'onglet ET à l'origine, il survit à un
 *    aller-retour, et il s'efface tout seul quand l'onglet se ferme.
 *
 * ⚠️ RIEN DE CE QUI EST ÉCRIT ICI N'EST CRU SUR PAROLE À L'ARRIVÉE.
 * `/api/reserver/carte` relit l'état d'autorisation de la carte CHEZ MEWS avant
 * de confirmer quoi que ce soit. Ce relais transporte de quoi reprendre le fil,
 * pas de quoi prouver un paiement. Il ne contient aucune donnée bancaire — le
 * numéro de carte n'a jamais approché ce site.
 */

export const CLE_3DS = 'voiles.vente3ds';

export type VenteEnAttente = {
  carteId: string;
  groupeId: string;
  numeros: string[];
  reservationIds: string[];
  sejour: {
    /** Les chambres du panier, DANS L'ORDRE OÙ ELLES ONT ÉTÉ ENVOYÉES À MEWS.
     *  Cet ordre apparie les réservations rendues aux chambres choisies : c'est
     *  lui qui fait poser la bonne note de réception sur chacune. */
    lignes: { categorieId: string; tarifId: string; adultes: number }[];
    arrivee: string; depart: string;
  };
  client: { prenom: string; nom: string; email: string; telephone: string };
  langue: 'fr' | 'en';
  /** Pour jeter un relais oublié : une vente reprise deux heures plus tard ne
   *  vaut plus rien, Mews aura relâché la chambre depuis longtemps. */
  poseeA: number;
};

/** Une option Mews vit vingt minutes. On se donne un peu de marge pour le
 *  temps du challenge bancaire, et pas davantage. */
const PEREMPTION = 30 * 60_000;

export function poserVente(v: Omit<VenteEnAttente, 'poseeA'>): void {
  try {
    sessionStorage.setItem(CLE_3DS, JSON.stringify({ ...v, poseeA: Date.now() }));
  } catch {
    /* Navigation privée, stockage plein, ou un navigateur qui refuse : on ne
     * casse pas la vente pour ça. Le client sera simplement renvoyé vers le
     * téléphone au retour, ce que l'écran sait dire. */
  }
}

/** Relit ET efface : une reprise ne doit jamais pouvoir se rejouer. */
export function reprendreVente(): VenteEnAttente | null {
  let brut: string | null = null;
  try {
    brut = sessionStorage.getItem(CLE_3DS);
    sessionStorage.removeItem(CLE_3DS);
  } catch { return null; }
  if (!brut) return null;

  try {
    const v = JSON.parse(brut) as VenteEnAttente;
    if (!v?.carteId || !v?.reservationIds?.length || !v?.sejour?.lignes?.length) return null;
    if (!Number.isFinite(v.poseeA) || Date.now() - v.poseeA > PEREMPTION) return null;
    return v;
  } catch {
    return null;
  }
}

export function oublierVente(): void {
  try { sessionStorage.removeItem(CLE_3DS); } catch { /* rien à faire */ }
}
