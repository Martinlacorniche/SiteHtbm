export async function GET() {
  try {
    const latitude = 43.117;
    const longitude = 5.933;

    const date = new Date();
    const dateStr = date.toISOString().split("T")[0];

    // Air
    const airReq = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=Europe%2FParis`
    );
    const airData = await airReq.json();
    const air = airData.current_weather?.temperature ?? null;
    const code = airData.current_weather?.weathercode ?? null;

    // Sea at 12:00
    const seaReq = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=sea_surface_temperature&timezone=Europe%2FParis&start_date=${dateStr}&end_date=${dateStr}`
    );
    const seaData = await seaReq.json();

    const seaTime = `${dateStr}T12:00`;
    const seaIdx = seaData.hourly.time.indexOf(seaTime);
    const sea =
      seaIdx !== -1
        ? seaData.hourly.sea_surface_temperature[seaIdx]
        : null;

    return Response.json({ air, sea, code });
  } catch {
    return Response.json({ air: null, sea: null, code: null });
  }
}
