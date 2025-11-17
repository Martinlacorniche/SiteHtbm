import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Hotel in Toulon – Seafront & Meetings",
  description:
    "Organise business trips or meetings in Toulon. Best Western Plus La Corniche offers an exceptional seaside setting for seminars and professional stays.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-8">

        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Toulon • Business • Meetings
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-slate-900">
            Business Hotel in Toulon – Seafront & Meetings
          </h1>
        </header>

        <p>
          Best Western Plus La Corniche offers an exceptional setting for
          business stays and meetings in Toulon. Located directly by the sea in
          the Mourillon district, the hotel combines Mediterranean atmosphere
          with professional services.
        </p>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Ideal For Meetings & Seminars
          </h2>
          <p>
            The hotel can host small seminars, team meetings and management
            committees with a bright setting overlooking Toulon’s harbour.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Services</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>4-star accommodation</li>
            <li>High-speed fibre Wi-Fi</li>
            <li>Daily breakfast buffet</li>
            <li>Quick access to Toulon city centre</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Request a Quote
          </h2>
          <p>
            You can request a seminar quote here:
          </p>
          <p>
            <a
              href="https://bw-plus-la-corniche.backyou.app/en/c/request#__step_request_0"
              className="text-sky-700 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Request a seminar quote
            </a>
          </p>
        </section>

      </article>
    </main>
  );
}
