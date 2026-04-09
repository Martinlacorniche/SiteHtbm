export default function WifiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── MOBILE : rendu normal ── */}
      <div className="md:hidden">
        {children}
      </div>

      {/* ── DESKTOP : photo plein écran + contenu à droite ── */}
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

        {/* Overlay sombre */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)" }} />

        {/* Panneau droit — contenu scrollable */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1/2 overflow-y-auto"
          style={{ background: "#FDFCF8" }}
        >
          {children}
        </div>

      </div>
    </>
  );
}
