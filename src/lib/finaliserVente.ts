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
 * 26/08/2026, sur les résas 29814 et 29816, celle-ci ayant pourtant une carte
 * attachée et un client allé au bout de son geste.
 *
 * ⚠️ ET C'EST AUSSI ELLE QUI DÉCLENCHE L'ENCAISSEMENT. Les deux groupes
 * tarifaires portent `SettlementType: Automatic` et
 * `SettlementTrigger: Confirmation` : la préautorisation de 1 % du flexible,
 * comme le débit de 100 % du prépayé, s'exécutent chez Mews à cet instant
 * précis, depuis la carte attachée à la réservation. Relevé le 27/08/2026 sur
 * `hotels/getAvailability`, ne pas re-deviner ces valeurs.
 *
 * Les deux chemins du tunnel se rejoignent donc ici, et pour la même raison :
 * le flexible après avoir attaché sa carte PciProxy, le prépayé après que le
 * checkout de Mews a encaissé.
 */

const TAXE_PAR_ADULTE_NUIT = 1.86;

export type SejourVendu = {
  categorieId: string;
  tarifId: string;
  arrivee: string;
  depart: string;
  adultes: number;
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
        arrivee: sejour.arrivee, depart: sejour.depart, adultes: sejour.adultes, langue: 'fr',
      }),
      chargerCategories('fr'),
    ]);
    const nuits = Math.max(
      1, Math.round((Date.parse(sejour.depart) - Date.parse(sejour.arrivee)) / 86_400_000),
    );
    const taxe = TAXE_PAR_ADULTE_NUIT * sejour.adultes * nuits;
    const prixMews = dispo.offres
      .find((o) => o.categorieId === sejour.categorieId && o.pourPersonnes === sejour.adultes)
      ?.prix.find((p) => p.tarifId === sejour.tarifId)?.total ?? 0;

    const texte = noteDeControle({
      chambre: cats.get(sejour.categorieId)?.nomFr || t(cats.get(sejour.categorieId)?.nom, 'fr'),
      prepaye: estPrepaye(dispo.tarifs.find((r) => r.Id === sejour.tarifId), dispo.groupes),
      total: prixMews + taxe,
      taxe,
      langueClient: langue,
    });
    await Promise.all(reservationIds.map((id) => ajouterNote(id, texte)));
  } catch (e) {
    console.error('Mews note de reception', e instanceof Error ? e.message : e);
  }
}
