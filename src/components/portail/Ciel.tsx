// LE CIEL DE LA MAISON — ce que le client voit avant d'avoir lu quoi que ce soit.
//
// 🔑 POURQUOI UN DESSIN, ET PAS UN DÉGRADÉ DE PLUS. Un portail de chambre
// s'ouvre à toute heure : au réveil, entre deux visites, à une heure du matin
// en cherchant le numéro de la réception. Il affichait le même beige dans les
// trois cas. Un ciel qui sait l'heure qu'il est ne décore pas : il reconnaît
// le moment de celui qui regarde, et c'est la différence entre une page et un
// accueil.
//
// ⚠️ L'HEURE EST CELLE DE L'HÔTEL, PAS CELLE DU NAVIGATEUR. Calculée sur le
// serveur (`parisHour`), donc identique au rendu et à l'hydratation — une heure
// lue dans le navigateur ferait diverger les deux et React le refuserait. Et
// c'est la bonne heure : le client est DANS l'hôtel. Le jour où une instance
// s'installe sous un autre fuseau, c'est le seul bouton à tourner.
//
// ⚠️ AUCUNE COULEUR EN DUR. Le ciel se teinte par `--brand` et `--accent` —
// qui valent ici exactement le marine et l'or du site (#004e7c, #C6A972), si
// bien que le composant tombe juste sans un réglage. C'est volontaire : il
// vient du produit NWH.os, où ces deux variables portent la marque du client,
// et il doit pouvoir y retourner sans modification.
//
// 🔁 COPIE DU PRODUIT. Ce fichier est le jumeau de
// `siteconsignes/src/components/public/Ciel.tsx`. ⚠️ Deux copies divergent
// toujours : une retouche ici doit être reportée là-bas, et inversement. Elles
// vivent dans deux dépôts parce que le portail reste servi par le site vitrine
// — c'est lui qui amène le trafic sur le domaine de l'hôtel, et ça vaut ce
// prix-là (Martin, 02/10/2026).
//
// ⛔ ET IL NE COÛTE RIEN. Pas d'image, pas de bibliothèque : des formes et des
// `@keyframes`. Une chambre d'hôtel passe souvent par un wifi encombré, et
// c'est précisément la page qu'on y charge en premier.

export type Moment = 'aube' | 'jour' | 'crepuscule' | 'nuit';

/** Le moment du jour, à l'heure de l'hôtel. */
export function momentDe(heure: number): Moment {
  if (heure >= 6 && heure < 9) return 'aube';
  if (heure >= 9 && heure < 18) return 'jour';
  if (heure >= 18 && heure < 22) return 'crepuscule';
  return 'nuit';
}

/** Le bonjour qui va avec. ⚠️ « Bienvenue » ne vaut que le premier jour ;
 *  « Bonsoir » est juste tous les soirs du séjour. */
export function salutDe(m: Moment, en: boolean): string {
  if (m === 'nuit') return en ? 'Good evening' : 'Bonsoir';
  if (m === 'crepuscule') return en ? 'Good evening' : 'Bonsoir';
  if (m === 'aube') return en ? 'Good morning' : 'Bonjour';
  return en ? 'Hello' : 'Bonjour';
}

/* Les étoiles : des positions FIXES, écrites une fois. Tirées au hasard à
 * chaque rendu, elles sauteraient d'une page à l'autre pendant la visite. */
const ETOILES = [
  [12, 22, 1.1], [23, 13, 0.8], [34, 28, 1.3], [45, 9, 0.9], [57, 24, 1.1],
  [66, 15, 0.8], [74, 30, 1.2], [84, 19, 0.9], [92, 27, 1.0], [7, 34, 0.9],
  [29, 38, 0.8], [52, 36, 1.0], [79, 38, 0.8],
] as const;

/**
 * La bande de ciel posée derrière l'en-tête d'une page publique.
 *
 * Elle se place toute seule (absolue, en haut, sous le contenu) : la page n'a
 * qu'à lui laisser de la hauteur.
 */
export function Ciel({ moment }: { moment: Moment }) {
  const nuit = moment === 'nuit';
  /* Il se lève à gauche, monte, se couche à droite. La lune occupe le même
     coin que le couchant : c'est la suite de la même journée. */
  const POS = moment === 'aube' ? { left: '21%', top: '36%' }
    : moment === 'jour' ? { left: '79%', top: '15%' }
    : moment === 'crepuscule' ? { left: '77%', top: '37%' }
    : { left: '80%', top: '19%' };
  const TAILLE = nuit ? 34 : 54;
  return (
    <div aria-hidden data-ciel={moment} className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden">
      <style>{`
/* Le ciel vit avec son dessin : le vocabulaire PARTAGÉ (data-anim, data-touche)
   est dans globals.css, ce qui n'appartient qu'à cette scène reste ici. */
/* ⛔ LE BAS DU CIEL NE SE PEINT PAS, IL S'EFFACE. Première version : la bande
   se terminait sur une couleur crème choisie à la main. Or le fond de page est
   lui-même un dégradé — la couleur ne tombait donc juste à aucune hauteur, et
   on voyait une COUTURE horizontale en travers de l'écran, d'autant plus large
   que l'écran l'est. Repéré par Martin sur la version web.
   Un masque règle le problème par construction : le ciel se dissout dans ce
   qu'il y a derrière, quel qu'il soit, à n'importe quelle largeur. */
[data-ciel]{ --ciel-haut:#EAF2F8; --ciel-bas:transparent; --astre:#F6C86A; --halo:rgba(246,200,106,.38);
  -webkit-mask-image: linear-gradient(to bottom, #000 42%, rgba(0,0,0,.55) 70%, transparent 97%);
  mask-image: linear-gradient(to bottom, #000 42%, rgba(0,0,0,.55) 70%, transparent 97%); }
[data-ciel="aube"]{
  --ciel-haut: color-mix(in srgb, var(--brand, #004e7c) 16%, #FFE3CE);
  --astre:#F7B26A; --halo:rgba(247,178,106,.45); }
[data-ciel="jour"]{
  --ciel-haut: color-mix(in srgb, var(--brand, #004e7c) 22%, #DDEDF8);
  --astre:#F8D27A; --halo:rgba(248,210,122,.40); }
[data-ciel="crepuscule"]{
  --ciel-haut: color-mix(in srgb, var(--brand, #004e7c) 34%, #F3B38A);
  --astre: var(--accent, #C6A972); --halo:rgba(198,169,114,.42); }
[data-ciel="nuit"]{
  --ciel-haut: color-mix(in srgb, var(--brand, #004e7c) 72%, #101C2E);
  --astre:#E8EDF4; --halo:rgba(232,237,244,.30); }

/* ⚠️ CE QUI VA SUR UN TÉLÉPHONE FAIT UN CHAMP VIDE SUR UN ÉCRAN LARGE. 42 vh
   d'une fenêtre de portable, c'est un bandeau ; d'un écran de bureau, c'est
   450 px de ciel autour d'une colonne de texte de 400 px. La bande se raccourcit
   dès qu'il y a de la largeur : elle redevient un en-tête. */
[data-ciel]{ height: 44vh; max-height: 420px }
@media (min-width: 768px){ [data-ciel]{ height: 36vh; max-height: 320px } }

[data-ciel] .fond{ position:absolute; inset:0;
  background: linear-gradient(to bottom, var(--ciel-haut) 0%, var(--ciel-bas) 88%); }

/* ⚠️ TROP LENT, C'EST FIGÉ. Première version : 120 s pour 13 px, 300 s pour
   traverser l'écran. Prudent sur le papier, immobile à l'usage — Martin :
   « ça fait rigide ». Personne ne regarde un portail de chambre trois minutes.
   Le mouvement doit se voir en QUELQUES SECONDES sans jamais attirer l'œil :
   c'est la différence entre un ciel calme et une image morte. */
[data-ciel] .astre{ position:absolute; border-radius:999px; background:var(--astre);
  box-shadow:0 0 44px 18px var(--halo); animation: astre-flotte 26s ease-in-out infinite alternate; }
@keyframes astre-flotte{ from{ transform:translateY(0) } to{ transform:translateY(-18px) } }

/* Les rayons ne tournent qu'en plein jour, et très lentement : au-delà, ce
   n'est plus un soleil, c'est un gyrophare. */
[data-ciel] .rayons{ position:absolute; opacity:.5; animation: rayons-tournent 55s linear infinite; }
@keyframes rayons-tournent{ to{ transform:rotate(360deg) } }

/* Les nuages passent. Trois vitesses, sinon ils forment un bloc qui glisse.
   ⚠️ UN NUAGE N'EST PAS UNE PILULE. Première version : un border-radius
   de 999 px, blanc — à l'écran, ça ne disait pas « nuage », ça disait « contenu en cours
   de chargement ». Il faut la silhouette, donc un dessin. */
[data-ciel] .nuage{ position:absolute; animation: nuage-passe linear infinite;
  color:#fff; filter: blur(1.5px); }
@keyframes nuage-passe{ from{ transform:translateX(-24vw) } to{ transform:translateX(118vw) } }

[data-ciel] .etoile{ position:absolute; border-radius:999px; background:#fff;
  animation: etoile-scintille ease-in-out infinite alternate; }
@keyframes etoile-scintille{ from{ opacity:.25 } to{ opacity:.95 } }

/* L'ÉTOILE FILANTE. Dix-sept secondes d'attente pour un dixième de seconde de
   ciel : c'est ce rapport-là qui en fait un événement. Plus fréquente, ce
   serait un effet ; moins, personne ne la verrait jamais. */
[data-ciel] .filante{ position:absolute; height:1.6px; border-radius:999px;
  background:linear-gradient(to right, transparent, #fff);
  animation: filante-passe 17s cubic-bezier(.3,0,.2,1) infinite; }
@keyframes filante-passe{
  0%{ opacity:0; transform:translate(0,0) rotate(22deg) scaleX(.2) }
  1.4%{ opacity:.9 }
  5.5%{ opacity:0; transform:translate(190px,78px) rotate(22deg) scaleX(1) }
  100%{ opacity:0; transform:translate(190px,78px) rotate(22deg) scaleX(1) } }

/* LE VOL. Trois oiseaux, loin, minuscules — l'échelle fait tout : gros, c'est
   une mascotte ; à cette taille, c'est le ciel qui a de la profondeur. */
[data-ciel] .vol{ position:absolute; animation: vol-passe 46s linear infinite; }
@keyframes vol-passe{
  0%{ opacity:0; transform:translate(-14vw,0) }
  6%{ opacity:.55 }
  44%{ opacity:.55; transform:translate(52vw,-16px) }
  58%{ opacity:0; transform:translate(74vw,-22px) }
  100%{ opacity:0; transform:translate(74vw,-22px) } }
[data-ciel] .vol path{ animation: aile-bat 1.9s ease-in-out infinite; transform-origin:center }
@keyframes aile-bat{ 0%,100%{ transform:scaleY(1) } 50%{ transform:scaleY(.42) } }


@media (prefers-reduced-motion: reduce){
  [data-ciel] .astre, [data-ciel] .rayons, [data-ciel] .nuage, [data-ciel] .etoile,
  [data-ciel] .filante, [data-ciel] .vol, [data-ciel] .vol path{ animation:none !important }
  [data-ciel] .filante, [data-ciel] .vol{ opacity:0 }
}
      `}</style>

      <div className="fond" />

      {/* L'astre : haut à midi, bas à l'aube et au crépuscule, lune la nuit.
          ⚠️ JAMAIS AU CENTRE. Premier essai à 50 % : le soleil se posait
          exactement derrière le logo de la maison, qui se retrouvait dans un
          halo — on lisait un accident, pas un ciel. Il se lève à gauche et se
          couche à droite, comme dehors, et laisse le logo tranquille. */}
      <div className="astre" style={{ width: TAILLE, height: TAILLE, left: POS.left, top: POS.top, marginLeft: -TAILLE / 2 }} />

      {moment === 'jour' ? (
        <svg className="rayons" viewBox="-60 -60 120 120" width="190" height="190"
          style={{ left: POS.left, top: POS.top, marginLeft: -95, marginTop: -95 + TAILLE / 2 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={-1.1} y={-54} width={2.2} height={13} rx={1.1} fill="var(--astre)"
              transform={`rotate(${i * 30})`} />
          ))}
        </svg>
      ) : null}

      {nuit ? ETOILES.map(([x, y, r], i) => (
        <span key={i} className="etoile" style={{
          left: `${x}%`, top: `${y}%`, width: r * 2.4, height: r * 2.4,
          animationDuration: `${2.4 + (i % 5) * 0.7}s`, animationDelay: `${(i % 7) * 0.4}s`,
        }} />
      )) : null}

      {nuit ? (
        <span className="filante" style={{ left: '14%', top: '8%', width: 64 }} />
      ) : null}

      {!nuit ? (
        /* Trois oiseaux, un seul vol : ils ne se croisent pas, ils voyagent. */
        <svg className="vol" viewBox="0 0 60 20" width="58" height="19" style={{ top: '30%', left: 0 }}>
          {[[6, 12], [24, 6], [40, 14]].map(([x, y], i) => (
            <path key={i} d={`M${x},${y} q3.4,-3.6 6.8,0 q-3.4,-1.5 -6.8,0`} fill="none"
              stroke="var(--brand, #004e7c)" strokeWidth={1.1} strokeLinecap="round" opacity={0.5}
              style={{ animationDelay: `${i * 0.22}s` }} />
          ))}
        </svg>
      ) : null}

      {!nuit ? [
        { w: 160, top: '26%', duree: 68, retard: -14, o: 0.46 },
        { w: 104, top: '45%', duree: 96, retard: -55, o: 0.30 },
        { w: 210, top: '9%', duree: 124, retard: -88, o: 0.24 },
      ].map((n, i) => (
        <svg key={i} className="nuage" viewBox="0 0 120 46" width={n.w} height={n.w * 46 / 120}
          style={{ top: n.top, opacity: n.o, animationDuration: `${n.duree}s`, animationDelay: `${n.retard}s` }}>
          {/* Une silhouette, pas un rectangle arrondi : trois bosses de tailles
              différentes sur une base plate — c'est ce profil-là qu'on lit
              comme un nuage, même flouté et à 25 % d'opacité. */}
          <path fill="currentColor" d="M18,40 Q4,40 4,31 Q4,23 13,22 Q14,10 26,9 Q35,8 40,15 Q46,4 60,5
            Q76,5 80,18 Q92,15 98,23 Q110,24 112,32 Q113,40 100,40 Z" />
        </svg>
      )) : null}

    </div>
  );
}
