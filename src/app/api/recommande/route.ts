import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const ROOMS = {
  cosy:       { name: "Chambre Cosy",       price: 80  },
  superieure: { name: "Chambre Supérieure", price: 100 },
  rooftop:    { name: "Chambre Rooftop",    price: 150 },
};

// Addons disponibles à offrir pour battre l'OTA (coût faible, valeur perçue haute)
const OTA_ADDONS = [
  "bouteille de bienvenue en chambre",
  "late checkout jusqu'à 13h",
  "early check-in dès midi (si disponible)",
  "1 nuit de parking offerte",
  "petit-déjeuner J1 pour deux",
];

export async function POST(request: Request) {
  const {
    checkIn,
    nights    = 1,
    guests    = 2,
    vibe      = 50,
    atouts    = [],
    otaPrice,   // prix simulé Booking.com (avec frais)
    ourPrice,   // notre prix direct
  } = await request.json();

  const vibeDesc = vibe < 25 ? "budget malin, optimise le prix"
    : vibe < 50 ? "raisonnable, bon rapport qualité/prix"
    : vibe < 75 ? "confort+, prêt à payer pour le bien-être"
    : "expérience totale, ne compte pas";

  const atotsStr = atouts.length > 0
    ? `Cartes jouées : ${atouts.join(", ")}`
    : "Aucune carte jouée.";

  const otaGap    = ourPrice && otaPrice ? ourPrice - otaPrice : 0;
  const otaContext = otaPrice && ourPrice ? `
Comparaison OTA — RÈGLE STRICTE selon le gap de prix (gap = ${otaGap}€) :
- gap < 0 (on est moins cher) → otaAddon = null, otaMessage = "Déjà ${Math.abs(otaGap)}€ moins cher qu'en direct."
- gap = 0 ET on a des perks → otaAddon = null, otaMessage = "Même prix que Booking, mais avec tout ça en plus."
- gap = 0 ET AUCUN perk → otaAddon = UN addon parmi (bouteille de bienvenue / late checkout +1h / accès chambre anticipé), otaMessage = "Même prix — on fait un geste pour faire la différence."
- gap > 0 (on est plus cher) → otaAddon = UN addon dont la valeur perçue couvre le gap (petit-déjeuner si gap ≤ 20€, parking + bouteille si gap ≤ 35€, petit-déjeuner + late checkout si gap > 35€). otaMessage = "Deal rééquilibré avec les inclus."` : "";

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 280,
      messages: [{
        role:    "user",
        content: `Hôtel Les Voiles à Toulon. Tu es le directeur, tu parles directement au client.
Demande : ${nights} nuit${nights > 1 ? "s" : ""}, ${guests} personne${guests > 1 ? "s" : ""}, arrivée le ${checkIn ?? "non précisée"}.
Profil client : ${vibeDesc}.
${atotsStr}
${otaContext}

Chambres :
- cosy : 80€/nuit, jardin secret, calme absolu, lit double
- superieure : 100€/nuit, spacieuse, baignoire, très lumineuse
- rooftop : 150€/nuit, vue panoramique rade de Toulon, rooftop privé

Règles cartes :
- vue_mer → rooftop obligatoire
- petit_dej → inclure dans perks
- champagne → inclure dans perks
- late_checkout → inclure dans perks (sauf si otaAddon déjà late checkout)
- early_checkin → inclure dans perks
- parking → inclure dans perks (sauf si otaAddon déjà parking)
- suite → "upgrade si disponible" dans perks
- paiement_immediat → "check-in express, code SMS la veille" dans perks
- arrivee_tardive → "bouteille de bienvenue" ou upgrade dans perks
- fidelite → upgrade chambre si possible
- profil budget → cosy ou superieure, perks minimum
- profil expérience → rooftop ou superieure, perks maximum

Max 3 perks. Sois direct, humain, jamais corporate.
JSON uniquement : {"roomId":"cosy|superieure|rooftop","dealPhrase":"max 18 mots","perks":["perk1","perk2"],"dealClose":"max 8 mots","otaAddon":"addon string ou null","otaMessage":"avantage direct max 10 mots"}`,
      }],
    });

    const text  = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      const data = JSON.parse(match[0]);
      if (Object.keys(ROOMS).includes(data.roomId)) {
        return NextResponse.json(data);
      }
    }
  } catch (e) {
    console.error("AI deal error:", e);
  }

  return NextResponse.json({
    roomId:     "superieure",
    dealPhrase: "Notre meilleure option pour votre séjour.",
    perks:      [],
    dealClose:  "On a un deal ?",
    otaAddon:   "bouteille de bienvenue en chambre",
    otaMessage: "Directement chez nous, sans frais cachés.",
  });
}
