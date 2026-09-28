// LA DOCUMENTATION DU CONNECTEUR.
//
// 🔑 CE N'EST PAS UNE PAGE MARKETING. L'annuaire de connecteurs la réclame en
// disant pourquoi : « les administrateurs informatiques l'examinent souvent
// pour décider d'approuver ou non un serveur MCP ». Le lecteur visé n'est donc
// pas un client, c'est quelqu'un qui se demande ce que ce serveur peut faire
// de mal.
//
// Elle dit donc en premier ce qu'on N'ENVOIE PAS et ce qu'on NE PEUT PAS
// faire — annuler, modifier, débiter — avant de dire ce qu'on sait faire.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connecteur MCP — Hôtel-Rooftop Les Voiles',
  description: 'Documentation du serveur MCP de l’Hôtel-Rooftop Les Voiles : outils, données transmises, sécurité.',
};

export default function Connecteur() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-700">
      <h1 className="font-serif text-3xl text-slate-900">Connecteur — Hôtel-Rooftop Les Voiles</h1>
      <p className="mt-3 leading-relaxed">
        Un serveur MCP qui interroge directement le logiciel hôtelier des Voiles (Toulon,
        Mourillon). Les disponibilités et les prix sont réels : ils changent quand une chambre
        se vend.
      </p>
      <p className="mt-4 rounded-lg bg-slate-50 p-4 font-mono text-sm text-slate-600 ring-1 ring-slate-200">
        https://hotels-toulon-mer.com/mcp
      </p>

      <Bloc titre="Ce que ce connecteur ne fait pas">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Il n’encaisse rien.</strong> Aucun outil ne débite quoi que ce soit. Pour
            réserver une chambre, il renvoie sur le site de l’hôtel, où le paiement a lieu.
          </li>
          <li>
            <strong>Il n’annule ni ne modifie aucune réservation.</strong> Ces opérations
            n’existent pas : le tarif vendu par cet intermédiaire est prépayé et non
            remboursable, et les dates ne peuvent pas être changées.
          </li>
          <li>
            <strong>Il ne demande ni compte ni mot de passe.</strong> Aucune authentification,
            aucun jeton OAuth, aucune donnée bancaire.
          </li>
        </ul>
      </Bloc>

      <Bloc titre="Les outils">
        <Outil nom="get_property_details" lecture>
          L’établissement : situation, étoiles, horaires d’arrivée et de départ, ce qui est
          compris et ce qui ne l’est pas, conditions tarifaires, taxe de séjour.
        </Outil>
        <Outil nom="create_booking_session" lecture>
          Une chambre réellement disponible pour des dates et une occupation, avec sa
          description, ses photos et son prix tout compris. Ouvre une session de devis : rien
          n’est tenu, rien n’est vendu.
        </Outil>
        <Outil nom="get_booking_session / update_booking_session">
          Relire un devis, ou y indiquer qui réserve.
        </Outil>
        <Outil nom="get_rooftop_availability" lecture>
          Les soirs où une table est libre au rooftop. Distingue « fermé » de « complet ».
        </Outil>
        <Outil nom="create_rooftop_reservation">
          Réserve une table, fermement et sans paiement. Une table par soir, cinq personnes au
          maximum ; au-delà, l’appel à l’hôtel est nécessaire.
        </Outil>
        <p className="pt-2 text-sm text-slate-500">
          Les trois outils suivants exigent la <strong>clé de séjour</strong> remise au client
          au moment de sa réservation. Sans elle, ils ne rendent rien — et un refus ne dit
          jamais pourquoi, pour qu’essayer des clés au hasard n’apprenne rien.
        </p>
        <Outil nom="get_stay" lecture>Dates, numéro de réservation, chambre attribuée.</Outil>
        <Outil nom="get_check_in" lecture>
          Le code du portail, le numéro de chambre et le code de la porte — le jour de
          l’arrivée seulement, à partir de 15 h, et une fois la chambre faite.
        </Outil>
        <Outil nom="get_folio" lecture>Le détail de la note, ce qui est réglé, ce qui reste dû.</Outil>
      </Bloc>

      <Bloc titre="Les données transmises">
        <p>
          Pour chercher une chambre : <strong>rien</strong> — des dates et un nombre de
          personnes. Pour conclure un devis, le nom du client et, s’il le fournit, son adresse
          électronique et son téléphone. Rien d’autre ne sort, et aucune donnée bancaire ne
          transite par ce connecteur.
        </p>
        <p className="mt-3">
          Traitement détaillé : <a href="/confidentialite" className="underline">politique de confidentialité</a>.
        </p>
      </Bloc>

      <Bloc titre="Limites et protection">
        <ul className="list-disc space-y-2 pl-5">
          <li>Cent appels par tranche de dix minutes et par appelant.</li>
          <li>Deux réservations de table par jour et par appelant. Au-delà, l’hôtel décide.</li>
          <li>Dix essais de clé invalide par dix minutes.</li>
          <li>Une clé de séjour cesse de valoir trente jours après le départ.</li>
        </ul>
      </Bloc>

      <Bloc titre="Protocole">
        <p>
          MCP, transport HTTP. Versions acceptées : 2024-11-05, 2025-03-26, 2025-06-18. Le
          serveur expose également un profil{' '}
          <a href="/.well-known/ucp" className="underline">Universal Commerce Protocol</a>, dont
          la capacité <code className="text-sm">dev.ucp.lodging.booking</code> permet une
          réservation complète, paiement inclus, sur une adresse distincte de celle-ci.
        </p>
      </Bloc>

      <Bloc titre="Assistance">
        <p>
          <a href="mailto:contact-lesvoiles@htbm.fr" className="underline">contact-lesvoiles@htbm.fr</a>{' '}
          · <a href="tel:+33494413623" className="underline">+33 4 94 41 36 23</a><br />
          SAS LES VOILES, 124 rue Gubler, 83000 Toulon, France.
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

function Outil({ nom, lecture, children }: { nom: string; lecture?: boolean; children: React.ReactNode }) {
  return (
    <p className="border-l-2 border-slate-100 pl-4">
      <code className="text-sm font-medium text-slate-900">{nom}</code>
      {lecture && <span className="ml-2 text-xs uppercase tracking-wide text-slate-400">lecture seule</span>}
      <span className="mt-1 block text-sm text-slate-600">{children}</span>
    </p>
  );
}
