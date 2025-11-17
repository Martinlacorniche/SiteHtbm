import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Villa Les Voiles à Toulon – Location privatisable",
  description:
    "Villa privatisable à Toulon, idéal pour familles, groupes et séjours longue durée, à proximité des plages du Mourillon.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Toulon • Mourillon • Villa privatisable
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-slate-900">
            Villa Les Voiles à Toulon – Location privatisable
          </h1>
        </header>

        <p>
          La Villa Les Voiles est une villa privatisable située à Toulon, dans
          le quartier du Mourillon. Elle est idéale pour les familles, les
          groupes d’amis ou les séjours longue durée à proximité des plages.
        </p>

        <p>
          La villa comprend plusieurs chambres, une cuisine entièrement équipée
          et de grands espaces de vie pour se retrouver. Sa localisation permet
          de rejoindre facilement les plages du Mourillon, le bord de mer et le
          centre-ville de Toulon.
        </p>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Pour quel type de séjour ?
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Réunions de famille ou retrouvailles entre amis</li>
            <li>Séjours longue durée avec confort d’une maison</li>
            <li>Base pour découvrir la rade de Toulon et la Côte d’Azur</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Réservation de la Villa Les Voiles
          </h2>
          <p>
            La Villa Les Voiles est proposée en location via Airbnb, avec
            calendrier et tarifs mis à jour :
          </p>
          <p>
            <a
              href="https://www.airbnb.com/l/hjiNz0ra"
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline underline-offset-2"
            >
              Voir la Villa Les Voiles sur Airbnb
            </a>
          </p>
          <p>
            Pour découvrir nos autres établissements (hôtels bord de mer et
            Hôtel Les Voiles) :
            <span> </span>
            <a href="/" className="text-sky-700 underline underline-offset-2">
              Hôtels Toulon Bord de Mer
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
