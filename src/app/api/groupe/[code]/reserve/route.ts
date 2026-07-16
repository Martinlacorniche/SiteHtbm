import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import { getStripeForHotel } from "@/lib/stripe";
import { teamEmailForHotel } from "@/lib/hotel-email";

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
  if (!nom) return NextResponse.json({ ok: false, error: "Le nom est requis." }, { status: 400 });
  if (!cgv) return NextResponse.json({ ok: false, error: "Vous devez accepter les conditions." }, { status: 400 });

  const { data: g } = await supabaseServer.from("groupes").select("*").eq("code_acces", code).maybeSingle();
  if (!g) return NextResponse.json({ ok: false, error: "Groupe introuvable" }, { status: 404 });

  // Mode 'pro' (tournage, séminaire…) : le nom SUFFIT. Email, téléphone et code PIN deviennent
  // facultatifs — on ne fait pas remplir un formulaire de client individuel à 18 comédiens dont
  // la production gère déjà tout (Martin 2026-07-16).
  // ⚠️ Conséquence assumée : sans email ET sans PIN, l'invité n'a aucun moyen de revenir sur sa
  // résa (ni lien magique, ni code) → c'est la réception/production qui la gère.
  const isPro = g.mode_vue === "pro";
  if (!isPro && !email) return NextResponse.json({ ok: false, error: "Nom et email sont requis." }, { status: 400 });
  const pinStr = String(pin || "");
  if (pinStr && !/^\d{4}$/.test(pinStr)) return NextResponse.json({ ok: false, error: "Le code doit faire 4 chiffres." }, { status: 400 });
  if (!isPro && !pinStr) return NextResponse.json({ ok: false, error: "Choisissez un code à 4 chiffres." }, { status: 400 });
  // Le paiement en ligne exige un email (Stripe l'envoie au client) → on l'impose là seulement.
  const modeP: string = g.mode_paiement || (g.paiement_obligatoire ? "immediat" : "aucun");
  if ((modeP === "immediat" || modeP === "differe") && !email)
    return NextResponse.json({ ok: false, error: "Un email est requis pour le règlement en ligne." }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  if (g.statut !== "actif" || today > g.date_limite) return NextResponse.json({ ok: false, error: "Les inscriptions sont closes." }, { status: 403 });

  const da = date_arrivee || g.date_arrivee;
  const dd = date_depart || g.date_depart;
  if (da < g.date_arrivee || dd > g.date_depart || dd <= da) return NextResponse.json({ ok: false, error: "Dates hors des bornes du séjour." }, { status: 400 });

  // Vérifie que chaque chambre appartient au groupe + capacité
  const ids = rooms.map((r: { groupe_chambre_id: string }) => r.groupe_chambre_id);
  const { data: gcs } = await supabaseServer
    .from("groupe_chambres")
    .select("id, groupe_id, hotel_id, tarif_nuit, room_units(numero, pax_max, twinable)")
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

  // Mode de paiement (4 modes ; repli sur l'ancien booléen pour compat).
  const mode: string = modeP;
  const immediat = mode === "immediat";
  const differe = mode === "differe";
  const nights = Math.max(1, Math.round((new Date(dd).getTime() - new Date(da).getTime()) / 86400000));
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
      code_pin: pinStr || null,
      nom, prenom: prenom || null, email: email || null, tel: tel || null,
      date_arrivee: da, date_depart: dd,
      config_lit: lit, nb_personnes: Math.max(1, parseInt(String(r.nb_personnes)) || 1),
      signature_url: sigPath, cgv_acceptees_at: nowIso,
      // immédiat → tenue en attente de paiement ; différé → tenue jusqu'au lien
      // envoyé + 48h ; optionnel/aucun → confirmée directement.
      statut: immediat ? "en_attente_paiement" : differe ? "paiement_differe" : "confirmee",
      derniere_action: "creation", vu_backoffice: false,
    };
  });

  const { data: inserted, error } = await supabaseServer
    .from("groupe_reservations").insert(insertRows).select("id, groupe_chambre_id");
  if (error) {
    // 23505 = ancien index unique (1 résa/chambre) · 23P01 = contrainte d'EXCLUSION
    // anti-chevauchement (migration 82). Sans 23P01, un conflit de dates renvoyait le
    // message brut de Postgres à l'invité.
    if (error.code === "23505" || error.code === "23P01")
      return NextResponse.json({ ok: false, error: "Ces nuits viennent d'être réservées par quelqu'un d'autre. Choisissez d'autres dates ou une autre chambre." }, { status: 409 });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // ── PAIEMENT IMMÉDIAT : une session Checkout PAR HÔTEL (comptes Stripe distincts) ──
  if (immediat) {
    const origin = req.headers.get("origin") || "http://localhost:3001";
    type HG = { resaIds: string[]; lines: { name: string; amount: number }[]; total: number };
    const byHotel = new Map<string, HG>();
    for (const ins of inserted || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gc: any = gcMap.get(ins.groupe_chambre_id);
      if (!gc) continue;
      const ru = one(gc.room_units);
      const amount = Math.round(Number(gc.tarif_nuit) * nights * 100); // cents
      const h = byHotel.get(gc.hotel_id) || { resaIds: [], lines: [], total: 0 };
      h.resaIds.push(ins.id);
      h.lines.push({ name: `${g.nom} · Ch. ${ru?.numero ?? "?"} · ${nights} nuit(s)`, amount });
      h.total += amount;
      byHotel.set(gc.hotel_id, h);
    }

    const { data: hotelsData } = await supabaseServer.from("hotels").select("id, nom").in("id", [...byHotel.keys()]);
    const hotelNom = new Map((hotelsData || []).map((x) => [x.id, x.nom]));

    const paymentsOut: { hotel_id: string; hotelNom: string; amount: number; url: string }[] = [];
    for (const [hotelId, h] of byHotel) {
      const stripe = getStripeForHotel(hotelId);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: h.lines.map((l) => ({ price_data: { currency: "eur", unit_amount: l.amount, product_data: { name: l.name } }, quantity: 1 })),
        customer_email: email,
        metadata: { type: "groupe_resa", groupe_id: g.id, hotel_id: hotelId, booking_ref: bookingRef },
        success_url: `${origin}/groupe/${code}?r=${bookingRef}&paye=1`,
        cancel_url: `${origin}/groupe/${code}`,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60, // ~30 min de blocage
      });
      await supabaseServer.from("groupe_reservations").update({ stripe_checkout_id: session.id }).in("id", h.resaIds);
      await supabaseServer.from("payments").insert({
        hotel_id: hotelId, type: "groupe_resa", amount: h.total / 100, currency: "eur",
        description: `${g.nom} — ${h.lines.length} chambre(s)`, client_nom: `${prenom || ""} ${nom}`.trim(),
        email, status: "open", stripe_checkout_id: session.id, hosted_invoice_url: session.url,
      });
      paymentsOut.push({ hotel_id: hotelId, hotelNom: hotelNom.get(hotelId) || "Hôtel", amount: h.total / 100, url: session.url! });
    }

    return NextResponse.json({ ok: true, ref: bookingRef, requirePayment: true, payments: paymentsOut });
  }

  // Notification hôtel (best-effort). Routée PAR HÔTEL via hotels.email_equipe
  // (repli ALERT_EMAIL) : un booking bi-hôtel prévient chaque équipe concernée,
  // avec uniquement ses chambres.
  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const roomRowsOf = (rs: { groupe_chambre_id: string; config_lit?: string; nb_personnes?: number }[]) =>
        rs.map((r) => {
          const ru = one(gcMap.get(r.groupe_chambre_id)!.room_units);
          const lit = ru?.twinable ? (r.config_lit === "twin" ? "2 lits séparés" : "1 grand lit") : "—";
          const pax = Math.max(1, parseInt(String(r.nb_personnes)) || 1);
          return `<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;font-weight:600;">Ch. ${ru?.numero ?? "?"}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${lit}</td><td style="padding:6px 10px;border:1px solid #e2e8f0;">${pax} pers.</td></tr>`;
        }).join("");

      // Regroupe les chambres réservées par hôtel.
      const byHotelRooms = new Map<string, { groupe_chambre_id: string; config_lit?: string; nb_personnes?: number }[]>();
      for (const r of rooms) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gc: any = gcMap.get(r.groupe_chambre_id);
        const hid = gc?.hotel_id;
        if (!hid) continue;
        if (!byHotelRooms.has(hid)) byHotelRooms.set(hid, []);
        byHotelRooms.get(hid)!.push(r);
      }

      for (const [hid, hrooms] of byHotelRooms) {
        const to = await teamEmailForHotel(hid);
        if (!to) continue;
        await resend.emails.send({
          from: "BW+ La Corniche <paiement@send.hotel-corniche.com>",
          to,
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
              <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Chambres (${hrooms.length})</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">${roomRowsOf(hrooms)}</table>
              <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;">À saisir dans le PMS. Pensez à cocher « Traité PMS » dans le back-office.</p>
            </div>
          </div>`,
        });
      }

      // Confirmation au CLIENT — seulement s'il a laissé un email (facultatif en mode 'pro').
      if (email) {
        const roomRows = roomRowsOf(rooms);
        const origin = req.headers.get("origin") || "";
        const fmtFr = (d: string) => { try { return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch { return d; } };
        const gestionUrl = origin ? `${origin}/groupe/${code}?r=${bookingRef}` : "";

        // Encart paiement selon le mode (charte HTBM). Rien en mode 'aucun' : personne ne règle.
        const paymentNote =
          differe && g.date_envoi_paiement
            ? `<div style="margin:0 0 16px;padding:14px 16px;background:#fbf7ef;border:1px solid #e5d9c3;border-radius:10px;">
                 <p style="margin:0;color:#8a6d3b;font-size:13px;line-height:1.5;">💳 Un lien de paiement sécurisé vous sera envoyé le <strong>${fmtFr(g.date_envoi_paiement)}</strong>. Vous aurez ensuite <strong>48&nbsp;heures</strong> pour régler, sans quoi la chambre sera automatiquement remise à disposition.</p>
               </div>`
            : mode === "optionnel" && gestionUrl
            ? `<div style="margin:0 0 16px;padding:14px 16px;background:#fbf7ef;border:1px solid #e5d9c3;border-radius:10px;">
                 <p style="margin:0 0 10px;color:#8a6d3b;font-size:13px;line-height:1.5;">Le règlement se fera directement à l'hôtel. Si vous préférez, vous pouvez aussi régler en ligne dès maintenant, en toute sécurité :</p>
                 <a href="${gestionUrl}" style="display:inline-block;background:#C6A972;color:#1e293b;padding:9px 18px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">Payer en ligne</a>
               </div>`
            : "";

        // Mode 'pro' : le mail parle du GROUPE, pas d'un client individuel (Martin 2026-07-16).
        // Il reprend le message d'accueil du groupe, ne réclame rien, et ne promet un code que
        // si l'invité en a réellement choisi un.
        const intro = isPro
          ? `<p style="margin:0 0 14px;">Bonjour ${prenom || nom}, votre chambre est réservée pour <strong>${g.nom}</strong>. Voici le récapitulatif :</p>`
          : `<p style="margin:0 0 14px;">Bonjour ${prenom || nom}, votre réservation est confirmée. Voici le récapitulatif :</p>`;
        const accueil = isPro && g.message_accueil
          ? `<div style="margin:0 0 16px;padding:14px 16px;background:#f1f5f9;border-radius:10px;"><p style="margin:0;font-size:13px;line-height:1.55;color:#475569;">${g.message_accueil}</p></div>`
          : "";
        const priseEnCharge = isPro && mode === "aucun"
          ? `<div style="margin:0 0 16px;padding:14px 16px;background:#f0f7f4;border:1px solid #cfe3d8;border-radius:10px;">
               <p style="margin:0;color:#2f6b4f;font-size:13px;line-height:1.5;">✅ Rien à régler : votre hébergement est pris en charge dans le cadre de <strong>${g.nom}</strong>.</p>
             </div>`
          : "";
        const pied = pinStr
          ? `<p style="margin:14px 0 0;color:#94a3b8;font-size:11px;text-align:center;">Votre code à 4 chiffres vous sera demandé pour modifier ou annuler.</p>`
          : isPro
          ? `<p style="margin:14px 0 0;color:#94a3b8;font-size:11px;text-align:center;">Pour toute modification, contactez la réception ou votre production.</p>`
          : "";

        await resend.emails.send({
          from: "BW+ La Corniche <paiement@send.hotel-corniche.com>",
          to: email,
          subject: isPro ? `Votre chambre est réservée · ${g.nom}` : `Votre réservation est confirmée · ${g.nom}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
              <div style="background:#004e7c;padding:20px 28px;border-radius:12px 12px 0 0;">
                <p style="margin:0;color:#C6A972;font-size:11px;letter-spacing:.12em;text-transform:uppercase;">${g.nom}</p>
                <h1 style="margin:6px 0 0;color:#fff;font-size:20px;">${isPro ? "Chambre réservée" : "Réservation confirmée"}</h1>
              </div>
              <div style="background:#f8fafc;padding:22px 28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
                ${intro}
                ${accueil}
                <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
                  <tr><td style="padding:6px 0;color:#64748b;font-size:12px;width:110px;">Séjour</td><td style="padding:6px 0;font-weight:600;">${fmtFr(da)} → ${fmtFr(dd)}</td></tr>
                </table>
                <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">${roomRows}</table>
                ${priseEnCharge}
                ${paymentNote}
                ${gestionUrl ? `<p style="margin:4px 0 0;text-align:center;"><a href="${gestionUrl}" style="background:#004e7c;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;">Voir / gérer ma réservation</a></p>` : ""}
                ${pied}
              </div>
            </div>`,
        });
      }
    }
  } catch (e) { console.error("Resend notif:", e); }

  return NextResponse.json({ ok: true, ref: bookingRef, requirePayment: false });
}
