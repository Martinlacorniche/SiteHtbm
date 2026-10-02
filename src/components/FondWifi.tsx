// Le fond des deux portails clients (/wifi et /wifiv).
//
// ⛔ LA PHOTO DE MER EST PARTIE. Elle tenait tout le fond en `md+`, sous un
// voile crème à 65 % — un parti pris qui marchait tant que la page n'avait pas
// de décor à elle. Depuis que le ciel dessiné occupe le haut, les deux se
// disputaient le même rôle : une photo floutée derrière un ciel peint, ça ne
// fait pas deux plans, ça fait du bruit. Et le fondu par le bas du ciel, prévu
// pour s'éteindre dans le papier, s'éteignait dans des vagues.
// Martin, 02/10/2026 : « tu peux enlever l'ancienne image de la mer ? ».
//
// ⚠️ LE FICHIER RESTE : `/images/pagewifi.jpg` sert encore à la page d'accueil
// et aux pages de groupe. On retire son usage ici, pas l'image du dépôt.
//
// Ce composant garde sa place — c'est l'endroit où se décide le fond des deux
// portails, et il vaut mieux un endroit vide qu'un endroit disparu : la
// prochaine fois qu'on voudra y poser quelque chose, on saura où.
export default function FondWifi({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-cream">
      {children}
    </div>
  );
}
