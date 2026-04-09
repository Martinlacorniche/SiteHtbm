export default function WifiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── MOBILE : rendu normal ── */}
      <div className="md:hidden">
        {children}
      </div>

      {/* ── DESKTOP : photo en fond très clair + contenu centré ── */}
      <div className="hidden md:block relative min-h-screen">

        {/* Photo plein écran */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/pagewifi.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Overlay très clair pour atténuer la photo */}
        <div className="absolute inset-0" style={{ background: "rgba(253,252,248,0.65)" }} />

        {/* Contenu centré scrollable */}
        <div className="relative z-10 overflow-y-auto min-h-screen">
          {children}
        </div>

      </div>
    </>
  );
}
