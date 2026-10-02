// OÙ REGARDER DANS UNE PHOTO — la même réponse pour l'écran de réglage et pour
// le portail.
//
// 🔑 UNE TUILE EST UN RECTANGLE, UNE PHOTO N'EN EST PAS UN. Il faut couper, et
// le centre est rarement le bon endroit : un flacon posé en bas de cadre, un
// comptoir d'accueil sur la droite. Personne ne peut le deviner à la place de
// celui qui a pris la photo.
//
// ⚠️ DEUX ÉCRITURES, UNE SEULE LECTURE. Les premières tuiles réglées portent un
// mot (« bas », « droite ») : c'était la version à cinq boutons. Depuis, on
// déplace la photo à la main et la valeur est un point précis (« 38% 72% »).
// Les anciennes valeurs restent lisibles — une migration pour cinq mots serait
// plus risquée que ces trois lignes.

const MOTS: Record<string, string> = {
  haut: '50% 18%', centre: '50% 50%', bas: '50% 82%', gauche: '18% 50%', droite: '82% 50%',
};

export const CENTRE = '50% 50%';

/** La valeur CSS `object-position` d'un réglage, quel que soit son âge. */
export function positionDe(valeur: unknown): string {
  const t = String(valeur ?? '').trim();
  if (!t) return CENTRE;
  if (MOTS[t]) return MOTS[t];
  /* Un réglage illisible vaut mieux centré qu'appliqué de travers. */
  return /^\d{1,3}% \d{1,3}%$/.test(t) ? t : CENTRE;
}

/** Le couple (x, y) en pourcentage, pour les calculs de l'écran de réglage. */
export function pointDe(valeur: unknown): { x: number; y: number } {
  const [x, y] = positionDe(valeur).split(' ').map((v) => parseFloat(v));
  return { x, y };
}

export const borne = (v: number) => Math.min(100, Math.max(0, v));

/* ── LE ZOOM ───────────────────────────────────────────────────────────────
 *
 * ⚠️ DÉPLACER NE SUFFIT PAS. Une photo large dans une tuile 4:3 ne déborde que
 * d'un côté : on peut la faire glisser, pas la resserrer sur un détail. Le
 * zoom est le deuxième geste de tout recadrage, et son absence se sent tout de
 * suite — Martin, 02/10/2026 : « faut rajouter la notion de zoom ».
 *
 * ⛔ ON NE DÉZOOME JAMAIS SOUS 1. En dessous, la photo ne couvre plus la tuile
 * et on verrait du vide dans les coins : ce n'est pas un réglage, c'est un
 * défaut d'affichage. */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 2.6;

export function zoomDe(valeur: unknown): number {
  const n = Number(valeur);
  if (!Number.isFinite(n)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, n));
}
