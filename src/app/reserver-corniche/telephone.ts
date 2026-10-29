// Le numéro de la réception, affiché au client.
//
// ⚠️ Un visiteur anglophone appelle depuis l'étranger : il lui faut
// l'indicatif. On le DÉRIVE du numéro national plutôt que d'en stocker deux —
// la marque n'en porte qu'un, et deux champs à tenir à jour finissent par
// diverger. Un numéro déjà international est rendu tel quel.
export function telInternational(numero: string): string {
  const n = (numero || '').trim();
  if (!n) return n;
  const chiffres = n.replace(/[^\d+]/g, '');
  if (chiffres.startsWith('+')) return n;
  if (chiffres.startsWith('0')) return `+33 ${n.slice(1).trim()}`;
  return n;
}

/** Le même, composable par un lien `tel:` — sans espaces ni ponctuation. */
export function telCompose(numero: string): string {
  return telInternational(numero).replace(/[^\d+]/g, '');
}
