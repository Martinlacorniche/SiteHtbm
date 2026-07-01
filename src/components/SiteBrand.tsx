import Link from "next/link";

// Signature discrète (cigale dorée) à poser en haut des pages de contenu autonomes.
// Cliquable → retour accueil. Volontairement petite et sobre.
export default function SiteBrand() {
  return (
    <div className="mb-8 flex justify-center">
      <Link href="/" aria-label="Hôtels Toulon Bord de Mer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/cigale-or-512.png"
          alt="Hôtels Toulon Bord de Mer"
          className="h-9 w-auto opacity-80 transition-opacity hover:opacity-100"
        />
      </Link>
    </div>
  );
}
