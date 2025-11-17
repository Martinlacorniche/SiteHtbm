import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hôtel proche des plages du Mourillon – Toulon",
  description:
    "Séjourner près des plages du Mourillon à Toulon : Best Western Plus La Corniche face à la mer et Hôtel Les Voiles sur les hauteurs du quartier.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Toulon • Plages du Mourillon
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-slate-900">
            Hôtel proche des plages du Mourillon à Toulon
          </h1>
        </header>

        <p>
          Les plages du Mourillon sont l’un des lieux les plus recherchés pour
          séjourner à Toulon. Nous proposons deux adresses complémentaires dans
          ce quartier : le Best Western Plus La Corniche, directement en bord de
          mer, et l’Hôtel Les Voiles, situé sur les hauteurs à quelques minutes
          des plages.
        </p>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-slate-900">
            Best Western Plus La Corniche – face aux plages
          </h2>
          <p>
            Le Best Western Plus La Corniche se trouve en face du littoral, à
            moins de 30 mètres de la mer. L’hôtel bénéficie d’une vue dégagée
            sur la rade de Toulon et d’un accès immédiat à la promenade, aux
            restaurants et aux plages du Mourillon.
          </p>
          <p>
            C’est l’adresse idéale si vous recherchez un hôtel 4 étoiles
            directement au bord de l’eau, avec certaines chambres vue mer et
            balcon.
          </p>
          <p>
            <a
              href="https://www.secure-hotel-booking.com/d-edge/Hotels-Toulon-Bord-De-Mer/JJ8R/fr-FR"
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline underline-offset-2"
            >
              Réserver au Best Western Plus La Corniche
            </a>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-slate-900">
            Hôtel Les Voiles – proche des plages et des criques
          </h2>
          <p>
            L’Hôtel Les Voiles est un hôtel 3 étoiles intimiste situé sur les
            hauteurs du Mourillon, dans un quartier résidentiel calme. Il se
            trouve à quelques minutes des plages et des criques, tout en offrant
            un environnement plus discret et reposant.
          </p>
          <p>
            Cet hôtel convient particulièrement aux couples, aux voyageurs
            d’affaires et à ceux qui cherchent un séjour au calme, tout en
            restant près du bord de mer.
          </p>
          <p>
            <a
              href="https://www.secure-hotel-booking.com/d-edge/Hotel-Les-Voiles/JJ8J/fr-FR"
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline underline-offset-2"
            >
              Réserver à l’Hôtel Les Voiles
            </a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Accès aux plages du Mourillon
          </h2>
          <p>
            Depuis nos hôtels, les plages du Mourillon sont accessibles à pied
            ou en quelques minutes en voiture. Le quartier offre des
            restaurants, des bars, des activités nautiques et une promenade
            en bord de mer idéale en famille, en couple ou entre amis.
          </p>
          <p>
            Pour découvrir nos établissements dans leur ensemble :
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
