"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Instagram, Facebook, Linkedin, Link2, Phone, Mail, MapPin, Star, FileText } from "lucide-react";
import { motion } from "framer-motion";
import Script from "next/script";

/** ========= CONTENU (à personnaliser si besoin) ========= */
const CONFIG = {
  brandFr: "Hôtel Toulon Bord de Mer",
  brandEn: "Hotel Toulon Bord de Mer",
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
      phone: "04 94 41 35 12",
      email: "contact-corniche@htbm.fr",
      socials: {
        instagram: "https://www.instagram.com/hotels_toulon_mer/",
        facebook: "https://www.facebook.com/hotelstbm",
      },
      address: "17 Littoral Frédéric Mistral, 83000 Toulon",
      image: "/images/corniche.jpg",
      logo: "/logos/la-corniche.png",
    },
    {
      key: "villa",
  nameFr: "Villa Les Voiles",
  nameEn: "Villa Les Voiles",
      stars: 0,
      bookingUrl: "https://www.airbnb.com/l/hjiNz0ra",
      phone: "04 94 41 36 23",
      email: "commercial@htbm.fr",
      socials: {
        instagram: "https://www.instagram.com/hotels_toulon_mer/",
        facebook: "https://www.facebook.com/hotelstbm",
      },
      address: "124 rue Gubler, 83000 Toulon",
      image: "/images/voiles.jpg",
      logo: "/logos/les-voiles.png",
      infoUrl: "/docs/villa-les-voiles.pdf",
    },
  ],

    miniVoiles: {
      titleFr: "Hôtel Les Voiles",
  titleEn: "Hotel Les Voiles",
  stars: 3,
     bookingUrl: "https://www.secure-hotel-booking.com/d-edge/Hotel-Les-Voiles/JJ8J/fr-FR",
  bg: "/images/voiles.jpg",
  closureFr: "Fermeture hivernale",
  closureEn: "Winter closure",
  },

  pro: {
    titleFr: "Espace Pro ",
    titleEn: "Business ",
    seminarUrl: "https://bw-plus-la-corniche.backyou.app/fr/c/request#__step_request_0",
    coworkUrl: "https://mywo.fr/etablissements/mywo-toulon",
    bg: "/images/business.jpg",
  },
  media: {
    bubbles: [
      "https://ia801600.us.archive.org/2/items/20250828-141235-118/20250828_141235_118.mp4",    // grande ovale (gauche)
      "https://ia601000.us.archive.org/31/items/20250828-142116-547_202509/20250828_142116_547.mp4", // petit cercle
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
     rooftop: CONFIG.miniVoiles.titleFr,
      menu: "Réserver",
      reserveTable: "Réserver",
      pro: CONFIG.pro.titleFr,
      seminar: "Réserver un séminaire",
      cowork: "Réserver un espace cowork",
      contact: "Contacts",
      heroTag: CONFIG.heroTagFr,
      info: "Informations",
    } as const;
    const en = {
      hotels: "Our Hotels",
      book: "Book Now",
      rooftop: CONFIG.miniVoiles.titleEn,
      menu: "View Menu",
      reserveTable: "Reserve",
      pro: CONFIG.pro.titleEn,
      seminar: "Book a seminar",
      cowork: "Book coworking",
      contact: "Contacts",
      heroTag: CONFIG.heroTagEn,
      info: "Information",
    } as const;
    return lang === "fr" ? fr : en;
  }, [lang]);

  const [showPopup, setShowPopup] = useState(true);
  // Afficher le popup seulement avant le 15 septembre 2025
const today = new Date();
const showBackToSchool = today < new Date("2025-09-15");



  return (
    <div className="min-h-screen w-full relative overflow-hidden text-slate-900">
           


      
      {/* ======= BACKGROUND LUXE MÉDITERRANÉE (clair & dynamique) ======= */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Couche 1 : ciel → azur très clair */}
        <div className="absolute inset-0 z-[-30]" style={{
          background: "linear-gradient(180deg, #EAF6FF 0%, #F7FBFF 38%, #FFF7E6 100%)",
        }} />
        {/* Couche 2 : halo "soleil" discret en haut droit */}
        <div className="absolute -top-40 right-[-10%] w-[60vw] h-[60vw] rounded-full blur-3xl z-[-29]" style={{
          background: "radial-gradient(closest-side, rgba(255,213,128,0.55), rgba(255,213,128,0.18) 55%, transparent 70%)",
        }} />
        {/* Couche 3 : reflets d'eau très légers (motif) */}
        <svg className="absolute inset-x-0 top-28 z-[-28] opacity-[0.18]" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="az-g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6EC1E4"/>
              <stop offset="100%" stopColor="#B5E2FA"/>
            </linearGradient>
          </defs>
          <path fill="url(#az-g1)" d="M0,96 C120,120 240,140 360,132 C480,124 600,88 720,88 C840,88 960,124 1080,136 C1200,148 1320,136 1440,120 L1440,0 L0,0 Z" />
        </svg>
        {/* Couche 4 : sable doux en bas */}
        <div className="absolute bottom-[-20%] left-[-10%] w-[80vw] h-[40vw] rounded-[40%] blur-2xl z-[-27]" style={{
          background: "radial-gradient(closest-side, rgba(240,220,190,0.65), rgba(240,220,190,0.28) 60%, transparent 70%)",
        }} />
      </div>

      {/* ======= HEADER (fondu, plein écran, responsive) ======= */}
<div className="sticky top-0 z-40 w-full">
  <div className="relative mx-auto max-w-[1600px] px-3 md:px-6">
    {/* degrade haut/bas pour eviter toute "coupure" visuelle */}
    <div
      className="pointer-events-none absolute inset-x-0 -top-6 h-6"
      style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0))" }}
    />
    <div className="edge-fade header-glass header-tight relative w-full rounded-none md:rounded-xl shadow-none ring-0 grid grid-cols-12 items-center">
      
      {/* Colonne gauche - FR/EN + reseaux */}
      <div className="col-span-12 md:col-span-3 order-2 md:order-1">
        <div className="px-2 md:px-3 py-1 flex items-center justify-center md:justify-start gap-1.5 md:gap-2 text-slate-700">
          <button onClick={() => setLang('fr')} className={`text-sm px-2 py-1 rounded ${lang==='fr'?'font-semibold':''}`}>FR</button>
          <span className="hidden md:inline-block h-4 w-px bg-slate-300" />
          <button onClick={() => setLang('en')} className={`text-sm px-2 py-1 rounded ${lang==='en'?'font-semibold':''}`}>EN</button>

          <div className="mx-1 h-4 w-px bg-slate-300" />

          <a href={CONFIG.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="p-1.5 rounded hover:bg-white/60">
            <Instagram className="h-5 w-5" />
          </a>
          <a href={CONFIG.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="p-1.5 rounded hover:bg-white/60">
            <Facebook className="h-5 w-5" />
          </a>
          {CONFIG.linkedin && (
            <a href={CONFIG.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="p-1.5 rounded hover:bg-white/60">
              <Linkedin className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>

      {/* Branding centre */}
      <div className="col-span-12 md:col-span-6 order-1 md:order-2">
        <div className="flex items-center justify-center gap-3 py-2 text-center">
          {CONFIG.brandLogo && (
            <Image
              src={CONFIG.brandLogo}
              alt="Hotel Toulon Bord de Mer"
              width={56}
              height={56}
              className="rounded-full shadow-sm ring-1 ring-black/5 md:w-[64px] md:h-[64px]"
              priority
            />
          )}
          <div className="leading-tight">
            <div className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-slate-600 -mb-0.5">
              {t.heroTag}
            </div>
            <h1 className="font-serif text-[28px] md:text-[34px] font-semibold tracking-tight leading-[1.05] m-0 text-slate-900">
              {lang === "fr" ? CONFIG.brandFr : CONFIG.brandEn}
            </h1>
          </div>
        </div>
      </div>

      {/* Colonne droite vide */}
      <div className="col-span-12 md:col-span-3 order-3" />

      {/* degrade bas pour fondre dans la page */}
      <div
        className="absolute inset-x-0 -bottom-6 h-6 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(255,255,255,0.86), rgba(255,255,255,0))" }}
      />
    </div>
  </div>
</div>



      {/* ======= CONTENU ======= */}
      <main className="mx-auto max-w-6xl px-4 pb-8">
        <section className="grid grid-cols-12 gap-5 pt-6 md:pt-8 items-stretch">
          {/* Col gauche : bulles vidéo + Rooftop & Pro */}
          <div className="col-span-12 md:col-span-6 flex flex-col gap-4 -mt-4 md:-mt-6 order-2 md:order-1">
            {/* Bulles vidéo */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative h-[320px] md:h-[380px] will-change-transform"
              style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden", WebkitTransform: "translateZ(0)", transform: "translateZ(0)" }}
            >
              {/* Grande ovale */}
              {CONFIG.media.bubbles[0] && (
                <motion.div
                  className="absolute left-6 md:left-10 top-10 w-72 h-56 md:w-[420px] md:h-[300px] bubble-oval shadow-xl ring-1 ring-white/50 will-change-transform"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 7, repeat: Infinity, repeatType: "mirror" }}
                  style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden", WebkitTransform: "translateZ(0)", transform: "translateZ(0)" }}
                >
                  <video
                    src={CONFIG.media.bubbles[0]}
                    autoPlay
                    muted
                    playsInline
                    loop
                    preload="auto"
                    controls={false}
                    disablePictureInPicture
                    className="w-full h-full object-cover"
                    style={{ WebkitTransform: "translateZ(0)", transform: "translateZ(0)", WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden" }}
                  />
                </motion.div>
              )}

              {/* Cercle */}
              {CONFIG.media.bubbles[1] && (
                <motion.div
                  className="absolute left-4 md:right-8 top-2 w-36 h-36 md:w-44 md:h-44 bubble shadow-xl ring-1 ring-white/50 will-change-transform"
                  animate={{ y: [0, -8, 0], rotate: [0, 1.2, 0] }}
                  transition={{ duration: 6.5, repeat: Infinity, repeatType: "mirror", delay: 0.12 }}
                  style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden", WebkitTransform: "translateZ(0)", transform: "translateZ(0)" }}
                >
                  <video
                    src={CONFIG.media.bubbles[1]}
                    autoPlay
                    muted
                    playsInline
                    loop
                    preload="auto"
                    controls={false}
                    disablePictureInPicture
                    className="w-full h-full object-cover"
                    style={{ WebkitTransform: "translateZ(0)", transform: "translateZ(0)", WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden" }}
                  />
                </motion.div>
              )}
            </motion.div>

            {/* Rooftop & Pro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 -mt-8 md:-mt-9">
              {/* Rooftop */}
              <div className="relative overflow-hidden rounded-3xl gradient-border shadow-xl group min-h-[240px]">
               <Image src={CONFIG.miniVoiles.bg} alt={lang === "fr" ? CONFIG.miniVoiles.titleFr : CONFIG.miniVoiles.titleEn} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />

                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/10" />

  

  <div className="relative p-5 flex flex-col gap-3 h-full">
  {/* Nom + étoiles alignés, puis badge centré en-dessous */}
  <div className="flex flex-col items-center gap-2 text-center">
    <div className="flex items-center gap-2">
      <h3 className="text-white text-[22px] md:text-[24px] font-semibold tracking-tight drop-shadow">
        {lang === "fr" ? CONFIG.miniVoiles.titleFr : CONFIG.miniVoiles.titleEn}
      </h3>
      <div className="flex items-center gap-1">
        {Array.from({ length: CONFIG.miniVoiles.stars }).map((_, i) => (
          <Star key={i} className="h-5 w-5 text-[#FFD84D]" fill="currentColor" strokeWidth={1.5} />
        ))}
      </div>
    </div>

   

  </div>

  {/* Badge + bouton rapprochés */}
<div className="mt-auto flex flex-col gap-[6px]">
  <div className="btn-pill bg-white/90 text-slate-800 text-sm font-medium flex items-center justify-center h-[36px] shadow w-full leading-none">
    {lang === "fr" ? CONFIG.miniVoiles.closureFr : CONFIG.miniVoiles.closureEn}
  </div>

  <a href={CONFIG.miniVoiles.bookingUrl} target="_blank" rel="noreferrer">
    <Button className="btn-pill btn-glass-white btn-tight w-full text-[14px] md:text-[15px] h-[36px] leading-none">
      {t.book}
    </Button>
  </a>
</div>


</div>
</div>



                

              {/* Espace Pro */}
              <div className="relative overflow-hidden rounded-3xl gradient-border shadow-xl group min-h-[240px]">
                <Image src={CONFIG.pro.bg} alt={t.pro} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/10" />
                <div className="relative p-5 flex flex-col gap-3 h-full">
                  <h3 className="text-white text-[22px] md:text-[24px] font-semibold tracking-tight drop-shadow">
                    {t.pro}
                  </h3>
                  <div className="mt-auto flex flex-col gap-2">
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

          {/* Col droite : cartes hôtels */}
          <div className="col-span-12 md:col-span-6 mt-2 md:mt-0 grid grid-cols-1 gap-4 order-1 md:order-2">
            {CONFIG.hotels.map((h) => (
              <motion.div key={h.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <div className="relative overflow-hidden rounded-3xl gradient-border shadow-2xl group min-h-[260px]">
                  <Image src={h.image} alt={h.nameFr} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/10" />
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
  {!!h.stars && h.stars > 0 &&
    Array.from({ length: h.stars }).map((_, i) => (
      <Star key={i} className="h-5 w-5 text-[#FFD84D] drop-shadow-[0_0_6px_rgba(255,216,77,0.65)]" fill="currentColor" strokeWidth={1.5} />
    ))
  }
</div>

                    </div>
                    <div className="mt-2 flex items-center gap-2 text-white/90">
  <a
  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.address)}`}
  target="_blank"
  rel="noreferrer"
  className="hotel-address-link flex items-center gap-2 hover:underline"
>
  <MapPin className="h-4 w-4 icon-white" />
  <span className="text-sm">{h.address}</span>
</a>

</div>

                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {h.bookingUrl && (
  <a href={h.bookingUrl} target="_blank" rel="noreferrer">
    <Button className="btn-pill btn-solid-white">{t.book}</Button>
  </a>
)}

{h.infoUrl && (
  <a href={h.infoUrl} target="_blank" rel="noreferrer">
    <Button className="btn-pill btn-glass-white">
      <FileText className="mr-2 h-4 w-4 icon-white" /> {t.info}
    </Button>
  </a>
)}{h.phone && (
  <a href={`tel:${h.phone.replace(/\s/g,"")}`}>
    <Button className="btn-pill btn-glass-white">
      <Phone className="mr-2 h-4 w-4 icon-white" /> {h.phone}
    </Button>
  </a>
)}
{h.email && (
  <a href={`mailto:${h.email}`}>
    <Button className="btn-pill btn-glass-white">
      <Mail className="mr-2 h-4 w-4 icon-white" /> {h.email}
    </Button>
  </a>
)}

                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </section>
      </main>

{/* Citation */}
<section className="mx-auto max-w-4xl px-4 pt-0 pb-10 text-center">
  <p className="font-serif italic text-xl md:text-2xl text-slate-800 drop-shadow-sm">
    {lang === "fr"
      ? "Besoin de soleil, de mer, de plage ou d'un chez-soi ? Bienvenue chez vous !"
      : "Need sun, sea, sand, or a home away from home? Welcome Home!"}
  </p>
</section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>© {new Date().getFullYear()} {lang === "fr" ? CONFIG.brandFr : CONFIG.brandEn}</div>
          <div className="flex items-center gap-3">
            <a className="hover:underline" href="#">Mentions légales</a>
            <a className="hover:underline" href="#">RGPD / Privacy</a>
          </div>
        </div>
      </footer>

      {/* Schema.org */}
      <Script id="hotel-schema" type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify([
      {
        "@context":"https://schema.org",
        "@type":"Hotel",
        "name": "Best Western Plus La Corniche",
        "address": { "@type":"PostalAddress", "streetAddress":"Plage du Mourillon", "addressLocality":"Toulon", "postalCode":"83000", "addressCountry":"FR" },
        "telephone": "04 94 41 35 12",
        "email": "contact-corniche@htbm.fr",
        "url": "https://www.secure-hotel-booking.com/d-edge/Hotels-Toulon-Bord-De-Mer/JJ8R/fr-FR"
      },
      {
        "@context":"https://schema.org",
        "@type":"Hotel",
        "name": "Hôtel Les Voiles",
        "address": { "@type":"PostalAddress", "streetAddress":"124 rue Gubler", "addressLocality":"Toulon", "postalCode":"83000", "addressCountry":"FR" },
        "telephone": "04 94 41 36 23",
        "email": "contact-lesvoiles@htbm.fr",
        "url": "https://www.secure-hotel-booking.com/d-edge/Hotel-Les-Voiles/JJ8J/fr-FR"
      },
      {
        "@context":"https://schema.org",
        "@type":"LodgingBusiness",
        "name": "Villa Les Voiles",
        "address": { "@type":"PostalAddress", "streetAddress":"124 rue Gubler", "addressLocality":"Toulon", "postalCode":"83000", "addressCountry":"FR" },
        "url": "https://www.airbnb.com/l/hjiNz0ra"
      }
    ])
  }}
/>


      {/* Styles utilitaires spécifiques (optionnels) */}
      <style jsx global>{`
        .gradient-border { position: relative; }
        .gradient-border::before {
          content: ""; position: absolute; inset: -1px; border-radius: 1.5rem;
          background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.2));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude; padding: 1px;
        }
        .btn-pill { border-radius: 9999px; }
        .btn-glass-white { background: rgba(255,255,255,0.28); backdrop-filter: blur(8px); color: #fff; }
        .btn-glass-white:hover { background: rgba(255,255,255,0.36); }
        .btn-solid-white { background: #fff; color: #0f172a; }
        .btn-solid-white:hover { background: #f8fafc; }
        .icon-white { color: #fff; }
        .bubble { border-radius: 9999px; overflow: hidden; }
        .bubble-oval { border-radius: 9999px/60%; overflow: hidden; }
      `}</style>
<style jsx global>{`
  @keyframes fade-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in {
    animation: fade-in 0.4s ease-out;
  }
`}</style>

{/* POPUP FERMETURE SAISONNIÈRE */}
{showPopup && today <= new Date("2025-11-15") && (
  <div
    onClick={() => setShowPopup(false)}
    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative max-w-md w-full rounded-3xl overflow-hidden shadow-2xl animate-fade-in"
    >
      <Image
        src="/images/fermeture-lesvoiles.jpg"
        alt="Fermeture saisonnière Les Voiles"
        width={600}
        height={400}
        className="w-full h-auto object-cover"
      />

      <button
        onClick={() => setShowPopup(false)}
        className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  </div>
)}


    </div>
  );
}