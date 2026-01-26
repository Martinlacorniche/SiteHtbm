"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { Playfair_Display, Inter } from 'next/font/google';
// Note les ".." pour remonter chercher les données
import { ARTICLES } from "../articles"; 

const serif = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-serif' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function ArticlePage() {
  const params = useParams();
  
  // On cherche l'article qui correspond au slug dans l'URL
  const post = ARTICLES.find((a) => a.slug === params.slug);

  // Sécurité si l'article n'existe pas
  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCF8]">
        <h1 className="font-serif text-4xl mb-4">Oups !</h1>
        <p>Article introuvable.</p>
        <Link href="/journal" className="mt-8 underline">Retour au journal</Link>
      </div>
    );
  }

  return (
    <div className={`${serif.variable} ${sans.variable} font-sans min-h-screen bg-[#FDFCF8] text-slate-900 selection:bg-amber-100`}>
      
      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between">
         <Link href="/journal" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour au Journal
         </Link>
      </nav>

      <article className="pt-32 pb-24">
        {/* EN-TÊTE ARTICLE */}
        <div className="max-w-4xl mx-auto px-4 text-center mb-12">
            <div className="flex justify-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
                <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600">{post.category}</span>
                <span className="flex items-center gap-2 py-1"><Calendar className="w-3 h-3"/> {post.date}</span>
                <span className="flex items-center gap-2 py-1"><Clock className="w-3 h-3"/> {post.readTime}</span>
            </div>
            <h1 className="font-serif text-4xl md:text-6xl leading-tight text-slate-900 mb-8">{post.title}</h1>
            <p className="text-xl text-slate-500 font-serif italic max-w-2xl mx-auto">{post.excerpt}</p>
        </div>

        {/* IMAGE */}
        <div className="relative w-full h-[50vh] md:h-[70vh] mb-16">
            <Image src={post.image} alt={post.title} fill className="object-cover" priority />
        </div>

        {/* CONTENU TEXTE */}
        <div className="max-w-2xl mx-auto px-6 text-lg leading-relaxed text-slate-800">
            {post.content}
            
            <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-center">
                <span className="font-serif italic text-slate-400">La Rédaction HTBM</span>
            </div>
        </div>
      </article>
    </div>
  );
}