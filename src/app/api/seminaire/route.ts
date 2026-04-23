import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { nom, societe, email, telephone, types, pax, budget, dates, notes } = await req.json();

  const validDates = (dates as string[]).filter(Boolean);

  await resend.emails.send({
    from: 'BW+ La Corniche <onboarding@resend.dev>',
    to: process.env.ALERT_EMAIL!,
    subject: `🔔 Nouvelle demande · ${(types as string[]).join(', ')} — ${nom}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
        <div style="background: #0f172a; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="margin: 0; color: #94a3b8; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;">BW+ La Corniche · Nouvelle demande</p>
          <h1 style="margin: 8px 0 0; color: #fff; font-size: 20px; font-weight: 700;">${(types as string[]).join(' + ')}</h1>
        </div>
        <div style="background: #f8fafc; padding: 28px 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px; width: 120px;">Nom</td><td style="padding: 8px 0; font-weight: 600;">${nom}${societe ? ` · ${societe}` : ''}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #3b82f6;">${email}</a></td></tr>
            ${telephone ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Téléphone</td><td style="padding: 8px 0;">${telephone}</td></tr>` : ''}
            ${pax ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Personnes</td><td style="padding: 8px 0;">${pax}</td></tr>` : ''}
            ${budget ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Budget</td><td style="padding: 8px 0;">${budget}</td></tr>` : ''}
            ${validDates.length > 0 ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px;">Date(s)</td><td style="padding: 8px 0;">${validDates.join(', ')}</td></tr>` : ''}
            ${notes ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 12px; vertical-align: top;">Notes</td><td style="padding: 8px 0; font-style: italic;">${notes}</td></tr>` : ''}
          </table>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">Demande reçue via le site web · ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
