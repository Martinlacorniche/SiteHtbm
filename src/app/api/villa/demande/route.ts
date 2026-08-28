import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabase-server';
import { ALERTES } from '@/lib/villaContenu';
import { chambresLibres } from '@/lib/mewsBooking';
import { CAPACITE, devis, nuitsEntre, type Formule } from '@/lib/villa';

/* La demande de privatisation.
 *
 *   POST /api/villa/demande
 *
 * ⚠️ ELLE NE RÉSERVE RIEN, ET C'EST VOULU.
 * Elle dépose une intention dans `villa_demandes`, que le back-office
 * transforme (ou non) en groupe, en allotement Mews et en lien
 * /groupe/<code>. Poser un bloc sur un simple formulaire retirerait seize
 * chambres de la vente sans qu'un humain l'ait décidé — et le prix de la
 * privatisation se négocie de toute façon.
 *
 * ⚠️ LA DISPONIBILITÉ EST RELUE ICI, PAS REÇUE DU NAVIGATEUR.
 * L'écran a déjà interrogé `/api/villa/dispo`, mais ce qu'il en a retenu
 * traverse le réseau et se maquille en deux clics. On redemande à Mews et on
 * enregistre NOTRE lecture. Ce n'est pas de la défiance envers le client :
 * c'est que ce chiffre sert ensuite à expliquer une décision commerciale.
 */

export const dynamic = 'force-dynamic';

type Corps = {
  arrivee?: string; depart?: string; personnes?: number;
  formule?: string;
  nom?: string; email?: string; telephone?: string; societe?: string;
  message?: string; langue?: string; source?: string;
};

const estDate = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
// Volontairement large, comme dans le tunnel : valider une adresse plus
// finement que « quelque chose, un @, quelque chose, un point » rejette des
// adresses valides.
const estEmail = (s: unknown): s is string =>
  typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
// Coupe sans jamais refuser : un message trop long est tronqué, pas rejeté.
// Perdre une demande commerciale pour une limite de caractères serait absurde.
const texte = (v: unknown, max: number): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};

export async function POST(req: NextRequest) {
  let c: Corps;
  try { c = await req.json(); } catch { return NextResponse.json({ erreur: 'requete illisible' }, { status: 400 }); }

  const nom = texte(c.nom, 120);
  if (!estDate(c.arrivee) || !estDate(c.depart) || c.depart <= c.arrivee)
    return NextResponse.json({ erreur: 'dates' }, { status: 400 });
  if (!nom) return NextResponse.json({ erreur: 'nom' }, { status: 400 });
  if (!estEmail(c.email)) return NextResponse.json({ erreur: 'email' }, { status: 400 });

  const nuits = nuitsEntre(c.arrivee, c.depart);
  if (nuits < 1 || nuits > 60) return NextResponse.json({ erreur: 'dates' }, { status: 400 });

  /* On relit Mews, mais on n'en fait PAS une condition d'acceptation.
     Une demande sur des dates prises reste une demande : le commercial peut
     proposer la semaine d'à côté, ou déplacer la réservation qui gêne. La
     refuser ici, c'est jeter un client qui vient d'écrire son numéro. */
  let libres: number | null = null;
  try { libres = await chambresLibres({ arrivee: c.arrivee, depart: c.depart }); } catch { libres = null; }

  /* La formule demandée. Elle ne se déduit PAS de la disponibilité — les deux
     exigent l'hôtel entier — c'est un choix du client : combien de chambres il
     lui faut, et à quel prix. La complète par défaut : c'est la demande la
     plus fréquente, et le commercial la corrige au téléphone bien plus
     facilement qu'il ne devinerait un champ vide. */
  const formule: Formule =
    c.formule === 'demi' || c.formule === 'complete' ? c.formule : 'complete';

  const { data, error } = await supabaseServer
    .from('villa_demandes')
    .insert({
      date_arrivee: c.arrivee,
      date_depart: c.depart,
      nb_personnes: Number.isInteger(c.personnes) && c.personnes! > 0 ? Math.min(c.personnes!, 99) : null,
      nom,
      email: c.email.slice(0, 160),
      telephone: texte(c.telephone, 30),
      societe: texte(c.societe, 120),
      message: texte(c.message, 2000),
      chambres_libres: libres,
      etait_libre: libres === null ? null : libres >= CAPACITE,
      formule,
      devis_affiche: devis(formule, nuits).total,
      langue: c.langue === 'en' ? 'en' : 'fr',
      source: texte(c.source, 60),
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ erreur: 'enregistrement' }, { status: 500 });

  /* ⚠️ L'ALERTE PART APRÈS L'ENREGISTREMENT, ET N'EN CONDITIONNE PAS LE SORT.
     Si Resend tombe, la demande est déjà en base : on ne rend surtout pas une
     erreur au visiteur, qui renverrait son formulaire et créerait un doublon
     pour un problème qui n'est pas le sien. Le back-office la verra de toute
     façon — l'e-mail est le raccourci, pas le registre. */
  void alerter({
    id: data.id, arrivee: c.arrivee, depart: c.depart, nuits, formule,
    nom, email: c.email, telephone: texte(c.telephone, 30),
    societe: texte(c.societe, 120), message: texte(c.message, 2000),
    personnes: Number.isInteger(c.personnes) ? c.personnes! : null,
    libres, total: devis(formule, nuits).total,
  });

  return NextResponse.json({ ok: true, id: data.id });
}

/* ─────────────────────── Prévenir quelqu'un, tout de suite ───────────────────
 *
 * Sans ça, une demande tombe en base et personne ne le sait : il faudrait que
 * quelqu'un pense à ouvrir le back-office. Une privatisation se joue à la
 * vitesse de réponse — le prospect a écrit aux deux ou trois adresses qu'il a
 * trouvées, le premier qui rappelle prend l'affaire.
 *
 * ⚠️ DEUX DESTINATAIRES : le commercial ET la réception des Voiles (`ALERTES`,
 * dans `villaContenu.ts`). Le premier vend, la seconde sait ce qui se passe
 * dans l'hôtel cette semaine-là et décroche quand le prospect rappelle.
 *
 * ⚠️ LE MAIL DIT SI LA DATE ÉTAIT LIBRE, et c'est le renseignement le plus
 * utile de l'alerte : « 16 chambres libres » veut dire qu'on peut rappeler pour
 * confirmer, « 12 » qu'il faut d'abord regarder ce qui gêne. Sans lui, le
 * commercial rouvre Mews avant de savoir quoi en penser.
 */

const echappe = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Alerte = {
  id: string; arrivee: string; depart: string; nuits: number; formule: Formule;
  nom: string; email: string; telephone: string | null; societe: string | null;
  message: string | null; personnes: number | null;
  libres: number | null; total: number;
};

async function alerter(a: Alerte): Promise<void> {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) return;

  const jour = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR',
      { day: 'numeric', month: 'long', year: 'numeric' });

  const dispo = a.libres === null
    ? 'non lue (Mews injoignable)'
    : a.libres >= CAPACITE
      ? `✅ hôtel entier libre (${a.libres}/${CAPACITE})`
      : `⚠️ ${a.libres}/${CAPACITE} chambres libres — pas privatisable en l'état`;

  const ligne = (t: string, v: string) =>
    `<tr><td style="padding:8px 0;color:#64748b;font-size:12px;width:130px;vertical-align:top">${t}</td>` +
    `<td style="padding:8px 0;font-weight:600">${v}</td></tr>`;

  try {
    const resend = new Resend(cle);
    await resend.emails.send({
      from: 'Villa Les Voiles <demandes@send.hotel-corniche.com>',
      to: ALERTES,
      // Le sujet porte l'essentiel : on doit pouvoir trier sans ouvrir.
      subject: `🏨 Privatisation — ${a.nom}, ${jour(a.arrivee)} → ${jour(a.depart)}`,
      // Répondre au mail répond AU CLIENT. Sans ça le commercial recopie
      // l'adresse à la main, et c'est le genre de friction qui fait attendre
      // une demande jusqu'au lendemain.
      replyTo: a.email,
      html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <div style="background:#013a5c;padding:24px 32px;border-radius:12px 12px 0 0">
          <p style="margin:0;color:#93c5fd;font-size:11px;letter-spacing:.1em;text-transform:uppercase">Villa Les Voiles · Demande de privatisation</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:20px">${echappe(a.nom)}${a.societe ? ` · ${echappe(a.societe)}` : ''}</h1>
        </div>
        <div style="background:#f8fafc;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <table style="width:100%;border-collapse:collapse">
            ${ligne('Séjour', `${jour(a.arrivee)} → ${jour(a.depart)} (${a.nuits} nuit${a.nuits > 1 ? 's' : ''})`)}
            ${ligne('Disponibilité', dispo)}
            ${ligne('Formule', a.formule === 'complete' ? 'Villa complète (16 chambres)' : 'Demi-villa (8 chambres)')}
            ${a.personnes ? ligne('Personnes', String(a.personnes)) : ''}
            ${ligne('Devis affiché', `${a.total.toLocaleString('fr-FR')} €`)}
            ${ligne('Email', `<a href="mailto:${echappe(a.email)}" style="color:#0284c7">${echappe(a.email)}</a>`)}
            ${a.telephone ? ligne('Téléphone', `<a href="tel:${echappe(a.telephone)}" style="color:#0284c7">${echappe(a.telephone)}</a>`) : ''}
            ${a.message ? ligne('Message', `<span style="font-weight:400;font-style:italic">${echappe(a.message)}</span>`) : ''}
          </table>
          <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
            Répondre à ce mail écrit directement au client. Demande ${a.id.slice(0, 8)} · reçue le
            ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>`,
    });
  } catch (e) {
    // On journalise et on n'en fait rien de plus : la demande est en base.
    console.error('Villa — alerte non envoyée:', e);
  }
}
