/* QUAND UNE VENTE MEURT AU 3-D SECURE, LA RÉCEPTION DOIT L'APPRENDRE AUTREMENT
 * QUE PAR LE CLIENT AU TÉLÉPHONE.
 *
 * 🔴 LE 08/10/2026. Une cliente règle, voit « appelez-nous », appelle. Au
 * comptoir : rien. Sa réservation était bien chez Mews, en `Optional`, avec sa
 * carte en `AuthorizationState: Authorizable` — le 3-D Secure n'était jamais
 * allé au bout. Le refus de confirmer était JUSTE : confirmer déclencherait le
 * règlement contre une carte qui ne peut pas le supporter. Mais personne, côté
 * hôtel, n'en savait rien : l'échec n'existait que sur l'écran du client.
 *
 * ⚠️ PAS UNE TÂCHE MEWS. On a regardé le 08/10 : Mews y pose ses propres
 * tâches (« demande de paiement expirée ») et elles dorment ouvertes depuis
 * plus d'une semaine. Une alerte dans un endroit que personne ne lit n'est pas
 * une alerte. La consigne NWH.os, elle, est l'écran du matin.
 *
 * ⚠️ ET ÇA NE DOIT JAMAIS FAIRE TOMBER LA RÉPONSE AU CLIENT. Tout est avalé :
 * une alerte manquée coûte une ligne, une exception ici coûterait la réponse
 * HTTP — donc la dernière chance qu'a le client de comprendre ce qui se passe.
 */

import { supabaseServer } from '@/lib/supabase-server';
import { callMews } from '@/lib/mewsConnector';

const HOTEL_NWH = 'ded6e6fb-ff3c-4fa8-ad07-403ee316be53'; // Les Voiles, côté NWH.os

type ResaLue = {
  Number?: string | null;
  CustomerId?: string | null;
  StartUtc?: string | null;
  EndUtc?: string | null;
};

/** Le nom et les dates, pour que la consigne serve au comptoir — sans eux elle
 *  ne dit que « quelqu'un a échoué quelque part ». */
async function quiEtQuand(reservationIds: string[]): Promise<string> {
  try {
    const r = await callMews<{ Reservations?: ResaLue[]; Customers?: { Id: string; FirstName?: string | null; LastName?: string | null; Phone?: string | null; Email?: string | null }[] }>(
      'reservations/getAll',
      { ReservationIds: reservationIds, Extent: { Reservations: true, Customers: true }, Limitation: { Count: 10 } },
    );
    const resas = r.Reservations ?? [];
    const noms = new Map((r.Customers ?? []).map((c) => [c.Id, {
      nom: [c.FirstName, c.LastName].filter(Boolean).join(' ').trim(),
      tel: c.Phone ?? '', mail: c.Email ?? '',
    }]));
    const bouts = resas.map((x) => {
      const c = x.CustomerId ? noms.get(x.CustomerId) : undefined;
      const sejour = `${String(x.StartUtc ?? '').slice(0, 10)} → ${String(x.EndUtc ?? '').slice(0, 10)}`;
      return `n° ${x.Number ?? '?'} · ${c?.nom || 'client sans nom'} · ${sejour}`
        + `${c?.tel ? ` · ${c.tel}` : ''}${c?.mail ? ` · ${c.mail}` : ''}`;
    });
    return bouts.join(' | ') || reservationIds.join(', ');
  } catch {
    /* Mews muet : on garde les identifiants plutôt que rien. La consigne doit
       partir même mal renseignée — c'est son absence qui a coûté l'appel. */
    return reservationIds.join(', ');
  }
}

/**
 * Pose une consigne de réception quand une vente du moteur meurt faute
 * d'authentification de la carte.
 *
 * `etat` est l'état lu CHEZ MEWS (`Authorizable`, `Pending`, `Declined`…) :
 * c'est lui qui distingue « le client a abandonné son 3-D Secure » d'un refus
 * sec de la banque, et la réception ne dit pas la même chose dans les deux cas.
 */
export async function alerterCarteNonAuthentifiee(
  reservationIds: string[], etat: string | null,
): Promise<void> {
  try {
    const detail = await quiEtQuand(reservationIds);
    const cause = etat === 'Declined'
      ? 'la banque a REFUSÉ l’authentification'
      : etat === 'Authorizable'
        ? 'le client n’a pas terminé son 3-D Secure (page de la banque fermée, ou abandonnée)'
        : `la carte est restée en « ${etat ?? 'état inconnu'} »`;
    const texte = `🔴 Moteur direct : réservation NON confirmée — ${cause}. ${detail}. `
      + 'Rien n’a été débité et aucune empreinte n’est valable. La chambre est relâchée par le PMS '
      + 'après 20 min. Si le client rappelle : lui refaire la réservation, ou lui envoyer un lien de paiement.';

    const { error } = await supabaseServer.from('consignes').insert({
      texte,
      auteur: 'Moteur de réservation',
      service: 'Réception',
      date_creation: new Date().toISOString().slice(0, 10),
      /* Trois jours : passé ce délai, le client a rappelé ou la vente est
         perdue. Une consigne qui traîne un mois cesse d'être lue. */
      date_fin: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
      valide: false,
      hotel_id: HOTEL_NWH,
    });
    if (error) console.error('Consigne 3-D Secure non posée :', error.message);
  } catch (e) {
    console.error('Consigne 3-D Secure non posée :', e instanceof Error ? e.message : e);
  }
}
