"use client";

/* LE PETIT-DÉJEUNER EN VIDÉO (30/10/2026) — cinq secondes tournées par Mariam au lever du soleil : le
 * buffet, les viennoiseries, la rade derrière la baie vitrée.
 *
 * Deux usages, un seul composant :
 *  · la VIGNETTE dans l'option « Ajouter le petit-déjeuner » du paiement — elle tourne en boucle, sans le
 *    son, à côté de la case : le client qui hésite voit ce qu'il coche ;
 *  · le BOUTON « voir » sur la ligne du petit-déjeuner dans « Nos plus ».
 * Les deux ouvrent la vidéo en grand, par-dessus la page (portail) : rien ne bouge dessous.
 *
 * Mouvement réduit demandé par l'appareil : la vignette reste sur son image fixe. */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const VIDEO_PDJ = {
  mp4: "/media/corniche-petit-dejeuner.mp4",
  webm: "/media/corniche-petit-dejeuner.webm",
  affiche: "/media/corniche-petit-dejeuner.jpg",
};

function useMouvementReduit() {
  const [reduit, setReduit] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduit(m.matches);
    const f = () => setReduit(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return reduit;
}

function Sources() {
  return (
    <>
      <source src={VIDEO_PDJ.webm} type="video/webm" />
      <source src={VIDEO_PDJ.mp4} type="video/mp4" />
    </>
  );
}

/** La vidéo en grand, verticale, centrée ; un clic n'importe où ou Échap la referme. */
export function VideoPetitDejGrand({ ouvert, onFermer, legende }: { ouvert: boolean; onFermer: () => void; legende: string }) {
  useEffect(() => {
    if (!ouvert) return;
    /* Échap ferme la vidéo, et SEULEMENT elle : écouté en premier (capture) et arrêté là — sinon il
       refermait aussi la fenêtre de paiement ouverte dessous. */
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); onFermer(); } };
    window.addEventListener("keydown", k, true);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k, true); document.body.style.overflow = avant; };
  }, [ouvert, onFermer]);
  if (!ouvert || typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={legende} onClick={onFermer}
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <figure className="relative" onClick={(e) => e.stopPropagation()}>
        <video autoPlay muted loop playsInline poster={VIDEO_PDJ.affiche}
          className="max-h-[82vh] w-auto max-w-[92vw] rounded-2xl shadow-2xl" style={{ aspectRatio: "9 / 16" }}>
          <Sources />
        </video>
        <figcaption className="mt-3 text-center text-[13px] text-white/80">{legende}</figcaption>
        <button type="button" onClick={onFermer} aria-label="Fermer"
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70">×</button>
      </figure>
    </div>,
    document.body,
  );
}

/** La vignette de l'option du paiement : 40 × 56, en boucle, sans le son. Le clic l'agrandit sans
 *  cocher la case qu'elle accompagne. */
export function VignettePetitDej({ legende }: { legende: string }) {
  const reduit = useMouvementReduit();
  const [grand, setGrand] = useState(false);
  return (
    <>
      <button type="button" aria-label={legende}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGrand(true); }}
        className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/5 transition hover:scale-[1.04] hover:ring-gold/60">
        {reduit ? (
          // eslint-disable-next-line @next/next/no-img-element -- image fixe locale, déjà au bon format
          <img src={VIDEO_PDJ.affiche} alt="" className="h-full w-full object-cover" />
        ) : (
          <video autoPlay muted loop playsInline preload="metadata" poster={VIDEO_PDJ.affiche} className="h-full w-full object-cover">
            <Sources />
          </video>
        )}
        <span aria-hidden className="absolute bottom-0.5 right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-white/85 text-[7px] text-navy">▶</span>
      </button>
      <VideoPetitDejGrand ouvert={grand} onFermer={() => setGrand(false)} legende={legende} />
    </>
  );
}

/** Le petit bouton lecture d'une ligne de « Nos plus » (`libelle` : son nom pour les lecteurs d'écran). */
export function VoirPetitDej({ libelle, legende }: { libelle: string; legende: string }) {
  const [grand, setGrand] = useState(false);
  return (
    <>
      {/* Une pastille de la hauteur du texte, sans libellé : un « voir » écrit passait à la ligne et
          rallongeait « Nos plus », qui doit tenir sans défiler. */}
      <button type="button" onClick={() => setGrand(true)} aria-label={libelle} title={libelle}
        className="ml-1 inline-grid h-[15px] w-[15px] place-items-center rounded-full bg-gold/90 align-[-2px] text-[7px] text-white transition hover:scale-110 hover:bg-gold">
        <span aria-hidden className="translate-x-[0.5px]">▶</span>
      </button>
      <VideoPetitDejGrand ouvert={grand} onFermer={() => setGrand(false)} legende={legende} />
    </>
  );
}
