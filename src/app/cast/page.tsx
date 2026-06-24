'use client';

import { useEffect, useState } from 'react';

// Page "lanceur" pour la connexion Chromecast en chambre.
// Le QR de la TV pointe ici (URL HTTPS propre → le téléphone OUVRE le navigateur au lieu
// de copier le lien). On redirige ensuite le client vers le PORTAIL LOCAL de l'hôtel, pour
// que sa vraie IP locale soit captée (nécessaire au scoping "ne voir que sa chambre").
// Le client doit être sur le WiFi de l'hôtel (sinon le serveur local est injoignable).

const LOCAL_PORTAL = 'http://192.168.0.60:5000/register'; // serveur cast La Corniche (LAN)

export default function CastRedirect() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) return;
    const url = `${LOCAL_PORTAL}?token=${encodeURIComponent(token)}`;
    setTarget(url);
    // redirection automatique
    window.location.href = url;
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: 24,
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#0b1f33',
        color: '#fff',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Connexion à votre Chromecast…</h1>
      <p style={{ opacity: 0.8, maxWidth: 420 }}>
        Connecting to your room TV…
      </p>
      {target ? (
        <a
          href={target}
          style={{
            marginTop: 8,
            background: '#d4af37',
            color: '#0b1f33',
            padding: '12px 22px',
            borderRadius: 10,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Continuer / Continue
        </a>
      ) : (
        <p style={{ opacity: 0.6 }}>Lien invalide (token manquant).</p>
      )}
      <p style={{ opacity: 0.55, fontSize: 13, maxWidth: 420, marginTop: 10 }}>
        Assurez-vous d&apos;être connecté au WiFi de l&apos;hôtel.
        <br />
        Please make sure you are connected to the hotel WiFi.
      </p>
    </main>
  );
}
