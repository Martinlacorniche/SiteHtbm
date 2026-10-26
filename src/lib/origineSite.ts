import { SITE_URL } from "@/lib/site";

/** L'adresse à mettre dans les liens qu'on envoie (Stripe, mails) : celle du site, jamais l'en-tête
 *  `Origin`, qui vient du client et pouvait faire pointer un lien de paiement ailleurs (revue de
 *  sécurité NWH, 26/10/2026). En développement seulement, on garde l'adresse locale de la requête. */
export function origineSite(req: Request): string {
  if (process.env.NODE_ENV === "development") return req.headers.get("origin") || "http://localhost:3001";
  return SITE_URL;
}

/** Ce qu'un visiteur a tapé, rendu inoffensif avant d'entrer dans le HTML d'un mail. */
export function echapperHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
