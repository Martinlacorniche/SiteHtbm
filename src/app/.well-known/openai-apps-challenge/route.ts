// LA PREUVE QUE CE DOMAINE EST LE NÔTRE — exigée par OpenAI avant de connecter
// le serveur MCP à une app soumise à l'annuaire.
//
// 🔑 LE JETON VIT DANS L'ENVIRONNEMENT, PAS DANS LE CODE. Il est délivré par le
// tableau de bord d'OpenAI au moment où l'on déclare le serveur : le coder en
// dur obligerait à un déploiement entre le clic qui le donne et le clic qui le
// vérifie. Avec une variable, il n'y a qu'à la poser et à revalider.
//
// ⚠️ EN TEXTE BRUT, PAS EN JSON. Leur documentation l'écrit noir sur blanc
// (« as plain text only, not JSON ») : une réponse `application/json` fait
// échouer la vérification, et l'erreur rendue ne dit pas pourquoi.
//
// ⛔ ET PAS DE 200 QUAND LE JETON MANQUE. Rendre une chaîne vide ferait croire
// à une vérification qui ne peut pas aboutir ; un 404 dit la vérité : il n'y a
// rien à vérifier ici tant que la variable n'est pas posée.

export const dynamic = 'force-dynamic';

export function GET() {
  const jeton = (process.env.OPENAI_APPS_CHALLENGE ?? '').trim();
  if (!jeton) return new Response('Aucun jeton de vérification configuré.', { status: 404 });
  return new Response(jeton, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
