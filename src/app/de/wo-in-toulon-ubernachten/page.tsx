import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wo in Toulon übernachten? – Umfassender Unterkunftsführer",
  description:
    "Umfassender Guide, wo man in Toulon übernachten kann: Strandhotels, Mourillon-Strände, private Villa, Aufenthalte als Paar, Geschäftsreisen und Familienurlaub.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-12">

        {/* Header */}
        <header className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Toulon • Guide • Unterkünfte
          </p>
          <h1 className="font-serif text-4xl text-slate-900">
            Wo in Toulon übernachten?
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Toulon bietet verschiedene Stadtteile und Unterkunftsarten:
            Strandhotels, das Viertel der Mourillon-Strände, eine private Villa,
            ruhige Lagen am Hang oder praktische Optionen für Geschäftsreisen.
          </p>
        </header>

        {/* Familien */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Für Familien
          </h2>
          <p>
            Das Hôtel Les Voiles eignet sich gut für Familien: ruhiges Wohngebiet,
            moderne Zimmer und Nähe zu den Mourillon-Stränden. Das Viertel ist
            angenehm und bietet schnellen Zugang zur Uferpromenade.  
            Für größere Familien bietet die <strong>Villa Les Voiles</strong> mehr Platz
            und eine voll ausgestattete Küche.
          </p>
        </section>

        {/* Paare */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">
            Für Paare und Wochenenden zu zweit
          </h2>
          <p>
            Für einen romantischen Aufenthalt ist das
            <strong> Best Western Plus La Corniche</strong> ideal: direkte Lage
            am Meer, Restaurants in Laufnähe, mediterranes Ambiente und Zimmer
            mit Balkon und Blick auf die Bucht von Toulon.
          </p>
        </section>

        {/* Geschäftsreisen */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">
            Für Geschäftsreisen
          </h2>
          <p>
            Das Hôtel Les Voiles bietet eine ruhige Atmosphäre, schnelles
            Glasfaser-WLAN und eine praktische Lage zwischen Stränden und
            Stadtzentrum.  
            Für Meetings oder kleinere Seminare eignet sich La Corniche mit
            seinem besonderen Rahmen direkt am Meer.
          </p>
        </section>

        {/* Strände */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">
            In der Nähe der Mourillon-Strände
          </h2>
          <p>Die zwei besten Optionen in Strandnähe sind:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Best Western Plus La Corniche</strong> – nur ca. 30 Meter
              vom Meer entfernt, direkt an der Uferpromenade
            </li>
            <li>
              <strong>Hôtel Les Voiles</strong> – ruhige Hanglage, in der Nähe
              von Buchten und kleinen Stränden
            </li>
          </ul>
        </section>

        {/* Meerblick */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">
            Für Zimmer mit echtem Meerblick
          </h2>
          <p>
            Das einzige Hotel in Toulon mit <strong>direktem Meerblick</strong>
            auf die Bucht ist das Best Western Plus La Corniche, mit mehreren
            Zimmern mit Balkon.
          </p>
        </section>

        {/* Villa */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">
            Für eine private Villa
          </h2>
          <p>
            Die <strong>Villa Les Voiles</strong> ist ideal für Gruppen,
            größere Familien und längere Aufenthalte. Sie bietet mehrere
            Schlafzimmer, eine voll ausgestattete Küche und großzügige
            Wohnbereiche in Strandnähe.
          </p>
        </section>

        {/* Versteckte FAQ */}
        <section className="sr-only">
          <h2 className="font-serif text-3xl">
            FAQ – Wo in Toulon übernachten?
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">
                Welches Hotel liegt am nächsten an den Mourillon-Stränden?
              </h3>
              <p>
                Das Best Western Plus La Corniche, etwa 30 Meter vom Meer und
                der Uferpromenade entfernt.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">
                Welches Hotel bietet den besten Meerblick in Toulon?
              </h3>
              <p>
                La Corniche, mit Zimmern mit Balkon und direktem Blick auf die
                Bucht von Toulon.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">
                Wo sollte man für einen romantischen Aufenthalt übernachten?
              </h3>
              <p>
                Im Best Western Plus La Corniche, dank der Lage direkt am Meer
                und der Umgebung.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">
                Welche Unterkunft eignet sich für Geschäftsreisen?
              </h3>
              <p>
                Das Hôtel Les Voiles, mit ruhiger Lage und schnellem Internet.
              </p>
            </div>

            <div>
              <h3 className="font-semibold">
                Gibt es eine private Villa zur Miete in Toulon?
              </h3>
              <p>
                Ja, die Villa Les Voiles ist eine moderne Villa in der Nähe der
                Mourillon-Strände.
              </p>
            </div>
          </div>
        </section>

      </article>
    </main>
  );
}
