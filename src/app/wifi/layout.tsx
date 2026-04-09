export default function WifiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── MOBILE : rendu normal ── */}
      <div className="md:hidden">
        {children}
      </div>

      {/* ── DESKTOP : cadre téléphone centré ── */}
      <div
        className="hidden md:flex min-h-screen items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #001a2e 0%, #004e7c 55%, #0a3d5c 100%)",
        }}
      >
        {/* Déco fond */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div style={{ position: "absolute", top: "10%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "rgba(198,169,114,0.06)", filter: "blur(60px)" }} />
          <div style={{ position: "absolute", bottom: "15%", right: "12%", width: 400, height: 400, borderRadius: "50%", background: "rgba(0,120,180,0.08)", filter: "blur(80px)" }} />
        </div>

        <div className="relative flex items-start gap-12">
          {/* Texte à gauche */}
          <div className="text-white max-w-xs pt-8">
            <p style={{ fontFamily: "serif", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(198,169,114,0.8)", marginBottom: 16 }}>
              Best Western Plus
            </p>
            <h2 style={{ fontFamily: "serif", fontSize: 42, fontWeight: 600, lineHeight: 1.1, marginBottom: 20 }}>
              La Corniche
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
              Bienvenue chez vous. Ici vous trouverez les informations principales de l&apos;hôtel.<br /><br />Pour tout le reste, venez nous voir&nbsp;:)
            </p>
            <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                WiFi connecté
              </span>
            </div>
          </div>

          {/* Cadre téléphone */}
          <div
            style={{
              width: 390,
              height: 820,
              borderRadius: 50,
              overflow: "hidden",
              boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 10px #1a2a3a, 0 0 0 11px #0d1c28",
              background: "#FDFCF8",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {/* Encoche */}
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 30, background: "#1a2a3a", borderRadius: "0 0 20px 20px", zIndex: 50 }} />

            {/* Contenu scrollable */}
            <div style={{ height: "100%", overflowY: "auto", scrollbarWidth: "none" }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
