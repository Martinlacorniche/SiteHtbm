import { createClient } from "@supabase/supabase-js";

// ⚠️ SERVER-ONLY : à n'importer QUE dans des routes API (src/app/api/**).
// Clé service_role → bypass de la RLS. Ne jamais exposer côté client.
// Ajouter SUPABASE_SERVICE_ROLE_KEY dans .env.local (Supabase → Settings → API).

const url = process.env.SUPABASE_URL || "https://drdlcohzfjdogyquglcs.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.warn("[supabase-server] SUPABASE_SERVICE_ROLE_KEY manquante — les routes Groupes échoueront.");
}

export const supabaseServer = createClient(url, serviceKey || "", {
  auth: { persistSession: false, autoRefreshToken: false },
});
