import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  'https://drdlcohzfjdogyquglcs.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGxjb2h6Zmpkb2d5cXVnbGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NDk1NDYsImV4cCI6MjA2NTEyNTU0Nn0.uPRYdTX9F0ccSdCTcUta7UyzahcPCZeFmoxIpuKamME'
);

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const body = await req.json();
  const { nom, societe, email, telephone, types, pax, budget, dates, notes } = body;

  const validDates = (dates as string[]).filter(Boolean);
  const titre = [
    (types as string[]).join(' + '),
    pax ? `${pax} pers.` : null,
    budget ? `Budget : ${budget}` : null,
  ].filter(Boolean).join(' · ');
  const commentaires = [
    notes || null,
    validDates.length > 1 ? `Dates multiples : ${validDates.join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const { error } = await supabase.from('suivi_commercial').insert([{
    hotel_id: 'f9d59e56-9a2f-433e-bcf4-f9753f105f32',
    nom_client: nom,
    societe: societe || null,
    email,
    telephone: telephone || null,
    titre_demande: titre || 'Demande site web',
    commentaires: commentaires || null,
    date_evenement: validDates[0] || null,
    date_relance: new Date().toISOString().split('T')[0],
    statut: 'Nouveau',
    source: 'Site web',
    created_at: new Date().toISOString(),
  }]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
