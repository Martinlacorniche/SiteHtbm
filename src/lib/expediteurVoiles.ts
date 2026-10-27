// L'expéditeur des mails des Voiles (rooftop, villa).
//
// 🔑 Les Voiles ont leur propre domaine d'envoi depuis le 27/10/2026 : partis de
// send.hotel-corniche.com, leurs mails tombaient en indésirables chez Hotmail. Une
// clé d'envoi Resend ne vaut que pour UN domaine, d'où une clé à part
// (RESEND_API_KEY_VOILES). Sans elle, on garde l'ancien expéditeur : un mail qui part
// de la Corniche vaut mieux qu'un mail refusé.
export function expediteurVoiles(nom: string): { cle: string | undefined; from: string } {
  const cle = process.env.RESEND_API_KEY_VOILES;
  return cle
    ? { cle, from: `${nom} <demandes@send.hotel-voiles.com>` }
    : { cle: process.env.RESEND_API_KEY, from: `${nom} <demandes@send.hotel-corniche.com>` };
}
