// LE ROOFTOP, PARLÉ PAR UNE MACHINE.
//
// 🔑 POURQUOI ICI, À CÔTÉ DES CHAMBRES. Martin, 28/09/2026 : « on peut câbler
// le rooftop aussi hein ! sans paiement mais en réservation a minima ». Un
// agent qui vient d'installer son client à l'hôtel doit pouvoir lui réserver
// une table dans la foulée, sans changer d'interlocuteur.
//
// ⚠️ ET UNE TABLE NE SE PRÉ-RÉSERVE PAS. La règle de la maison, dite par
// Martin : « une résa par table et par soir, il y a un max par table, et soit
// la table est dispo et on réserve, soit pas de résa ». C'est exactement ce que
// fait `rooftop_book` en base — elle prend la plus petite table qui accueille
// le groupe, la verrouille, et écrit une réservation `confirmee`. Il n'y a
// donc rien à confirmer après : ce qui est rendu `ok` EST une table tenue.
//
// 🔑 ON NE RÉÉCRIT NI LA DISPONIBILITÉ NI LA RÉSERVATION. `rooftop_book` et
// `rooftop_day_availability` vivent en base, en `security definer`, et servent
// déjà la page publique du site. Une seconde implémentation qui déciderait
// elle-même « c'est libre » finirait par diverger de celle qui dresse les
// tables — et ce jour-là, deux clients auraient la même.
//
// ⚠️ CLÉ ANONYME, ET C'EST VOULU. Cet endpoint est ouvert à tous les vents.
// Les deux RPC sont exécutables en anonyme (elles le sont déjà depuis la page
// publique) : leur donner la clé de service ferait passer un endpoint public
// par un rôle qui peut tout lire, pour un gain nul.

import { supabase } from '@/lib/supabase';
import { SITE_URL } from '@/lib/site';

/** Les Voiles. Le rooftop est à cet hôtel et à aucun autre. */
export const ROOFTOP_HOTEL = 'ded6e6fb-ff3c-4fa8-ad07-403ee316be53';

/* ⚠️ LA PLUS GRANDE TABLE FAIT CINQ COUVERTS. Relevé en base le 28/09/2026 :
 * six tables actives, 18 couverts en tout, la plus grande à 5. Au-delà,
 * `rooftop_book` ne trouve aucune table et rend `full` — un agent en
 * conclurait « complet ce soir-là » alors que c'est « pas par ce chemin ».
 * On le dit donc avant d'essayer, et on renvoie vers l'hôtel. */
export const COUVERTS_MAX = 5;

/** Les créneaux du service du soir, ceux de la page publique. */
const CRENEAUX = (() => {
  const o: string[] = [];
  for (let h = 17; h <= 21; h++) { o.push(`${h}h00`); o.push(`${h}h30`); }
  return o;
})();

/* ⚠️ UN CRÉNEAU DÉJÀ PASSÉ N'EST PAS UN CRÉNEAU. Réserver 19h00 à 22h48
 * ferait tenir une table pour un service terminé, et l'équipe la découvrirait
 * le lendemain. Même préavis que la page publique : une demi-heure, le temps
 * d'arriver et que la salle s'organise. */
const PREAVIS_MIN = 30;

const jourParis = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const minutesParis = () => {
  const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date());
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return n('hour') * 60 + n('minute');
};
const enMinutes = (c: string) => { const [h, m] = c.split('h'); return Number(h) * 60 + Number(m || 0); };

/** Les créneaux encore proposables pour une date. Vide si le service est passé. */
export function creneauxDe(date: string): string[] {
  if (date !== jourParis()) return CRENEAUX;
  const limite = minutesParis() + PREAVIS_MIN;
  return CRENEAUX.filter((c) => enMinutes(c) >= limite);
}

export type Soir = { date: string; reservable: boolean; motif?: 'ferme' | 'complet' };

/** Les soirs d'une fenêtre, en disant POURQUOI quand ce n'est pas réservable. */
export async function soirs(
  { du, au, couverts = 2 }: { du: string; au: string; couverts?: number },
): Promise<Soir[]> {
  const [dispo, fermetures] = await Promise.all([
    supabase.rpc('rooftop_day_availability', { p_hotel: ROOFTOP_HOTEL, p_pax: couverts, p_start: du, p_end: au }),
    supabase.from('rooftop_closures').select('date_debut, date_fin, date_fermee').eq('hotel_id', ROOFTOP_HOTEL),
  ]);
  if (dispo.error) throw new Error(`Disponibilité du rooftop indisponible : ${dispo.error.message}`);

  /* ⚠️ `rooftop_day_availability` REND `false` POUR FERMÉ COMME POUR COMPLET.
   * Sans lire les fermetures à part, les sept mois d'hiver s'annoncent
   * « complet » — un agent rapporterait au client que le rooftop est pris
   * d'assaut jusqu'en mai. Les fermetures s'écrivent de deux façons dans la
   * table, un jour seul (`date_fermee`) ou une période : les récentes sont
   * toutes en période, et n'interroger que l'autre colonne rend une table qui
   * paraît vide. */
  const ferme = (d: string) => (fermetures.data ?? []).some((f) => {
    const seul = f.date_fermee as string | null;
    if (seul && seul === d) return true;
    const a = f.date_debut as string | null, b = f.date_fin as string | null;
    return Boolean(a && b && d >= a && d <= b);
  });

  /* ⚠️ Les colonnes de cette RPC sont en ANGLAIS (`day` / `available`), à
   * l'inverse du reste du schéma rooftop. Un mapping « à la française » a déjà
   * fait annoncer « rien de libre » sur trois semaines pleines, en production. */
  return ((dispo.data ?? []) as { day: string; available: boolean }[]).map((r) => ({
    date: r.day,
    reservable: Boolean(r.available) && creneauxDe(r.day).length > 0,
    ...(r.available && creneauxDe(r.day).length === 0
      ? { motif: 'complet' as const }
      : r.available ? {} : { motif: ferme(r.day) ? ('ferme' as const) : ('complet' as const) }),
  }));
}

export class ErreurRooftop extends Error {
  constructor(message: string, readonly code = 'invalid_request') { super(message); }
}

export type DemandeTable = {
  date: string; heure?: string; couverts: number;
  nom: string; telephone?: string; email?: string; message?: string;
};

export type TableTenue = { id: string; table: string; date: string; heure: string; couverts: number };

/** Prend une table, pour de bon. Lève si elle n'est pas prise. */
export async function reserverTable(d: DemandeTable): Promise<TableTenue> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) throw new ErreurRooftop('Date invalide (AAAA-MM-JJ).');
  if (!Number.isInteger(d.couverts) || d.couverts < 1) throw new ErreurRooftop('Nombre de couverts invalide.');
  if (d.couverts > COUVERTS_MAX) {
    throw new ErreurRooftop(
      `Au-delà de ${COUVERTS_MAX} personnes, la table se réserve avec l’hôtel (+33 4 94 41 36 23) : `
      + 'le rooftop n’a pas de table plus grande, il faut en rapprocher plusieurs.',
    );
  }
  if (d.date < jourParis()) throw new ErreurRooftop('Cette date est passée.');
  if (!d.nom?.trim()) throw new ErreurRooftop('Le nom du client est nécessaire pour tenir la table.');

  const ouverts = creneauxDe(d.date);
  if (!ouverts.length) throw new ErreurRooftop('Le service du soir est terminé pour aujourd’hui.', 'unavailable');
  const heure = d.heure?.trim() || ouverts[0];
  if (!ouverts.includes(heure)) {
    throw new ErreurRooftop(`Créneau indisponible. Encore possibles ce jour-là : ${ouverts.join(', ')}.`);
  }

  const { data, error } = await supabase.rpc('rooftop_book', {
    p_hotel: ROOFTOP_HOTEL, p_date: d.date, p_heure: heure, p_pax: d.couverts,
    p_nom: d.nom.trim(), p_tel: d.telephone?.trim() ?? null,
    p_email: d.email?.trim() ?? null, p_message: d.message?.trim() ?? null,
  });
  if (error) throw new Error(`Le rooftop n’a pas répondu : ${error.message}`);

  const r = (data ?? {}) as { status?: string; table?: string; id?: string };
  /* Les trois refus de `rooftop_book` se disent tels quels : un agent doit
     pouvoir les rapporter au client sans croire que le serveur est cassé. */
  if (r.status === 'closed') throw new ErreurRooftop('Le rooftop est fermé ce soir-là.', 'unavailable');
  if (r.status === 'full') throw new ErreurRooftop('Plus aucune table pour ce soir-là.', 'unavailable');
  if (r.status === 'blacklisted') {
    /* ⚠️ ON NE DIT PAS POURQUOI, ET SÛREMENT PAS À UNE MACHINE. Le motif
     * regarde l'hôtel et le client, pas l'agent qui transmettra la réponse. */
    throw new ErreurRooftop('Cette réservation ne peut pas être prise en ligne — merci d’appeler l’hôtel.', 'unavailable');
  }
  if (r.status !== 'ok' || !r.id) throw new Error('Le rooftop n’a pas confirmé la table.');

  /* ⚠️ UNE TABLE PRISE QUE PERSONNE NE VOIT EST UNE TABLE PERDUE. C'est le
   * courriel qui prévient la salle ; il ne fait jamais échouer la réservation,
   * qui est déjà acquise en base. Même route que le site, avec sa propre
   * source : l'équipe doit pouvoir distinguer ce qui vient d'un agent. */
  try {
    await fetch(`${SITE_URL}/api/rooftop-reservation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: d.nom, telephone: d.telephone, email: d.email, date: d.date,
        heure, couverts: d.couverts, message: d.message, table: r.table, source: 'agent',
      }),
    });
  } catch (e) {
    console.error('[rooftop] notification equipe', e instanceof Error ? e.message : e);
  }

  return { id: r.id, table: r.table ?? '', date: d.date, heure, couverts: d.couverts };
}
