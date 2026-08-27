import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/site';

/* ⚠️ LE SITE EXISTE EN DOUBLE SUR INTERNET, ET GOOGLE PEUT LE VOIR.
 *
 * Mesuré le 27/08/2026 : `https://sitehtbm.netlify.app` sert le site ENTIER,
 * avec un `robots.txt` qui dit `Allow: /` et aucun `X-Robots-Tag`. Google peut
 * donc indexer une copie complète de chaque page sous une seconde adresse.
 * C'est du contenu dupliqué : l'autorité accumulée se partage entre deux
 * domaines au lieu de s'additionner sur un seul, et c'est pour ça que
 * l'adresse `.netlify.app` remonte là où on ne l'attend pas.
 *
 * Deux domaines de l'hôtel aggravent le tout — relevé le même jour :
 *   hotel-voiles.com   → 301 vers sitehtbm.netlify.app
 *   hotel-corniche.com → 301 vers sitehtbm.netlify.app
 * Ces deux-là sont derrière Cloudflare, pas dans ce dépôt : leur redirection se
 * corrige chez Cloudflare, pas ici. Mais tant qu'elles pointent sur le
 * sous-domaine Netlify, ce rebond-ci les rattrape et les renvoie au bon endroit.
 *
 * ⚠️ 301 ET PAS `noindex`. Un `noindex` ferait disparaître la copie sans
 * transmettre ce qu'elle a accumulé ; une redirection permanente le reverse au
 * domaine canonique. Et elle rattrape aussi les humains — les liens en
 * `.netlify.app` qui traînent dans des mails continuent de fonctionner.
 *
 * ⚠️ ON NE TOUCHE PAS AUX APERÇUS DE DÉPLOIEMENT. Netlify sert chaque branche
 * et chaque « deploy preview » sur un sous-domaine `.netlify.app` : les
 * rediriger tous rendrait impossible de relire une modification avant de la
 * mettre en ligne. Seul le nom de production est renvoyé.
 */

const CANONIQUE = new URL(SITE_URL).host;

/** Le seul hôte `.netlify.app` qu'on redirige : celui de production.
 *  Les aperçus (`deploy-preview-42--…`, `main--…`) doivent rester joignables. */
const NETLIFY_PROD = 'sitehtbm.netlify.app';

export function middleware(req: NextRequest) {
  const hote = req.headers.get('host')?.toLowerCase() ?? '';

  if (hote === NETLIFY_PROD) {
    const url = req.nextUrl.clone();
    url.host = CANONIQUE;
    url.protocol = 'https:';
    url.port = '';
    // 308 plutôt que 301 : il préserve la méthode HTTP. Un POST vers l'ancienne
    // adresse resterait un POST au lieu de se transformer en GET — ce qui, sur
    // une route de réservation, ferait disparaître une commande en silence.
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  /* Tout, sauf ce qui n'a rien à gagner à un rebond : les fichiers statiques
     servis par le CDN et l'image d'optimisation de Next. */
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
