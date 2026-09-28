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
import { UCP_VERSION } from '@/lib/ucp/lodging';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    ucp: {
      version: UCP_VERSION,
      services: {
        'dev.ucp.lodging': [
          {
            version: UCP_VERSION,
            spec: `https://ucp.dev/${UCP_VERSION}/specification/overview`,
            transport: 'mcp',
            schema: `https://ucp.dev/${UCP_VERSION}/services/lodging/mcp.openrpc.json`,
            endpoint: `${SITE_URL}/ucp/mcp`,
          },
        ],
      },
      capabilities: {
        'dev.ucp.lodging.booking': [
          {
            version: UCP_VERSION,
            spec: `https://ucp.dev/${UCP_VERSION}/specification/lodging/booking`,
            schema: `https://ucp.dev/${UCP_VERSION}/schemas/lodging/booking.json`,
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
