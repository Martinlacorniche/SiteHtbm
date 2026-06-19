import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";

// POST /api/groupe/[code]/reserve
// Réserve une OU plusieurs chambres en une fois (booking_ref partagé).
// Insert atomique : l'index unique partiel (1 résa confirmée par chambre)
// fait échouer tout le batch si une chambre est déjà prise.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function one(x: any) { return Array.isArray(x) ? x[0] : x; }

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 }); }

  const { rooms, nom, prenom, email, tel, date_arrivee, date_depart, signature, cgv, pin } = body;

  if (!Array.isArray(rooms) || rooms.length === 0) return NextResponse.json({ ok: false, error: "Sélectionnez au moins une chambre." }, { status: 400 });
  if (!nom || !email) return NextResponse.json({ ok: false, error: "Nom et email sont requis." }, { status: 400 });
  if (!cgv) return NextResponse.json({ ok: false, error: "Vous devez accepter les conditions." }, { status: 400 });
  if (!/^\d{4}$/.test(String(pin || ""))) return NextResponse.json({ ok: false, error: "Choisissez un code à 4 chiffres." }, { status: 400 });

  const { data: g } = await supabaseServer.from("groupes").select("*").eq("code_acces", code).maybeSingle();
  if (!g) return NextResponse.json({ ok: false, error: "Groupe introuvable" }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  if (g.statut !== "actif" || today > g.date_limite) return NextResponse.json({ ok: false, error: "Les inscriptions sont closes." }, { status: 403 });

  const da = date_arrivee || g.date_arrivee;
  const dd = date_depart || g.date_depart;
  if (da < g.date_arrivee || dd > g.date_depart || dd <= da) return NextResponse.json({ ok: false, error: "Dates hors des bornes du séjour." }, { status: 400 });

  // Vérifie que chaque chambre appartient au groupe + capacité
  const ids = rooms.map((r: { groupe_chambre_id: string }) => r.groupe_chambre_id);
  const { data: gcs } = await supabaseServer
    .from("groupe_chambres")
    .select("id, groupe_id, room_units(numero, pax_max, twinable)")
    .in("id", ids);
  const gcMap = new Map((gcs || []).map((x) => [x.id, x]));

  for (const r of rooms) {
    const gc = gcMap.get(r.groupe_chambre_id);
    if (!gc || gc.groupe_id !== g.id) return NextResponse.json({ ok: false, error: "Chambre invalide." }, { status: 400 });
    const ru = one(gc.room_units);
    const pax = Math.max(1, parseInt(r.nb_personnes) || 1);
    if (ru && pax > ru.pax_max) return NextResponse.json({ ok: false, error: `Une chambre dépasse sa capacité (${ru.pax_max} max).` }, { status: 400 });
  }

  const bookingRef = crypto.randomUUID();

  // Signature (une seule pour tout le booking) → bucket privé
  let sigPath: string | null = null;
  if (typeof signature === "string" && signature.startsWith("data:image")) {
    const buf = Buffer.from(signature.split(",")[1] || "", "base64");
    const path = `${g.id}/${bookingRef}.png`;
    const up = await supabaseServer.storage.from("groupe-signatures").upload(path, buf, { contentType: "image/png", upsert: true });
    if (!up.error) sigPath = path;
  }

  const nowIso = new Date().toISOString();
  const insertRows = rooms.map((r: { groupe_chambre_id: string; config_lit?: string; nb_personnes?: number }) => {
    const gc = gcMap.get(r.groupe_chambre_id);
    const ru = one(gc!.room_units);
    const lit = ru?.twinable ? (r.config_lit === "twin" ? "twin" : "double") : null;
    return {
      groupe_id: g.id,
      groupe_chambre_id: r.groupe_chambre_id,
      booking_ref: bookingRef,
      token: crypto.randomUUID().replace(/-/g, ""),
      code_pin: String(pin),
      nom, prenom: prenom || null, email, tel: tel || null,
      date_arrivee: da, date_depart: dd,
      config_lit: lit, nb_personnes: Math.max(1, parseInt(String(r.nb_personnes)) || 1),
      signature_url: sigPath, cgv_acceptees_at: nowIso,
      statut: "confirmee", derniere_action: "creation", vu_backoffice: false,
    };
  });

  const { error } = await supabaseServer.from("groupe_reservations").insert(insertRows);
  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: false, error: "Une des chambres vient d'être réservée par quelqu'un d'autre." }, { status: 409 });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Notification hôtel (best-effort ; domaine de test Resend → ALERT_EMAIL)
  try {
    if (process.env.RESEND_API_KEY && process.env.ALERT_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const roomRows = rooms.map((r: { groupe_chambre_id: string; config_lit?: string; nb_personnes?: number }) => {
        const ru = one(gcMap.get(r.groupe_chambre_id)!.room_units);
        const lit = ru?.twinable ? (r.config_lit === "twin" ? "2 lits séparés" : "1 grand lit") : "—";
        const pax = Math.max(1, parseInt(String(r.nb_personnes)) || 1);
        return `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;">Ch. ${ru?.numero ?? "?"}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${lit}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${pax} pers.</td></tr>`;
      }).join("");
      await resend.emails.send({
        from: "Groupes HTBM <onboarding@resend.dev>",
        to: process.env.ALERT_EMAIL!,
        subject: `🛏️ Nouvelle réservation · ${g.nom} — ${prenom || ""} ${nom}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="background:#004e7c;padding:20px 28px;border-radius:12px 12px 0 0;">
              <p style="margin:0;color:#C6A972;font-size:11px;letter-spacing:.12em;text-transform:uppercase;">${g.nom} · Nouvelle réservation</p>
              <h1 style="margin:6px 0 0;color:#fff;font-size:20px;">${prenom || ""} ${nom}</h1>
            </div>
            <div style="background:#f8fafc;padding:22px 28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
              <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                <tr><td style="padding:6px 0;color:#64748b;font-size:12px;width:110px;">Email</td><td style="padding:6px 0;font-weight:600;"><a href="mailto:${email}" style="color:#004e7c;">${email}</a></td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Téléphone</td><td style="padding:6px 0;font-weight:600;">${tel || "—"}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-size:12px;">Séjour</td><td style="padding:6px 0;font-weight:600;">${da} → ${dd}</td></tr>
              </table>
              <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Chambres (${rooms.length})</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">${roomRows}</table>
              <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;">À saisir dans le PMS. Pensez à cocher « Traité PMS » dans le back-office.</p>
            </div>
          </div>`,
      });
    }
  } catch (e) { console.error("Resend notif:", e); }

  return NextResponse.json({ ok: true, ref: bookingRef });
}
