// UCP — LE TRANSPORT MCP. C'est ici qu'un agent réserve.
//
// 🔑 LE MÊME PROTOCOLE QUE CELUI QU'ON PARLE DÉJÀ. NWH.os sert un serveur MCP
// depuis des mois pour l'assistant de Martin ; UCP a choisi MCP comme transport
// de sa capacité hôtelière. On ne découvre donc pas un langage : on l'ouvre à
// d'autres interlocuteurs, sur un endpoint qui ne connaît QUE la réservation.
//
// ⚠️ CET ENDPOINT EST PUBLIC ET NE DOIT RIEN SAVOIR D'AUTRE. Le serveur MCP de
// l'outil de gestion lit des chiffres d'affaires, des plannings et des mails :
// il est derrière une authentification et il y reste. Celui-ci ne sait faire
// qu'une chose — proposer une chambre et préparer une réservation — et c'est
// pour ça qu'il peut être ouvert à tous les vents.
//
// ⚠️ ET IL N'ÉCRIT RIEN DANS LE PMS. Tant que la réservation se termine dans
// notre tunnel (`continue_url`), rien n'est posé chez Mews depuis ici : un
// agent ne peut pas bloquer une chambre en boucle. Le jour où l'on complètera
// les réservations ici, ce sera une décision séparée, avec ses garde-fous.

import { NextResponse } from 'next/server';
import {
  creerSession, lireSession, majSession, completerSession,
  ErreurUcp, ErreurPaiement, UCP_VERSION, PROPRIETE,
} from '@/lib/ucp/lodging';
import { soirs, reserverTable, creneauxDe, ErreurRooftop, COUVERTS_MAX } from '@/lib/ucp/rooftop';
import { ficheHotel } from '@/lib/ucp/hotel';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

type Rpc = { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };

const ok = (id: unknown, result: unknown) =>
  NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result }, { headers: CORS });

/* ⚠️ UNE ERREUR SE DIT DANS LE PROTOCOLE, PAS DANS UN CODE HTTP. Un agent qui
 * reçoit un 500 ne sait pas s'il doit réessayer, changer de dates ou renoncer.
 * JSON-RPC a un canal pour ça, et la spécification UCP s'appuie dessus. */
const ko = (id: unknown, code: number, message: string) =>
  NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { headers: CORS });

/** Les outils tels que l'agent les découvre. Les descriptions sont lues par une
 *  machine : elles disent ce que l'outil FAIT, pas ce qu'il est. */
const OUTILS = [
  {
    name: 'create_booking_session',
    description:
      'Ouvre une session de réservation à l’Hôtel-Rooftop Les Voiles (Toulon, Mourillon) '
      + 'pour des dates et une occupation données. Rend la chambre et le tarif réellement '
      + 'disponibles, le prix total en centimes d’euro, et une URL pour finaliser. '
      + 'Seuls les tarifs PRÉPAYÉS se réservent par agent : le séjour est réglé en totalité '
      + 'à la réservation, et n’est pas remboursable. '
      + 'Rend une erreur claire si l’hôtel est complet ou fermé sur la période.',
    inputSchema: {
      type: 'object',
      properties: {
        meta: { type: 'object', description: 'Métadonnées de protocole UCP.' },
        booking: {
          type: 'object',
          properties: {
            property: { type: 'object', properties: { id: { type: 'string' } } },
            booker: {
              type: 'object',
              description: 'Le client qui réserve. Son nom est nécessaire avant de conclure.',
              properties: {
                first_name: { type: 'string' }, last_name: { type: 'string' },
                email: { type: 'string' }, phone_number: { type: 'string' },
              },
            },
            stays: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  accommodation_type: { type: 'object', properties: { id: { type: 'string' } } },
                  rate_plan: { type: 'object', properties: { id: { type: 'string' } } },
                  occupancy: { type: 'object', properties: { adults: { type: 'integer' } } },
                  stay_dates: {
                    type: 'object',
                    properties: { start_date: { type: 'string' }, end_date: { type: 'string' } },
                    required: ['start_date', 'end_date'],
                  },
                },
                required: ['stay_dates'],
              },
            },
          },
          required: ['stays'],
        },
      },
      required: ['booking'],
    },
  },
  {
    name: 'get_booking_session',
    description: 'Relit une session de réservation ouverte, par son identifiant.',
    inputSchema: {
      type: 'object',
      properties: {
        meta: { type: 'object' },
        booking: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      required: ['booking'],
    },
  },
  {
    name: 'update_booking_session',
    description:
      'Complète une session ouverte avec le client qui réserve (`booker`). '
      + 'À appeler avant de conclure si le nom n’a pas été donné à l’ouverture.',
    inputSchema: {
      type: 'object',
      properties: {
        meta: { type: 'object' },
        id: { type: 'string' },
        booking: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            booker: {
              type: 'object',
              properties: {
                first_name: { type: 'string' }, last_name: { type: 'string' },
                email: { type: 'string' }, phone_number: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  {
    name: 'complete_booking_session',
    description:
      'Conclut la réservation : débite le jeton de paiement et pose la chambre dans le PMS de l’hôtel. '
      + 'Le séjour est réglé EN TOTALITÉ et n’est pas remboursable (tarif prépayé). '
      + 'Exige un jeton de paiement partagé Stripe (`spt_…`) accordé au profil publié dans /.well-known/ucp, '
      + 'et le nom du client. '
      + 'Si la banque du client réclame une authentification, rien n’est débité ni réservé : '
      + 'la réservation doit alors être finalisée par le client via `continue_url`.',
    inputSchema: {
      type: 'object',
      properties: {
        meta: {
          type: 'object',
          description: 'Doit porter `idempotency-key` : elle évite un double débit sur reprise.',
        },
        id: { type: 'string', description: 'Identifiant de la session ouverte.' },
        booking: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            payment: {
              type: 'object',
              properties: {
                instruments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' }, handler_id: { type: 'string' },
                      type: { type: 'string' },
                      credential: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          shared_payment_granted_token: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
              required: ['instruments'],
            },
          },
          required: ['payment'],
        },
      },
      required: ['booking'],
    },
  },
  {
    name: 'get_property_details',
    description:
      'Tout ce qu’il faut savoir pour DÉCRIRE l’Hôtel-Rooftop Les Voiles à un client : '
      + 'situation, étoiles, horaires d’arrivée et de départ, équipements compris (et ce qui ne l’est pas), '
      + 'petit-déjeuner, rooftop, catégories de chambres, conditions tarifaires et taxe de séjour. '
      + 'À appeler avant de présenter l’hôtel ; les prix et disponibilités, eux, viennent de '
      + '`create_booking_session`.',
    inputSchema: { type: 'object', properties: {} },
  },
  /* ── LE ROOFTOP ──────────────────────────────────────────────────────────
   * Une table se réserve sans payer, et fermement : il n'y a donc ni session
   * ni escalade ici, contrairement aux chambres. Deux outils suffisent —
   * savoir quels soirs sont ouverts, et prendre la table. */
  {
    name: 'get_rooftop_availability',
    description:
      'Les soirs où une table est libre au Rooftop des Voiles (Toulon), sur une période donnée. '
      + 'Dit pour chaque soir s’il est réservable, et sinon si le rooftop est FERMÉ ou COMPLET — '
      + 'les deux ne se disent pas de la même façon à un client. '
      + `Le rooftop accueille jusqu’à ${COUVERTS_MAX} personnes par table.`,
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Premier soir regardé, AAAA-MM-JJ.' },
        end_date: { type: 'string', description: 'Dernier soir regardé, AAAA-MM-JJ.' },
        party_size: { type: 'integer', description: 'Nombre de couverts. 2 par défaut.' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'create_rooftop_reservation',
    description:
      'Réserve une table au Rooftop des Voiles. La table est tenue IMMÉDIATEMENT et fermement : '
      + 'il n’y a rien à confirmer ensuite, et aucun paiement n’est demandé. '
      + 'Rend une erreur claire si le rooftop est fermé, complet, ou si le service du soir est passé.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Le soir, AAAA-MM-JJ.' },
        time: { type: 'string', description: 'Créneau, par exemple « 19h30 ». Le premier possible si absent.' },
        party_size: { type: 'integer', description: `Nombre de couverts, ${COUVERTS_MAX} au maximum.` },
        name: { type: 'string', description: 'Nom au nom duquel la table est tenue.' },
        phone: { type: 'string' },
        email: { type: 'string' },
        note: { type: 'string', description: 'Allergies, occasion, demande particulière.' },
      },
      required: ['date', 'party_size', 'name'],
    },
  },
] as const;

/** Le client tel qu'UCP le décrit, ramené à ce dont Mews a besoin. */
function lireBooker(v: unknown) {
  const b = (v ?? {}) as Record<string, unknown>;
  const nom = String(b.last_name ?? '').trim();
  if (!nom) return undefined;
  return {
    prenom: String(b.first_name ?? '').trim(),
    nom,
    email: b.email ? String(b.email).trim() : undefined,
    telephone: b.phone_number ? String(b.phone_number).trim() : undefined,
  };
}

/** Un contenu d'outil MCP : le texte pour l'humain, la donnée pour la machine. */
const contenu = (donnee: unknown) => ({
  content: [{ type: 'text', text: JSON.stringify(donnee) }],
  structuredContent: donnee,
});

export async function POST(req: Request) {
  const corps = await req.json().catch(() => null) as Rpc | null;
  if (!corps || corps.jsonrpc !== '2.0' || !corps.method) {
    return ko(corps?.id, -32600, 'Requête JSON-RPC invalide.');
  }

  try {
    switch (corps.method) {
      case 'initialize':
        return ok(corps.id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'Hôtel-Rooftop Les Voiles — UCP Lodging', version: UCP_VERSION },
        });

      case 'notifications/initialized':
        return new NextResponse(null, { status: 204, headers: CORS });

      case 'tools/list':
        return ok(corps.id, { tools: OUTILS });

      case 'tools/call': {
        const nom = String((corps.params as { name?: string } | undefined)?.name ?? '');
        const args = ((corps.params as { arguments?: Record<string, unknown> } | undefined)?.arguments ?? {});
        const booking = (args.booking ?? {}) as Record<string, unknown>;

        if (nom === 'get_booking_session') {
          const s = lireSession(String(booking.id ?? ''));
          /* ⚠️ Une session expirée n'est pas une erreur de l'agent : elle se dit,
             pour qu'il en rouvre une plutôt que d'insister sur un identifiant mort. */
          if (!s) return ko(corps.id, -32004, 'Session inconnue ou expirée — ouvrez-en une nouvelle.');
          return ok(corps.id, contenu(s.booking));
        }

        if (nom === 'create_booking_session') {
          const stays = Array.isArray(booking.stays) ? booking.stays as Record<string, unknown>[] : [];
          const stay = stays[0];
          /* ⚠️ UN SEUL SÉJOUR POUR CE PREMIER JALON, ET ON LE DIT. Le protocole
             prévoit un panier de plusieurs chambres ; notre moteur ne sait en
             tenir qu'une à la fois. Accepter la demande en n'en traitant qu'une
             ferait réserver une chambre à qui en demandait trois. */
          if (stays.length > 1) {
            return ko(corps.id, -32602, 'Une seule chambre par session pour l’instant — ouvrez une session par chambre.');
          }
          if (!stay) return ko(corps.id, -32602, 'Aucun séjour demandé (`booking.stays`).');

          const dates = (stay.stay_dates ?? {}) as { start_date?: string; end_date?: string };
          const occ = (stay.occupancy ?? {}) as { adults?: number };
          const session = await creerSession({
            arrivee: String(dates.start_date ?? ''),
            depart: String(dates.end_date ?? ''),
            adultes: Number(occ.adults ?? 2),
            accommodationTypeId: (stay.accommodation_type as { id?: string } | undefined)?.id,
            ratePlanId: (stay.rate_plan as { id?: string } | undefined)?.id,
            client: lireBooker(booking.booker),
          });
          return ok(corps.id, contenu(session.booking));
        }

        if (nom === 'update_booking_session') {
          return ok(corps.id, contenu(majSession(
            String(args.id ?? booking.id ?? ''),
            lireBooker(booking.booker),
          )));
        }

        if (nom === 'complete_booking_session') {
          const paiement = (booking.payment ?? {}) as { instruments?: Record<string, unknown>[] };
          const meta = (args.meta ?? {}) as Record<string, unknown>;
          return ok(corps.id, contenu(await completerSession({
            id: String(args.id ?? booking.id ?? ''),
            instruments: Array.isArray(paiement.instruments) ? paiement.instruments : [],
            cleIdempotence: meta['idempotency-key'] ? String(meta['idempotency-key']) : undefined,
          })));
        }

        if (nom === 'get_property_details') return ok(corps.id, contenu(ficheHotel()));

        if (nom === 'get_rooftop_availability') {
          const liste = await soirs({
            du: String(args.start_date ?? ''), au: String(args.end_date ?? ''),
            couverts: Number(args.party_size ?? 2),
          });
          return ok(corps.id, contenu({
            property: PROPRIETE.name,
            max_party_size: COUVERTS_MAX,
            nights: liste.map((s) => ({
              date: s.date,
              available: s.reservable,
              ...(s.motif ? { reason: s.motif === 'ferme' ? 'closed' : 'full' } : {}),
              ...(s.reservable ? { times: creneauxDe(s.date) } : {}),
            })),
          }));
        }

        if (nom === 'create_rooftop_reservation') {
          const t = await reserverTable({
            date: String(args.date ?? ''), heure: args.time ? String(args.time) : undefined,
            couverts: Number(args.party_size ?? 0), nom: String(args.name ?? ''),
            telephone: args.phone ? String(args.phone) : undefined,
            email: args.email ? String(args.email) : undefined,
            message: args.note ? String(args.note) : undefined,
          });
          return ok(corps.id, contenu({
            status: 'confirmed',
            id: t.id, date: t.date, time: t.heure, party_size: t.couverts, table: t.table,
            property: PROPRIETE.name,
            note: 'Table tenue. Aucun paiement n’est demandé ; le règlement se fait sur place.',
          }));
        }

        return ko(corps.id, -32601, `Outil inconnu : ${nom}`);
      }

      default:
        return ko(corps.id, -32601, `Méthode inconnue : ${corps.method}`);
    }
  } catch (e) {
    if (e instanceof ErreurPaiement) {
      /* ⚠️ UN REFUS N'EST PAS UNE PANNE. L'agent doit pouvoir dire au client
         « votre banque a refusé » ou « votre banque demande une confirmation »,
         et non « le site de l'hôtel est cassé ». */
      return ko(corps.id, e.code === 'requires_action' ? -32005 : -32004, e.message);
    }
    if (e instanceof ErreurRooftop) {
      return ko(corps.id, e.code === 'unavailable' ? -32003 : -32602, e.message);
    }
    if (e instanceof ErreurUcp) {
      /* `unavailable` n'est pas une panne : complet ou fermé se disent, et
         l'agent doit pouvoir le rapporter au client tel quel. */
      return ko(corps.id, e.code === 'unavailable' ? -32003 : -32602, e.message);
    }
    console.error('[ucp] ', e instanceof Error ? e.message : e);
    return ko(corps.id, -32603, 'Le moteur de réservation n’a pas répondu.');
  }
}

/** Un GET renvoie de quoi se repérer : qui répond ici, et où est le profil. */
export function GET() {
  return NextResponse.json({
    service: 'dev.ucp.lodging',
    version: UCP_VERSION,
    property: PROPRIETE.name,
    profil: '/.well-known/ucp',
    note: 'Transport MCP (JSON-RPC 2.0) en POST sur cette adresse.',
  }, { headers: CORS });
}
