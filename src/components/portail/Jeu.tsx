'use client';

// LE JEU DE LA VALISE — ce qui arrive quand on clique sur la valise du décor.
//
// 🔁 COPIE DU PRODUIT (`siteconsignes/src/components/public/Jeu.tsx`). Seule
// l'adresse du record change : ici l'hôtel se désigne par son identifiant,
// là-bas par son slug.
//
// 🔑 L'IDÉE EST DE MARTIN, 02/10/2026 : « Google en 404 ils proposent un jeu
// avec un T-Rex qui saute des obstacles, on peut pas faire ça ? un voyageur avec
// sa valise ». Oui — à une condition.
//
// ⛔ LE PORTAIL A UN TRAVAIL : qu'on trouve l'heure du petit-déjeuner en dix
// secondes. Un jeu qui démarrerait tout seul le lui volerait. Celui-ci
// n'existe que si on clique la valise posée dans la marge : rien ne bouge pour
// qui ne la voit pas, et la marge n'existe qu'au-dessus de 1280 px — donc pas
// une ligne de ce fichier ne s'exécute sur le téléphone d'un client en chambre.
// « Œuf de Pâques mais pas œuf de Pâques » : il ne se cache pas, il attend.
//
// ⚠️ ET IL NE RE-RENDRE PAS REACT SOIXANTE FOIS PAR SECONDE. Toute la boucle
// écrit directement dans le DOM par des `ref` ; React ne revoit la page que
// pour le score et la fin de partie. Une page de chambre tourne sur un
// téléphone de cinq ans branché à un wifi encombré.
//
// ⚠️ LA BARRE D'ESPACE FAIT DÉFILER LA PAGE. On ne l'intercepte QUE pendant une
// partie : casser le défilement de tout le monde pour un jeu que personne n'a
// demandé serait un très mauvais échange.

import { useCallback, useEffect, useRef, useState } from 'react';

const SOL = 92;          // la ligne de sol, dans le repère du jeu
/* ⚠️ RÉGLÉ EN MESURANT, PAS AU JUGÉ. Le sommet d'un saut vaut v²/2g : à 11,4 et
 * 0,62, il montait de CENT CINQ unités pour un décor qui en fait cent dix — il
 * sortait du cadre par le haut à chaque saut. À 5,8 et 0,42 il monte de
 * quarante, soit dix de plus que le plus haut obstacle : de quoi passer, pas de
 * quoi disparaître. Et il reste un demi-tiers de seconde en l'air, le temps
 * qu'il faut pour que le saut se sente. */
const GRAVITE = 0.42;
const SAUT = 5.8;
const LARGEUR = 1000;    // le repère logique ; le SVG s'étire dessus

type Obstacle = { x: number; type: 0 | 1 | 2 };

/* Trois obstacles, tous pris dans le monde de l'hôtel : un plot de parking, un
 * chariot d'étage, un transat. ⚠️ Des HAUTEURS différentes, sinon le saut
 * devient un réflexe et il n'y a plus de jeu. */
const OBSTACLES = [
  { l: 16, h: 22 },   // plot
  { l: 30, h: 30 },   // chariot
  { l: 44, h: 18 },   // transat
] as const;

export function Jeu({ accent, encre, hotel, onFermer }: {
  accent: string; encre: string;
  /** L'identifiant de l'hôtel : il ne sert qu'à l'adresse du record. */
  hotel: string;
  onFermer: () => void;
}) {
  const [fini, setFini] = useState(false);
  const [score, setScore] = useState(0);
  const [record, setRecord] = useState(0);
  /* 🔑 LE RECORD DE LA MAISON. Idée de Martin : un meilleur score gardé dans
   * SON navigateur ne se compare à personne ; celui de l'hôtel fait entrer les
   * autres clients dans la partie, et c'est ça qui donne envie d'un dernier
   * essai. ⛔ Un chiffre, aucun nom : une page affichée dans les chambres ne
   * peut pas porter un texte libre que personne ne relit avant publication. */
  const [maison, setMaison] = useState<number | null>(null);
  const [nouveau, setNouveau] = useState(false);

  const coureur = useRef<SVGGElement | null>(null);
  const piste = useRef<SVGGElement | null>(null);
  const etat = useRef({ y: 0, v: 0, obstacles: [] as Obstacle[], vitesse: 5.2, d: 0, mort: false, prochain: 320 });

  /* Le meilleur score tient dans le navigateur du client, et nulle part
   * ailleurs : ce n'est pas une donnée de l'hôtel. */
  useEffect(() => {
    try { setRecord(Number(localStorage.getItem('portail-valise') || 0)); } catch { /* privé */ }
    /* ⛔ Si l'appel échoue, on n'affiche simplement pas le record de la maison :
     * un jeu de couloir ne doit pas montrer d'erreur. */
    fetch(`/api/jeu?hotel=${hotel}`)
      .then((r) => r.json())
      .then((d) => setMaison(Number(d?.record) || 0))
      .catch(() => {});
  }, [hotel]);

  const sauter = useCallback(() => {
    const e = etat.current;
    if (e.mort) return;
    if (e.y === 0) e.v = SAUT;
  }, []);

  const rejouer = useCallback(() => {
    etat.current = { y: 0, v: 0, obstacles: [], vitesse: 5.2, d: 0, mort: false, prochain: 320 };
    setScore(0); setFini(false); setNouveau(false);
  }, []);

  useEffect(() => {
    const clavier = (ev: KeyboardEvent) => {
      if (ev.code !== 'Space' && ev.code !== 'ArrowUp') return;
      /* ⛔ Seulement ici, et seulement pendant la partie. */
      ev.preventDefault();
      if (etat.current.mort) rejouer(); else sauter();
    };
    const echap = (ev: KeyboardEvent) => { if (ev.code === 'Escape') onFermer(); };
    window.addEventListener('keydown', clavier);
    window.addEventListener('keydown', echap);
    return () => { window.removeEventListener('keydown', clavier); window.removeEventListener('keydown', echap); };
  }, [sauter, rejouer, onFermer]);

  useEffect(() => {
    let brut = 0;
    let dernier = performance.now();
    const boucle = (t: number) => {
      brut = requestAnimationFrame(boucle);
      /* ⚠️ LE TEMPS RÉEL, PAS LE NOMBRE D'IMAGES. Un écran à 120 Hz jouerait
       * deux fois plus vite que celui d'à côté. */
      const dt = Math.min(3, (t - dernier) / 16.67); dernier = t;
      const e = etat.current;
      if (e.mort) return;

      e.v -= GRAVITE * dt;
      e.y = Math.max(0, e.y + e.v * dt);
      if (e.y === 0 && e.v < 0) e.v = 0;

      e.d += e.vitesse * dt;
      e.vitesse = Math.min(11, 5.2 + e.d / 2600);
      if (e.d > e.prochain) {
        e.obstacles.push({ x: LARGEUR + 40, type: Math.floor(Math.random() * 3) as 0 | 1 | 2 });
        /* L'écart rétrécit avec la vitesse, mais jamais au point d'être
         * infranchissable : un jeu qu'on ne peut pas gagner n'est pas difficile,
         * il est cassé. */
        e.prochain = e.d + 260 + Math.random() * 260;
      }
      for (const o of e.obstacles) o.x -= e.vitesse * dt;
      e.obstacles = e.obstacles.filter((o) => o.x > -60);

      /* Collision : deux rectangles, et une marge de pardon de 4 px — sans
       * elle, on perd sur des contacts qu'on n'a pas vus. */
      const cx = 120, cl = 26, ch = 34;
      for (const o of e.obstacles) {
        const d = OBSTACLES[o.type];
        if (o.x < cx + cl - 4 && o.x + d.l > cx + 4 && e.y < d.h - 4) {
          e.mort = true;
          setFini(true);
          const s = Math.floor(e.d / 10);
          setScore(s);
          setRecord((r) => {
            const n = Math.max(r, s);
            try { localStorage.setItem('portail-valise', String(n)); } catch { /* privé */ }
            return n;
          });
          /* On dépose le score : le serveur ne garde que s'il bat la maison, et
           * c'est lui qui le dit. ⚠️ On ne compare pas nous-mêmes à `maison` —
           * quelqu'un d'autre a pu passer entre-temps. */
          fetch(`/api/jeu?hotel=${hotel}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: s }),
          })
            .then((r) => r.json())
            .then((d) => { setMaison(Number(d?.record) || 0); if (d?.bat) setNouveau(true); })
            .catch(() => {});
          return;
        }
      }

      if (coureur.current) coureur.current.setAttribute('transform', `translate(0 ${-e.y})`);
      if (piste.current) {
        piste.current.innerHTML = e.obstacles.map((o) => {
          const d = OBSTACLES[o.type];
          return `<rect x="${o.x.toFixed(1)}" y="${SOL - d.h}" width="${d.l}" height="${d.h}" rx="3" fill="${encre}" opacity="0.8"/>`;
        }).join('');
      }
      if (Math.floor(e.d) % 10 === 0) setScore(Math.floor(e.d / 10));
    };
    brut = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(brut);
  }, [encre, fini]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-[#FDFCF8]/95 backdrop-blur"
      onClick={() => (etat.current.mort ? rejouer() : sauter())}>
      <style>{`
@keyframes jeu-arrive{ from{ opacity:0; transform:translateY(24px) } to{ opacity:1; transform:none } }
[data-jeu]{ animation: jeu-arrive 420ms cubic-bezier(.23,1,.32,1) both }
[data-jeu] .roue{ transform-box:fill-box; transform-origin:center; animation: roule .5s linear infinite }
@keyframes roule{ to{ transform:rotate(360deg) } }
[data-jeu] .patte{ transform-box:fill-box; transform-origin:center top; animation: court .26s linear infinite alternate }
[data-jeu] .patte.b{ animation-delay:.13s }
@keyframes court{ from{ transform:rotate(22deg) } to{ transform:rotate(-22deg) } }
@media (prefers-reduced-motion: reduce){ [data-jeu] *{ animation:none !important } }
      `}</style>

      <div data-jeu className="relative mx-auto max-w-[1100px] px-5 py-3">
        <div className="flex items-baseline justify-between gap-6 pr-14 text-[11px] text-slate-400">
          <span>Espace pour sauter · Échap pour revenir</span>
          <span className="tabular-nums">
            {score} m
            {record > 0 && <span className="text-slate-300"> · vous {record}</span>}
            {maison != null && maison > 0 && <span className="text-slate-300"> · maison {maison}</span>}
          </span>
        </div>

        <svg viewBox={`0 0 ${LARGEUR} 110`} className="w-full" style={{ height: 118 }}>
          <line x1="0" y1={SOL} x2={LARGEUR} y2={SOL} stroke={encre} strokeWidth="1.5" opacity="0.25" />
          <g ref={piste} />
          <g ref={coureur}>
            <g transform="translate(120 0)">
              {/* Le voyageur : la même silhouette que dans la marge, et sa
                  valise derrière lui. Aucun visage, ici non plus. */}
              <circle cx="13" cy={SOL - 50} r="7.5" fill={encre} />
              <path d={`M5,${SOL - 40} q8,-4.4 16,0 l1.6,20 q-9.6,2.4 -19.2,0 Z`} fill={encre} />
              <rect className="patte" x="8" y={SOL - 20} width="4.6" height="20" rx="2.3" fill={encre} />
              <rect className="patte b" x="14" y={SOL - 20} width="4.6" height="20" rx="2.3" fill={encre} />
              <g>
                <rect x="-16" y={SOL - 26} width="16" height="20" rx="3" fill={accent} opacity="0.9" />
                <path d={`M-14,${SOL - 26} L-14,${SOL - 38} q0,-3 3,-3 l4,0`} fill="none"
                  stroke={encre} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                <circle className="roue" cx="-12" cy={SOL - 4} r="3.4" fill={encre} opacity="0.7" />
                <circle className="roue" cx="-4" cy={SOL - 4} r="3.4" fill={encre} opacity="0.7" />
              </g>
            </g>
          </g>
        </svg>

        {fini && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#FDFCF8]/85">
            <p className="text-sm font-semibold text-slate-700">{score} mètres</p>
            {/* ⚠️ DISCRET, MÊME POUR UN RECORD. Une fanfare dans la marge d'une
                page de chambre serait une publicité ; une ligne dorée suffit à
                faire sourire celui qui vient de le battre. */}
            {nouveau ? (
              <p className="text-[12px] font-semibold" style={{ color: accent }}>
                Nouveau record de la maison 🧳
              </p>
            ) : maison != null && maison > 0 ? (
              <p className="text-[12px] text-slate-400">
                Record de la maison : {maison} m
              </p>
            ) : null}
            <p className="mt-1 text-[12px] text-slate-400">Espace pour recommencer · Échap pour revenir</p>
          </div>
        )}

        <button onClick={(e) => { e.stopPropagation(); onFermer(); }}
          className="absolute right-4 top-2 rounded-full px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-700">
          fermer
        </button>
      </div>
    </div>
  );
}
