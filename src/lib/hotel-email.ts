import { supabaseServer } from "@/lib/supabase-server";

// Adresse mail de l'équipe d'un hôtel pour les notifs internes (groupes, etc.).
// Source unique = colonne hotels.email_equipe (posée côté siteconsignes, même base).
// Repli sur ALERT_EMAIL si l'hôtel n'a pas d'adresse renseignée.
export async function teamEmailForHotel(hotelId: string | null | undefined): Promise<string | null> {
  const fallback = process.env.ALERT_EMAIL || null;
  if (!hotelId) return fallback;
  const { data } = await supabaseServer
    .from("hotels").select("email_equipe").eq("id", hotelId).maybeSingle();
  return (data?.email_equipe as string | null) || fallback;
}
