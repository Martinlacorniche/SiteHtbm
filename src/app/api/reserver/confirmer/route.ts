import { NextRequest, NextResponse } from 'next/server';
import {
  chercherDisponibilite, chargerCategories, estPrepaye, t, type Langue,
} from '@/lib/mewsBooking';
import {
  confirmerReservations, ajouterNote, noteDeControle, annulerDemandePaiement,
} from '@/lib/mewsConnector';

/* Ferme la vente, une fois le paiement passé.
 *
 * ⚠️ C'EST ICI QUE LA CHAMBRE EST VENDUE, et nulle part avant.
 * `reservationGroups/create` n'a posé qu'une option, relâchée par Mews au bout
 * de vingt minutes. Tant que cette route n'a pas tourné, le client n'a rien —
 * et c'est voulu : celui qui ferme l'onglet devant le formulaire de carte ne
 * doit pas immobiliser une chambre.
 *
 * Elle est appelée par le `onSuccess` du checkout Mews, donc APRÈS que le
 * paiement (ou la préautorisation) a réellement abouti chez eux.
 *
 * ⚠️ On ne fait AUCUNE confiance à l'appelant sur ce point : le navigateur
 * pourrait appeler cette route sans avoir payé. On relit donc l'état de la
 * demande de paiement chez Mews avant de confirmer quoi que ce soit.
 */

const estGuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const estDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

const TAXE_PAR_ADULTE_NUIT = 1.86;

type Corps = {
  langue?: Langue;
  reservationIds?: string[];
  demandeId?: string;
  sejour?: { categorieId?: string; tarifId?: string; arrivee?: string; depart?: string; adultes?: number };
};

export async function POST(req: NextRequest) {
  let corps: Corps;
  try { corps = await req.json(); } catch {
    return NextResponse.json({ erreur: 'requete illisible' }, { status: 400 });
  }
  const langue: Langue = corps.langue === 'en' ? 'en' : 'fr';
  const ids = (corps.reservationIds ?? []).filter(estGuid);
  const sejour = corps.sejour;

  if (!ids.length) return NextResponse.json({ erreur: 'reservation absente' }, { status: 400 });
  if (!estGuid(sejour?.categorieId) || !estGuid(sejour?.tarifId)
      || !estDate(sejour?.arrivee) || !estDate(sejour?.depart)) {
    return NextResponse.json({ erreur: 'sejour invalide' }, { status: 400 });
  }
  const adultes = Number(sejour?.adultes);
  if (!Number.isInteger(adultes) || adultes < 1 || adultes > 4) {
    return NextResponse.json({ erreur: 'occupation invalide' }, { status: 400 });
  }

  /* Confirmer d'abord : c'est ce qui décide qu'il y a une vente.
   * Un échec ici est renvoyé au client, contrairement à la note : la chambre
   * n'est PAS acquise, et le laisser croire l'inverse est le pire scénario. */
  try {
    await confirmerReservations(ids);
  } catch (e) {
    console.error(
      'MEWS CONFIRMATION ECHOUEE apres paiement — reservation relachee dans 20 min :',
      ids.join(', '), e instanceof Error ? e.message : e,
    );
    return NextResponse.json({ erreur: 'confirmation impossible' }, { status: 502 });
  }

  /* La note part après coup et sans bloquer : la chambre est vendue, c'est ce
   * qui compte. Un échec se lit dans les journaux et se rattrape au comptoir. */
  try {
    const [dispo, cats] = await Promise.all([
      chercherDisponibilite({ arrivee: sejour.arrivee, depart: sejour.depart, adultes, langue: 'fr' }),
      chargerCategories('fr'),
    ]);
    const nuits = Math.max(
      1, Math.round((Date.parse(sejour.depart) - Date.parse(sejour.arrivee)) / 86_400_000),
    );
    const taxe = TAXE_PAR_ADULTE_NUIT * adultes * nuits;
    const prixMews = dispo.offres
      .find((o) => o.categorieId === sejour.categorieId && o.pourPersonnes === adultes)
      ?.prix.find((p) => p.tarifId === sejour.tarifId)?.total ?? 0;

    const texte = noteDeControle({
      chambre: cats.get(sejour.categorieId)?.nomFr || t(cats.get(sejour.categorieId)?.nom, 'fr'),
      prepaye: estPrepaye(dispo.tarifs.find((r) => r.Id === sejour.tarifId), dispo.groupes),
      total: prixMews + taxe,
      taxe,
      langueClient: langue,
    });
    await Promise.all(ids.map((id) => ajouterNote(id, texte)));
  } catch (e) {
    console.error('Mews note de reception', e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ok: true });
}

/* Le client a fermé l'onglet, ou le paiement a échoué définitivement.
 * On renonce à la demande pour ne pas laisser traîner une invitation à payer
 * une chambre que Mews va relâcher. L'option, elle, s'éteint toute seule. */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('demande');
  if (estGuid(id)) await annulerDemandePaiement(id);
  return NextResponse.json({ ok: true });
}
