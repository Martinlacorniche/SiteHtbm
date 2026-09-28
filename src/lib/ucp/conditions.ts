// LES CONDITIONS, DITES AVANT DE PAYER.
//
// 🔑 POURQUOI ELLES SONT ICI ET PAS DANS UN LIEN. Martin, 28/09/2026 : « les
// conditions, à dire obligatoirement avant de payer ». Un lien vers les CGV ne
// vaut rien face à un agent : il ne le suivra pas, et le client ne le verra
// jamais. Ce qu'un agent peut répéter à son client, c'est ce qu'on lui met
// entre les mains, en clair, dans la réponse.
//
// ⚠️ ET LA PLUS IMPORTANTE EST CELLE QU'ON N'AIME PAS DIRE. Le tarif agentique
// est prépayé : ni annulable, ni modifiable, ni remboursable. Un client qui
// l'apprend après coup est un litige ; un client qui l'apprend avant est un
// client qui a choisi. C'est la première de la liste, et elle est nommée
// `cancellation` pour qu'un agent qui ne lit qu'un seul type lise celui-là.
//
// La spécification prévoit exactement ce cas : le vocabulaire des types est
// ouvert et « Businesses MAY define custom types in their own domain ». D'où
// `com.htbm.policy.*` — on ne squatte pas le namespace du protocole pour des
// règles qui ne sont que les nôtres.

const CGV = '/cgv';

type Politique = {
  type: string;
  description: { plain: string };
  url?: string;
};

/** Les conditions d'un séjour vendu à un agent. */
export function conditions(site: string, taxeParNuitee: number): Politique[] {
  return [
    {
      /* 🔴 EN PREMIER, ET SANS ADOUCISSEMENT. */
      type: 'com.htbm.policy.cancellation',
      description: {
        plain:
          'Tarif prépayé : le séjour est réglé en totalité à la réservation. '
          + 'Il n’est NI ANNULABLE, NI MODIFIABLE, NI REMBOURSABLE — les dates ne peuvent pas être changées. '
          + 'Ces conditions doivent être présentées au client AVANT le paiement. '
          + 'Un tarif flexible, annulable sans frais jusqu’au jour d’arrivée à 18 h (heure de Paris), '
          + 'existe mais ne se réserve pas par agent : il est disponible sur le site de l’hôtel.',
      },
      url: `${site}${CGV}`,
    },
    {
      type: 'com.htbm.policy.payment',
      description: {
        plain:
          'Le paiement se fait à la réservation, par jeton de paiement partagé Stripe. '
          + 'Si la banque du client réclame une authentification, rien n’est débité : '
          + 'un lien de paiement valable 15 minutes est renvoyé, et la chambre est tenue pendant ces 15 minutes.',
      },
    },
    {
      type: 'com.htbm.policy.check_in',
      description: {
        plain:
          'Arrivée autonome à partir de 15 h. Il n’y a pas de réception 24 h/24 : '
          + 'le code du portail, le numéro de chambre et le code de la porte sont délivrés '
          + 'le jour de l’arrivée à partir de 15 h, une fois la chambre prête. '
          + 'Une pièce d’identité est demandée ; pour un client étranger, une fiche de police est obligatoire.',
      },
    },
    {
      type: 'com.htbm.policy.check_out',
      description: { plain: 'Départ jusqu’à midi pour une réservation prise en direct.' },
    },
    {
      type: 'com.htbm.policy.taxes',
      description: {
        plain:
          `Taxe de séjour de ${taxeParNuitee.toFixed(2).replace('.', ',')} € par adulte et par nuit, `
          + 'déjà comprise dans le total annoncé. Le prix est tout compris, petit-déjeuner inclus.',
      },
    },
    {
      type: 'com.htbm.policy.pets',
      description: { plain: 'Les animaux sont bienvenus, sans supplément.' },
    },
  ];
}
