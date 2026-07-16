import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getStripeForHotel } from "@/lib/stripe";

// POST /api/groupe/[code]/pay  { ref: booking_ref }
// Paiement EN LIGNE À LA DEMANDE d'un booking (modes « Sur place » / « Programmé »).
// Crée une session Checkout par hôtel pour les chambres NON encore payées, et
// renvoie les liens. « Payé » = la session du booking a un paiement status='paid'.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function one(x: any) { return Array.isArray(x) ? x[0] : x; }
const nights = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let body: { ref?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 }); }
  const ref = body.ref;
  if (!ref) return NextResponse.json({ ok: false, error: "Référence manquante" }, { status: 400 });

  const { data: g } = await supabaseServer.from("groupes")
    .select("id, nom, code_acces, mode_paiement, paiement_obligatoire, taxe_sejour_mode, taxe_sejour_montant")
    .eq("code_acces", code).maybeSingle();
  if (!g) return NextResponse.json({ ok: false, error: "Groupe introuvable" }, { status: 404 });
  const mode: string = g.mode_paiement || (g.paiement_obligatoire ? "immediat" : "aucun");
  // Taxe de séjour : encaissée en mode « ajoutee » — celui où la page groupe
  // l'annonce comprise dans le total. 'incluse' = déjà dans le tarif/nuit, rien à
  // ajouter. (2 modes seulement depuis la migration 89.)
  const tsAjoutee = g.taxe_sejour_mode === "ajoutee";
  const tsMontant = Number(g.taxe_sejour_montant) || 0;
  if (mode !== "optionnel" && mode !== "differe") {
    return NextResponse.json({ ok: false, error: "Paiement en ligne indisponible pour ce groupe." }, { status: 400 });
  }

  // Chambres du booking encore « tenues » (confirmée sur place, ou en attente du lien programmé).
  const { data: rows } = await supabaseServer
    .from("groupe_reservations")
    .select("id, email, nom, prenom, date_arrivee, date_depart, nb_personnes, statut, stripe_checkout_id, groupe_chambres!inner(hotel_id, tarif_nuit, room_units(numero))")
    .eq("booking_ref", ref).eq("groupe_id", g.id).in("statut", ["confirmee", "paiement_differe"]);
  if (!rows || rows.length === 0) return NextResponse.json({ ok: false, error: "Réservation introuvable." }, { status: 404 });

  // Exclut ce qui est déjà payé (session Stripe déjà réglée).
  const ckoutIds = [...new Set(rows.map((r) => r.stripe_checkout_id).filter(Boolean) as string[])];
  const paid = new Set<string>();
  if (ckoutIds.length) {
    const { data: pays } = await supabaseServer.from("payments").select("stripe_checkout_id").in("stripe_checkout_id", ckoutIds).eq("status", "paid");
    for (const p of pays || []) if (p.stripe_checkout_id) paid.add(p.stripe_checkout_id);
  }
  const unpaid = rows.filter((r) => !(r.stripe_checkout_id && paid.has(r.stripe_checkout_id)));
  if (unpaid.length === 0) return NextResponse.json({ ok: false, error: "Cette réservation est déjà réglée." }, { status: 409 });

  const first = unpaid[0];
  const origin = req.headers.get("origin") || "";

  // Une session par hôtel (comptes Stripe distincts).
  type HG = { ids: string[]; lines: { name: string; amount: number }[]; total: number; taxe: number; taxePax: number };
  const byHotel = new Map<string, HG>();
  for (const r of unpaid) {
    const gc = one(r.groupe_chambres);
    const hid = gc?.hotel_id;
    if (!hid) continue;
    const n = nights(r.date_arrivee, r.date_depart);
    const pax = Math.max(1, Number(r.nb_personnes) || 1);
    const amount = Math.round(Number(gc.tarif_nuit) * n * 100);
    const h = byHotel.get(hid) || { ids: [], lines: [], total: 0, taxe: 0, taxePax: 0 };
    h.ids.push(r.id);
    h.lines.push({ name: `${g.nom} · Ch. ${one(gc.room_units)?.numero ?? "?"} · ${n} nuit(s)`, amount });
    h.total += amount;
    if (tsAjoutee) { h.taxe += Math.round(tsMontant * n * pax * 100); h.taxePax += pax * n; }
    byHotel.set(hid, h);
  }
  for (const h of byHotel.values()) {
    if (h.taxe > 0) {
      h.lines.push({ name: `Taxe de séjour · ${h.taxePax} nuitée(s) × ${tsMontant.toFixed(2)} €`, amount: h.taxe });
      h.total += h.taxe;
    }
  }

  const out: { hotelNom: string; amount: number; url: string }[] = [];
  const { data: hs } = await supabaseServer.from("hotels").select("id, nom").in("id", [...byHotel.keys()]);
  const hMap = new Map((hs || []).map((x) => [x.id, x.nom]));

  for (const [hotelId, h] of byHotel) {
    if (h.total <= 0) continue;
    const stripe = getStripeForHotel(hotelId);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: h.lines.map((l) => ({ price_data: { currency: "eur", unit_amount: l.amount, product_data: { name: l.name } }, quantity: 1 })),
      customer_email: first.email,
      metadata: { type: "groupe_resa", groupe_id: g.id, hotel_id: hotelId, booking_ref: ref },
      success_url: `${origin}/groupe/${code}?r=${ref}&paye=1`,
      cancel_url: `${origin}/groupe/${code}?r=${ref}`,
    });
    await supabaseServer.from("groupe_reservations").update({ stripe_checkout_id: session.id }).in("id", h.ids);
    await supabaseServer.from("payments").insert({
      hotel_id: hotelId, type: "groupe_resa", amount: h.total / 100, currency: "eur",
      description: `${g.nom} — ${h.lines.length} chambre(s) (paiement en ligne)`,
      client_nom: `${first.prenom || ""} ${first.nom}`.trim(), email: first.email,
      status: "open", stripe_checkout_id: session.id, hosted_invoice_url: session.url,
    });
    out.push({ hotelNom: hMap.get(hotelId) || "Hôtel", amount: h.total / 100, url: session.url! });
  }

  if (out.length === 0) return NextResponse.json({ ok: false, error: "Rien à régler." }, { status: 400 });
  return NextResponse.json({ ok: true, payments: out });
}
