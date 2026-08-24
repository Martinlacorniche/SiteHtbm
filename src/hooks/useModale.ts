"use client";

import { useCallback, useEffect, useRef } from "react";

const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Le minimum vital d'une boîte de dialogue, au clavier comme au lecteur
 * d'écran : Échap ferme, le focus entre dans la modale et n'en sort plus tant
 * qu'elle est ouverte, la page derrière ne défile pas, et le focus revient sur
 * le bouton d'origine à la fermeture.
 *
 * Renvoie la ref à poser sur le panneau (pas sur le voile de fond).
 */
export function useModale<T extends HTMLElement>(ouverte: boolean, fermer: () => void) {
  const ref = useRef<T>(null);

  // La fermeture change d'identité à chaque rendu du parent : on la garde dans
  // une ref, sinon l'effet se rejouerait sans cesse et volerait le focus.
  const fermerRef = useRef(fermer);
  fermerRef.current = fermer;

  const visibles = useCallback(() => {
    if (!ref.current) return [] as HTMLElement[];
    return Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLES)).filter(
      el => el.offsetParent !== null || el === document.activeElement
    );
  }, []);

  useEffect(() => {
    if (!ouverte) return;

    const declencheur = document.activeElement as HTMLElement | null;
    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const premiers = visibles();
    (premiers[0] ?? ref.current)?.focus();

    function auClavier(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        fermerRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;

      const cibles = visibles();
      if (!cibles.length) return;
      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];
      const actif = document.activeElement;

      if (e.shiftKey && (actif === premier || !ref.current.contains(actif))) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && actif === dernier) {
        e.preventDefault();
        premier.focus();
      }
    }

    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("keydown", auClavier);
      document.body.style.overflow = overflowInitial;
      if (declencheur?.isConnected) declencheur.focus();
    };
  }, [ouverte, visibles]);

  return ref;
}
