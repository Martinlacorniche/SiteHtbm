import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { GERABLES } from "@/lib/groupeStatuts";

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

  // Toutes les résas gérables de cette chambre, pas une seule : en mode 'pro' la
  // même chambre porte plusieurs séjours sur des nuits différentes, chacun avec
  // son code. Un `maybeSingle()` sur `confirmee` renvoyait « aucune réservation
  // active » à un invité dont la résa existait bel et bien (paiement différé).
  const { data: list } = await supabaseServer
    .from("groupe_reservations")
    .select("booking_ref, code_pin, date_arrivee")
    .eq("groupe_id", g.id)
    .eq("groupe_chambre_id", groupe_chambre_id)
    .in("statut", [...GERABLES])
    .order("date_arrivee", { ascending: true });

  if (!list?.length) return NextResponse.json({ ok: false, error: "Aucune réservation active sur cette chambre." }, { status: 404 });
  // Le code est FACULTATIF depuis le mode 'pro' (Martin 2026-07-16) : « si quelqu'un le
  // saisit, seul lui pourra gérer sa résa ». Le corollaire assumé : SANS code, la résa
  // n'est pas verrouillée — quiconque a le lien du groupe peut la gérer.
  // ⚠️ Le `!r.code_pin` d'origine renvoyait un 403 à tout le monde → une résa sans code
  // devenait définitivement inaccessible, y compris à son propre auteur.
  const saisi = String(pin || "").trim();
  // Le code désigne AUSSI le séjour quand la chambre en porte plusieurs.
  const r = list.find((x) => x.code_pin && x.code_pin === saisi)
    || list.find((x) => !x.code_pin);
  if (!r) return NextResponse.json({ ok: false, error: "Code à 4 chiffres incorrect." }, { status: 403 });

  return NextResponse.json({ ok: true, ref: r.booking_ref });
}
