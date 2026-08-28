import { supabaseServer } from '@/lib/supabase-server';
import { CONTENU, type LangueVilla } from '@/lib/villaContenu';
import { FORMULES, NUITS_MIN, PRIX_CHAMBRE_NUIT } from '@/lib/villa';

/* Ce que le back-office a posé pour la Villa, par-dessus ce que porte le dépôt.
 *
 * ⚠️ LE DÉPÔT RESTE LE SOCLE, LA BASE NE FAIT QUE LE RECOUVRIR.
 * Une clé absente, une liste vide, une table injoignable : la page affiche ce
 * qu'elle a toujours affiché. C'est ce qui permet à quelqu'un de préparer sa
 * sélection de photos ou de retravailler un texte sans mettre la vitrine à
 * blanc entre-temps — et c'est aussi le filet si Supabase tombe.
 *
 * ⚠️ EFFACER UN CHAMP DANS LE BACK-OFFICE N'EFFACE PAS LE TEXTE : ça rend la
 * main au dépôt. C'est le seul retour arrière simple, et il est annoncé à
 * l'écran là-bas.
 *
 * ⚠️ CE FICHIER NE DIT RIEN DE LA DISPONIBILITÉ. Les chambres libres se lisent
 * dans Mews, et nulle part ailleurs. Ici, ce sont les prix, les mots, les
 * images — pas ce qui est vendable.
 */

type Photo = { url: string; alt_fr: string; alt_en: string };

type Ligne = {
  prix_chambre_nuit: string | number | null;
  nuits_min: number | null;
  chambres_complete: number | null;
  chambres_demi: number | null;
  pax_complete: number | null;
  pax_demi: number | null;
  textes: Record<string, Record<string, unknown>> | null;
  photos: Photo[] | null;
};

export type TarifsVilla = {
  prixChambreNuit: number;
  nuitsMin: number;
  formules: {
    complete: { chambres: number; personnes: number; parNuit: number };
    demi: { chambres: number; personnes: number; parNuit: number };
  };
};

/* La FORME du contenu, écrite ici et non déduite de `CONTENU`.
 *
 * ⚠️ `CONTENU` est un `as const` : ses types sont les chaînes elles-mêmes
 * (« Toulon · Mourillon · Location exclusive » et non `string`). Parfait pour
 * une constante, impossible à recouvrir par ce que rend la base. On décrit donc
 * la forme une fois, en types ouverts. */
export type TexteVilla = {
  surtitre: string;
  titre: string;
  chapo: string;
  galerieTitre: string;
  optionsTitre: string;
  services: string;
  inclus: string[];
  options: string[];
  aSavoir: string[];
  pour: string[];
  forces: { titre: string; texte: string }[];
};

export type ContenuVilla = {
  photo: string;
  photoMobile: string;
  galerie: { src: string; alt: Record<LangueVilla, string> }[];
  fr: TexteVilla;
  en: TexteVilla;
};

/* Trente secondes de cache.
 *
 * Assez pour qu'une rafale de visites ne fasse pas trente requêtes, assez court
 * pour que le commercial voie son changement en rafraîchissant — c'est ce qu'on
 * lui annonce à l'écran (« la page publique suit dans la minute »). Un cache
 * d'un quart d'heure lui aurait fait croire que le bouton n'enregistre pas. */
let cache: { a: number; ligne: Ligne | null } | null = null;
const TTL = 30_000;

async function lire(): Promise<Ligne | null> {
  if (cache && Date.now() - cache.a < TTL) return cache.ligne;
  try {
    const { data } = await supabaseServer
      .from('villa_contenu')
      .select('prix_chambre_nuit, nuits_min, chambres_complete, chambres_demi, pax_complete, pax_demi, textes, photos')
      .eq('id', 1)
      .maybeSingle();
    cache = { a: Date.now(), ligne: (data as Ligne) ?? null };
  } catch {
    // Base injoignable : on mémorise l'échec le temps du cache plutôt que de
    // la rappeler à chaque rendu, et la page sert les valeurs du dépôt.
    cache = { a: Date.now(), ligne: null };
  }
  return cache.ligne;
}

/** Un nombre du back-office, ou celui du dépôt. Zéro et négatif sont refusés :
 *  un tarif à zéro n'est pas un choix commercial, c'est un champ vidé. */
const nb = (v: unknown, defaut: number): number => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : defaut;
};

export async function chargerTarifsVilla(): Promise<TarifsVilla> {
  const l = await lire();
  const prix = nb(l?.prix_chambre_nuit, PRIX_CHAMBRE_NUIT);
  const chambresComplete = nb(l?.chambres_complete, FORMULES.complete.chambres);
  const chambresDemi = nb(l?.chambres_demi, FORMULES.demi.chambres);
  return {
    prixChambreNuit: prix,
    nuitsMin: nb(l?.nuits_min, NUITS_MIN),
    formules: {
      // Le prix à la nuit se CALCULE, il ne se stocke pas : une colonne de plus
      // serait un jour où elle contredit le prix par chambre.
      complete: {
        chambres: chambresComplete,
        personnes: nb(l?.pax_complete, FORMULES.complete.personnes),
        parNuit: prix * chambresComplete,
      },
      demi: {
        chambres: chambresDemi,
        personnes: nb(l?.pax_demi, FORMULES.demi.personnes),
        parNuit: prix * chambresDemi,
      },
    },
  };
}

/** Une chaîne du back-office, ou celle du dépôt. Le vide rend la main. */
const txt = (v: unknown, defaut: string): string =>
  typeof v === 'string' && v.trim() ? v.trim() : defaut;

/** Une liste du back-office, ou celle du dépôt. */
const liste = (v: unknown, defaut: readonly string[]): string[] =>
  Array.isArray(v) && v.length ? v.filter((x) => typeof x === 'string' && x.trim()) : [...defaut];

function fusionner(langue: LangueVilla, saisi: Record<string, unknown>): TexteVilla {
  const d = CONTENU[langue];
  return {
    // Les trois arguments ne sont pas éditables : ils portent la promesse de
    // l'offre, pas une information qui bouge. Recopiés tels quels.
    forces: d.forces.map((f) => ({ titre: f.titre, texte: f.texte })),
    surtitre: txt(saisi.surtitre, d.surtitre),
    titre: txt(saisi.titre, d.titre),
    chapo: txt(saisi.chapo, d.chapo),
    galerieTitre: txt(saisi.galerieTitre, d.galerieTitre),
    optionsTitre: txt(saisi.optionsTitre, d.optionsTitre),
    services: txt(saisi.services, d.services),
    inclus: liste(saisi.inclus, d.inclus),
    options: liste(saisi.options, d.options),
    aSavoir: liste(saisi.aSavoir, d.aSavoir),
    pour: liste(saisi.pour, d.pour),
  };
}

export async function chargerContenuVilla(): Promise<ContenuVilla> {
  const l = await lire();
  const t = l?.textes ?? {};

  /* ⚠️ LE BACK-OFFICE NE RÈGLE QUE LA GALERIE (Martin, 28/08/2026).
     Les deux grandes images d'en-tête restent au dépôt : elles ont des
     contraintes de forme qu'un téléversement ne dit pas — l'une doit être
     large, l'autre verticale — et les intervertir casse l'écran d'accueil de
     l'offre. On a déjà payé ce défaut une fois, avec une bande panoramique
     étirée sur un écran de téléphone.
     La galerie, elle, accepte n'importe quel cadrage : une seule photo posée
     là-bas suffit à prendre la main sur celles du dépôt. */
  const posees = (l?.photos ?? []).filter((p) => p?.url);
  const galerie = posees.length
    ? posees.map((p) => ({
        src: p.url,
        alt: { fr: p.alt_fr || '', en: p.alt_en || p.alt_fr || '' },
      }))
    : CONTENU.galerie.map((g) => ({ src: g.src, alt: { fr: g.alt.fr, en: g.alt.en } }));

  return {
    photo: CONTENU.photo,
    photoMobile: CONTENU.photoMobile,
    galerie,
    fr: fusionner('fr', (t.fr ?? {}) as Record<string, unknown>),
    en: fusionner('en', (t.en ?? {}) as Record<string, unknown>),
  };
}
