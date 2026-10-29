import { notFound } from "next/navigation";
import Moteur, { type ContenuCategorie, type Privilege, type Recit } from "./Moteur";
import { pageMoteurCorniche } from "@/lib/moteurNwh/pageCorniche";

/** La page du moteur, en français ou en anglais (les deux adresses la partagent). */
export async function pageCorniche(langue: "fr" | "en") {
  const p = await pageMoteurCorniche(langue);
  if (!p?.cfg) notFound();
  return (
    <Moteur
      langue={langue} hotel={p.slug} hotelId={p.cfg.hotelId} nom={p.marque.nom} adresse={p.marque.adresse}
      maison="corniche" cfg={p.cfg}
      contenu={p.categories as Record<string, ContenuCategorie>}
      privileges={p.privileges as Privilege[]} recit={p.recit as Recit | null}
      telephone={p.marque.telephone} taxeSejour={p.taxeSejour}
      carteRooftop="" nomBar=""
      couleur={p.marque.couleur} accent={p.marque.accent} logo={p.marque.logo ?? ""} policeTitre={p.marque.policeTitre ?? undefined}
      parcours="a"
    />
  );
}

