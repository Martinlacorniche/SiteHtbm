// src/app/mentions/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-[#FDFCF8] text-slate-900 font-sans p-6 md:p-12">
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
              Le site <strong>hotels-toulon-bord-de-mer.com</strong> est édité par la société <strong>SARL SUERE</strong>.<br/>
              Forme juridique : [SARL]<br/>
              Capital social : [100 000] €<br/>
              SIRET : [34179719900013]<br/>
              Siège social : 17 Littoral Frédéric Mistral, 83000 Toulon<br/>
              Directeur de la publication : [Jérôme SUERE]<br/>
              Email : contact-corniche@htbm.fr
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