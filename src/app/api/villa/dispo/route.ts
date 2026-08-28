import { NextRequest, NextResponse } from 'next/server';
import { chambresLibres } from '@/lib/mewsBooking';
import {
  CAPACITE, NUITS_MIN, devis, nuitsEntre, type Verdict,
} from '@/lib/villa';

/* Le verdict de disponibilité de la privatisation.
 *
 *   GET /api/villa/dispo?arrivee=2026-11-10&depart=2026-11-13
 *
 * ⚠️ UN APPEL PAR DEMANDE, JAMAIS UN BALAYAGE DE CALENDRIER.
 * La Booking Engine API de Mews est, sa propre documentation le dit,
 * « unsuitable for continuous polling by a single server ». Peindre un
 * calendrier de six mois en vert et gris coûterait cent quatre-vingts appels
 * pour une seule page vue. Le client pose SES dates, on répond sur celles-là.
 *
 * ⚠️ Et cet appel ne saurait pas peindre ce calendrier de toute façon :
 * `hotels/getAvailability` rend ce qui est réservable sur TOUTE la période,
 * c'est-à-dire le minimum des nuits — pas le détail nuit par nuit. Exactement
 * ce qu'il faut pour un verdict, et inutilisable pour une carte.
 */

export const dynamic = 'force-dynamic';

const estDate = (s: string | null): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// Un séjour privatisé se compte en nuits, pas en saisons. Au-delà c'est un
// bail, ça ne se traite pas depuis une page web.
const NUITS_MAX = 60;

function ferme(motif: Verdict['motif'], nuits = 0): NextResponse {
  return NextResponse.json({
    libre: false, libres: 0, capacite: CAPACITE, nuits, motif, devis: null,
  } satisfies Verdict);
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const arrivee = p.get('arrivee'), depart = p.get('depart');

  if (!estDate(arrivee) || !estDate(depart) || depart <= arrivee) return ferme('dates-invalides');
  const nuits = nuitsEntre(arrivee, depart);
  if (nuits < 1 || nuits > NUITS_MAX) return ferme('dates-invalides', nuits);
  // Deux nuits minimum : une seule ne paie ni la mise en place ni le ménage de
  // fin de séjour. On le dit à part de « c'est pris » — le client n'a qu'une
  // nuit à ajouter, pas une semaine à décaler.
  if (nuits < NUITS_MIN) return ferme('trop-court', nuits);

  /* ⚠️ PLUS DE FILTRE DE SAISON ICI (Martin, 28/08/2026). Cette route refusait
     tout l'été. Puisque la disponibilité est lue dans Mews, un été plein se
     ferme de lui-même — et une semaine creuse de juin reste vendable à un
     groupe, ce que le filtre interdisait. */

  try {
    const libres = await chambresLibres({ arrivee, depart });
    /* ⚠️ LE SEUIL EST LE MÊME POUR LES DEUX FORMULES. Privatiser, c'est être
       seul dans les murs : que le groupe ouvre huit chambres ou seize, on ne
       vend rien à côté de lui. Une seule chambre prise ferme la date. */
    const libre = libres >= CAPACITE;

    return NextResponse.json({
      libre, libres, capacite: CAPACITE, nuits,
      motif: libre ? 'libre' : 'chambres-prises',
      // Le devis part sur la villa entière ; l'écran laisse basculer sur la
      // demi, qui est un choix de prix et non de disponibilité.
      devis: libre ? devis('complete', nuits) : null,
    } satisfies Verdict);
  } catch {
    /* Mews injoignable. On ne dit surtout pas « c'est libre » : une
       privatisation annoncée disponible puis refusée est pire qu'un
       « appelez-nous ». L'écran bascule sur le téléphone. */
    return NextResponse.json({ erreur: 'indisponible' }, { status: 503 });
  }
}
