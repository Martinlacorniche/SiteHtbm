import {
  chercherDisponibilite, chargerCategories, estPrepaye, t, type Langue,
} from '@/lib/mewsBooking';
import { confirmerReservations, ajouterNote, noteDeControle } from '@/lib/mewsConnector';

/* Ferme la vente : la confirmation, puis la note que lira la réception.
 *
 * ⚠️ C'EST LA CONFIRMATION QUI VEND LA CHAMBRE, et rien d'autre.
 * `reservationGroups/create` ne pose qu'une option, `State: Optional`, avec un
 * `ReleasedUtc` à création + 20 min. Sans cet appel, Mews la relâche de
 * lui-même en `CancellationReason: BookingAbandoned` — constaté deux fois le
 * 26/08/2026, sur les résas 29814 et 29816.
 *
 * ⚠️ ET C'EST AUSSI ELLE QUI DÉCLENCHE L'ENCAISSEMENT. Les deux groupes
 * tarifaires portent `SettlementType: Automatic` et
 * `SettlementTrigger: Confirmation` : la préautorisation de 1 % du flexible,
 * comme le débit de 100 % du prépayé, s'exécutent chez Mews à cet instant
 * précis. Relevé le 27/08/2026 sur `hotels/getAvailability`, ne pas re-deviner.
 *
 * ⚠️ ELLE VIENT APRÈS L'AUTHENTIFICATION DE LA CARTE, JAMAIS AVANT.
 * Confirmer une réservation dont la carte est encore `Authorizable` déclenche
 * un règlement que la DSP2 empêche, et Mews n'en dit rien : la demande reste
 * `Pending` puis expire. C'est ce qui est arrivé à la résa 29841.
 *
 * Les deux chemins du tunnel se rejoignent ici : le flexible après le 3-D
 * Secure, le prépayé après que le checkout de Mews a encaissé.
 */

const TAXE_PAR_ADULTE_NUIT = 1.86;

/** Une chambre du séjour. Plusieurs sont possibles, toutes du même groupe
 *  tarifaire — la contrainte qui garde une seule règle d'encaissement. */
export type LigneVendue = { categorieId: string; tarifId: string; adultes: number };

export type SejourVendu = {
  lignes: LigneVendue[];
  arrivee: string;
  depart: string;
};

/** Lève si la confirmation échoue — la chambre n'est alors PAS acquise, et
 *  laisser le client croire l'inverse est le pire des scénarios. La note, elle,
 *  ne bloque jamais : elle se rattrape au comptoir. */
export async function finaliserVente(
  { reservationIds, sejour, langue }:
  { reservationIds: string[]; sejour: SejourVendu; langue: Langue },
): Promise<void> {
  await confirmerReservations(reservationIds);

  try {
    const [dispo, cats] = await Promise.all([
      chercherDisponibilite({
        arrivee: sejour.arrivee, depart: sejour.depart,
        // La recherche porte sur l'occupation de la première chambre : c'est
        // elle qui fixe le jeu de prix que Mews renvoie, et chaque ligne y
        // retrouve le sien par sa propre occupation.
        adultes: sejour.lignes[0]?.adultes ?? 1, langue: 'fr',
      }),
      chargerCategories('fr'),
    ]);
    const nuits = Math.max(
      1, Math.round((Date.parse(sejour.depart) - Date.parse(sejour.arrivee)) / 86_400_000),
    );

    /* ⚠️ UNE NOTE PAR RÉSERVATION, ET PAS LA MÊME POUR TOUTES.
     *
     * La réception lit une note par chambre : elle dit quelle chambre, à
     * quelles conditions, et ce qu'il faut encaisser. Poser la note de la
     * première sur les trois enverrait le comptoir réclamer trois fois le
     * montant d'une seule.
     *
     * L'appariement se fait PAR RANG : Mews rend ses réservations dans l'ordre
     * où on les lui a envoyées. C'est le même ordre que `sejour.lignes`, qui
     * vient lui-même du panier du client. */
    const notes = reservationIds.map((id, rang) => {
      const ligne = sejour.lignes[rang] ?? sejour.lignes[0];
      if (!ligne) return null;
      const taxe = TAXE_PAR_ADULTE_NUIT * ligne.adultes * nuits;
      const prixMews = dispo.offres
        .find((o) => o.categorieId === ligne.categorieId && o.pourPersonnes === ligne.adultes)
        ?.prix.find((p) => p.tarifId === ligne.tarifId)?.total ?? 0;
      const texte = noteDeControle({
        chambre: cats.get(ligne.categorieId)?.nomFr || t(cats.get(ligne.categorieId)?.nom, 'fr'),
        prepaye: estPrepaye(dispo.tarifs.find((r) => r.Id === ligne.tarifId), dispo.groupes),
        total: prixMews + taxe,
        taxe,
        langueClient: langue,
      });
      return ajouterNote(id, texte);
    });
    await Promise.all(notes.filter(Boolean));
  } catch (e) {
    console.error('Mews note de reception', e instanceof Error ? e.message : e);
  }
}
