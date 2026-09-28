// LA POLITIQUE DE CONFIDENTIALITÉ.
//
// 🔴 ELLE N'EXISTAIT PAS, ET ELLE ÉTAIT DÉJÀ PUBLIÉE. Le protocole UCP renvoie
// `privacy_policy` à chaque session de réservation : l'adresse pointait
// `/confidentialite`, une page jamais écrite. Tout agent qui vérifiait ce
// qu'on fait des données de son client tombait sur un 404.
//
// ⚠️ ET C'EST UN PRÉREQUIS D'ANNUAIRE. La politique de publication des
// connecteurs d'Anthropic rejette d'emblée un serveur sans politique de
// confidentialité — ce n'est pas négociable, et c'est la première chose
// vérifiée.
//
// ⚠️ ELLE DIT CE QUI EST VRAI, PAS CE QUI RASSURE. Les traitements décrits ici
// sont ceux que le code fait réellement : ce qui part chez Mews, chez Stripe,
// ce qu'on garde et combien de temps. Une politique générique recopiée d'un
// modèle serait fausse le jour où quelqu'un la confronte au produit.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Hôtels Toulon Bord de Mer',
  description: 'Traitement des données personnelles pour la réservation, le séjour et la relation client.',
};

const MAJ = '28 septembre 2026';

export default function Confidentialite() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-700">
      <h1 className="font-serif text-3xl text-slate-900">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : {MAJ}</p>

      <Bloc titre="Qui traite vos données">
        <p>
          <strong>SAS LES VOILES</strong>, 124 rue Gubler, 83000 Toulon — SIREN 795&nbsp;063&nbsp;304 —
          pour l’Hôtel-Rooftop Les Voiles. Le site est édité par la SARL SUERE, 17 Littoral
          Frédéric Mistral, 83000 Toulon.
        </p>
      </Bloc>

      <Bloc titre="Ce que nous collectons, et pourquoi">
        <Item t="Réserver une chambre ou une table">
          Nom, prénom, adresse électronique, numéro de téléphone, dates et occupation. Ces
          données sont nécessaires à l’exécution du contrat : sans elles, la réservation ne
          peut pas être prise.
        </Item>
        <Item t="Encaisser">
          Nous ne voyons jamais votre numéro de carte. Le paiement est traité par
          <strong> Stripe</strong> ou par <strong>Mews Payments</strong>, qui nous transmettent
          seulement le résultat et les quatre derniers chiffres.
        </Item>
        <Item t="Vous accueillir">
          Votre séjour est enregistré dans le logiciel de l’hôtel (<strong>Mews</strong>).
          Le jour de votre arrivée, un code de porte est engendré pour votre chambre et pour la
          durée de votre séjour ; il cesse de fonctionner à votre départ.
        </Item>
        <Item t="Vous écrire">
          Confirmation, informations pratiques, facture. Les courriels partent par
          <strong> Resend</strong>. Nous n’envoyons pas de prospection commerciale sans votre
          accord.
        </Item>
      </Bloc>

      <Bloc titre="Réservation par un assistant ou un agent">
        <p>
          Notre moteur est accessible à des assistants automatiques (protocole UCP). Dans ce
          cas, l’agent nous transmet votre nom et, si vous l’avez fourni, votre adresse
          électronique — rien d’autre. Le paiement se fait par un jeton à usage unique accordé
          par votre portefeuille : <strong>nous ne recevons pas votre carte</strong>, seulement
          le droit de débiter une fois le montant convenu.
        </p>
        <p className="mt-3">
          À la réservation, une clé de séjour vous est remise. Elle seule donne accès à votre
          dossier, à votre note et à vos codes d’arrivée. Elle cesse de valoir trente jours
          après votre départ.
        </p>
      </Bloc>

      <Bloc titre="Combien de temps nous les gardons">
        <ul className="list-disc space-y-1 pl-5">
          <li>Dossier de réservation et facture : <strong>10 ans</strong> (obligation comptable).</li>
          <li>Clé de séjour : <strong>départ + 30 jours</strong>, puis elle ne vaut plus rien.</li>
          <li>Code de porte : la durée du séjour, puis il est révoqué.</li>
          <li>Sessions de recherche ouvertes par un agent : <strong>30 minutes</strong>, puis effacées.</li>
        </ul>
      </Bloc>

      <Bloc titre="Qui d’autre y a accès">
        <p>
          Uniquement nos prestataires, pour ce qu’ils font : <strong>Mews</strong> (logiciel
          hôtelier), <strong>Stripe</strong> (paiement), <strong>Resend</strong> (courriels),
          <strong> Supabase</strong> et <strong>Netlify</strong> (hébergement, Union européenne),
          <strong> TTLock</strong> (serrures). Nous ne vendons ni ne cédons vos données.
        </p>
      </Bloc>

      <Bloc titre="Vos droits">
        <p>
          Accès, rectification, effacement, limitation, opposition et portabilité. Écrivez à{' '}
          <a href="mailto:contact-lesvoiles@htbm.fr" className="underline">contact-lesvoiles@htbm.fr</a>{' '}
          ou appelez le <a href="tel:+33494413623" className="underline">04 94 41 36 23</a>. Nous
          répondons sous un mois. Vous pouvez également saisir la CNIL.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          ⚠️ Certaines données ne peuvent pas être effacées avant leur terme : une facture doit
          être conservée dix ans, et nous ne pouvons pas y déroger.
        </p>
      </Bloc>
    </main>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl text-slate-900">{titre}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

function Item({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <p>
      <strong className="text-slate-900">{t}.</strong> {children}
    </p>
  );
}
