import type { Metadata } from "next";
import Link from "next/link";


export const metadata: Metadata = {
  title: "Hôtel pour séminaire à Toulon – Bord de mer",
  description:
    "Organiser un séminaire à Toulon en bord de mer : Best Western Plus La Corniche et son Espace Pro pour réunions, journées d’étude et événements d’entreprise.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Toulon • Séminaires • Entreprises
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-slate-900">
            Hôtel pour séminaire à Toulon en bord de mer
          </h1>
        </header>

        <p>
          Pour organiser un séminaire à Toulon, une réunion d’équipe ou une
          journée d’étude, le Best Western Plus La Corniche propose un cadre
          unique en bord de mer, dans le quartier du Mourillon. L’hôtel associe
          un environnement méditerranéen lumineux et les services nécessaires à
          l’accueil de groupes professionnels.
        </p>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Un cadre de travail face à la mer
          </h2>
          <p>
            Les espaces peuvent accueillir des réunions, comités de direction ou
            petits séminaires dans un décor ouvert sur la rade de Toulon. Le
            quartier du Mourillon permet d’alterner séances de travail, pauses
            en terrasse et moments sur le littoral.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Services pour les séminaires
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Hébergement en hôtel 4 étoiles</li>
            <li>Wifi Fibre haut débit</li>
            <li>Petit-déjeuner buffet</li>
            <li>Accès rapide au centre-ville et au port de Toulon</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Demande de devis et réservation
          </h2>
          <p>
            Pour une demande sur mesure ou un devis séminaire à Toulon, vous
            pouvez passer par notre formulaire dédié :
          </p>
          <p>
            <a
              href="https://bw-plus-la-corniche.backyou.app/fr/c/request#__step_request_0"
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline underline-offset-2"
            >
              Demander un séminaire à La Corniche
            </a>
          </p>
          <p>
  Vous pouvez aussi découvrir nos autres offres bord de mer :
  <span> </span>
  <Link href="/" className="text-sky-700 underline underline-offset-2">
    Hôtels Toulon Bord de Mer
  </Link>
  .
</p>

        </section>
      </article>
    </main>
  );
}
