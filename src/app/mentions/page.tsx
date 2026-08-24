// src/app/mentions/page.tsx
import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { alternatesFor } from "@/lib/site";

export const metadata: Metadata = {
  alternates: alternatesFor("/mentions"),
  title: "Mentions légales — Hôtels Toulon Bord de Mer",
  description:
    "Éditeur, hébergement, propriété intellectuelle et données personnelles du site des Hôtels Toulon Bord de Mer.",
};

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-cream text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        
        {/* BOUTON RETOUR */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-12 font-bold text-sm uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>

        <h1 className="font-serif text-4xl md:text-5xl mb-8">Mentions Légales</h1>

        <div className="space-y-8 text-slate-600 leading-relaxed">
          
          {/* SECTION 1 */}
          <section>
            <h2 className="font-serif text-2xl text-slate-900 mb-4">1. Éditeur du site</h2>
            <p>
              Le site <strong>hotels-toulon-mer.com</strong> est édité par la société <strong>SARL SUERE</strong>.<br/>
              Forme juridique : société à responsabilité limitée (SARL)<br/>
              Capital social : 100 000 € (fixe)<br/>
              SIREN : 341 797 199 — SIRET du siège : 341 797 199 00013<br/>
              RCS Toulon 341 797 199<br/>
              N° de TVA intracommunautaire : FR50 341 797 199<br/>
              Siège social : 17 Littoral Frédéric Mistral, 83000 Toulon<br/>
              Directeur de la publication : Jérôme SUERE, gérant<br/>
              Téléphone : <a href="tel:0494413512" className="underline">04 94 41 35 12</a><br/>
              Email : <a href="mailto:contact-corniche@htbm.fr" className="underline">contact-corniche@htbm.fr</a>
            </p>
          </section>

          {/* SECTION 2 */}
          <section>
            <h2 className="font-serif text-2xl text-slate-900 mb-4">2. Hébergement</h2>
            <p>
              Le site est hébergé par <strong>Netlify</strong>.<br/>
              Adresse de l'hébergeur :  340 S Lemon Ave #4133 Walnut, CA 91789, USA
            </p>
          </section>

          {/* SECTION 3 */}
          <section>
            <h2 className="font-serif text-2xl text-slate-900 mb-4">3. Propriété intellectuelle</h2>
            <p>
              L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
            </p>
          </section>
          
          {/* SECTION 4 */}
           <section>
            <h2 className="font-serif text-2xl text-slate-900 mb-4">4. Données personnelles</h2>
            <p>
              Les informations recueillies via les liens de contact sont destinées exclusivement à l'usage interne pour répondre à vos demandes. Conformément à la loi « Informatique et Libertés », vous disposez d'un droit d'accès, de modification et de suppression des données vous concernant.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}