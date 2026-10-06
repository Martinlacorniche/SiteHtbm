// LE JOURNAL D'AUDIENCE DU SERVEUR MCP.
//
// Martin, 06/10/2026 : « Je veux augmenter mes ventes via ia donc oui compte les
// mcp ». Jusqu'ici, seul le canal `agent-ia` de Distribution comptait les
// VENTES : un serveur visité cent fois sans vendre et un serveur que personne
// n'appelle rendaient le même chiffre — zéro. Impossible de savoir si une
// inscription à un annuaire sert à quelque chose, ni de voir l'entonnoir se
// former avant la première vente.
//
// 🔑 L'`initialize` EST LA LIGNE LA PLUS PRÉCIEUSE. C'est la seule qui porte le
// nom de l'agent (`clientInfo.name` : « ChatGPT », « Claude »…). Les appels
// d'outils qui suivent ne le répètent jamais ; ils se rattachent à elle par
// `appelant` et l'horodatage.
//
// ⚠️ AUCUNE ADRESSE IP N'EST STOCKÉE. `appelant` est une empreinte salée et
// tronquée : assez pour recoller les appels d'une même conversation, jamais pour
// retrouver quelqu'un. Un journal d'audience n'a pas besoin d'identifier une
// personne, et en garder la possibilité serait une donnée personnelle de plus à
// défendre.
//
// ⛔ ET IL NE FAIT JAMAIS ÉCHOUER UN APPEL. Mesurer ne doit pas casser ce qu'on
// mesure : toute erreur d'écriture est avalée. Un journal troué vaut mieux
// qu'une réservation perdue parce que la base de mesure ne répondait pas.

import { createHash } from 'node:crypto';
import { supabaseServer } from '@/lib/supabase-server';

export type Issue = 'ok' | 'refus' | 'erreur';

/** L'empreinte d'un appelant. Salée avec un secret d'instance quand il existe —
 *  sans sel, une empreinte d'adresse IP se retrouve par force brute en quelques
 *  secondes, l'espace des adresses étant minuscule. */
function empreinte(adresse: string): string {
  if (!adresse || adresse === 'inconnu') return 'inconnu';
  const sel = process.env.MCP_JOURNAL_SEL ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createHash('sha256').update(`${sel}:${adresse}`).digest('hex').slice(0, 12);
}

export type LigneJournal = {
  porte: 'public' | 'ucp';
  methode: string;
  outil?: string | null;
  agent?: string | null;
  agentVersion?: string | null;
  adresse: string;
  issue: Issue;
  ms: number;
};

export function journaliser(l: LigneJournal): void {
  /* Pas d'`await` au point d'appel : la réponse à l'agent ne doit pas attendre
     notre comptage. */
  void supabaseServer.from('mcp_appels').insert({
    porte: l.porte,
    methode: l.methode,
    outil: l.outil ?? null,
    agent: l.agent ?? null,
    agent_version: l.agentVersion ?? null,
    appelant: empreinte(l.adresse),
    issue: l.issue,
    ms: Math.max(0, Math.round(l.ms)),
  }).then(
    ({ error }) => { if (error) console.warn('[mcp] journal non écrit :', error.message); },
    (e: unknown) => { console.warn('[mcp] journal non écrit :', e instanceof Error ? e.message : e); },
  );
}
