import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dove dormire a Tolone – Guida completa agli alloggi",
  description:
    "Guida dettagliata per scegliere dove dormire a Tolone: hotel sul mare, spiagge del Mourillon, villa privata, soggiorni di coppia, viaggi di lavoro e vacanze in famiglia.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-12">

        {/* Header */}
        <header className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Tolone • Guida • Alloggi
          </p>
          <h1 className="font-serif text-4xl text-slate-900">
            Dove dormire a Tolone
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Tolone offre diverse zone per dormire, ciascuna con caratteristiche uniche:
            hotel sul mare, quartiere delle spiagge del Mourillon, villa privata,
            strutture tranquille in collina o opzioni pratiche per viaggi di lavoro.
          </p>
        </header>

        {/* Famiglie */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Per le famiglie</h2>
          <p>
            L’Hôtel Les Voiles è ottimo per le famiglie grazie alla sua posizione tranquilla,
            alle camere moderne e alla vicinanza alle spiagge del Mourillon. Il quartiere è
            sicuro, ben servito e permette un accesso rapido al lungomare.
            Per famiglie numerose, la <strong>Villa Les Voiles</strong> offre ampi spazi e una cucina attrezzata.
          </p>
        </section>

        {/* Coppie */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Per soggiorni romantici</h2>
          <p>
            Per un weekend di coppia, il <strong>Best Western Plus La Corniche</strong> è ideale:
            vista mare, ristoranti raggiungibili a piedi, atmosfera mediterranea e possibilità
            di camere con balcone panoramico sulla rada.
          </p>
        </section>

        {/* Lavoro */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Per viaggi di lavoro</h2>
          <p>
            L’Hôtel Les Voiles offre un ambiente silenzioso, Wi-Fi in fibra ad alta velocità
            e una posizione equilibrata tra spiagge e centro città.
            Per riunioni o seminari, La Corniche propone un contesto professionale fronte mare.
          </p>
        </section>

        {/* Spiagge */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Vicino alle spiagge del Mourillon</h2>
          <p>Le due migliori opzioni sono:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>La Corniche</strong> — a 30 metri dal mare, posizione privilegiata</li>
            <li><strong>Hôtel Les Voiles</strong> — in zona collinare tranquilla, vicino a calette e scogliere</li>
          </ul>
        </section>

        {/* Vista mare */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Per una vera vista mare</h2>
          <p>
            Il solo hotel a Tolone con vista mare diretta sulla rada è il
            <strong> Best Western Plus La Corniche</strong>, con camere dotate di balcone privato.
          </p>
        </section>

        {/* Villa */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Per una villa privata</h2>
          <p>
            La <strong>Villa Les Voiles</strong> è perfetta per gruppi, famiglie numerose
            e soggiorni lunghi. Offre camere multiple, cucina completa e vicinanza alle spiagge.
          </p>
        </section>

        {/* FAQ nascosta */}
        <section className="sr-only">
          <h2 className="font-serif text-3xl">FAQ – Dove dormire a Tolone</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Qual è l’hotel più vicino alle spiagge del Mourillon?</h3>
              <p>La Corniche, a 30 metri dal mare.</p>
            </div>

            <div>
              <h3 className="font-semibold">Quale hotel ha la migliore vista mare?</h3>
              <p>La Corniche, con camere vista mare e balcone.</p>
            </div>

            <div>
              <h3 className="font-semibold">Dove dormire per un viaggio romantico?</h3>
              <p>La Corniche, grazie alla posizione fronte mare.</p>
            </div>

            <div>
              <h3 className="font-semibold">Esiste una villa in affitto?</h3>
              <p>La Villa Les Voiles, moderna e vicina al mare.</p>
            </div>
          </div>
        </section>

      </article>
    </main>
  );
}
