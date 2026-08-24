// Température de l'air et de la mer au Mourillon, pour les portails clients.
//
// Open-Meteo est appelé au plus une fois par quart d'heure et par instance,
// quel que soit le nombre de visiteurs : la mer ne bouge pas à la minute, et
// deux allers-retours par visiteur, c'était deux fois trop.
const REVALIDATION = 900; // 15 min

export async function GET() {
  const latitude = 43.117;
  const longitude = 5.933;

  try {
    // Date au fuseau de Toulon : à 1 h du matin, l'UTC est encore la veille et
    // l'API marine renverrait la journée précédente.
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const [airData, seaData] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=Europe%2FParis`,
        { next: { revalidate: REVALIDATION } }
      ).then(r => r.json()),
      fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=sea_surface_temperature&timezone=Europe%2FParis&start_date=${dateStr}&end_date=${dateStr}`,
        { next: { revalidate: REVALIDATION } }
      ).then(r => r.json()),
    ]);

    const air = airData?.current_weather?.temperature ?? null;
    const code = airData?.current_weather?.weathercode ?? null;

    // Relevé de midi : la valeur que le client a en tête quand il se baigne.
    const seaIdx = seaData?.hourly?.time?.indexOf(`${dateStr}T12:00`) ?? -1;
    const sea = seaIdx !== -1 ? seaData.hourly.sea_surface_temperature[seaIdx] ?? null : null;

    return Response.json(
      { air, sea, code },
      { headers: { "Cache-Control": `public, s-maxage=${REVALIDATION}, stale-while-revalidate=3600` } }
    );
  } catch {
    // Pas de cache sur un échec : le prochain visiteur doit pouvoir réessayer.
    return Response.json(
      { air: null, sea: null, code: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
