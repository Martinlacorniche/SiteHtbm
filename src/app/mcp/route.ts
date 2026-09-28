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

/** Un GET dit qui répond ici, et où trouver la porte complète. */
export function GET() {
  return Response.json({
    service: 'Hôtel-Rooftop Les Voiles',
    transport: 'mcp',
    note: 'Chercher une chambre, décrire l’hôtel, réserver une table au rooftop. '
      + 'Le paiement se fait sur le site de l’hôtel.',
    booking: 'https://hotels-toulon-mer.com/reserver',
    ucp_profile: 'https://hotels-toulon-mer.com/.well-known/ucp',
  }, { headers: { 'Access-Control-Allow-Origin': '*' } });
}
