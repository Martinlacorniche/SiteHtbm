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
  creerSession, lireSession, majSession, completerSession, finaliserSiPaye,
  ErreurUcp, ErreurPaiement, UCP_VERSION, PROPRIETE,
} from '@/lib/ucp/lodging';
import { soirs, reserverTable, creneauxDe, ErreurRooftop, COUVERTS_MAX } from '@/lib/ucp/rooftop';
import { ficheHotel } from '@/lib/ucp/hotel';
import { appelant, compter, PLAFONDS, TropDAppels } from '@/lib/ucp/debit';
import { reconnaitre } from '@/lib/ucp/acces';
import { arrivee, HEURE_ARRIVEE } from '@/lib/ucp/checkin';
import { lireSejour, noteDuSejour, ouvrirReglement, consignerReglements } from '@/lib/ucp/sejour';

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
      /* ⚠️ ON DÉCRIT, ON NE COMMANDE PAS. La politique des annuaires interdit
         qu'une description d'outil porte « des instructions concernant le
         comportement du modèle ». « À appeler avant de… » en était une, même
         anodine : le fait se dit aussi bien, et il se vérifie. */
      'Enregistre le client qui réserve (`booker`) sur une session ouverte. '
      + 'Le nom du client est nécessaire pour conclure une réservation ; '
      + 'cet outil permet de le fournir après l’ouverture de la session.',
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
      + 'Ne contient ni prix ni disponibilité : ceux-ci viennent de `create_booking_session`.',
    inputSchema: { type: 'object', properties: {} },
  },
  /* ── LE SÉJOUR, UNE FOIS VENDU ───────────────────────────────────────────
   * 🔴 TOUS EXIGENT LA CLÉ DU SÉJOUR, y compris pour LIRE. Vendre est ouvert à
   * tous ; un nom de client et le détail d'une note ne regardent que lui. */
  {
    name: 'get_stay',
    description:
      'Relit un séjour déjà réservé : dates, numéro de réservation, chambre attribuée. '
      + 'Exige la clé du séjour (`stay_key`), celle remise dans la confirmation. '
      + 'Rappel : un séjour réservé par agent est prépayé — il n’est ni annulable, ni modifiable.',
    inputSchema: {
      type: 'object',
      properties: { stay_key: { type: 'string', description: 'La clé remise dans la confirmation.' } },
      required: ['stay_key'],
    },
  },
  {
    name: 'get_check_in',
    description:
      'Le code du portail, le numéro de chambre et le code de la porte — l’hôtel n’a pas de réception 24 h/24 '
      + `et l’arrivée est autonome. Délivrés SEULEMENT le jour de l’arrivée, à partir de ${HEURE_ARRIVEE} h, `
      + 'et une fois la chambre faite. Sinon, dit ce qui manque et à partir de quand revenir.',
    inputSchema: {
      type: 'object',
      properties: { stay_key: { type: 'string' } },
      required: ['stay_key'],
    },
  },
  {
    name: 'get_folio',
    description:
      'La note du séjour : le détail des prestations, ce qui est déjà réglé, et ce qui reste dû.',
    inputSchema: {
      type: 'object',
      properties: { stay_key: { type: 'string' } },
      required: ['stay_key'],
    },
  },
  {
    name: 'pay_folio',
    description:
      'Ouvre un lien de paiement pour solder la note du séjour. Rend une erreur claire s’il n’y a rien à régler. '
      + 'Le règlement est ensuite consigné dans le PMS de l’hôtel.',
    inputSchema: {
      type: 'object',
      properties: { stay_key: { type: 'string' } },
      required: ['stay_key'],
    },
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

/* 🔑 CE QU'UN AGENT DOIT SAVOIR AVANT D'APPELER.
 *
 * Les annuaires de connecteurs — celui d'Anthropic en particulier — exigent que
 * chaque outil porte un `title` lisible et dise s'il LIT ou s'il ÉCRIT. Ce
 * n'est pas une formalité : c'est ce qui permet à un agent de décider seul
 * qu'il peut appeler `get_folio` sans rien demander, et qu'il doit confirmer
 * avant `create_rooftop_reservation`.
 *
 * ⚠️ `destructiveHint` est FAUX partout, et c'est vrai : rien ici ne détruit.
 * Il n'y a ni annulation ni modification — le tarif vendu par agent est
 * prépayé, et une porte absente ne s'ouvre pas par erreur.
 *
 * ⚠️ `openWorldHint` est VRAI partout : chaque appel interroge le PMS de
 * l'hôtel ou son moteur, pas une base figée. Deux appels identiques à une
 * minute d'écart peuvent légitimement différer — une chambre a pu se vendre. */
const ANNOTATIONS: Record<string, {
  title: string; readOnlyHint: boolean; destructiveHint: boolean;
  idempotentHint?: boolean; openWorldHint: boolean;
}> = {
  create_booking_session: {
    title: 'Chercher une chambre et son prix',
    /* Ouvre une session et rend un prix. Rien n'est tenu, rien n'est vendu. */
    readOnlyHint: true, destructiveHint: false, openWorldHint: true,
  },
  get_booking_session: {
    title: 'Relire une recherche en cours',
    readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
  },
  update_booking_session: {
    title: 'Indiquer qui réserve',
    readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true,
  },
  complete_booking_session: {
    title: 'Payer et confirmer la réservation',
    /* ⚠️ Le seul outil qui débite. Idempotent par la clé fournie : un agent
       qui réessaie retrouve SA réservation, il n'en pose pas une seconde. */
    readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true,
  },
  get_property_details: {
    title: 'Décrire l’hôtel',
    readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
  },
  get_stay: {
    title: 'Relire un séjour réservé',
    readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
  },
  get_check_in: {
    title: 'Obtenir les codes d’arrivée',
    readOnlyHint: true, destructiveHint: false, openWorldHint: true,
  },
  get_folio: {
    title: 'Lire la note du séjour',
    readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
  },
  pay_folio: {
    title: 'Ouvrir un lien pour régler la note',
    readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true,
  },
  get_rooftop_availability: {
    title: 'Voir les soirs libres au rooftop',
    readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
  },
  create_rooftop_reservation: {
    title: 'Réserver une table au rooftop',
    /* Tient une table fermement. Sans paiement, mais ce n'est pas anodin. */
    readOnlyHint: false, destructiveHint: false, openWorldHint: true,
  },
};

/** Un contenu d'outil MCP : le texte pour l'humain, la donnée pour la machine. */
const contenu = (donnee: unknown) => ({
  content: [{ type: 'text', text: JSON.stringify(donnee) }],
  structuredContent: donnee,
});

/* 🔴 CE QU'UN ANNUAIRE DE CONNECTEURS ACCEPTE, ET CE QU'IL REFUSE.
 *
 * Anthropic interdit nommément les connecteurs qui « transfèrent de l'argent
 * ou exécutent des transactions financières au nom des utilisateurs » ; chez
 * OpenAI, le commerce est limité aux biens physiques et les services de voyage
 * sont explicitement exclus. Le modèle autorisé est : chercher, montrer,
 * renvoyer.
 *
 * On ne renonce pas pour autant à encaisser : les deux portes servent le MÊME
 * serveur, et seule celle qui est publiée dans les annuaires cache les outils
 * qui débitent. Un agent qui connaît notre profil UCP garde l'accès complet.
 *
 * ⚠️ DEUX PORTES, UN SEUL CODE. Dupliquer la logique aurait produit deux
 * serveurs qui divergent — et le jour où l'un corrige un prix, l'autre le
 * ment. */
const OUTILS_QUI_DEBITENT = new Set(['complete_booking_session', 'pay_folio']);

export async function traiter(req: Request, sansPaiement = false) {
  const corps = await req.json().catch(() => null) as Rpc | null;
  if (!corps || corps.jsonrpc !== '2.0' || !corps.method) {
    return ko(corps?.id, -32600, 'Requête JSON-RPC invalide.');
  }

  try {
    switch (corps.method) {
      case 'initialize': {
        /* 🔴 ON ANNONÇAIT UNE VERSION EN DUR, ET C'EST CE QUI A FAIT ÉCHOUER LA
         * PREMIÈRE SOUMISSION À L'ANNUAIRE. Le client demandait `2025-06-18`,
         * on répondait `2024-11-05` : il voyait « 0 outil, 0 ressource » et
         * abandonnait la connexion.
         *
         * La spécification veut que le serveur réponde avec la version
         * demandée s'il la parle, et propose la sienne sinon. On reflète donc
         * ce que le client demande quand on la connaît — les trois versions
         * publiées se valent pour ce que nous exposons : des outils, rien de
         * plus. */
        const CONNUES = new Set(['2024-11-05', '2025-03-26', '2025-06-18']);
        const demandee = String(
          (corps.params as { protocolVersion?: string } | undefined)?.protocolVersion ?? '',
        );
        return ok(corps.id, {
          protocolVersion: CONNUES.has(demandee) ? demandee : '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'Hôtel-Rooftop Les Voiles', version: UCP_VERSION },
        });
      }

      case 'notifications/initialized':
        /* 202 et pas 204 : c'est ce que la spécification demande pour une
           notification acceptée sans réponse. */
        return new NextResponse(null, { status: 202, headers: CORS });

      case 'tools/list':
        return ok(corps.id, {
          tools: OUTILS
            .filter((o) => !(sansPaiement && OUTILS_QUI_DEBITENT.has(o.name)))
            .map((o) => ({
              ...o,
              ...(ANNOTATIONS[o.name] ? { annotations: ANNOTATIONS[o.name] } : {}),
            })),
        });

      case 'tools/call': {
        const nom = String((corps.params as { name?: string } | undefined)?.name ?? '');
        /* 🔴 RIEN N'ÉTAIT COMPTÉ. Voir `debit.ts` : quatre-vingt-dix requêtes
         * suffisaient à bloquer le rooftop jusqu'en mai. Le plafond global
         * protège la facture et nos jetons d'API ; les plafonds par action,
         * plus bas, protègent l'inventaire — et ce sont eux qui comptent. */
        /* ⚠️ CACHÉ NE SUFFIT PAS : un outil absent de la liste doit aussi être
         * refusé quand on l'appelle directement. Sans ça, la porte « sans
         * paiement » n'en serait pas une. */
        if (sansPaiement && OUTILS_QUI_DEBITENT.has(nom)) {
          return ko(corps.id, -32601,
            'Le paiement ne se fait pas par ce connecteur. '
            + 'Terminez la réservation sur https://hotels-toulon-mer.com/reserver, '
            + 'ou passez par le profil UCP de l’hôtel (/.well-known/ucp).');
        }

        const qui = appelant(req);
        await compter({
          cle: `ucp:${qui}`, ...PLAFONDS.global,
          message: 'Trop d’appels — réessayez dans quelques minutes.',
        });
        const args = ((corps.params as { arguments?: Record<string, unknown> } | undefined)?.arguments ?? {});
        const booking = (args.booking ?? {}) as Record<string, unknown>;

        if (nom === 'get_booking_session') {
          /* 🔑 RELIRE, C'EST AUSSI RATTRAPER. Si un lien de paiement a été
           * envoyé et réglé entre-temps, c'est ici que la vente se conclut —
           * sans attendre que le client revienne sur la page de retour.
           * L'opération ne fait rien quand il n'y a rien à faire. */
          const rattrape = await finaliserSiPaye(String(booking.id ?? '')).catch(() => null);
          if (rattrape) return ok(corps.id, contenu(rattrape));
          const s = await lireSession(String(booking.id ?? ''));
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
          return ok(corps.id, contenu(await majSession(
            String(args.id ?? booking.id ?? ''),
            lireBooker(booking.booker),
          )));
        }

        if (nom === 'complete_booking_session') {
          await compter({
            cle: `vente:${qui}`, ...PLAFONDS.vente,
            message: 'Trop de tentatives de paiement — réessayez plus tard.',
          });
          const paiement = (booking.payment ?? {}) as { instruments?: Record<string, unknown>[] };
          const meta = (args.meta ?? {}) as Record<string, unknown>;
          return ok(corps.id, contenu(await completerSession({
            id: String(args.id ?? booking.id ?? ''),
            instruments: Array.isArray(paiement.instruments) ? paiement.instruments : [],
            cleIdempotence: meta['idempotency-key'] ? String(meta['idempotency-key']) : undefined,
          })));
        }

        if (nom === 'get_property_details') return ok(corps.id, contenu(ficheHotel()));

        /* La clé, d'abord et toujours, pour tout ce qui touche un séjour. */
        if (nom === 'get_stay' || nom === 'get_check_in' || nom === 'get_folio' || nom === 'pay_folio') {
          const ouvert = await reconnaitre(String(args.stay_key ?? ''));
          /* ⚠️ UN REFUS NE SE MOTIVE PAS : inconnue, expirée ou révoquée se
             répondent de la même façon, sinon on renseigne qui tâtonne. */
          if (!ouvert) {
            /* 🔑 ET ON NE COMPTE QUE LES ÉCHECS. Une clé valide s'utilise
             * souvent — c'est normal. Une clé invalide répétée, non : c'est
             * une énumération, et dix essais par dix minutes la rendent
             * absurde face à trente-deux octets d'aléa. */
            await compter({
              cle: `cle:${qui}`, ...PLAFONDS.cleInvalide,
              message: 'Trop de tentatives.',
            });
            return ko(corps.id, -32001, 'Clé de séjour invalide.');
          }

          const sejour = await lireSejour(ouvert.reservationId);
          if (!sejour) return ko(corps.id, -32001, 'Clé de séjour invalide.');

          if (nom === 'get_stay') {
            return ok(corps.id, contenu({
              reservation: sejour.numero, status: sejour.statut,
              check_in_date: sejour.arrivee, check_out_date: sejour.depart,
              room: sejour.chambre,
              property: PROPRIETE.name,
              note: 'Tarif prépayé : ce séjour n’est ni annulable, ni modifiable, ni remboursable.',
            }));
          }

          if (nom === 'get_check_in') {
            const a = await arrivee({
              hotelId: ouvert.hotelId, reservationId: ouvert.reservationId,
              reference: `ucp:${String(args.stay_key)}`,
            });
            return ok(corps.id, contenu(a));
          }

          /* Un règlement payé mais pas encore posé au folio fausserait la note
             qu'on s'apprête à lire : on le consigne avant de répondre. */
          await consignerReglements(String(args.stay_key)).catch(() => 0);
          const note = await noteDuSejour({
            reservationId: ouvert.reservationId, accountId: sejour.accountId,
          });

          if (nom === 'get_folio') {
            return ok(corps.id, contenu({
              reservation: sejour.numero,
              currency: note.devise,
              lines: note.lignes.map((l) => ({ date: l.date, label: l.libelle, amount: Math.round(l.montant * 100) })),
              total: Math.round(note.total * 100),
              paid: Math.round(note.regle * 100),
              balance_due: Math.round(note.solde * 100),
              ...(note.enAttente
                ? { note: 'Un règlement vient d’être encaissé et n’apparaît pas encore au folio. '
                    + 'Ce solde sera à jour dans quelques instants — ne le faites pas régler une seconde fois.' }
                : {}),
            }));
          }

          /* pay_folio */
          const centimes = Math.round(note.solde * 100);
          if (centimes <= 0) {
            return ko(corps.id, -32602, 'Cette note est déjà soldée — il n’y a rien à régler.');
          }
          if (note.enAttente) {
            return ko(corps.id, -32602,
              'Un règlement vient d’être encaissé et n’apparaît pas encore au folio. '
              + 'Attendez quelques instants avant de relire la note — ne payez pas une seconde fois.');
          }
          const r = await ouvrirReglement({
            jeton: String(args.stay_key), hotelId: ouvert.hotelId,
            reservationId: ouvert.reservationId, accountId: sejour.accountId,
            centimes, libelle: `${PROPRIETE.name} — note du séjour ${sejour.numero ?? ''}`.trim(),
          });
          return ok(corps.id, contenu({
            payment_url: r.url, amount: centimes, currency: note.devise, expires_at: r.expire,
          }));
        }

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
          /* 🔴 UNE TABLE TENUE EST UNE TABLE PERDUE POUR UN VRAI CLIENT. Deux
           * par jour et par appelant laisse passer une famille qui réserve
           * deux soirs, et arrête net un balayage du calendrier.
           *
           * ⚠️ ON NE COMPTE QUE LES TABLES RÉELLEMENT PRISES. Compter aussi
           * les refus — un soir fermé, un créneau passé — bloquerait un client
           * qui tâtonne sur les dates après deux essais, ce qui est le
           * comportement normal de quelqu'un qui cherche. Le martèlement sans
           * effet, lui, est déjà arrêté par le plafond global. */
          await compter({
            cle: `rooftop:${qui}`, ...PLAFONDS.rooftop, consommer: false,
            message: 'Deux réservations de table par jour au maximum. '
              + 'Pour un groupe ou plusieurs soirs, appelez l’hôtel au +33 4 94 41 36 23.',
          });
          const t = await reserverTable({
            date: String(args.date ?? ''), heure: args.time ? String(args.time) : undefined,
            couverts: Number(args.party_size ?? 0), nom: String(args.name ?? ''),
            telephone: args.phone ? String(args.phone) : undefined,
            email: args.email ? String(args.email) : undefined,
            message: args.note ? String(args.note) : undefined,
          });
          /* La table est prise : c'est maintenant qu'un droit se consomme. */
          await compter({ cle: `rooftop:${qui}`, ...PLAFONDS.rooftop, message: '' });
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
    if (e instanceof TropDAppels) {
      /* -32029 : hors de la plage réservée par JSON-RPC, et stable côté
         appelant. Un agent doit pouvoir distinguer « trop vite » d'une panne. */
      return ko(corps.id, -32029, e.message);
    }
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

/** Un GET renvoie de quoi se repérer : qui répond ici, et où est le profil.
 *  ⚠️ 405 pour un client qui cherche un flux d'événements — voir `/mcp`. */
export function GET(req: Request) {
  if ((req.headers.get('accept') ?? '').includes('text/event-stream')) {
    return new NextResponse(null, { status: 405, headers: { ...CORS, Allow: 'POST, OPTIONS' } });
  }
  return NextResponse.json({
    service: 'dev.ucp.lodging',
    version: UCP_VERSION,
    property: PROPRIETE.name,
    profil: '/.well-known/ucp',
    note: 'Transport MCP (JSON-RPC 2.0) en POST sur cette adresse.',
  }, { headers: CORS });
}


/** La porte complète : celle qu'annonce le profil UCP. */
export const POST = (req: Request) => traiter(req);
