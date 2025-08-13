"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Globe, Phone, Mail, Star, Instagram, Facebook, Linkedin, Link2, MapPin,
} from "lucide-react";
import { motion } from "framer-motion";
import Script from "next/script";



/** ========= CONTENU (à personnaliser si besoin) ========= */
const CONFIG = {
  brandFr: "Hôtel Toulon Bord de Mer",
  brandEn: "Hotel Toulon Seafront",
  brandLogo: "/logos/logo-bleu.png",

  instagram: "https://www.instagram.com/hotels_toulon_mer/",
  facebook: "https://www.facebook.com/hotelstbm",
  linkedin: "https://fr.linkedin.com/company/best-western-plus-hotel-la-corniche",

  heroTagFr: "Boutiques Hôtels de Charme – Côte d’Azur",
  heroTagEn: "Seafront Escapes – Côte d’Azur",

  hotels: [
    {
      key: "corniche",
      nameFr: "Best Western Plus La Corniche",
      nameEn: "Best Western Plus La Corniche",
      stars: 4,
      bookingUrl: "https://www.secure-hotel-booking.com/d-edge/Hotels-Toulon-Bord-De-Mer/JJ8R/fr-FR",
      phone: "04 94 41 35 12",               // ← laisse tes valeurs actuelles si tu les as modifiées
      email: "contact-corniche@htbm.fr",     // ← idem
      socials: {
        instagram: "https://www.instagram.com/hotels_toulon_mer/",
        facebook: "https://www.facebook.com/hotelstbm",
      },
      address: "17 Littoral Frédéric Mistral, 83000 Toulon",
      image: "/images/corniche.jpg",
      logo: "/logos/la-corniche.png",
    },
    {
      key: "voiles",
      nameFr: "Hôtel Les Voiles",
      nameEn: "Hotel Les Voiles",
      stars: 3,
      bookingUrl: "https://www.secure-hotel-booking.com/d-edge/Hotel-Les-Voiles/JJ8J/fr-FR",
      phone: "04 94 41 36 23",               // ← laisse tes valeurs actuelles si tu les as modifiées
      email: "contact-lesvoiles@htbm.fr",    // ← idem
      socials: {
        instagram: "https://www.instagram.com/hotels_toulon_mer/",
        facebook: "https://www.facebook.com/hotelstbm",
      },
      address: "124 rue Gubler, 83000 Toulon",
      image: "/images/voiles.jpg",
      logo: "/logos/les-voiles.png",
    },
  ],

  rooftop: {
    titleFr: "Le Rooftop",
    titleEn: "The Rooftop",
    menuUrl: "https://www.monsieurcocktail.com/menu-sunday-sunset/",
    bookingUrl: "", // vide ⇒ pas de bouton
    bg: "/images/rooftop.jpg", 
  },
  pro: {
    titleFr: "Espace Pro",
    titleEn: "Business",
    seminarUrl: "https://bw-plus-la-corniche.backyou.app/fr/c/request#__step_request_0",
    coworkUrl: "https://mywo.fr/etablissements/mywo-toulon",
    bg: "/images/business.jpg",
  },
  media: {
  bubbles: [
    "https://res.cloudinary.com/dclj42mpj/video/upload/v1755098533/sea_bhzotx.mp4",    // grande ovale (gauche)
    "https://res.cloudinary.com/dclj42mpj/video/upload/v1755098499/sunset_lswe4c.mp4", // petit cercle
  ],
},
};
/** ====================================================== */

export default function Page() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const t = useMemo(() => {
    const fr = {
      hotels: "Nos hôtels",
      book: "Réserver",
      rooftop: CONFIG.rooftop.titleFr,
      menu: "Voir la carte",
      reserveTable: "Réserver",
      pro: CONFIG.pro.titleFr,
      seminar: "Réserver un séminaire",
      cowork: "Réserver un espace cowork",
      contact: "Contacts",
      heroTag: CONFIG.heroTagFr,
    } as const;
    const en = {
      hotels: "Our Hotels",
      book: "Book Now",
      rooftop: CONFIG.rooftop.titleEn,
      menu: "View Menu",
      reserveTable: "Reserve",
      pro: CONFIG.pro.titleEn,
      seminar: "Book a seminar",
      cowork: "Book coworking",
      contact: "Contacts",
      heroTag: CONFIG.heroTagEn,
    } as const;
    return lang === "fr" ? fr : en;
  }, [lang]);

  return (
    <div className="min-h-screen w-full relative overflow-hidden text-slate-900">
      {/* Background doux */}
<div className="pointer-events-none absolute inset-0 -z-10">
  {/* Dégradés au fond (plus bas en z-index) */}
  <div className="absolute inset-0 z-[-20] bg-[radial-gradient(60%_60%_at_80%_10%,#93C5FD40,transparent_60%),radial-gradient(50%_50%_at_10%_90%,#C6A97226,transparent_60%)]" />
  <div className="absolute inset-0 z-[-19] bg-gradient-to-b from-[#FAF9F6] via-white to-[#FAF9F6]" />

  {/* Vagues très discrètes (au-dessus des dégradés) */}
  <div className="waves z-[-18]">
    {/* Top */}
    <svg className="top layer1" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f4f82"/><stop offset="100%" stopColor="#79a7d8"/>
        </linearGradient>
      </defs>
      <path fill="url(#wg1)"
        d="M0,96 L60,90 C120,84 240,72 360,90 C480,108 600,156 720,152 C840,148 960,100 1080,92 C1200,84 1320,112 1380,128 L1440,144 L1440,0 L0,0 Z" />
    </svg>

    <svg className="top layer2" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2d6da0"/><stop offset="100%" stopColor="#93c5fd"/>
        </linearGradient>
      </defs>
      <path fill="url(#wg2)"
        d="M0,120 L80,114 C160,108 320,96 480,112 C640,128 800,172 960,156 C1120,140 1280,64 1360,52 L1440,40 L1440,0 L0,0 Z" />
    </svg>

    {/* Bottom miroir — on redessine directement (pas de <use> qui peut foirer) */}
    <svg className="bot layer1" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
      <path fill="url(#wg1)"
        d="M0,96 L60,90 C120,84 240,72 360,90 C480,108 600,156 720,152 C840,148 960,100 1080,92 C1200,84 1320,112 1380,128 L1440,144 L1440,160 L0,160 Z" />
    </svg>
  </div>



        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_10%,#93C5FD40,transparent_60%),radial-gradient(50%_50%_at_10%_90%,#C6A97226,transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF9F6] via-white to-[#FAF9F6]" />
      </div>

      {/* TOPBAR ultra-compact + parfaitement centré */}
<div className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-white/60">
  <div className="relative mx-auto max-w-6xl px-4 py-0">
    {/* Actions à droite, hors flux pour ne pas décentrer le titre */}
    <div className="absolute right-0 top-1 flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => setLang("fr")} className={lang==="fr"?"font-semibold":""}>FR</Button>
      <Separator orientation="vertical" className="h-5" />
      <Button variant="ghost" size="sm" onClick={() => setLang("en")} className={lang==="en"?"font-semibold":""}>EN</Button>
      <Separator orientation="vertical" className="h-5" />
      <a href={CONFIG.instagram} target="_blank" rel="noreferrer">
        <Button variant="ghost" size="icon" aria-label="Instagram"><Instagram className="h-5 w-5"/></Button>
      </a>
      <a href={CONFIG.facebook} target="_blank" rel="noreferrer">
        <Button variant="ghost" size="icon" aria-label="Facebook"><Facebook className="h-5 w-5"/></Button>
      </a>
      {CONFIG.linkedin && (
        <a href={CONFIG.linkedin} target="_blank" rel="noreferrer">
          <Button variant="ghost" size="icon" aria-label="LinkedIn"><Linkedin className="h-5 w-5"/></Button>
        </a>
      )}
    </div>

    {/* Branding centré */}
    <div className="flex items-center justify-center gap-3 py-2 text-center">
      {CONFIG.brandLogo && (
        <Image
          src={CONFIG.brandLogo}
          alt="Hôtel Toulon Bord de Mer"
          width={56}
          height={56}
          className="rounded-full shadow-sm ring-1 ring-white/70 md:w-[64px] md:h-[64px]"
          priority
        />
      )}
      <div className="leading-tight">
        <div className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] opacity-70 -mb-0.5">
          {t.heroTag}
        </div>
        <h1 className="font-serif text-[28px] md:text-[34px] font-semibold tracking-tight leading-[1.05] m-0">
          {lang === "fr" ? CONFIG.brandFr : CONFIG.brandEn}
        </h1>
      </div>
    </div>
  </div>
</div>




      {/* HERO : bulles vidéo + Rooftop/Pro + cartes hôtels */}
      <main className="mx-auto max-w-6xl px-4 pb-8">
        <section className="grid grid-cols-12 gap-5 pt-6 md:pt-8 items-stretch">
          {/* Col gauche : bulles vidéo + Rooftop & Pro */}
          <div className="col-span-12 md:col-span-6 flex flex-col gap-4 -mt-4 md:-mt-6">

            {/* Bulles vidéo — 2 éléments luxe */}
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  className="relative h-[320px] md:h-[380px]"
>
  {/* Grande ovale (gauche) */}
  {CONFIG.media.bubbles[0] && (
    <motion.div
      className="absolute left-6 md:left-10 top-10 w-72 h-56 md:w-[420px] md:h-[300px] bubble-oval shadow-xl ring-1 ring-white/50"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 7, repeat: Infinity, repeatType: "mirror" }}
    >
      <video
        src={CONFIG.media.bubbles[0]}
        autoPlay
        muted
        playsInline
        loop
        preload="metadata"
        className="w-full h-full object-cover"
      />
    </motion.div>
  )}

  {/* Cercle (droite) */}
  {CONFIG.media.bubbles[1] && (
    <motion.div
      className="absolute left-4 md:right-8 top-2 w-36 h-36 md:w-44 md:h-44 bubble shadow-xl ring-1 ring-white/50"
      animate={{ y: [0, -8, 0], rotate: [0, 1.2, 0] }}
      transition={{ duration: 6.5, repeat: Infinity, repeatType: "mirror", delay: 0.12 }}
    >
      <video
        src={CONFIG.media.bubbles[1]}
        autoPlay
        muted
        playsInline
        loop
        preload="metadata"
        className="w-full h-full object-cover"
      />
    </motion.div>
  )}

  {/* Label luxe (facultatif) */}
 
</motion.div>


  {/* Cercle (droite) */}
  

           {/* Rooftop & Pro – version image de fond + overlay luxe */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 -mt-8 md:-mt-9">

  {/* Rooftop */}
  <div className="relative overflow-hidden rounded-3xl gradient-border shadow-xl group min-h-[240px]">
    <Image src={CONFIG.rooftop.bg} alt={t.rooftop} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/10" />
    <div className="relative p-5 flex flex-col gap-3 h-full">
      <h3 className="text-white text-[22px] md:text-[24px] font-semibold tracking-tight drop-shadow">
  {t.rooftop}
</h3>
      <div className="mt-auto flex flex-col gap-2">
        <a href={CONFIG.rooftop.menuUrl} target="_blank" rel="noreferrer">
          <Button className="btn-pill btn-glass-white btn-tight w-full text-[14px] md:text-[15px]">
            <Link2 className="mr-2 h-4 w-4 icon-white" /> {t.menu}
          </Button>
        </a>
        {/* Pas de bouton résa si pas d’URL */}
        {CONFIG.rooftop.bookingUrl ? (
          <a href={CONFIG.rooftop.bookingUrl} target="_blank" rel="noreferrer">
            <Button className="btn-pill btn-glass-white btn-tight w-full text-[14px] md:text-[15px]">
              {t.reserveTable}
            </Button>
          </a>
        ) : null}
      </div>
    </div>
  </div>

  {/* Espace Pro */}
  <div className="relative overflow-hidden rounded-3xl gradient-border shadow-xl group min-h-[240px]">
    <Image src={CONFIG.pro.bg} alt={t.pro} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/10" />
    <div className="relative p-5 flex flex-col gap-3 h-full">
      <h3 className="text-white text-[22px] md:text-[24px] font-semibold tracking-tight drop-shadow">
  {t.pro}
</h3>

      <div className="mt-auto flex flex-col gap-2">
        {/* ⇩ Même style “glass” que cowork + interligne réduit */}
        <a href={CONFIG.pro.seminarUrl} target="_blank" rel="noreferrer">
          <Button className="btn-pill btn-glass-white btn-tight w-full text-[14px] md:text-[15px]">
            {t.seminar}
          </Button>
        </a>
        <a href={CONFIG.pro.coworkUrl} target="_blank" rel="noreferrer">
          <Button className="btn-pill btn-glass-white btn-tight w-full text-[14px] md:text-[15px]">
            {t.cowork}
          </Button>
        </a>
      </div>
    </div>
  </div>
</div>


</div>



          {/* Col droite : cartes hôtels “glass” avec photo + logo */}
          <div className="col-span-12 md:col-span-6 mt-2 md:mt-0 grid grid-cols-1 gap-4">


  {CONFIG.hotels.map((h) => (
    <motion.div key={h.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <div className="relative overflow-hidden rounded-3xl gradient-border shadow-2xl group min-h-[260px]">
        {/* Image de fond */}
        <Image src={h.image} alt={h.nameFr} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
        {/* Overlay lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/15" />
        {/* Contenu */}
        <div className="relative p-6 flex flex-col h-[260px] sm:h-[280px]">

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {h.logo && (
                <div className="relative w-12 h-12 bg-white/92 rounded-full overflow-hidden ring-1 ring-black/10 shadow-sm">
                  <Image src={h.logo} fill alt={`${h.nameFr} logo`} className="object-contain p-1.5" />
                </div>
              )}
              <h3 className="text-white font-serif text-2xl drop-shadow-sm">
                {lang === "fr" ? h.nameFr : h.nameEn}
              </h3>
            </div>
            <div className="flex items-center gap-1">
  {Array.from({ length: h.stars }).map((_, i) => (
    <Star
      key={i}
      className="h-5 w-5 text-[#FFD84D] drop-shadow-[0_0_6px_rgba(255,216,77,0.65)]"
      fill="currentColor"          // ⇒ étoile pleine
      strokeWidth={1.5}            // ⇒ trait un poil plus fin
    />
  ))}
</div>

          </div>

          <div className="mt-2 flex items-center gap-2 text-white/90">
            <MapPin className="h-4 w-4 icon-white" />
            <span className="text-sm">{h.address}</span>
          </div>

          {/* CTAs harmonisés */}
          <div className="mt-auto flex flex-wrap items-center gap-2">

            {h.bookingUrl && (
              <a href={h.bookingUrl} target="_blank" rel="noreferrer">
                <Button className="btn-pill btn-solid-white">{t.book}</Button>
              </a>
            )}
            <a href={`tel:${h.phone.replace(/\s/g,"")}`}>
              <Button className="btn-pill btn-glass-white">
                <Phone className="mr-2 h-4 w-4 icon-white" /> {h.phone}
              </Button>
            </a>
            <a href={`mailto:${h.email}`}>
              <Button className="btn-pill btn-glass-white">
                <Mail className="mr-2 h-4 w-4 icon-white" /> {h.email}
              </Button>
            </a>
            
          </div>
        </div>
      </div>
    </motion.div>
  ))}

  {/* Pastilles déco (facultatives) */}
  
</div>

        </section>
      </main>

      {/* Footer compact */}
      <footer className="mx-auto max-w-6xl px-4 py-6 text-xs opacity-70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>© {new Date().getFullYear()} {lang === "fr" ? CONFIG.brandFr : CONFIG.brandEn}</div>
          <div className="flex items-center gap-3">
            <a className="hover:underline" href="#">Mentions légales</a>
            <a className="hover:underline" href="#">RGPD / Privacy</a>
          </div>
        </div>
      </footer>

      <Script id="hotel-schema" type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify([
      {
        "@context":"https://schema.org",
        "@type":"Hotel",
        "name": CONFIG.hotels[0].nameFr,
        "address": { "@type":"PostalAddress", "streetAddress":"Plage du Mourillon", "addressLocality":"Toulon", "postalCode":"83000", "addressCountry":"FR" },
        "telephone": CONFIG.hotels[0].phone,
        "email": CONFIG.hotels[0].email,
        "url": CONFIG.hotels[0].bookingUrl
      },
      {
        "@context":"https://schema.org",
        "@type":"Hotel",
        "name": CONFIG.hotels[1].nameFr,
        "address": { "@type":"PostalAddress", "streetAddress":"124 rue Gubler", "addressLocality":"Toulon", "postalCode":"83000", "addressCountry":"FR" },
        "telephone": CONFIG.hotels[1].phone,
        "email": CONFIG.hotels[1].email,
        "url": CONFIG.hotels[1].bookingUrl
      }
    ])
  }}
/>

    </div>
  );
}
