// LE TEMPS QU'IL FAIT, DESSINÉ.
//
// 🔑 POURQUOI PAS L'ÉMOJI. Il y en avait un (☀️ 🌧️ ❄️), et il avait deux
// défauts qu'on ne voit qu'en comparant : il n'a pas la couleur de la maison —
// c'est le soleil d'Apple sur un iPhone, celui de Google sur un Android, jamais
// le nôtre — et il ne bouge pas. Or c'est la seule donnée VIVANTE de la page :
// le client la regarde pour savoir s'il sort. De la pluie qui tombe vraiment
// dit en un dixième de seconde ce qu'un pictogramme fait lire.
//
// ⚠️ ON DESSINE CE QU'ON SAIT, PAS PLUS. Les codes viennent d'Open-Meteo (WMO) :
// six familles, pas davantage. Un code inconnu rend le ciel clair plutôt qu'un
// point d'interrogation — on ne fait pas peur avec la météo.
//
// ⛔ Et jamais plus de 2 ko : une page de chambre passe par le wifi de l'hôtel.
//
// 🔁 COPIE DU PRODUIT (`siteconsignes/src/components/public/Meteo.tsx`). Une
// retouche ici doit être reportée là-bas.

/** Les six familles qu'on sait dessiner, à partir d'un code WMO. */
export type Temps = 'soleil' | 'voile' | 'brume' | 'pluie' | 'neige' | 'orage';

export function tempsDe(code: number | null): Temps {
  if (code == null) return 'soleil';
  if (code === 0) return 'soleil';
  if (code < 4) return 'voile';
  if (code < 50) return 'brume';
  if (code < 70) return 'pluie';
  if (code < 80) return 'neige';
  return 'orage';
}

const CSS = `
[data-temps]{ display:inline-block; vertical-align:-3px }
[data-temps] .rayons{ transform-origin:center; animation: meteo-rayons 26s linear infinite }
@keyframes meteo-rayons{ to{ transform:rotate(360deg) } }
/* Le nuage dérive de deux pixels. C'est assez pour qu'il ne soit pas un logo. */
[data-temps] .nue{ animation: meteo-derive 7s ease-in-out infinite alternate }
@keyframes meteo-derive{ from{ transform:translateX(-1.2px) } to{ transform:translateX(1.2px) } }
/* Les gouttes tombent l'une après l'autre : ensemble, c'est un rideau. */
[data-temps] .goutte{ animation: meteo-tombe 1.15s linear infinite }
@keyframes meteo-tombe{
  0%{ opacity:0; transform:translateY(-2px) } 20%{ opacity:1 }
  80%{ opacity:1 } 100%{ opacity:0; transform:translateY(7px) } }
[data-temps] .flocon{ animation: meteo-flotte 3.4s linear infinite }
@keyframes meteo-flotte{
  0%{ opacity:0; transform:translate(0,-2px) } 25%{ opacity:1 }
  75%{ opacity:1 } 100%{ opacity:0; transform:translate(1.5px,7px) } }
/* L'éclair ne clignote pas : il frappe, puis plus rien pendant longtemps.
   Un éclair qui bat la mesure est une alarme, pas un orage. */
[data-temps] .eclair{ animation: meteo-eclair 4.5s steps(1) infinite }
@keyframes meteo-eclair{ 0%,6%{ opacity:1 } 7%,12%{ opacity:.15 } 13%,100%{ opacity:1 } }
/* La mer : une ligne qui ondule, pas une vague de dessin animé. */
[data-mer] path{ animation: mer-ondule 5.5s ease-in-out infinite alternate }
@keyframes mer-ondule{ from{ transform:translateX(0) } to{ transform:translateX(-5px) } }
@media (prefers-reduced-motion: reduce){
  [data-temps] *, [data-mer] *{ animation:none !important }
}
`;

/** Le pictogramme du temps, dans la couleur de la maison. */
export function IconeMeteo({ temps, taille = 15 }: { temps: Temps; taille?: number }) {
  const nuage = (
    <path className="nue" fill="currentColor" opacity={0.85}
      d="M7,17 Q3.4,17 3.4,13.9 Q3.4,11.1 6.3,10.8 Q6.9,7.6 10.2,7.6 Q13.1,7.6 14.2,10
         Q17.6,9.6 19,12 Q21.6,12.6 21.6,15 Q21.6,17 18.8,17 Z" />
  );
  return (
    <svg data-temps={temps} viewBox="0 0 24 24" width={taille} height={taille} aria-hidden>
      <style>{CSS}</style>
      {temps === 'soleil' || temps === 'voile' ? (
        <g className="rayons" style={temps === 'voile' ? { opacity: 0.8, transformOrigin: '12px 12px', translate: '-2px -3px' } : undefined}>
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={11.4} y={1.1} width={1.2} height={3} rx={0.6} fill="var(--accent, #C6A972)"
              transform={`rotate(${i * 45} 12 12)`} />
          ))}
        </g>
      ) : null}
      {temps === 'soleil' || temps === 'voile' ? (
        <circle cx={12} cy={12} r={temps === 'voile' ? 4.2 : 5.2} fill="var(--accent, #C6A972)"
          style={temps === 'voile' ? { translate: '-2px -3px' } : undefined} />
      ) : null}

      {temps !== 'soleil' ? (
        /* ⚠️ LE NUAGE N'A PAS LE MÊME POIDS SELON LE TEMPS QU'IL FAIT. Tous à
           la couleur pleine de la maison, le ciel voilé d'un matin à 26 °C
           ressemblait à un orage. Il s'éclaircit quand il ne pleut pas — c'est
           la densité, pas la forme, qui dit s'il faut prendre une veste. */
        <g style={{ color: temps === 'pluie' || temps === 'orage'
          ? 'var(--brand, #004e7c)'
          : 'color-mix(in srgb, var(--brand, #004e7c) 38%, #ffffff)' }}>
          {nuage}
        </g>
      ) : null}

      {temps === 'pluie' ? [5, 11, 17].map((x, i) => (
        <rect key={x} className="goutte" x={x} y={18} width={1.3} height={3.4} rx={0.65}
          fill="var(--brand, #004e7c)" opacity={0.7} style={{ animationDelay: `${i * 0.33}s` }} />
      )) : null}

      {temps === 'neige' ? [5.5, 11.5, 17.5].map((x, i) => (
        <circle key={x} className="flocon" cx={x} cy={19.4} r={1.15} fill="var(--brand, #004e7c)"
          opacity={0.6} style={{ animationDelay: `${i * 1.05}s` }} />
      )) : null}

      {temps === 'orage' ? (
        <path className="eclair" d="M12.6,17.4 L9,22.4 L11.6,22.4 L10.4,26 L15,20.6 L12.2,20.6 L13.6,17.4 Z"
          fill="var(--accent, #C6A972)" transform="translate(0,-2.2)" />
      ) : null}

      {temps === 'brume' ? [19, 21.4].map((y, i) => (
        <rect key={y} className="nue" x={5} y={y} width={14 - i * 4} height={1.2} rx={0.6}
          fill="var(--encre-douce, #8A97A3)" opacity={0.5}
          style={{ animationDelay: `${i * 1.2}s` }} />
      )) : null}
    </svg>
  );
}

/** La mer : trois crêtes qui glissent. On ne la dessine que si l'hôtel a une
 *  température d'eau — une vague sans chiffre ne dit rien. */
export function IconeMer({ taille = 15 }: { taille?: number }) {
  return (
    <svg data-mer viewBox="0 0 24 14" width={taille} height={(taille * 14) / 24} aria-hidden>
      <style>{CSS}</style>
      <path d="M-6,5 Q-1,2 4,5 T14,5 T24,5 T34,5" fill="none" stroke="var(--brand, #004e7c)"
        strokeWidth={1.5} strokeLinecap="round" opacity={0.75} />
      <path d="M-6,10 Q-1,7 4,10 T14,10 T24,10 T34,10" fill="none" stroke="var(--brand, #004e7c)"
        strokeWidth={1.5} strokeLinecap="round" opacity={0.4}
        style={{ animationDuration: '7.5s' }} />
    </svg>
  );
}
