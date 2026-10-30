import { NextRequest, NextResponse } from "next/server";
import { chercherDisponibilite } from "@/lib/mewsBooking";
import { prixAPartirDe } from "@/lib/balisageReserver";
import { prixCorniche } from "@/lib/moteurNwh/balisageCorniche";
import { HOTEL_CORNICHE } from "@/lib/moteurNwh/pageCorniche";
import { REOUVERTURE_VOILES } from "@/lib/site";

/* LA RECHERCHE DE L'ACCUEIL (29/10/2026) — les deux maisons d'un coup.
 *
 * Mews ne sait pas chercher dans deux hôtels à la fois (le moteur multi-établissements est une option
 * Enterprise), et La Corniche est sur HotSoft : cette route interroge les deux moteurs, chacun par son
 * chemin, et rend une ligne par hôtel.
 *
 * ⚠️ QUATRE ÉTATS, PAS DEUX. « libre », « complet », « fermé » (la saison des Voiles) et « muet » (le
 * moteur n'a pas répondu). Un moteur muet affiché « complet » ferait partir un client qui aurait trouvé
 * une chambre — on dit qu'on ne sait pas, et le lien reste.
 *
 * Sans dates : le « dès X € » de chaque maison, mesuré sur les semaines à venir (une heure de mémoire,
 * celle des balisages). */

export const dynamic = "force-dynamic";

type Etat =
  | { etat: "libre"; parNuit: number; total: number }
  | { etat: "complet" }
  | { etat: "ferme"; rouvre: string }
  | { etat: "muet" }
  | { etat: "apercu"; des: number | null };

const estDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

async function voiles(arrivee: string, depart: string, adultes: number): Promise<Etat> {
  /* La fermeture se dit AVANT d'interroger Mews : la restriction d'hiver y rend une liste vide, que
   * rien ne distingue d'une maison pleine. Un séjour qui la chevauche (arrivée en mars) aussi. */
  if (arrivee < REOUVERTURE_VOILES) return { etat: "ferme", rouvre: REOUVERTURE_VOILES };
  try {
    const d = await chercherDisponibilite({ arrivee, depart, adultes, langue: "fr" });
    let bas: { parNuit: number; total: number } | null = null;
    for (const o of d.offres) {
      // Un prix « une personne » rendu sur une recherche à deux n'est pas une offre pour eux.
      if (o.chambresRestantes < 1 || o.pourPersonnes < adultes) continue;
      for (const p of o.prix) if (p.total > 0 && (!bas || p.total < bas.total)) bas = { parNuit: p.parNuit, total: p.total };
    }
    return bas ? { etat: "libre", parNuit: Math.round(bas.parNuit), total: Math.round(bas.total) } : { etat: "complet" };
  } catch {
    return { etat: "muet" };
  }
}

async function corniche(arrivee: string, depart: string, adultes: number): Promise<Etat> {
  const base = (process.env.GROUPE_RELAIS_NWH || "").replace(/\/$/, "");
  if (!base) return { etat: "muet" };
  try {
    const r = await fetch(`${base}/api/moteur-hotsoft/hotels/getAvailability`, {
      method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
      body: JSON.stringify({ HotelId: HOTEL_CORNICHE, StartUtc: `${arrivee}T00:00:00Z`, EndUtc: `${depart}T00:00:00Z`, AdultCount: adultes }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!r.ok) return { etat: "muet" };
    type P = { Price?: { Total?: { EUR?: number }; AveragePerNight?: { EUR?: number } } };
    const j = (await r.json()) as { RoomCategoryAvailabilities?: { AvailableRoomCount?: number; RoomOccupancyAvailabilities?: { Pricing?: P[] }[] }[] };
    let bas: { parNuit: number; total: number } | null = null;
    for (const c of j.RoomCategoryAvailabilities ?? []) {
      if ((c.AvailableRoomCount ?? 0) < 1) continue;
      for (const o of c.RoomOccupancyAvailabilities ?? []) for (const p of o.Pricing ?? []) {
        const total = p.Price?.Total?.EUR ?? 0;
        if (total > 0 && (!bas || total < bas.total)) bas = { parNuit: p.Price?.AveragePerNight?.EUR ?? total, total };
      }
    }
    return bas ? { etat: "libre", parNuit: Math.round(bas.parNuit), total: Math.round(bas.total) } : { etat: "complet" };
  } catch {
    return { etat: "muet" };
  }
}

/* ⚠️ LE CACHE DE NETLIFY IGNORE LA QUERY STRING PAR DÉFAUT (mesuré le 30/10/2026) : l'aperçu sans dates,
 * mis en cache dix minutes, était rendu à TOUTES les recherches datées (« dès 79 » quelles que soient les
 * dates). `Netlify-Vary: query` fait de chaque recherche sa propre entrée.
 * Une recherche datée se garde une minute au CDN, et se resert pendant qu'on la rafraîchit : presque tous
 * les visiteurs arrivent sur « ce soir → demain », un seul paie l'aller-retour vers HotSoft. Le moteur
 * revérifie de toute façon le stock avant de vendre. */
const CACHE_APERCU = { "cache-control": "public, max-age=600", "netlify-vary": "query" };
const CACHE_RECHERCHE = {
  "cache-control": "public, max-age=0, must-revalidate",
  "netlify-cdn-cache-control": "public, s-maxage=60, stale-while-revalidate=300",
  "netlify-vary": "query",
};

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const arrivee = p.get("arrivee"), depart = p.get("depart");
  const adultes = Number(p.get("adultes") ?? 2);

  if (!arrivee && !depart) {
    const [v, c] = await Promise.all([
      aujourdhui() < REOUVERTURE_VOILES
        ? Promise.resolve<Etat>({ etat: "ferme", rouvre: REOUVERTURE_VOILES })
        : prixAPartirDe().then((des): Etat => ({ etat: "apercu", des })).catch((): Etat => ({ etat: "apercu", des: null })),
      prixCorniche().then((des): Etat => ({ etat: "apercu", des })).catch((): Etat => ({ etat: "apercu", des: null })),
    ]);
    return NextResponse.json({ corniche: c, voiles: v }, { headers: CACHE_APERCU });
  }

  if (!estDate(arrivee) || !estDate(depart) || depart <= arrivee || arrivee < aujourdhui()) {
    return NextResponse.json({ erreur: "dates invalides" }, { status: 400 });
  }
  if (!Number.isInteger(adultes) || adultes < 1 || adultes > 4) {
    return NextResponse.json({ erreur: "occupation invalide" }, { status: 400 });
  }
  /* Les Voiles ne logent pas plus de deux personnes par chambre en ligne : à trois ou quatre, c'est
   * La Corniche seule (ses suites), et l'écran le dit plutôt que d'afficher « complet ». */
  const [c, v] = await Promise.all([
    corniche(arrivee, depart, adultes),
    adultes > 2 ? Promise.resolve<Etat>({ etat: "complet" }) : voiles(arrivee, depart, adultes),
  ]);
  /* Un moteur muet ne se met pas en cache : la minute suivante doit pouvoir répondre. */
  const muet = c.etat === "muet" || v.etat === "muet";
  return NextResponse.json({ corniche: c, voiles: v }, { headers: muet ? { "cache-control": "no-store" } : CACHE_RECHERCHE });
}
