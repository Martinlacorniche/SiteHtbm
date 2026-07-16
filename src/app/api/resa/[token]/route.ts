import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import { teamEmailForHotel } from "@/lib/hotel-email";

function fmtD(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function litLabel(v: string | null) { return v === "twin" ? "2 lits séparés" : v === "double" ? "1 grand lit" : "—"; }

// Envoi best-effort à l'équipe de l'hôtel concerné (to résolu par l'appelant via
// hotels.email_equipe, repli ALERT_EMAIL).
async function notifyHotel(to: string | null, subject: string, html: string) {
  try {
    if (process.env.RESEND_API_KEY && to) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({ from: "Groupes HTBM <demandes@send.hotel-corniche.com>", to, subject, html });
    }
  } catch (e) { console.error("Resend notif:", e); }
}
function shell(label: string, color: string, title: string, bodyRows: string, footer: string) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
      <div style="background:${color};padding:20px 28px;border-radius:12px 12px 0 0;">
        <p style="margin:0;color:#fff;opacity:.85;font-size:11px;letter-spacing:.12em;text-transform:uppercase;">${label}</p>
        <h1 style="margin:6px 0 0;color:#fff;font-size:20px;">${title}</h1>
      </div>
      <div style="background:#f8fafc;padding:22px 28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
        <table style="width:100%;border-collapse:collapse;">${bodyRows}</table>
        <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;">${footer}</p>
      </div>
    </div>`;
}
function row(label: string, value: string, changed = false) {
  return `<tr><td style="padding:6px 0;color:#64748b;font-size:12px;width:120px;vertical-align:top;">${label}</td><td style="padding:6px 0;font-weight:600;${changed ? "color:#dc2626;" : ""}">${value}</td></tr>`;
}

// Le segment [token] porte ici le booking_ref (regroupe les chambres d'un invité).
// GET   → toutes les chambres du booking + méta du groupe
// PATCH → { action: 'update' | 'cancel', resa_id, code, ... } sur UNE chambre
//   Le code à 4 chiffres est exigé pour toute action.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function one(x: any) { return Array.isArray(x) ? x[0] : x; }

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: ref } = await params;

  const { data: rows } = await supabaseServer
    .from("groupe_reservations")
    .select("id, statut, code_pin, stripe_checkout_id, date_arrivee, date_depart, config_lit, nb_personnes, groupe_chambres(tarif_nuit, room_units(numero, pax_max, twinable, room_types(nom))), groupes(nom, code_acces, date_arrivee, date_depart, date_limite, conditions_annulation, statut, cover_image_url, mode_paiement, paiement_obligatoire)")
    .eq("booking_ref", ref);

  if (!rows || rows.length === 0) return NextResponse.json({ ok: false, error: "Réservation introuvable" }, { status: 404 });

  const g = one(rows[0].groupes);
  const today = new Date().toISOString().slice(0, 10);

  const resas = rows.map((r) => {
    const gc = one(r.groupe_chambres);
    const ru = one(gc?.room_units);
    const rt = one(ru?.room_types);
    return {
      id: r.id, statut: r.statut,
      date_arrivee: r.date_arrivee, date_depart: r.date_depart,
      config_lit: r.config_lit, nb_personnes: r.nb_personnes,
      numero: ru?.numero ?? "—", type: rt?.nom ?? null,
      pax_max: ru?.pax_max ?? 2, twinable: !!ru?.twinable, tarif: Number(gc?.tarif_nuit ?? 0),
    };
  });

  // Paiements restant à régler (chambres « en attente de paiement »).
  const pendingCkout = [...new Set(rows.filter((r) => r.statut === "en_attente_paiement" && r.stripe_checkout_id).map((r) => r.stripe_checkout_id as string))];
  let pendingPayments: { hotel_id: string; hotelNom: string; amount: number; url: string }[] = [];
  if (pendingCkout.length) {
    const { data: pays } = await supabaseServer.from("payments").select("hotel_id, amount, hosted_invoice_url, stripe_checkout_id").in("stripe_checkout_id", pendingCkout).eq("status", "open");
    if (pays && pays.length) {
      const { data: hs } = await supabaseServer.from("hotels").select("id, nom").in("id", [...new Set(pays.map((p) => p.hotel_id))]);
      const hMap = new Map((hs || []).map((x) => [x.id, x.nom]));
      pendingPayments = pays.filter((p) => p.hosted_invoice_url).map((p) => ({ hotel_id: p.hotel_id, hotelNom: hMap.get(p.hotel_id) || "Hôtel", amount: Number(p.amount), url: p.hosted_invoice_url as string }));
    }
  }

  // Paiement en ligne à la demande (modes « Sur place » / « Programmé ») : dispo
  // s'il reste au moins une chambre tenue et non encore réglée.
  const mode: string = g?.mode_paiement || (g?.paiement_obligatoire ? "immediat" : "aucun");
  let canPayOnline = false;
  if (mode === "optionnel" || mode === "differe") {
    const ckoutIds = [...new Set(rows.filter((r) => r.stripe_checkout_id).map((r) => r.stripe_checkout_id as string))];
    const paidCkout = new Set<string>();
    if (ckoutIds.length) {
      const { data: pays } = await supabaseServer.from("payments").select("stripe_checkout_id").in("stripe_checkout_id", ckoutIds).eq("status", "paid");
      for (const p of pays || []) if (p.stripe_checkout_id) paidCkout.add(p.stripe_checkout_id);
    }
    canPayOnline = rows.some((r) =>
      (r.statut === "confirmee" || r.statut === "paiement_differe") &&
      !(r.stripe_checkout_id && paidCkout.has(r.stripe_checkout_id)));
  }

  return NextResponse.json({
    ok: true,
    resas,
    pendingPayments,
    canPayOnline,
    // La page ne doit pas réclamer un code que l'invité n'a jamais créé.
    hasPin: !!rows[0].code_pin,
    groupe: {
      nom: g?.nom, code: g?.code_acces, date_arrivee: g?.date_arrivee, date_depart: g?.date_depart, date_limite: g?.date_limite,
      conditions_annulation: g?.conditions_annulation, cover_image_url: g?.cover_image_url,
      locked: g?.statut !== "actif" || today > g?.date_limite,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: ref } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 }); }
  const { action, resa_id, code } = body;

  const { data: rows } = await supabaseServer
    .from("groupe_reservations")
    .select("id, code_pin, statut, date_arrivee, date_depart, config_lit, nb_personnes, nom, prenom, email, tel, groupes(nom, date_arrivee, date_depart, date_limite, statut), groupe_chambres(hotel_id, room_units(numero, pax_max, twinable))")
    .eq("booking_ref", ref);
  if (!rows || rows.length === 0) return NextResponse.json({ ok: false, error: "Réservation introuvable" }, { status: 404 });

  // Code exigé SEULEMENT si la résa en a un. Il est devenu facultatif en mode 'pro'
  // (Martin 2026-07-16) et le `!pin` d'origine renvoyait alors un 403 à TOUT LE MONDE :
  // la réservation devenait ingérable, même avec le lien magique.
  // Sans code, le TOKEN du lien (32 car. aléatoires, envoyé au seul invité) fait foi —
  // c'est le même secret qui donne accès à la page de gestion.
  const pin = rows[0].code_pin;
  if (pin && String(code || "").trim() !== pin) return NextResponse.json({ ok: false, error: "Code à 4 chiffres incorrect." }, { status: 403 });

  const g = one(rows[0].groupes);
  const today = new Date().toISOString().slice(0, 10);
  if (g.statut !== "actif" || today > g.date_limite) return NextResponse.json({ ok: false, error: "La date limite est passée : contactez l'hôtel." }, { status: 403 });

  const target = rows.find((r) => r.id === resa_id);
  if (!target) return NextResponse.json({ ok: false, error: "Chambre introuvable dans cette réservation." }, { status: 400 });

  const nowIso = new Date().toISOString();
  const gc = one(target.groupe_chambres);
  const ru = one(gc?.room_units);
  const guest = `${target.prenom || ""} ${target.nom || ""}`.trim();
  const numero = ru?.numero ?? "?";
  const to = await teamEmailForHotel(gc?.hotel_id);

  if (action === "cancel") {
    const { error } = await supabaseServer.from("groupe_reservations")
      .update({ statut: "annulee", annulee_at: nowIso, derniere_action: "annulation", vu_backoffice: false, pms_done: false, modified_at: nowIso })
      .eq("id", resa_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await notifyHotel(
      to,
      `❌ Annulation · ${g.nom} — Ch. ${numero}`,
      shell("Annulation", "#dc2626", `${guest} — Chambre ${numero}`,
        row("Groupe", g.nom) + row("Statut", "ANNULÉE par l'invité", true) + row("Séjour", `${fmtD(target.date_arrivee)} → ${fmtD(target.date_depart)}`) + row("Contact", `${target.email || "—"} · ${target.tel || "—"}`),
        "⚠️ À RETIRER du PMS, puis cocher « Traité PMS » dans le back-office."),
    );
    return NextResponse.json({ ok: true });
  }

  if (action === "update") {
    if (target.statut !== "confirmee") return NextResponse.json({ ok: false, error: "Chambre non modifiable." }, { status: 400 });
    const da = body.date_arrivee || target.date_arrivee;
    const dd = body.date_depart || target.date_depart;
    if (da < g.date_arrivee || dd > g.date_depart || dd <= da) return NextResponse.json({ ok: false, error: "Dates hors des bornes du séjour." }, { status: 400 });
    const lit = ru?.twinable ? (body.config_lit === "twin" ? "twin" : "double") : target.config_lit;
    const pax = body.nb_personnes != null ? Math.max(1, parseInt(body.nb_personnes) || 1) : target.nb_personnes;
    if (ru && pax > ru.pax_max) return NextResponse.json({ ok: false, error: `Cette chambre accueille ${ru.pax_max} personne(s) max.` }, { status: 400 });

    const { error } = await supabaseServer.from("groupe_reservations")
      .update({ date_arrivee: da, date_depart: dd, config_lit: lit, nb_personnes: pax, derniere_action: "modification", vu_backoffice: false, pms_done: false, modified_at: nowIso })
      .eq("id", resa_id);
    // Déplacer ses dates peut désormais TOMBER SUR un autre séjour de la même chambre
    // (23P01 = contrainte d'exclusion, migration 82) → message lisible plutôt que le brut SQL.
    if (error) {
      if (error.code === "23P01" || error.code === "23505")
        return NextResponse.json({ ok: false, error: "Ces nuits sont déjà prises sur cette chambre. Choisissez d'autres dates." }, { status: 409 });
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Email avec les changements en rouge (old → new)
    const dChanged = da !== target.date_arrivee || dd !== target.date_depart;
    const litChanged = lit !== target.config_lit;
    const paxChanged = pax !== target.nb_personnes;
    await notifyHotel(
      to,
      `✏️ Modification · ${g.nom} — Ch. ${numero}`,
      shell("Modification", "#d97706", `${guest} — Chambre ${numero}`,
        row("Groupe", g.nom) +
        row("Séjour", dChanged ? `${fmtD(target.date_arrivee)} → ${fmtD(target.date_depart)} &nbsp;➜&nbsp; <u>${fmtD(da)} → ${fmtD(dd)}</u>` : `${fmtD(da)} → ${fmtD(dd)}`, dChanged) +
        (ru?.twinable ? row("Lits", litChanged ? `${litLabel(target.config_lit)} ➜ <u>${litLabel(lit)}</u>` : litLabel(lit), litChanged) : "") +
        row("Personnes", paxChanged ? `${target.nb_personnes} ➜ <u>${pax}</u>` : String(pax), paxChanged) +
        row("Contact", `${target.email || "—"} · ${target.tel || "—"}`),
        "🔴 Réservation re-passée « à traiter » : mettez à jour le PMS puis cochez « Traité PMS »."),
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}
