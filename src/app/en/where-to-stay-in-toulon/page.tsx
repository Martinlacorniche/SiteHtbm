import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Where to Stay in Toulon – Complete Local Accommodation Guide",
  description:
    "Where to stay in Toulon for families, couples, business trips or seafront holidays. Discover Mourillon, seafront hotels and private villa options.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-12">

        <header className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Toulon • Guide • Accommodation</p>
          <h1 className="font-serif text-4xl text-slate-900">Where to Stay in Toulon</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Toulon offers different types of accommodation depending on your stay:
            seafront hotels, Mourillon beaches, a private villa, quiet hillside rooms,
            or convenient locations for business trips.
          </p>
        </header>

        {/* Families */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">For Families</h2>
          <p>
            Hôtel Les Voiles is an excellent option for families thanks to its quiet
            residential location, modern rooms and proximity to Mourillon beaches.
            For larger families, the <strong>Villa Les Voiles</strong> offers multiple bedrooms
            and a fully equipped kitchen.
          </p>
        </section>

        {/* Couples */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">For Couples</h2>
          <p>
            For romantic stays, <strong>Best Western Plus La Corniche</strong> is ideal:
            panoramic sea views, seafront restaurants, Mediterranean atmosphere and
            direct access to the Mourillon promenade.
          </p>
        </section>

        {/* Business */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">For Business Travel</h2>
          <p>
            Hôtel Les Voiles offers fast fibre Wi-Fi, a quiet environment and a great
            location between beaches and the city centre.
            For seminars or meetings, La Corniche provides a unique seafront setting.
          </p>
        </section>

        {/* Beaches */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Near Mourillon Beaches</h2>
          <p>The two best options near Mourillon beaches are:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Best Western Plus La Corniche</strong> — 30 metres from the shoreline</li>
            <li><strong>Hôtel Les Voiles</strong> — quiet hillside location, close to coves</li>
          </ul>
        </section>

        {/* Sea View */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">For True Sea View Rooms</h2>
          <p>
            The only hotel in Toulon offering a <strong>direct sea view</strong> is
            Best Western Plus La Corniche, with balconies overlooking the harbour.
          </p>
        </section>

        {/* Villa */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">For a Private Villa</h2>
          <p>
            The <strong>Villa Les Voiles</strong> is perfect for groups, families and long stays.
            Multiple rooms, fully equipped kitchen and close to the beach.
          </p>
        </section>

      </article>
    </main>
  );
}
