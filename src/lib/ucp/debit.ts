// CE QU'UN INCONNU PEUT FAIRE EN UNE HEURE.
//
// 🔴 POURQUOI CE FICHIER EXISTE. `/ucp/mcp` est public et sans
// authentification — c'est voulu : demander une chambre et un prix doit être
// sans friction, et exiger un compte tuerait l'intérêt du protocole.
//
// Mais tout n'est pas sans conséquence. `create_rooftop_reservation` TIENT une
// table, fermement, et n'exigeait qu'un nom. Mesuré le 28/09/2026 : six tables
// actives, quinze soirs ouverts avant l'hiver — **quatre-vingt-dix requêtes
// suffisaient à bloquer le rooftop jusqu'en mai**, avec des noms inventés,
// depuis n'importe où. Il n'existait aucune limitation de débit dans tout le
// dépôt, et le seul garde — une liste noire de cinq entrées — ne vaut rien
// contre quelqu'un qui change de nom.
//
// ⚠️ DEUX PLAFONDS, PAS UN. Un plafond global protège la facture et les jetons
// d'API ; un plafond par ACTION protège l'inventaire. Le second est le plus
// important : cent lectures de disponibilité ne coûtent qu'un peu d'argent,
// deux réservations de trop coûtent une soirée de service.
//
// ⚠️ ET ON NE BLOQUE JAMAIS SUR UNE PANNE DE COMPTEUR. Si la base ne répond
// pas, on laisse passer : refuser une vraie réservation parce qu'un compteur
// est en rideau serait pire que le risque qu'il couvre.

import { supabaseServer } from '@/lib/supabase-server';

export class TropDAppels extends Error {
  constructor(message: string) { super(message); }
}

/** L'appelant, tel que Netlify le rapporte. */
export function appelant(req: Request): string {
  /* ⚠️ `x-forwarded-for` EST UNE LISTE, ET SON DERNIER ÉLÉMENT EST LE PLUS
   * SÛR côté proxy — mais Netlify pose sa propre en-tête, qu'un client ne peut
   * pas falsifier. On la préfère, et on ne retient que la PREMIÈRE adresse du
   * repli : celle du client, pas des proxys traversés. */
  const nf = req.headers.get('x-nf-client-connection-ip');
  if (nf) return nf.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'inconnu';
}

/**
 * Consomme un droit. Lève `TropDAppels` si le plafond est atteint.
 *
 * ⚠️ VÉRIFIER ET CONSOMMER SONT DEUX GESTES. Pour ce qui coûte à l'hôtel — une
 * table tenue — on vérifie avant, et on ne consomme qu'une fois l'action
 * réussie : compter les refus bloquerait un client qui tâtonne sur les dates,
 * ce qui est le comportement normal de quelqu'un qui cherche. Le martèlement
 * sans effet est arrêté par le plafond global, pas par celui-ci.
 */
export async function compter(
  { cle, max, minutes, message, consommer = true }:
  { cle: string; max: number; minutes: number; message: string; consommer?: boolean },
): Promise<void> {
  const maintenant = Date.now();
  try {
    const { count } = await supabaseServer.from('ucp_debit')
      .select('id', { count: 'exact', head: true })
      .eq('cle', cle).gt('expire_le', new Date(maintenant).toISOString());
    if ((count ?? 0) >= max) throw new TropDAppels(message);

    /* `consommer: false` ne fait que VÉRIFIER — pour les actions dont on ne
       veut débiter le droit qu'une fois réussies. */
    if (consommer) {
      await supabaseServer.from('ucp_debit').insert({
        cle, expire_le: new Date(maintenant + minutes * 60_000).toISOString(),
      });
    }

    /* Ménage opportuniste, jamais bloquant. */
    void supabaseServer.from('ucp_debit')
      .delete().lt('expire_le', new Date(maintenant - 3_600_000).toISOString())
      .then(undefined, () => {});
  } catch (e) {
    if (e instanceof TropDAppels) throw e;
    /* La base n'a pas répondu : on laisse passer plutôt que de refuser une
       vraie réservation pour un compteur en rideau. */
    console.error('[ucp] compteur de débit indisponible', e instanceof Error ? e.message : e);
  }
}

/** Les plafonds, nommés une fois pour qu'ils ne se contredisent pas ailleurs. */
export const PLAFONDS = {
  /* Large : cent appels en dix minutes, c'est un agent bavard, pas une
     attaque. Ce plafond protège la facture, pas l'inventaire. */
  global: { max: 100, minutes: 10 },
  /* 🔴 Serré, et c'est le seul qui compte vraiment : une table tenue est une
     table perdue pour un vrai client. Deux par jour et par appelant laisse
     passer une famille qui réserve deux soirs, et arrête net un balayage. */
  rooftop: { max: 2, minutes: 24 * 60 },
  /* Une vente exige déjà un jeton de paiement valide — donc coûteux à
     obtenir. Ce plafond n'est là que contre l'acharnement. */
  vente: { max: 10, minutes: 60 },
  /* Une clé de séjour valide autorise à lire souvent ; une clé invalide, non
     — c'est ce qui rend une énumération inutile. */
  cleInvalide: { max: 10, minutes: 10 },
} as const;
