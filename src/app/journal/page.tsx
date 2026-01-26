"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { Playfair_Display, Inter } from 'next/font/google';
import { cn } from "@/lib/utils";
// C'est cette ligne qui va chercher tes articles dans le fichier articles.tsx
import { ARTICLES } from "./articles"; 

const serif = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-serif' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function JournalPage() {
  return (
    <div className={`${serif.variable} ${sans.variable} font-sans min-h-screen bg-[#FDFCF8] text-slate-900 selection:bg-amber-100`}>
      
      {/* --- HEADER SIMPLE --- */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between">
         <Link href="/" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
         </Link>
         <span className="font-serif font-bold text-lg hidden md:block">Hôtels Toulon Bord de Mer</span>
         <div className="w-20" /> 
      </nav>

      {/* --- TITRE --- */}
      <header className="pt-40 pb-20 px-4 text-center">
          <span className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase mb-4 block">Magazine & Inspirations</span>
          <h1 className="font-serif text-5xl md:text-7xl text-slate-900 mb-6">Le Journal</h1>
          <p className="max-w-xl mx-auto text-slate-600 leading-relaxed text-lg">
            Histoires de mer, guides locaux et coulisses de nos maisons.
            L'art de vivre toulonnais, décrypté pour vous.
          </p>
      </header>

      {/* --- GRILLE ARTICLES --- */}
      <section className="px-4 pb-24">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
           {ARTICLES.map((post) => (
             <Link href={`/journal/${post.slug}`} key={post.id} className="group cursor-pointer flex flex-col gap-4">
                {/* Image avec effet zoom */}
                <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
                   <Image 
                     src={post.image} 
                     alt={post.title} 
                     fill 
                     className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                   />
                   <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                   <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-900 shadow-sm">
                      {post.category}
                   </div>
                </div>

                {/* Contenu Textuel */}
                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {post.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {post.readTime}</span>
                   </div>
                   
                   <h2 className="font-serif text-2xl md:text-3xl text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                      {post.title}
                   </h2>
                   
                   <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
                      {post.excerpt}
                   </p>

                   <div className="pt-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-900 group-hover:gap-4 transition-all duration-300">
                      Lire l'article <ArrowLeft className="w-3 h-3 rotate-180" />
                   </div>
                </div>
             </Link>
           ))}
        </div>
      </section>

      {/* --- FOOTER SIMPLIFIÉ --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-center text-xs">
          <p>© {new Date().getFullYear()} HTBM Collection. Tous droits réservés.</p>
      </footer>
    </div>
  );
}