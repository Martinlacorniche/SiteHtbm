import Link from "next/link";
import { ETABLISSEMENTS, lienReservation } from "@/lib/site";

// Bloc de fin des guides etrangers. Ils se terminaient sur un paragraphe, sans
// un seul lien : le lecteur arrivait de Google, lisait, et repartait. Deux
// maisons, deux boutons, dans sa langue.
//
// Les pages detaillees n'existent qu'en francais et en anglais : les lecteurs
// espagnols, italiens et allemands sont envoyes vers l'anglais plutot que vers
// une page qu'ils ne liront pas.

type Langue = "en" | "es" | "it" | "de";

const MOTS: Record<Langue, { titre: string; intro: string; reserver: string; enSavoir: string; appeler: string }> = {
  en: {
    titre: "Book direct with us",
    intro: "Our two houses in Mourillon, a few minutes from the beaches. Booking direct means talking to the hotel itself.",
    reserver: "Book",
    enSavoir: "About the hotel",
    appeler: "Call",
  },
  es: {
    titre: "Reservar directamente",
    intro: "Nuestras dos casas en Mourillon, a pocos minutos de las playas. Reservar en directo es hablar con el hotel.",
    reserver: "Reservar",
    enSavoir: "Ver el hotel",
    appeler: "Llamar",
  },
  it: {
    titre: "Prenota direttamente",
    intro: "Le nostre due case al Mourillon, a pochi minuti dalle spiagge. Prenotare in diretta significa parlare con l'hotel.",
    reserver: "Prenota",
    enSavoir: "Scopri l'hotel",
    appeler: "Chiama",
  },
  de: {
    titre: "Direkt buchen",
    intro: "Unsere zwei Häuser in Mourillon, wenige Minuten von den Stränden. Direkt buchen heißt mit dem Hotel selbst sprechen.",
    reserver: "Buchen",
    enSavoir: "Zum Hotel",
    appeler: "Anrufen",
  },
};

const PAGE_EN: Record<string, string> = {
  corniche: "/en/seafront-hotel-toulon",
  voiles: "/en/mourillon-beach-hotels",
};

export default function ReserverEnDirect({ langue }: { langue: Langue }) {
  const mots = MOTS[langue];
  return (
    <section className="rounded-2xl border border-gold/30 bg-white/70 p-6 md:p-8">
      <h2 className="font-serif text-2xl text-slate-900">{mots.titre}</h2>
      <p className="mt-2 max-w-2xl text-slate-600">{mots.intro}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {ETABLISSEMENTS.map(e => (
          <div key={e.hotel} className="space-y-2">
            <p className="font-serif text-lg text-slate-900">
              {e.nom}
              <span className="ml-2 align-middle text-[11px] tracking-widest text-gold-ink">{"★".repeat(e.etoiles)}</span>
            </p>
            <p className="text-sm text-slate-500">{e.adresse}</p>
            <p className="flex flex-wrap items-center gap-3 pt-1">
              <a href={lienReservation(e.hotel, "en")} className="btn btn-or px-5 py-2.5 text-xs">
                {mots.reserver}
              </a>
              <Link href={PAGE_EN[e.hotel]} className="text-sm text-navy underline underline-offset-2 hover:text-gold-ink">
                {mots.enSavoir}
              </Link>
              <a href={`tel:${e.telephone.replace(/\s/g, "")}`} className="text-sm text-slate-500 hover:text-gold-ink">
                {mots.appeler} {e.telephone}
              </a>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
