// Décor commun aux deux portails clients (/wifi et /wifiv).
//
// La photo n'apparaît qu'à partir de `md`, mais la page, elle, n'est montée
// qu'une seule fois : la version précédente rendait {children} deux fois — une
// branche `md:hidden`, une branche `hidden md:block` — si bien que chaque page
// interrogeait Supabase et l'API météo en double et dupliquait tout son DOM
// (ids, effets, images) dans chaque document.
export default function FondWifi({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Fond fixe : il ne défile pas avec le contenu, comme avant. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 hidden md:block">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/pagewifi.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Voile clair pour atténuer la photo sous le contenu. */}
        <div className="absolute inset-0" style={{ background: "rgba(253,252,248,0.65)" }} />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
