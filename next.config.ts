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
};

export default nextConfig;
