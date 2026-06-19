import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ⚠️ SERVER-ONLY : à n'importer QUE dans des routes API (src/app/api/**).
// Clé service_role → bypass de la RLS. Ne jamais exposer côté client.
// Définir SUPABASE_SERVICE_ROLE_KEY dans l'env (Netlify + .env.local local).
//
// Instanciation PARESSEUSE via Proxy : le client n'est créé qu'au 1ᵉʳ accès
// (à la requête), pas à l'import. Sinon `next build` plante en collectant les
// pages quand la variable d'env n'est pas (encore) présente.

const url = process.env.SUPABASE_URL || "https://drdlcohzfjdogyquglcs.supabase.co";

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (_client) return _client;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante (env serveur).");
  _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _client;
}

export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = getClient() as any;
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});
