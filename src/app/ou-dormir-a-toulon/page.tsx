import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Où dormir à Toulon ? Guide complet selon votre séjour",
  description:
    "Hôtel bord de mer, hôtel proche des plages du Mourillon, villa privatisable, séjour en couple, en famille ou pour le business : découvrez où dormir à Toulon selon votre type de voyage.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-slate-800">
      <article className="space-y-12">

        {/* HERO */}
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Guide • Toulon • Hébergements
          </p>
          <h1 className="font-serif text-4xl text-slate-900">
            Où dormir à Toulon selon votre voyage ?
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Toulon offre des options variées pour chaque type de séjour : bord de mer, plages du Mourillon, villa privatisable,
            escapade romantique ou déplacement professionnel. Voici un guide clair et local pour choisir l’hébergement idéal.
          </p>
        </header>

        {/* Familles */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Pour les familles</h2>
          <p>
            Pour un séjour en famille à Toulon, l’Hôtel Les Voiles est idéal : environnement calme, chambres modernes,
            proximité immédiate des plages du Mourillon et accès simple aux activités nautiques.  
            Pour les familles nombreuses, la <strong>Villa Les Voiles</strong> offre encore plus d’espace avec plusieurs chambres et une cuisine équipée.
          </p>

          <p>
            ➜ <a href="/hotel-plage-mourillon" className="underline text-sky-700">Voir où dormir près des plages du Mourillon</a>
          </p>
        </section>

        {/* Couples */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Pour un séjour en couple</h2>
          <p>
            Pour un week-end romantique à Toulon, le <strong>Best Western Plus La Corniche</strong> est parfait : face à la mer,
            ambiance méditerranéenne, restaurants de bord de mer accessibles à pied et possibilité de chambres avec vue panoramique.
            Le quartier du Mourillon est idéal pour les balades au coucher du soleil.
          </p>

          <p>
            ➜ <a href="/hotel-bord-de-mer-toulon" className="underline text-sky-700">Voir les hôtels bord de mer</a>
          </p>
        </section>

        {/* Business */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Pour un déplacement professionnel</h2>
          <p>
            Pour un séjour business, l’Hôtel Les Voiles propose un environnement calme, un Wifi Fibre très haut débit
            et une localisation pratique entre plages et centre-ville.  
            Pour les réunions et séminaires, le <strong>Best Western Plus La Corniche</strong> dispose d’un cadre idéal face à la rade.
          </p>

          <p>
            ➜ <a href="/hotel-seminaire-toulon" className="underline text-sky-700">Organiser un séminaire à Toulon</a>
          </p>
        </section>

        {/* Plage / Mourillon */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Pour être près des plages du Mourillon</h2>
          <p>
            Le quartier des plages du Mourillon est l’endroit le plus recherché pour dormir à Toulon.
            Deux options s’offrent à vous :
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Best Western Plus La Corniche</strong> — directement face à la mer, à 30 m du littoral</li>
            <li><strong>Hôtel Les Voiles</strong> — sur les hauteurs, calme et proche des criques</li>
          </ul>

          <p>
            ➜ <a href="/hotel-plage-mourillon" className="underline text-sky-700">Hôtels proches des plages du Mourillon</a>
          </p>
        </section>

        {/* Vue mer */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Pour une vraie vue mer</h2>
          <p>
            Le seul hôtel de Toulon proposant une <strong>vue mer directe sur la rade</strong> est le Best Western Plus La Corniche.
            Plusieurs chambres disposent d’un balcon privatif permettant de profiter du panorama.
          </p>

          <p>
            ➜ <a href="/hotel-bord-de-mer-toulon" className="underline text-sky-700">Voir l’hôtel face à la mer</a>
          </p>
        </section>

        {/* Villa */}
        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-slate-900">Pour une villa privatisable</h2>
          <p>
            La <strong>Villa Les Voiles</strong> est parfaite pour les groupes, les familles nombreuses et les séjours longue durée.
            Elle combine autonomie (cuisine, grande surface) et emplacement privilégié à proximité des plages.
          </p>

          <p>
            ➜ <a href="/villa-les-voiles-toulon" className="underline text-sky-700">Voir la Villa Les Voiles</a>
          </p>
        </section>

      </article>
    </main>
  );
}
