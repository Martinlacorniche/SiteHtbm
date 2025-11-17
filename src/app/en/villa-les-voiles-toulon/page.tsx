import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Villa Les Voiles – Private Villa Rental in Toulon",
  description:
    "Private villa rental in Toulon, perfect for families, groups and long stays. Open spaces, multiple bedrooms and close to Mourillon beaches.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-8">

        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Toulon • Mourillon • Private Rental
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-slate-900">
            Villa Les Voiles – Private Villa Rental in Toulon
          </h1>
        </header>

        <p>
          Villa Les Voiles is a fully privatizable accommodation located in the
          Mourillon district of Toulon. Ideal for families, groups of friends or
          long stays, it offers generous living spaces, several bedrooms and a
          fully equipped kitchen.
        </p>

        <p>
          The villa is just minutes from the beaches, harbour and seafront
          restaurants, making it an ideal base for discovering Toulon.
        </p>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Ideal For:
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Family holidays and reunions</li>
            <li>Groups looking for space and independence</li>
            <li>Long stays near the Mediterranean sea</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Book the Villa
          </h2>
          <p>
            The villa can be booked via Airbnb:
          </p>

          <p>
            <a
              href="https://www.airbnb.com/l/hjiNz0ra"
              className="text-sky-700 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              View Villa Les Voiles on Airbnb
            </a>
          </p>
        </section>

      </article>
    </main>
  );
}
