import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Notification de demande de réservation de table au Rooftop des Voiles.
// Envoie un email à l'équipe (contact-lesvoiles@htbm.fr). L'enregistrement en base
// (rooftop_reservations) est fait côté client en anon ; ici on ne fait que notifier.
export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { nom, telephone, email, date, heure, couverts, message } = await req.json();

  const dateFr = (() => {
    try {
      return new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return date; }
  })();

  const { error } = await resend.emails.send({
    from: 'Rooftop Les Voiles <demandes@send.hotel-corniche.com>',
    to: 'contact-lesvoiles@htbm.fr',
    replyTo: email || undefined,
    subject: `🍸 Réservation Rooftop · ${dateFr} ${heure} — ${nom} (${couverts} pers.)`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
        <div style="background: #004e7c; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="margin: 0; color: #C6A972; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">Rooftop Les Voiles · Réservation de table</p>
          <h1 style="margin: 8px 0 0; color: #fff; font-size: 20px; font-weight: 700;">${dateFr} · ${heure}</h1>
        </div>
        <div style="background: #f8fafc; padding: 28px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px; width: 120px;">Nom</td><td style="padding: 8px 0; font-weight: 600;">${nom}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Couverts</td><td style="padding: 8px 0;">${couverts} personne(s)</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Date</td><td style="padding: 8px 0;">${dateFr}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Heure</td><td style="padding: 8px 0;">${heure}</td></tr>
            ${telephone ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Téléphone</td><td style="padding: 8px 0;">${telephone}</td></tr>` : ''}
            ${email ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #004e7c;">${email}</a></td></tr>` : ''}
            ${message ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px; vertical-align: top;">Message</td><td style="padding: 8px 0; font-style: italic;">${message}</td></tr>` : ''}
          </table>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">Demande reçue via la vitrine Rooftop · à confirmer auprès du client</p>
          </div>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error('Resend error (rooftop):', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
