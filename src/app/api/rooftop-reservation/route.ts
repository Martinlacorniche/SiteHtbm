import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { SITE_URL } from '@/lib/site';
import { supabaseServer } from '@/lib/supabase-server';

/* 🔴 CETTE ROUTE ÉTAIT UN RELAIS DE COURRIEL OUVERT. Pas d'authentification,
 * pas de secret, pas de vérification d'origine — et tous les champs étaient
 * interpolés BRUTS dans le HTML des deux messages, dont l'un part à l'adresse
 * fournie par l'appelant, depuis un domaine signé SPF/DKIM.
 *
 * Un `nom` valant `</td></tr></table><h1>Votre réservation est annulée,
 * cliquez ici…` suffisait à faire recevoir à n'importe qui un courriel
 * authentifié au nom du Rooftop des Voiles, contenant le HTML de l'attaquant.
 * Du hameçonnage avec la réputation d'envoi de l'hôtel — et, accessoirement,
 * de quoi inonder `contact-lesvoiles@` en boucle.
 *
 * Deux verrous, pas un :
 *   · LES DONNÉES VIENNENT DE LA BASE, plus du corps de la requête. On exige
 *     l'identifiant de la réservation, on la relit, et on n'écrit dans le
 *     courriel que ce que `rooftop_book` a réellement enregistré. Le
 *     destinataire est celui de la ligne, pas celui qu'on nous demande.
 *   · TOUT EST ÉCHAPPÉ quand même. Le champ `message` est saisi par un client,
 *     donc il peut contenir n'importe quoi de bonne foi — une apostrophe, un
 *     chevron — et une défense en profondeur ne coûte rien. */
const echapper = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Réservation de table au Rooftop des Voiles.
// - notifie l'équipe (contact-lesvoiles@htbm.fr)
// - envoie une confirmation au client (si email fourni) avec un lien "Ajouter à mon agenda"
// L'enregistrement en base est fait via la RPC rooftop_book côté client.
export async function POST(req: NextRequest) {
  /* ⚠️ ON VALIDE AVANT DE CONSTRUIRE QUOI QUE CE SOIT. `new Resend()` lève
   * quand la clé manque : la route rendait donc 500 sur toute requête, y
   * compris celles qu'elle aurait dû refuser proprement — et un 500 ne dit pas
   * la même chose qu'un refus, ni à un appelant ni dans un journal. */
  const recu = await req.json().catch(() => ({})) as { id?: string; source?: string };
  const source = recu.source;

  /* ⚠️ SANS IDENTIFIANT, RIEN NE PART. C'est ce qui distingue une vraie
   * réservation d'un inconnu qui veut faire envoyer un courriel par nous. */
  const id = String(recu.id ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: 'Réservation inconnue' }, { status: 400 });
  }
  const { data: ligne } = await supabaseServer
    .from('rooftop_reservations')
    .select('nom, telephone, email, date_resa, heure, couverts, message, statut, table_id')
    .eq('id', id).maybeSingle();
  if (!ligne || ligne.statut === 'annulee') {
    return NextResponse.json({ ok: false, error: 'Réservation inconnue' }, { status: 404 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: laTable } = ligne.table_id
    ? await supabaseServer.from('rooftop_tables').select('nom').eq('id', ligne.table_id).maybeSingle()
    : { data: null };

  const nom = echapper(ligne.nom);
  const telephone = echapper(ligne.telephone);
  const message = echapper(ligne.message);
  const couverts = Number(ligne.couverts) || 1;
  const heure = echapper(ligne.heure);
  const table = echapper(laTable?.nom ?? '');
  const date = String(ligne.date_resa ?? '');
  /* Le destinataire est celui de la LIGNE. On ne poste jamais à une adresse
     que l'appelant a choisie. */
  const email = String(ligne.email ?? '').trim();

  /* ⚠️ PAS DEUX COURRIELS POUR UN MÊME SÉJOUR.
   *
   * Quand la table est prise depuis le tunnel de réservation (`source:
   * 'tunnel'`), le client vient de recevoir la confirmation de sa chambre et a
   * la table sous les yeux sur l'écran de confirmation. Lui envoyer en plus la
   * confirmation rooftop, c'est deux courriels à la minute près pour une seule
   * décision — et le second fait douter du premier.
   * L'équipe, elle, est prévenue dans TOUS les cas : c'est elle qui dresse. */
  const depuisTunnel = source === 'tunnel';

  const dateFr = (() => {
    try {
      return new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return date; }
  })();

  // ── Lien "Ajouter à mon agenda" (Google Calendar) ──────────────────────────
  const calLink = (() => {
    try {
      const m = String(heure).match(/(\d{1,2})\s*h\s*(\d{0,2})/i);
      const h = m ? parseInt(m[1], 10) : 19;
      const min = m && m[2] ? parseInt(m[2], 10) : 0;
      const ymd = String(date).replace(/-/g, '');
      const pad = (n: number) => String(n).padStart(2, '0');
      const start = `${ymd}T${pad(h)}${pad(min)}00`;
      const end = `${ymd}T${pad(Math.min(h + 2, 23))}${pad(min)}00`;
      const p = new URLSearchParams({
        action: 'TEMPLATE',
        text: 'Rooftop Les Voiles — Table réservée',
        dates: `${start}/${end}`,
        details: `Réservation pour ${couverts} personne(s) à ${heure}.`,
        location: 'Hôtel-Rooftop Les Voiles, 124 rue Gubler, 83000 Toulon',
      });
      return `https://calendar.google.com/calendar/render?${p.toString()}`;
    } catch { return null; }
  })();

  // ── 1) Notif équipe ─────────────────────────────────────────────────────────
  const { error: teamErr } = await resend.emails.send({
    from: 'Rooftop Les Voiles <demandes@send.hotel-corniche.com>',
    to: 'contact-lesvoiles@htbm.fr',
    replyTo: email || undefined,
    subject: `🍸 Réservation Rooftop · ${dateFr} ${heure} — ${nom} (${couverts} pers.)`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
        <div style="background: #004e7c; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="margin: 0; color: #C6A972; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">Rooftop Les Voiles · Réservation</p>
          <h1 style="margin: 8px 0 0; color: #fff; font-size: 20px; font-weight: 700;">${dateFr} · ${heure}</h1>
        </div>
        <div style="background: #f8fafc; padding: 28px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px; width: 120px;">Nom</td><td style="padding: 8px 0; font-weight: 600;">${nom}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Couverts</td><td style="padding: 8px 0;">${couverts} personne(s)</td></tr>
            ${table ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Table</td><td style="padding: 8px 0;">${table}</td></tr>` : ''}
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Date</td><td style="padding: 8px 0;">${dateFr}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Heure</td><td style="padding: 8px 0;">${heure}</td></tr>
            ${telephone ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Téléphone</td><td style="padding: 8px 0;">${telephone}</td></tr>` : ''}
            ${email ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #004e7c;">${email}</a></td></tr>` : ''}
            ${message ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px; vertical-align: top;">Message</td><td style="padding: 8px 0; font-style: italic;">${message}</td></tr>` : ''}
          </table>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">Réservation confirmée via la vitrine Rooftop.</p>
          </div>
        </div>
      </div>
    `,
  });

  if (teamErr) console.error('Resend error (rooftop team):', teamErr);

  // ── 2) Confirmation client (best-effort) ────────────────────────────────────
  // Sautée depuis le tunnel : voir `depuisTunnel` en tête de fichier.
  if (email && !depuisTunnel) {
    const { error: clientErr } = await resend.emails.send({
      from: 'Rooftop Les Voiles <demandes@send.hotel-corniche.com>',
      to: email,
      subject: `Votre table au Rooftop des Voiles — ${dateFr} à ${heure}`,
      html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
        <div style="background: #013a5c; padding: 26px 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <p style="margin: 0; color: #C6A972; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;">Rooftop · Les Voiles · Toulon</p>
          <h1 style="margin: 10px 0 0; color: #fff; font-size: 22px; font-weight: 700;">C'est réservé ! 🥂</h1>
        </div>
        <div style="background: #ffffff; padding: 28px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 16px; font-size: 15px;">Bonjour ${nom},</p>
          <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.55;">
            Votre table vous attend au Rooftop des Voiles. On a hâte de vous accueillir face à la rade !
          </p>
          <table style="width: 100%; border-collapse: collapse; background: #f9f5ef; border-radius: 10px;">
            <tr><td style="padding: 12px 16px 4px; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">Quand</td></tr>
            <tr><td style="padding: 0 16px 12px; font-size: 16px; font-weight: 600; text-transform: capitalize;">${dateFr} · ${heure}</td></tr>
            <tr><td style="padding: 0 16px 4px; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">Pour</td></tr>
            <tr><td style="padding: 0 16px 14px; font-size: 15px;">${couverts} personne(s)</td></tr>
          </table>
          ${calLink ? `
          <div style="text-align: center; margin: 24px 0 8px;">
            <a href="${calLink}" style="background: #C6A972; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 13px 26px; border-radius: 9999px; display: inline-block;">📅 Ajouter à mon agenda</a>
          </div>` : ''}
          <div style="text-align: center; margin: 10px 0 0;">
            <a href="${SITE_URL}/rooftop-les-voiles" style="color: #004e7c; font-size: 13px; text-decoration: underline;">Revoir la carte du rooftop</a>
          </div>
          <p style="margin: 20px 0 0; font-size: 12px; color: #94a3b8; line-height: 1.55; text-align: center;">
            Un empêchement ? Appelez-nous au 04 94 41 36 23.<br/>Hôtel-Rooftop Les Voiles · 124 rue Gubler, Toulon
          </p>
        </div>
      </div>
      `,
    });
    if (clientErr) console.error('Resend error (rooftop client):', clientErr);
  }

  return NextResponse.json({ ok: !teamErr });
}
