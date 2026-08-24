/** Codes météo Open-Meteo → emoji. Partagé par les portails WiFi et leurs sous-pages. */
export function weatherEmoji(code: number | null) {
  if (code === null) return "🌊";
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}
