import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hôtel bord de mer à Toulon – Best Western Plus La Corniche",
  description:
    "Hôtel 4 étoiles face à la mer à Toulon, dans le quartier du Mourillon. Chambres vue mer, balcon, petit-déjeuner, idéal pour week-end, vacances et voyages professionnels.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Toulon • Mourillon • Bord de mer
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-slate-900">
            Hôtel bord de mer à Toulon – Best Western Plus La Corniche
          </h1>
        </header>

        <p>
          Le Best Western Plus La Corniche est un hôtel 4 étoiles situé
          directement en bord de mer à Toulon, face à la rade et au cœur du
          quartier des plages du Mourillon. L’hôtel se trouve à moins de 30
          mètres du littoral, avec un accès immédiat à la promenade, aux
          restaurants et aux plages.
        </p>

        <p>
          Les chambres sont lumineuses et modernes. Certaines offrent un balcon
          privatif avec vue mer sur la rade de Toulon. La literie premium, le
          Wifi Fibre haut débit et le petit-déjeuner buffet en font un choix
          idéal pour un week-end en bord de mer, des vacances ou un déplacement
          professionnel.
        </p>

        <p>
          Depuis l’hôtel, le Fort Saint-Louis est accessible en quelques minutes
          à pied, tout comme les plages du Mourillon. Le port de Toulon est à
          environ 7 minutes en voiture. Le quartier est calme, largement
          piéton, et permet de profiter du bord de mer à toute heure de la
          journée.
        </p>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Pourquoi choisir cet hôtel en bord de mer à Toulon ?
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Vue mer directe sur la rade de Toulon pour de nombreuses chambres</li>
            <li>Situation au cœur des plages du Mourillon</li>
            <li>Restaurants et bars de bord de mer accessibles à pied</li>
            <li>Quartier calme, idéal pour les balades au lever ou au coucher du soleil</li>
            <li>Accès simple au centre-ville et au port de Toulon</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">
            Réserver votre séjour
          </h2>
          <p>
            Pour vérifier les disponibilités et réserver votre chambre bord de
            mer à Toulon, consultez notre moteur de réservation sécurisé :
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
          <p>
            Vous pouvez également découvrir l’ensemble de nos établissements sur
            la page d’accueil :
            <span> </span>
            <a
              href="/"
              className="text-sky-700 underline underline-offset-2"
            >
              Hôtels Toulon Bord de Mer
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
