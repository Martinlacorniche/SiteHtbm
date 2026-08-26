import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Un package.json orphelin traîne dans le dossier parent (framer-motion,
  // lucide-react — vraisemblablement un `npm install` lancé un cran trop haut).
  // Sans cette ligne, Next le prend pour la racine du projet et le signale à
  // chaque démarrage. L'application, elle, vit bien ici.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drdlcohzfjdogyquglcs.supabase.co",
      },
      {
        // Les photos de chambres vivent dans Mews : on les sert depuis leur CDN
        // plutot que d'en copier une version dans le depot.
        protocol: "https",
        hostname: "cdn.mews.com",
      },
    ],
  },
  async headers() {
    // Les médias ne portent pas d'empreinte dans leur nom : un cache d'un an
    // « immutable » figerait une photo remplacée sous le même nom chez tous
    // ceux qui l'ont déjà vue. Une journée en cache, un mois en réutilisation
    // pendant la revalidation : la vidéo de 2,3 Mo n'est plus retéléchargée à
    // chaque visite, et un remplacement se propage en 24 h.
    const medias = "public, max-age=86400, stale-while-revalidate=2592000";

    return [
      {
        source: "/:chemin*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          /* ⚠️ `payment` DOIT être ouvert aux domaines de Mews.
           *
           * Le commentaire d'avant disait « le paiement se passe chez Stripe,
           * sur son propre domaine » — ce n'est plus vrai depuis que le tunnel
           * /reserver encaisse : Mews Payments Checkout s'exécute dans un
           * iframe SUR CETTE PAGE, et il charge Stripe.js pour Google Pay.
           *
           * Une directive absente prend sa valeur par défaut, `self` : l'iframe
           * de Mews se voyait donc refuser l'API de paiement, et le formulaire
           * restait muet — le bouton « Confirmer l'autorisation » ne déclenchait
           * aucune requête, sans la moindre erreur. Diagnostiqué le 26/08/2026
           * au navigateur : zéro POST au clic.
           *
           * `publickey-credentials-get` suit, parce que le 3-D Secure peut
           * passer par une clé d'accès. */
          {
            key: "Permissions-Policy",
            value: [
              "camera=()", "microphone=()", "geolocation=()", "browsing-topics=()",
              'payment=(self "https://app.mews.com" "https://pay.datatrans.com" "https://js.stripe.com")',
              'publickey-credentials-get=(self "https://app.mews.com")',
            ].join(", "),
          },
        ],
      },
      { source: "/media/:chemin*", headers: [{ key: "Cache-Control", value: medias }] },
      { source: "/images/:chemin*", headers: [{ key: "Cache-Control", value: medias }] },
      { source: "/logos/:chemin*", headers: [{ key: "Cache-Control", value: medias }] },
      { source: "/docs/:chemin*", headers: [{ key: "Cache-Control", value: medias }] },
    ];
  },
};

export default nextConfig;
