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
    title: "L'art de la Figue : La signature du Sud",
    excerpt: "Pourquoi nous avons choisi la figue comme identité olfactive avec Byca...",
    image: "/images/byca-figue.jpg",
    content: <p>Contenu à venir...</p>
  },
  {
    id: 4,
    slug: "regates-voiles",
    category: "Événement",
    date: "15 Sept 2025",
    readTime: "2 min",
    title: "Retour en images sur la régate des Voiles",
    excerpt: "Une journée exceptionnelle en mer. Vent d'est, ciel bleu...",
    image: "/images/voiles.jpg",
    content: <p>Contenu à venir...</p>
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