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

  const { data: resas } = await supabaseServer
    .from("groupe_reservations")
    .select("groupe_chambre_id, nom, prenom, statut")
    .eq("groupe_id", g.id)
    .eq("statut", "confirmee");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taken = new Map<string, any>();
  for (const r of resas || []) taken.set(r.groupe_chambre_id, r);

  const today = new Date().toISOString().slice(0, 10);
  const closed = g.statut !== "actif" || today > g.date_limite;

  const out = (rooms || []).map((rc) => {
    const ru = one(rc.room_units);
    const rt = one(ru?.room_types);
    const hotel = one(rc.hotels);
    const t = taken.get(rc.id);
    return {
      id: rc.id,
      numero: ru?.numero ?? "—",
      type: rt?.nom ?? null,
      pax_max: ru?.pax_max ?? 2,
      twinable: !!ru?.twinable,
      tarif: Number(rc.tarif_nuit),
      hotel: hotel?.nom ?? null,
      taken: !!t,
      occupant: t && g.plan_visible ? `${t.prenom || ""} ${(t.nom || "").charAt(0)}.`.trim() : null,
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
      cover_image_url: g.cover_image_url,
      message_accueil: g.message_accueil,
      closed,
    },
    rooms: out,
  });
}
