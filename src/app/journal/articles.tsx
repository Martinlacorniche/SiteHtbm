import React from "react";

export const ARTICLES = [
  {
    id: 1,
    slug: "criques-mitre-toulon", // C'est ça qui fait l'URL (ex: /journal/criques-mitre-toulon)
    category: "Secret Spot",
    date: "26 Jan 2026",
    readTime: "4 min",
    title: "L'Eldorado Secret : Les Criques de la Mitre",
    excerpt: "Oubliez les grandes plages. Juste en face de l'hôtel se cache un chapelet de criques sauvages, invisibles depuis la ville.",
    image: "/images/mitre2.jpg",
    // Ici on met le VRAI contenu de l'article
    content: (
      <>
        <p className="mb-6 font-serif text-xl leading-relaxed text-slate-600">
          C'est un paradoxe toulonnais. On peut être en plein centre-ville et se sentir seul au monde. Les plages de la Mitre ne sont pas indiquées, et c'est tant mieux. C'est un sanctuaire de roche et d'eau cristalline, protégé des regards par la falaise.
        </p>
        <h3 className="text-2xl font-serif text-slate-900 mt-8 mb-4">Pourquoi on adore ?</h3>
        <p className="mb-6 leading-relaxed text-slate-600">
          Ici, pas de sable fin aligné, mais une succession de petites anses sauvages, de galets polis et de rochers plats où il fait bon lézarder. L'eau y est souvent plus claire qu'ailleurs, brassée par les courants du large. C'est le spot préféré des locaux pour un bain matinal ou un apéro au coucher du soleil face à la Tour Royale.
        </p>
        <div className="bg-amber-50 border-l-4 border-amber-300 p-6 my-8 rounded-r-xl">
           <h4 className="font-bold text-amber-900 mb-2 uppercase tracking-widest text-xs">L'Accès Secret (Réservé à nos hôtes)</h4>
           <p className="text-amber-800 text-sm">
             Depuis l'hôtel, inutile de prendre la voiture. Traversez simplement le parking qui nous fait face pour rejoindre la mer. Prenez la promenade pietonne au bout. Là, longez la falaise. Vous trouverez un escalier discret qui descend vers ce paradis minéral. Chut, ça reste entre nous.
           </p>
        </div>
      </>
    )
  },
  
  // Tu peux laisser les autres comme ça pour l'instant
  {
    id: 3,
    slug: "art-figue",
    category: "Sens",
    date: "28 Sept 2025",
    readTime: "5 min",
    title: "L'art de la Figue : notre signature olfactive avec Byca",
    excerpt: "Une chambre d'hôtel a une odeur. Nous avons choisi la nôtre : la figue, et des soins artisanaux signés Byca. Voici pourquoi.",
    image: "/images/byca-figue.jpg",
    content: (
      <>
        <p className="mb-6 font-serif text-xl leading-relaxed text-slate-600">
          On retient un lieu par ce qu'on y voit, mais on s'en souvient par ce qu'on y sent. Avant même la vue sur la rade ou la douceur des draps, c'est une odeur qui vous accueille chez nous. Nous avons mis du temps à la choisir. C'est la figue.
        </p>

        <h3 className="text-2xl font-serif text-slate-900 mt-8 mb-4">Pourquoi la figue ?</h3>
        <p className="mb-6 leading-relaxed text-slate-600">
          Parce qu'elle est d'ici. Le figuier pousse partout sur la côte varoise, dans les jardins du Mourillon comme au creux des criques. Son parfum n'est pas sucré ni entêtant : c'est une senteur verte, lactée, presque fraîche, qui évoque l'ombre d'un arbre en fin d'été. Elle ne cherche pas à impressionner — elle apaise. C'est exactement ce que nous voulons offrir dès le passage de la porte.
        </p>

        <h3 className="text-2xl font-serif text-slate-900 mt-8 mb-4">Une collaboration artisanale : Byca</h3>
        <p className="mb-6 leading-relaxed text-slate-600">
          Pour donner vie à cette signature, nous avons choisi <strong>Byca</strong>, des soins cosmétiques artisanaux. Plutôt que des petits flacons industriels anonymes, nous voulions des produits qu'on a envie de garder en main : des textures soignées, des formules sobres, une fabrication à taille humaine. La figue se prolonge ainsi du parfum d'ambiance jusqu'au soin pour la peau.
        </p>

        <div className="bg-emerald-50 border-l-4 border-emerald-300 p-6 my-8 rounded-r-xl">
          <h4 className="font-bold text-emerald-900 mb-2 uppercase tracking-widest text-xs">🌿 À emporter (ou presque)</h4>
          <p className="text-emerald-800 text-sm">
            Les soins Byca sont disponibles à la réception du Best Western Plus La Corniche. Beaucoup de nos hôtes repartent avec : un moyen simple de prolonger un peu le séjour, une fois rentrés chez eux.
          </p>
        </div>

        <h3 className="text-2xl font-serif text-slate-900 mt-8 mb-4">Le détail qui fait la maison</h3>
        <p className="mb-6 leading-relaxed text-slate-600">
          Ce sont ces petites attentions — une odeur, un soin, une texture — qui transforment une nuit d'hôtel en souvenir. Au <a href="/hotel-bord-de-mer-toulon" className="underline text-sky-700">Best Western Plus La Corniche</a>, les soins Byca font désormais partie de l'expérience, tandis que l'esprit de la figue souffle aussi sur l'<a href="/hotel-plage-mourillon" className="underline text-sky-700">Hôtel Les Voiles</a>. Une signature discrète, mais que l'on n'oublie pas.
        </p>

        <div className="bg-slate-900 text-white p-6 my-8 rounded-xl">
          <h4 className="font-bold mb-2 uppercase tracking-widest text-xs text-amber-300">✨ Bientôt</h4>
          <p className="text-slate-200 text-sm leading-relaxed">
            Cet été, nous allons encore plus loin : nos premiers diffuseurs de parfum nouvelle génération arrivent dans les chambres. L'idée ? Vous laisser <strong>choisir l'odeur de votre chambre</strong> — au moment du check-in, et bientôt dès la réservation. Votre séjour, votre ambiance. On a hâte de vous faire respirer ça.
          </p>
        </div>
      </>
    )
  },
  {
    id: 4,
    slug: "le-mourillon-quartier-plage-toulon",
    category: "Le Quartier",
    date: "22 Juin 2026",
    readTime: "4 min",
    title: "Le Mourillon, le quartier plage de Toulon (vu par The Guardian)",
    excerpt: "Le quotidien britannique The Guardian consacre un reportage au Mourillon — et cite l'Hôtel Les Voiles. Visite de notre quartier, entre criques, marché provençal et terrasses face à la mer.",
    image: "/images/voiles.jpg",
    content: (
      <>
        <p className="mb-6 font-serif text-xl leading-relaxed text-slate-600">
          En juin 2026, le journal britannique <em>The Guardian</em> a consacré un reportage au Mourillon, qu'il décrit comme « le quartier plage cool et décontracté de Toulon », avec un ensoleillement « quasiment garanti toute l'année ». Un quartier que nous avons la chance d'appeler maison.
        </p>

        <h3 className="text-2xl font-serif text-slate-900 mt-8 mb-4">Un ancien village de pêcheurs</h3>
        <p className="mb-6 leading-relaxed text-slate-600">
          Au sud du centre-ville, Le Mourillon a gardé son âme de village méditerranéen : petites boutiques de produits provençaux, étals de tomates gorgées de soleil et d'ail rose, bars animés et terrasses qui débordent sur les places dès les beaux jours. On y vient pour les <a href="/hotel-plage-mourillon" className="underline text-sky-700">plages</a>, on y reste pour l'ambiance.
        </p>

        <div className="bg-sky-50 border-l-4 border-sky-300 p-6 my-8 rounded-r-xl">
          <h4 className="font-bold text-sky-900 mb-2 uppercase tracking-widest text-xs">Ils parlent de nous</h4>
          <p className="text-sky-800 text-sm">
            Parmi les bonnes adresses où dormir, <em>The Guardian</em> cite notre <a href="/hotel-plage-mourillon" className="underline">Hôtel Les Voiles</a> : un hébergement simple aux belles vues, à deux pas des plages. Une jolie reconnaissance pour notre boutique-hôtel sur les hauteurs du Mourillon.
          </p>
        </div>

        <h3 className="text-2xl font-serif text-slate-900 mt-8 mb-4">Où manger, boire un verre</h3>
        <p className="mb-6 leading-relaxed text-slate-600">
          Le quartier regorge de tables. L'article met en avant <strong>AOC 41</strong> pour sa cuisine de saison, le <strong>Havana Café</strong> pour un verre qui s'étend sur toute la place l'été, ou encore <strong>La Sorga</strong> pour une salade et un verre de rosé face à la mer. De quoi composer un séjour gourmand sans jamais prendre la voiture.
        </p>

        <h3 className="text-2xl font-serif text-slate-900 mt-8 mb-4">Nos deux maisons, au cœur du quartier</h3>
        <p className="mb-6 leading-relaxed text-slate-600">
          Pour profiter du Mourillon, deux adresses : le <a href="/hotel-bord-de-mer-toulon" className="underline text-sky-700">Best Western Plus La Corniche</a>, les pieds dans l'eau face à la rade, et l'<a href="/hotel-plage-mourillon" className="underline text-sky-700">Hôtel Les Voiles</a>, plus intime, sur la colline. Et pour un séjour entre proches, la <a href="/villa-les-voiles-toulon" className="underline text-sky-700">Villa Les Voiles</a> se privatise entièrement.
        </p>
      </>
    )
  },
    {
    id: 5,
    slug: "renovation-villa",
    category: "Design",
    date: "02 Sept 2025",
    readTime: "4 min",
    title: "Rénover une villa historique : Les coulisses",
    excerpt: "Comment garder l'âme d'une maison de famille tout en apportant le confort...",
    image: "/images/villa.jpg",
    content: <p>Contenu à venir...</p>
  }
];