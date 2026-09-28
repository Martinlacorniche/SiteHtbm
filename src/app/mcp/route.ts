// LA PORTE PUBLIQUE — celle qu'on publie dans les annuaires.
//
// 🔑 POURQUOI UNE SECONDE ADRESSE. Les annuaires de connecteurs interdisent
// d'encaisser : Anthropic exclut nommément les serveurs qui « exécutent des
// transactions financières au nom des utilisateurs », et OpenAI limite le
// commerce aux biens physiques en excluant les services de voyage. Publier
// `/ucp/mcp` tel quel, c'est se faire refuser.
//
// Celle-ci sert le MÊME code, sans les deux outils qui débitent. Un agent y
// trouve tout ce qu'il faut pour décrire l'hôtel, chercher une chambre, obtenir
// un vrai prix et réserver une table au rooftop — et pour la chambre, il
// renvoie sur notre tunnel.
//
// ⚠️ ET C'EST LA MÊME LOGIQUE, PAS UNE COPIE. Deux serveurs jumeaux auraient
// fini par diverger, et le jour où l'un corrige un prix, l'autre le ment.

import { traiter } from '@/app/ucp/mcp/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export const POST = (req: Request) => traiter(req, true);

/**
 * 🔴 UN CLIENT « STREAMABLE HTTP » FAIT UN GET POUR OUVRIR UN FLUX, et il faut
 * lui répondre 405 quand on n'en sert pas. On rendait 200 avec du JSON
 * descriptif : le client attendait un flux d'événements qui n'arrivait jamais.
 *
 * Un humain qui ouvre l'adresse dans son navigateur, lui, mérite de savoir où
 * il est tombé — on ne lui rend le descriptif que s'il ne demande pas de flux.
 */
export function GET(req: Request) {
  if ((req.headers.get('accept') ?? '').includes('text/event-stream')) {
    return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS' } });
  }
  return Response.json({
    service: 'Hôtel-Rooftop Les Voiles',
    transport: 'mcp',
    note: 'Chercher une chambre, décrire l’hôtel, réserver une table au rooftop. '
      + 'Le paiement se fait sur le site de l’hôtel.',
    booking: 'https://hotels-toulon-mer.com/reserver',
    ucp_profile: 'https://hotels-toulon-mer.com/.well-known/ucp',
  }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}
