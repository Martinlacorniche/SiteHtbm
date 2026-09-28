// LE PROFIL UCP — la porte par laquelle un agent découvre qu'on sait lui parler.
//
// 🔑 SANS CE FICHIER, RIEN N'EXISTE. Le Universal Commerce Protocol commence par
// une découverte : un agent lit `/.well-known/ucp`, y trouve les services, les
// capacités et l'adresse où appeler. Un endpoint MCP sans profil est un numéro
// de téléphone que personne n'a.
//
// ⚠️ ON N'ANNONCE QUE CE QU'ON SERT VRAIMENT. Déclarer une capacité qu'on ne
// sait pas tenir est pire que se taire : l'agent appelle, échoue, et l'hôtel
// passe pour cassé dans un classement qu'on ne verra jamais. Ici, une seule
// capacité — `dev.ucp.lodging.booking` — et aucun `payment_handlers`, parce que
// nous ne savons pas encore encaisser depuis un agent. C'est exactement ce que
// la spécification prévoit : la réservation se termine par un `continue_url`
// vers notre tunnel.

import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/site';
import { UCP_CANAL, UCP_VERSION } from '@/lib/ucp/lodging';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    ucp: {
      version: UCP_VERSION,
      services: {
        'dev.ucp.lodging': [
          {
            version: UCP_VERSION,
            spec: `https://ucp.dev/${UCP_CANAL}/specification/overview`,
            transport: 'mcp',
            schema: `https://ucp.dev/${UCP_CANAL}/services/lodging/mcp.openrpc.json`,
            endpoint: `${SITE_URL}/ucp/mcp`,
          },
        ],
        /* ⚠️ LE ROOFTOP N'EST PAS DU « LODGING », ET ON NE FAIT PAS SEMBLANT.
         * UCP n'a pas encore de verticale restauration — elle est annoncée,
         * pas publiée. Ranger une table sous `dev.ucp.lodging` ferait qu'un
         * agent strict la lirait comme une chambre. On la déclare donc pour ce
         * qu'elle est : un service à nous, sur le même transport MCP, dont les
         * outils se découvrent par `tools/list`. Le jour où la verticale
         * existe, ce bloc devient standard et l'endpoint ne bouge pas. */
        'htbm.rooftop': [
          {
            version: UCP_VERSION,
            transport: 'mcp',
            endpoint: `${SITE_URL}/ucp/mcp`,
            tools: ['get_rooftop_availability', 'create_rooftop_reservation'],
            note: 'Réservation de table au Rooftop des Voiles. Table tenue fermement, sans paiement.',
          },
        ],
      },
      capabilities: {
        'dev.ucp.lodging.booking': [
          {
            version: UCP_VERSION,
            spec: `https://ucp.dev/${UCP_CANAL}/specification/lodging/booking`,
            schema: `https://ucp.dev/${UCP_CANAL}/schemas/lodging/booking.json`,
          },
        ],
      },
      /* Vide, et volontairement : aucun instrument de paiement ne se collecte
         chez nous depuis un agent. Voir le commentaire d'en-tête. */
      payment_handlers: {},
    },
  }, {
    headers: {
      /* Une minute de cache : le profil ne bouge presque jamais, mais il doit
         pouvoir changer le jour où l'on branche un handler de paiement. */
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
