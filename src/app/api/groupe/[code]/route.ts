import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// GET /api/groupe/[code]
// Données publiques d'un groupe pour la page invité : méta + chambres du bloc
// (libre/pris, occupant si plan visible). Passe par service_role (RLS).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function one(x: any) { return Array.isArray(x) ? x[0] : x; }

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const { data: g } = await supabaseServer.from("groupes").select("*").eq("code_acces", code).maybeSingle();
  if (!g) return NextResponse.json({ ok: false, error: "Groupe introuvable" }, { status: 404 });

  const { data: rooms } = await supabaseServer
    .from("groupe_chambres")
    .select("id, tarif_nuit, hotel_id, room_units(numero, pax_max, twinable, room_types(nom)), hotels:hotel_id(nom)")
    .eq("groupe_id", g.id);

  // Les DATES de chaque résa sont nécessaires au mode 'pro' (calendrier) : une chambre
  // n'est plus « prise » ou « libre » dans l'absolu, elle l'est nuit par nuit.
  // On retient aussi les résas TENUES (en attente / différé) : elles bloquent leurs nuits,
  // exactement comme la contrainte d'exclusion en base (cf migration 82).
  const { data: resas } = await supabaseServer
    .from("groupe_reservations")
    .select("groupe_chambre_id, nom, prenom, statut, date_arrivee, date_depart, nb_personnes")
    .eq("groupe_id", g.id)
    .in("statut", ["confirmee", "en_attente_paiement", "paiement_differe"]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byRoom = new Map<string, any[]>();
  for (const r of resas || []) {
    const list = byRoom.get(r.groupe_chambre_id) || [];
    list.push(r);
    byRoom.set(r.groupe_chambre_id, list);
  }

  const today = new Date().toISOString().slice(0, 10);
  const closed = g.statut !== "actif" || today > g.date_limite;

  const out = (rooms || []).map((rc) => {
    const ru = one(rc.room_units);
    const rt = one(ru?.room_types);
    const hotel = one(rc.hotels);
    const list = byRoom.get(rc.id) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conf = list.find((r: any) => r.statut === "confirmee") || list[0];
    return {
      id: rc.id,
      numero: ru?.numero ?? "—",
      type: rt?.nom ?? null,
      pax_max: ru?.pax_max ?? 2,
      twinable: !!ru?.twinable,
      tarif: Number(rc.tarif_nuit),
      hotel: hotel?.nom ?? null,
      // `taken` reste le champ du mode 'simple' : là-bas tout le monde réserve la plage
      // entière du groupe, donc « au moins une résa » = « chambre prise ». Inchangé.
      taken: list.length > 0,
      occupant: conf && g.plan_visible ? `${conf.prenom || ""} ${(conf.nom || "").charAt(0)}.`.trim() : null,
      // Mode 'pro' : les nuits déjà prises, pour que le calendrier grise au bon endroit.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      periodes: list.map((r: any) => ({
        from: r.date_arrivee,
        to: r.date_depart,
        pax: r.nb_personnes || 1,      // la taxe de séjour se compte PAR PERSONNE
        occupant: g.plan_visible ? `${r.prenom || ""} ${(r.nom || "").charAt(0)}.`.trim() : null,
      })),
    };
  });

  return NextResponse.json({
    ok: true,
    groupe: {
      nom: g.nom,
      date_arrivee: g.date_arrivee,
      date_depart: g.date_depart,
      date_limite: g.date_limite,
      conditions_annulation: g.conditions_annulation,
      plan_visible: g.plan_visible,
      // 'simple' (cartes, dates du groupe) | 'pro' (calendrier, dates par invité).
      // Repli sur 'simple' tant que la migration 82 n'est pas passée.
      mode_vue: g.mode_vue === "pro" ? "pro" : "simple",
      // Pilote deux choses côté page : l'email redevient obligatoire si un règlement en ligne
      // est attendu (Stripe l'envoie au client), et 'aucun' masque les tarifs.
      mode_paiement: g.mode_paiement || (g.paiement_obligatoire ? "immediat" : "aucun"),
      // Réglages staff (migration 84). Replis = comportement d'avant si non migré.
      affichage_tarifs: ["complet", "budget", "masque"].includes(g.affichage_tarifs) ? g.affichage_tarifs : "complet",
      taxe_sejour_mode: ["sur_place", "incluse", "ajoutee"].includes(g.taxe_sejour_mode) ? g.taxe_sejour_mode : "sur_place",
      taxe_sejour_montant: Number(g.taxe_sejour_montant) || 0,
      cover_image_url: g.cover_image_url,
      message_accueil: g.message_accueil,
      closed,
    },
    rooms: out,
  });
}
