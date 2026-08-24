"use client";

import { useEffect } from "react";

/**
 * Corrige l'attribut lang de <html> sur les pages non francophones.
 *
 * Pourquoi un composant client : seul le layout racine rend la balise <html>, et
 * il ne connait pas l'URL. Le corriger cote serveur imposerait soit des route
 * groups (deplacer tout le site), soit headers() dans le layout racine (ce qui
 * ferait perdre le prerendu statique partout).
 *
 * Ce palliatif corrige ce qui gene le plus au quotidien : les lecteurs d'ecran,
 * qui lisaient jusqu'ici l'anglais avec la prononciation francaise. Le HTML servi
 * reste en lang="fr" — la vraie correction viendra avec le chantier i18n.
 */
export default function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const el = document.documentElement;
    const precedent = el.lang;
    el.lang = lang;
    // Navigation client vers une page FR : on remet la langue d'origine.
    return () => { el.lang = precedent; };
  }, [lang]);

  return null;
}
