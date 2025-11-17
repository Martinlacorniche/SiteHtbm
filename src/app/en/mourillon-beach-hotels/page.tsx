import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hotels Near Mourillon Beaches – Toulon",
  description:
    "Discover the best hotels near Toulon's Mourillon beaches: seafront 4-star La Corniche, and quiet hillside Hôtel Les Voiles.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Toulon • Mourillon • Beaches
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-slate-900">
            Hotels Near Mourillon Beaches – Toulon
          </h1>
        </header>

        <p>
          Mourillon Beach is one of Toulon’s most popular seaside spots. We offer
          two complementary hotels in this district: the seafront 4-star Best
          Western Plus La Corniche, and the quieter hillside Hôtel Les Voiles.
        </p>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-slate-900">
            Best Western Plus La Corniche – Seafront
          </h2>
          <p>
            Located less than 30 meters from the sea, La Corniche offers
            panoramic views, seaside access, restaurants within walking distance
            and a Mediterranean atmosphere.
          </p>
          <p>
            <a
              href="https://www.secure-hotel-booking.com/d-edge/Hotels-Toulon-Bord-De-Mer/JJ8R/en-US"
              className="text-sky-700 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Book at La Corniche
            </a>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-slate-900">
            Hôtel Les Voiles – Quiet & Close to the Coves
          </h2>
          <p>
            Located on the hillside, Hôtel Les Voiles is calm, modern, and close
            to both beaches and rocky inlets. Perfect for couples and business
            travellers.
          </p>
          <p>
            <a
              href="https://www.secure-hotel-booking.com/d-edge/Hotel-Les-Voiles/JJ8J/en-US"
              className="text-sky-700 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Book at Hôtel Les Voiles
            </a>
          </p>
        </section>

      </article>
    </main>
  );
}
