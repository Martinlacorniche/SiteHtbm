// LA RÉSERVATION DE GROUPE N'EST PLUS TRAITÉE ICI : ELLE EST RELAYÉE À NWH.
//
// Ce site avait sa propre copie des routes de groupe, qui écrivait la même base
// que NWH.os. Une règle posée d'un seul côté ne l'était pas de l'autre : le
// 30/09/2026, une réservation de 2 nuits est passée par ici sur un groupe qui en
// exigeait 3. Désormais chaque route de groupe transmet la requête à la MÊME
// route chez NWH, qui applique seule les règles, et renvoie sa réponse telle
// quelle. L'invité ne voit rien changer : même page, même adresse, et NWH fait
// partir les liens (paiement, gestion) de l'adresse de ce site.
//
// Deux variables d'environnement l'allument :
//   GROUPE_RELAIS_NWH     l'adresse de NWH (https://consigneshtbm.com)
//   GROUPE_RELAIS_SECRET  le secret partagé, le même que chez NWH
// Sans elles, le relais est éteint et l'ancienne copie locale répond : c'est le
// repli, le temps de valider. Le retirer = enlever les deux variables.

const ENTETE_RELAIS = "x-nwh-relais";

/** Transmet la requête à NWH si le relais est allumé ; `null` sinon (la route locale répond). */
export async function relayerVersNwh(req: Request, chemin: string): Promise<Response | null> {
  const base = (process.env.GROUPE_RELAIS_NWH || "").replace(/\/$/, "");
  const secret = process.env.GROUPE_RELAIS_SECRET || "";
  if (!base || !secret) return null;

  const methode = req.method.toUpperCase();
  const corps = methode === "GET" || methode === "HEAD" ? undefined : await req.text();
  const entetes: Record<string, string> = { [ENTETE_RELAIS]: secret };
  const type = req.headers.get("content-type");
  if (type) entetes["content-type"] = type;

  try {
    const r = await fetch(`${base}${chemin}`, { method: methode, headers: entetes, body: corps, cache: "no-store" });
    const texte = await r.text();
    return new Response(texte, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json" },
    });
  } catch {
    /* NWH injoignable : on le DIT, on ne retombe pas en silence sur l'ancienne copie
       (deux codes qui répondent tour à tour, c'est précisément ce qu'on supprime). */
    return Response.json({ ok: false, error: "Service de réservation momentanément indisponible. Réessayez dans un instant." }, { status: 503 });
  }
}
