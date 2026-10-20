"use client";

import { useEffect } from "react";
import { noterProvenance } from "@/lib/mesure";

/** Note d'où vient le visiteur, à la PREMIÈRE page de l'onglet. Rien d'autre :
 *  voir `src/lib/mesure.ts` pour ce qui est retenu (une étiquette, jamais une
 *  adresse). Sur /reserver, le référent serait notre propre page d'accueil. */
export default function Provenance() {
  useEffect(() => { noterProvenance(); }, []);
  return null;
}
