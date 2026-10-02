'use client';

// LES MARGES D'UN GRAND ÉCRAN — la maison d'un côté, une valise de l'autre.
//
// 🔑 LE PROBLÈME N'ÉTAIT PAS « IL MANQUE UNE DÉCORATION ». Sur un téléphone, le
// portail remplit l'écran. Sur un 1500, la colonne fait 1024 px et il reste deux
// bandes vides de 230 px : la page ne paraît pas sobre, elle paraît inachevée.
//
// ⚠️ UNE SEULE MARGE REMPLIE EST PIRE QUE DEUX VIDES. La maison à gauche et rien
// à droite, ça ne lit pas comme une composition, ça lit comme un oubli. Les deux
// marges se répondent, sur la MÊME ligne de sol.
//
// ⛔ ET IL N'Y A PLUS DE PERSONNAGE. La marge de droite a porté un concierge,
// puis un voyageur, puis la journée entière d'un client en huit scènes — le
// café, la plage, le dîner, la douche, le sommeil. C'était juste, et c'était
// trop : huit dessins qui tournent dans la marge d'une page dont le travail est
// qu'on trouve l'heure du petit-déjeuner en dix secondes. Martin, 02/10/2026 :
// « enlève les scènes, mets juste une jolie valise ». Une valise ne raconte pas
// une journée — elle dit « quelqu'un séjourne ici », ce qui est exactement le
// sujet, et elle le dit en une image qui ne bouge pas.
//
// ⛔ ET C'EST ELLE QU'ON CLIQUE. Le jeu (`Jeu.tsx`) s'ouvre de là. Elle ne se
// cache pas et ne s'impose pas : elle attend.
//
// 🔁 COPIE DU PRODUIT (`siteconsignes/src/components/public/Maison.tsx`). Une
// retouche ici doit être reportée là-bas, et inversement.
//
// ⛔ ÇA N'EXISTE QU'À PARTIR DE 1280 px. Il n'y a pas de marge sur un téléphone,
// et c'est là que presque tous les clients lisent cette page.

import type { Moment } from './Ciel';

/* LE CŒUR, SUR UNE FAÇADE DE 5 × 5 FENÊTRES.
 *
 * 🔑 Idée de Martin : « les lumières qui s'allument, elles peuvent former un
 * cœur ? ». Elles le peuvent, mais pas sur douze fenêtres — il en faut
 * vingt-cinq pour que la forme se lise. L'ordre d'allumage SUIT LE DESSIN :
 * on voit le cœur se tracer, pas des fenêtres s'allumer au hasard.
 *
 *   . X . X .
 *   X X X X X
 *   X X X X X
 *   . X X X .
 *   . . X . .
 */
const COEUR = [1, 3, 5, 9, 6, 8, 7, 10, 14, 11, 13, 12, 16, 18, 17, 22];

const CSS = `
[data-decor]{ display:none }
/* ⛔ 1280 px, PAS 1024 : en dessous la marge est trop étroite et le dessin
   viendrait toucher les vignettes. */
@media (min-width: 1280px){
  [data-decor]{
    /* 🔴 z-5 METTAIT LE DÉCOR SOUS UN CALQUE QUI PREND TOUTE LA LARGEUR. Le
       contenu du portail vit dans un conteneur relative z-10 qui s'étend d'un
       bord à l'autre de la fenêtre — même si ce qu'il DESSINE tient dans une
       colonne au milieu, il INTERCEPTE les clics jusque dans les marges. La
       valise était parfaitement visible et parfaitement inerte. */
    display:flex; align-items:center; justify-content:center;
    position:fixed; top:0; height:100vh; z-index:20;
    width: calc((100% - 1024px) / 2 - 10px);
  }
  [data-decor="gauche"]{ left:0 }
  [data-decor="droite"]{ right:0 }
}
/* ⚠️ MÊME HAUTEUR RENDUE DES DEUX CÔTÉS, SINON LE SOL N'EST PLUS LE MÊME. Les
   deux dessins partagent une ligne de sol ; rendus à des tailles différentes,
   elle tombe à deux hauteurs à l'écran et les deux moitiés ne forment plus une
   scène, mais deux vignettes posées de travers. */
[data-decor] svg{ height:206px; width:auto; max-width:100% }

/* 🔑 ILS DOIVENT ÊTRE LOIN, PAS COLLÉS DESSUS. Nets et pleinement opaques sur
   une photo de mer, les deux dessins se lisaient comme deux autocollants posés
   après coup — Martin : « semble trop être un rajout ». Ce qui est loin est
   plus pâle et moins net : un rien de flou et d'opacité suffit à les faire
   passer DERRIÈRE la page au lieu de dessus. C'est de la profondeur, pas de la
   décoration.
   ⚠️ ET ILS SE FONDENT PAR LE BAS. Une ligne de sol nette, c'est un dessin qui
   s'arrête ; un dégradé qui s'éteint, c'est un décor qui continue hors champ. */
[data-decor]{ opacity:.52; filter: blur(.6px) }
[data-decor] svg{
  -webkit-mask-image: linear-gradient(to bottom, #000 62%, transparent 99%);
  mask-image: linear-gradient(to bottom, #000 62%, transparent 99%);
}
/* La valise, elle, se rapproche quand la main vient : c'est le seul élément du
   décor qui se clique, et c'est ainsi qu'il le dit. */
[data-decor="droite"]:hover{ opacity:.92; filter:none }

/* ── LA MAISON ──────────────────────────────────────────────────────────── */
/* Le fanion bat, il ne tourne pas. Et il bat moins fort la nuit : le vent tombe. */
[data-decor] .fanion{ transform-origin:left center; animation: fanion-bat 3.1s ease-in-out infinite }
[data-decor="gauche"][data-moment="nuit"] .fanion{ animation-duration: 6.4s }
[data-decor="gauche"][data-moment="jour"] .fanion{ animation-duration: 2.3s }
@keyframes fanion-bat{ 0%,100%{ transform:scaleY(1) skewY(0deg) } 50%{ transform:scaleY(.84) skewY(-6deg) } }

/* Les stores descendent l'un après l'autre, dans l'ordre du dessin. Même
   principe que la lumière : on voit le cœur se tracer. */
[data-decor] .store{ transform-origin: center top; animation: store-descend 620ms cubic-bezier(.23,1,.32,1) both }
@keyframes store-descend{ from{ opacity:0; transform:scaleY(.08) } to{ opacity:1; transform:none } }

/* Les fenêtres s'allument l'une après l'autre et RESTENT allumées : un hôtel
   qui clignote est un hôtel en panne. */
[data-decor] .lumiere{ opacity:0; animation: fenetre-allume 900ms ease-out forwards }
@keyframes fenetre-allume{ to{ opacity:1 } }
/* La nuit, une seule fenêtre s'éteint de temps en temps — quelqu'un se couche. */
[data-decor="gauche"][data-moment="nuit"] .lumiere.dort{ animation: fenetre-allume 900ms ease-out forwards, dodo 23s ease-in-out infinite 6s }
@keyframes dodo{ 0%,62%{ opacity:1 } 70%,96%{ opacity:.08 } 100%{ opacity:1 } }

/* ── LA VALISE ──────────────────────────────────────────────────────────── */
/* L'étiquette se balance à peine : c'est le seul mouvement de ce côté-ci, et
   c'est lui qui dit que le dessin est vivant sans rien raconter. */
[data-decor] .etiquette{ transform-box:fill-box; transform-origin: top center;
  animation: etiquette-balance 5.4s ease-in-out infinite alternate }
@keyframes etiquette-balance{ from{ transform:rotate(-5deg) } to{ transform:rotate(5deg) } }

/* Elle se soulève à l'approche, et c'est tout ce qui la signale. Un halo ou un
   « jouez ! » transformerait un décor en publicité. */
[data-decor] .valise{ pointer-events:auto; cursor:pointer;
  transition: transform 280ms cubic-bezier(.23,1,.32,1) }
[data-decor] .valise:hover{ transform: translateY(-5px) }

/* Pendant la partie — et sous tout voile : annonce du jour, vignette dépliée —
   le décor s'efface. On ne joue pas devant soi-même, et on ne lit pas un
   message par-dessus un dessin.
   ⚠️ C'est aussi la seule réponse correcte à un z-index qui ne peut pas gagner :
   la fenêtre d'annonce vit DANS le conteneur du contenu, donc son empilement ne
   sort jamais de celui-ci. Voir globals.css. */
[data-decor]{ transition: opacity 320ms ease }
[data-joue="oui"] [data-decor], [data-voile="oui"] [data-decor]{ opacity:0; pointer-events:none }

@media (prefers-reduced-motion: reduce){
  [data-decor] *{ animation:none !important }
  [data-decor] .lumiere, [data-decor] .store{ opacity:1 }
}
`;

/** LES DEUX MARGES, D'UN SEUL TENANT.
 *
 *  ⛔ ET UNE SEULE FEUILLE DE STYLE. Les deux dessins rendaient chacun le même
 *  `<style>` : React a refusé l'hydratation (« the server rendered text didn't
 *  match the client »), parce qu'il déduplique les balises de style et que le
 *  second n'existait plus au moment de reprendre la page. */
export function Decor({ moment, etoiles, onValise }: {
  moment: Moment; etoiles: number | null;
  /** Ce qui arrive quand on clique la valise. */
  onValise?: () => void;
}) {
  return (
    <>
      <style>{CSS}</style>
      <Maison moment={moment} etoiles={etoiles} />
      <Valise moment={moment} onValise={onValise} />
    </>
  );
}

/** La maison, dans la marge de gauche. */
function Maison({ moment, etoiles }: { moment: Moment; etoiles: number | null }) {
  const soir = moment === 'nuit' || moment === 'crepuscule';
  const nuit = moment === 'nuit';
  /* ⚠️ LE MATIN AUSSI, LA LUMIÈRE EST ALLUMÉE — remarque de Martin. À six
   * heures il fait encore nuit dehors : une façade éteinte à l'aube est une
   * façade qui ment. Seul le plein jour baisse les stores. */
  const eclaire = moment !== 'jour';

  /* ⚠️ LA SILHOUETTE EST LA CLÉ DE LISIBILITÉ. De jour, le mur porte la couleur
   * de la maison sur un ciel clair. De nuit, il faut l'INVERSE : plus sombre
   * que le ciel, sans quoi il s'y dissout — vérifié à l'écran, le bâtiment
   * avait purement et simplement disparu. */
  const mur = nuit
    ? 'color-mix(in srgb, var(--brand, #004e7c) 42%, #060D16)'
    : soir ? 'color-mix(in srgb, var(--brand, #004e7c) 78%, #10243A)'
    : 'var(--brand, #004e7c)';

  return (
    <div aria-hidden data-decor="gauche" data-moment={moment} className="pointer-events-none">
      <svg viewBox="0 0 130 152">
        <rect x="22" y="40" width="86" height="104" rx="4" fill={mur} />
        <rect x="16" y="31" width="98" height="10" rx="3" fill={mur} />

        <rect x="63" y="6" width="2" height="26" rx="1" fill={mur} />
        <path className="fanion" d="M65,8 L88,14 L65,20 Z" fill="var(--accent, #C6A972)" />

        {/* Ses étoiles, les vraies, posées sous le toit. */}
        {etoiles ? Array.from({ length: Math.min(etoiles, 5) }).map((_, k) => (
          <circle key={k} cx={65 + (k - (Math.min(etoiles, 5) - 1) / 2) * 8} cy={48} r={1.9}
            fill="var(--accent, #C6A972)" />
        )) : null}

        {/* 5 × 5 fenêtres : il en faut vingt-cinq pour qu'un cœur se lise.
            🔑 ET LE CŒUR EXISTE À TOUTE HEURE, pas seulement la nuit — question
            de Martin : « comment on peut avoir ce cœur en journée ? on baisse
            des stores ? ». Oui, exactement : en plein jour il se dessine en
            STORES BAISSÉS, le seul moyen qu'a une façade de se marquer quand
            il fait grand soleil. Le reste du temps, il s'allume. */}
        {Array.from({ length: 25 }).map((_, k) => {
          const x = 29.5 + (k % 5) * 15, y = 52 + Math.floor(k / 5) * 14;
          const rang = COEUR.indexOf(k);
          const dansLeCoeur = rang >= 0;
          return (
            <g key={k}>
              <rect x={x} y={y} width={11} height={9} rx={1.6} fill="#ffffff" opacity={eclaire ? 0.07 : 0.2} />
              {dansLeCoeur && eclaire ? (
                <rect className={`lumiere${rang === 22 || rang === 3 ? ' dort' : ''}`}
                  x={x} y={y} width={11} height={9} rx={1.6} fill="var(--accent, #C6A972)"
                  style={{ animationDelay: `${700 + rang * 230}ms`,
                           filter: 'drop-shadow(0 0 4px color-mix(in srgb, var(--accent, #C6A972) 75%, transparent))' }} />
              ) : null}
              {dansLeCoeur && !eclaire ? (
                /* Le store : un panneau plein et ses lames. Deux traits
                   suffisent — en dessous de cette taille, trois font du bruit. */
                <g className="store" style={{ animationDelay: `${500 + rang * 190}ms` }}>
                  <rect x={x} y={y} width={11} height={9} rx={1.6} fill="var(--accent, #C6A972)" opacity="0.92" />
                  <rect x={x + 1} y={y + 3} width={9} height={0.9} rx={0.45} fill={mur} opacity="0.45" />
                  <rect x={x + 1} y={y + 5.6} width={9} height={0.9} rx={0.45} fill={mur} opacity="0.45" />
                </g>
              ) : null}
            </g>
          );
        })}

        {/* ⚠️ LA PORTE MANGEAIT LA POINTE DU CŒUR. Son auvent, plus large que
            la dernière fenêtre et posé juste dessous, se lisait comme la suite
            du dessin : le cœur n'avait plus de pointe. Il faut de l'air entre
            les deux, et un auvent plus étroit que ce qu'il y a au-dessus. */}
        <rect x="58" y="130" width="14" height="14" rx="2.5" fill="var(--accent, #C6A972)" opacity={eclaire ? 0.95 : 0.85} />
        <path d="M54,127 L76,127 L73,131 L57,131 Z" fill="var(--accent, #C6A972)" opacity="0.45" />
      </svg>
    </div>
  );
}


/** LA VALISE, DANS LA MARGE DE DROITE.
 *
 * ⚠️ UNE VALISE N'EST PAS UN RECTANGLE ARRONDI. Ce qui la fait reconnaître, ce
 * sont ses accessoires : la poignée, les deux sangles, les fermoirs, les coins
 * renforcés, l'étiquette qui pend. Enlevez-les, il reste un bagage de
 * pictogramme ; gardez-les, et c'est une malle qui a voyagé.
 *
 * ⚠️ ET ELLE SE CLIQUE, DONC ELLE DOIT SE VISER. Une cible invisible plus large
 * que le dessin : à cette échelle, pointer vingt pixels à la souris est une
 * épreuve, pas une invitation. */
function Valise({ moment, onValise }: { moment: Moment; onValise?: () => void }) {
  const nuit = moment === 'nuit';
  const cuir = nuit
    ? 'color-mix(in srgb, var(--accent, #C6A972) 70%, #0B1420)'
    : 'var(--accent, #C6A972)';
  const ferrure = nuit
    ? 'color-mix(in srgb, var(--brand, #004e7c) 38%, #060D16)'
    : 'var(--brand, #004e7c)';

  return (
    <div aria-hidden data-decor="droite" data-moment={moment} className="pointer-events-none">
      <svg viewBox="0 0 130 152">
        {/* ⚠️ PLUS GRANDE QU'AVANT. La maison occupe 91 % de la hauteur du
            dessin, la valise 51 % : à marges égales, la gauche pesait deux fois
            la droite et la page penchait. Elle monte à 70 % — hors d'échelle,
            évidemment, mais ces deux marges se répondent, elles ne se mesurent
            pas. */}
        {/* Son ombre : sans elle, elle flotte au-dessus du sol. */}
        <ellipse cx="65" cy="144" rx="42" ry="3.4" fill={ferrure} opacity="0.1" />

        <g className="valise" onClick={onValise} role="button" tabIndex={-1}>
          {/* La poignée, puis le corps : la poignée passe DERRIÈRE, c'est ce qui
              la fait tenir au bagage plutôt que flotter dessus. */}
          <path d="M55,72 L55,56 q0,-6 6,-6 l8,0 q6,0 6,6 l0,16" fill="none" stroke={ferrure}
            strokeWidth="4.5" strokeLinecap="round" opacity="0.9" />
          <rect x="26" y="70" width="78" height="72" rx="8" fill={cuir} />
          {/* Le couvercle : une ligne, et la malle s'ouvre dans la tête de qui
              regarde. */}
          <rect x="26" y="88" width="78" height="2.4" fill={ferrure} opacity="0.3" />

          {/* Les deux sangles. */}
          <rect x="41" y="70" width="7" height="72" fill={ferrure} opacity="0.75" />
          <rect x="82" y="70" width="7" height="72" fill={ferrure} opacity="0.75" />
          <rect x="38.5" y="98" width="12" height="8" rx="1.8" fill={ferrure} />
          <rect x="79.5" y="98" width="12" height="8" rx="1.8" fill={ferrure} />

          {/* Les coins renforcés : quatre angles, et le cuir devient une malle.
              ⚠️ ÉCRITS UN PAR UN. Première version : un seul chemin retourné par
              une transformation pour faire les quatre — le miroir tombait à
              côté et les deux coins du bas pendaient sous la malle comme des
              éclats. Quatre lignes lisibles valent mieux qu'une astuce fausse. */}
          <path d="M28,78 L28,72 L34,72" fill="none" stroke={ferrure} strokeWidth="2.8"
            strokeLinecap="round" opacity="0.5" />
          <path d="M102,78 L102,72 L96,72" fill="none" stroke={ferrure} strokeWidth="2.8"
            strokeLinecap="round" opacity="0.5" />
          <path d="M28,134 L28,140 L34,140" fill="none" stroke={ferrure} strokeWidth="2.8"
            strokeLinecap="round" opacity="0.5" />
          <path d="M102,134 L102,140 L96,140" fill="none" stroke={ferrure} strokeWidth="2.8"
            strokeLinecap="round" opacity="0.5" />

          {/* L'étiquette, au bout de sa ficelle. */}
          <g className="etiquette">
            <line x1="65" y1="63" x2="65" y2="72" stroke={ferrure} strokeWidth="1.4" opacity="0.7" />
            <path d="M57,72 l16,0 l0,14 l-8,4.5 l-8,-4.5 Z" fill="#FDFCF8" opacity="0.92" />
            <circle cx="65" cy="75.5" r="1.5" fill={ferrure} opacity="0.6" />
            <rect x="60" y="80" width="10" height="1.4" rx="0.7" fill={ferrure} opacity="0.35" />
          </g>

          {/* La cible : plus large que le dessin. */}
          <rect x="20" y="48" width="90" height="100" fill="transparent" />
        </g>

      </svg>
    </div>
  );
}
