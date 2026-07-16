import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// POST /api/groupe/[code]/access
// Depuis la page principale : l'invité clique SA chambre (réservée) et entre son
// code à 4 chiffres → on lui renvoie le booking_ref pour accéder à sa gestion.
// Body: { groupe_chambre_id, pin }

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 }); }

  const { groupe_chambre_id, pin } = body;
  if (!groupe_chambre_id) return NextResponse.json({ ok: false, error: "Chambre requise." }, { status: 400 });

  const { data: g } = await supabaseServer.from("groupes").select("id").eq("code_acces", code).maybeSingle();
  if (!g) return NextResponse.json({ ok: false, error: "Groupe introuvable" }, { status: 404 });

  const { data: r } = await supabaseServer
    .from("groupe_reservations")
    .select("booking_ref, code_pin")
    .eq("groupe_id", g.id)
    .eq("groupe_chambre_id", groupe_chambre_id)
    .eq("statut", "confirmee")
    .maybeSingle();

  if (!r) return NextResponse.json({ ok: false, error: "Aucune réservation active sur cette chambre." }, { status: 404 });
  // Le code est FACULTATIF depuis le mode 'pro' (Martin 2026-07-16) : « si quelqu'un le
  // saisit, seul lui pourra gérer sa résa ». Le corollaire assumé : SANS code, la résa
  // n'est pas verrouillée — quiconque a le lien du groupe peut la gérer.
  // ⚠️ Le `!r.code_pin` d'origine renvoyait un 403 à tout le monde → une résa sans code
  // devenait définitivement inaccessible, y compris à son propre auteur.
  if (r.code_pin && String(pin || "") !== r.code_pin)
    return NextResponse.json({ ok: false, error: "Code à 4 chiffres incorrect." }, { status: 403 });

  return NextResponse.json({ ok: true, ref: r.booking_ref });
}
