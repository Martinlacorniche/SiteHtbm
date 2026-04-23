export default function WifiVLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="md:hidden">
        {children}
      </div>
      <div className="hidden md:block relative min-h-screen">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/pagewifi.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(253,252,248,0.65)" }} />
        <div className="relative z-10 overflow-y-auto min-h-screen">
          {children}
        </div>
      </div>
    </>
  );
}
