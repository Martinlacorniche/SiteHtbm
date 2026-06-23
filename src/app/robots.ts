import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// robots.txt généré par Next. Autorise Google + explicitement les crawlers IA
// (GPTBot, ClaudeBot, PerplexityBot, etc.) pour favoriser la citation par les IA.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Pages privées / techniques à ne pas indexer
        disallow: ["/api/", "/groupe/", "/paiement/"],
      },
      // On autorise explicitement les principaux bots IA (réponses génératives)
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-Web", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
