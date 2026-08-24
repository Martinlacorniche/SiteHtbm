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
          // Aucune de ces API n'est utilisée par le site ; le paiement, lui,
          // se passe chez Stripe, sur son propre domaine.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
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
