import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seafront Hotel in Toulon – Best Western Plus La Corniche",
  description:
    "4-star seafront hotel in Toulon, located in the Mourillon district. Sea view rooms, balcony options, breakfast buffet, ideal for weekends or business trips.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Toulon • Seafront • Mourillon
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-slate-900">
            Seafront Hotel in Toulon – Best Western Plus La Corniche
          </h1>
        </header>

        <p>
          Best Western Plus La Corniche is a 4-star hotel located directly on the
          Toulon waterfront, in the heart of the Mourillon seaside district.
          The hotel sits less than 30 meters from the sea, with immediate access
          to restaurants, coastal paths and sandy beaches.
        </p>

        <p>
          Rooms are bright and modern, some offering private balconies with
          panoramic sea views. The hotel features premium bedding, high-speed
          fibre Wi-Fi and a daily breakfast buffet, making it ideal for romantic
          stays, weekends away or business travel.
        </p>

        <p>
          Fort Saint-Louis is a 3-minute walk away, while Toulon Harbour is
          a 7-minute drive. The neighbourhood is walkable, quiet and perfect for
          seaside strolls at sunrise or sunset.
        </p>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Why choose a seafront hotel in Toulon?
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Direct sea view rooms with balconies</li>
            <li>Situated in Toulon's most beautiful seaside area</li>
            <li>Restaurants and bars within walking distance</li>
            <li>Calm and scenic neighbourhood</li>
            <li>Easy access to the city centre and ferry harbour</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Book Your Stay</h2>
          <p>
            Check availability and book directly through our secure booking
            platform:
          </p>
          <p>
            <a
              href="https://www.secure-hotel-booking.com/d-edge/Hotels-Toulon-Bord-De-Mer/JJ8R/en-US"
              className="text-sky-700 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Book at Best Western Plus La Corniche
            </a>
          </p>

          <p>
            Or return to our main page:
            <span> </span>
            <a href="/en" className="text-sky-700 underline underline-offset-2">
              Toulon Seafront Hotels
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
