"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script"; 
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MapPin, Star, Wind, Thermometer, Menu, X, Instagram, Facebook, Phone, Building2, Mail, FileText, Home, Plus, Minus } from "lucide-react";
import { Playfair_Display, Inter } from 'next/font/google';
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// --- TYPOGRAPHIE ---
const serif = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-serif' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

// --- DATA ---
const CONFIG = {
  weatherApi: "/api/meteo",
  
  texts: {
    fr: {
      subtitle: "Bienvenue chez vous. Toulon, Mourillon",
      book: "Réserver",
      info: "Brochure", 
      viewMap: "Voir sur la carte",
      seminar: "Organiser un séminaire",
      cowork: "Espace Coworking",
      menu_pro: "Espace Pro",
      menu_contact: "Contact",
      winter_closure: "Fermeture Hivernale",
      villa_push: "Disponible en Villa (Privatisation)",
      pro_title: "Professionnels",
      pro_desc: "Un cadre inspirant pour vos équipes. Séminaires, journées d'étude ou coworking face à la mer."
    },
    en: {
      subtitle: "Welcome Home. Toulon, Mourillon ",
      book: "Book Now",
      info: "Brochure", 
      viewMap: "View on map",
      seminar: "Organize a seminar",
      cowork: "Coworking Space",
      menu_pro: "Business",
      menu_contact: "Contact",
      winter_closure: "Winter Closure",
      villa_push: "Available as Villa (Private Rental)",
      pro_title: "Business & Events",
      pro_desc: "An inspiring setting for your teams. Seminars, study days or coworking facing the sea."
    }
  },

 // --- CONFIG POPUP ---

  popup: {
    endDate: "2026-03-01", 
    image: "/images/popup-sun26.jpg", // Pense à remplacer le fichier image dans ton dossier !
    // MODIF ICI 👇 : On met SUN26 dans le lien
    link: "https://www.secure-hotel-booking.com/d-edge/Hotels-Toulon-Bord-De-Mer/JJ8R/fr-FR?code=SUN26",
  },

  corniche: {
    title: "Best Western Plus La Corniche", 
    shortTitle: "L'Horizon", 
    tagline: { fr: "Vivre face à la mer", en: "Living by the sea" },
    stars: 4,
    features: {
      fr: ["Soins uniques by Byca", "Espace gym (Exclusivité : Zwift Ride)", "Réception 24/24", "Accès Plage"],
      en: ["Unique Byca Amenities", "Gym (Zwift Ride Exclusive)", "24/7 Reception", "Beach Access"]
    },
    desc: {
      fr: "L'expérience 4 étoiles les pieds dans l'eau. Rade de Toulon, balcon panoramique et embruns.",
      en: "The 4-star experience right on the water. Toulon harbor, panoramic balconies and sea spray."
    },
    address: "17 Littoral Frédéric Mistral, 83000 Toulon",
    phone: "04 94 41 35 12",
    email: "contact-corniche@htbm.fr",
    bookingUrl: "https://www.secure-hotel-booking.com/d-edge/Hotels-Toulon-Bord-De-Mer/JJ8R/fr-FR",
    video: "https://ia601600.us.archive.org/2/items/20250828-141235-118/20250828_141235_118.mp4", 
    image: "/images/corniche.jpg",
  },

  voiles: {
    title: "Hôtel Les Voiles", 
    shortTitle: "Le Refuge", 
    tagline: { fr: "L'intimité sur la colline", en: "Intimacy on the hill" },
    stars: 3,
    isClosed: true, 
    features: {
      fr: ["Accès Plage", "Rooftop & Vue", "Petit-Déj Inclus"],
      en: ["Beach Access", "Rooftop & View", "Breakfast Included"]
    },
    desc: {
      fr: "Un boutique-hôtel intimiste niché au calme sur les hauteurs du Mourillon. Jardin secret et douceur de vivre.",
      en: "A boutique hotel nestled in the quiet heights of Mourillon. Secret garden and gentle living."
    },
    address: "124 rue Gubler, 83000 Toulon",
    phone: "04 94 41 36 23",
    email: "contact-lesvoiles@htbm.fr",
    bookingUrl: "https://www.secure-hotel-booking.com/d-edge/Hotel-Les-Voiles/JJ8J/fr-FR",
    video: "https://ia601000.us.archive.org/31/items/20250828-142116-547_202509/20250828_142116_547.mp4",
    image: "/images/voiles.jpg",
  },

  villa: {
    title: "Villa Les Voiles",
    shortTitle: "La Villa",
    tagline: { fr: "Votre hôtel privatisé en bord de mer ", en: "A seaside hotel, exclusively yours" },
    features: {
      fr: ["Jusqu'à 16 Chambres", "Rooftop Vue Mer", "Patio Ombragé", "Privatisation Totale"],
      en: ["Up to 16 Rooms", "Sea View Rooftop", "Shaded Patio", "Full Privatization"]
    },
  
    desc: {
      fr: "L'expérience unique d'un hôtel rien que pour vous (de mi-octobre à mi-mai). Une adresse secrète du Mourillon à 300m des plages.",
      en: "The unique experience of a hotel just for you (from mid-October to mid-May). A secret address in Mourillon, 300m from the beaches."
    },
    phone: "07 59 91 63 54",
    email: "commercial2@htbm.fr", 
    
    bookingUrl: "https://www.leboncoin.fr/ad/locations_saisonnieres/3076521661",
    infoUrl: "/docs/villa-les-voiles.pdf",
    image: "/images/villa.jpg", 
  },

  pro: {
    image: "/images/business.jpg",
  },
  socials: {
    instagram: "https://www.instagram.com/hotels_toulon_mer/",
    facebook: "https://www.facebook.com/hotelstbm",
  }
};

export default function PageUltimeV15() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const t = CONFIG.texts[lang];

  // --- STATE 3 COLONNES ---
  const [hoveredSection, setHoveredSection] = useState<"corniche" | "voiles" | "villa" | null>(null);
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [weather, setWeather] = useState<{ air: number | null; sea: number | null }>({ air: null, sea: null });

  // --- POPUP STATE ---
  const [showPopup, setShowPopup] = useState(false);

  // --- COWORK MODAL ---
  const [showCoworkModal, setShowCoworkModal] = useState(false);

  // --- SEMINAIRE FORM ---
  const [showSeminarForm, setShowSeminarForm] = useState(false);
  const [seminarStep, setSeminarStep] = useState(0);
  const [seminarData, setSeminarData] = useState({ nom: '', societe: '', email: '', telephone: '', types: [] as string[], pax: '', budget: '', dates: [''], notes: '' });
  const [seminarSending, setSeminarSending] = useState(false);
  const [seminarSent, setSeminarSent] = useState(false);

  const openSeminarForm = () => {
    setSeminarStep(0);
    setSeminarData({ nom: '', societe: '', email: '', telephone: '', types: [], pax: '', budget: '', dates: [''], notes: '' });
    setSeminarSent(false);
    setSeminarSending(false);
    setShowSeminarForm(true);
  };

  const toggleSeminarType = (t: string) =>
    setSeminarData(p => ({ ...p, types: p.types.includes(t) ? p.types.filter(x => x !== t) : [...p.types, t] }));

  const handleSeminarSubmit = async () => {
    setSeminarSending(true);
    const validDates = seminarData.dates.filter(Boolean);
    const titre = [
      seminarData.types.join(' + '),
      seminarData.pax ? `${seminarData.pax} pers.` : null,
      seminarData.budget ? `Budget : ${seminarData.budget}` : null,
    ].filter(Boolean).join(' · ');
    const commentaires = [
      seminarData.notes || null,
      validDates.length > 1 ? `Dates multiples : ${validDates.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    const { error: dbError } = await supabase.from('suivi_commercial').insert([{
      hotel_id: 'f9d59e56-9a2f-433e-bcf4-f9753f105f32',
      nom_client: seminarData.nom,
      societe: seminarData.societe || null,
      email: seminarData.email,
      telephone: seminarData.telephone || null,
      titre_demande: titre || 'Demande site web',
      commentaires: commentaires || null,
      date_evenement: validDates[0] || null,
      date_relance: new Date().toISOString().split('T')[0],
      statut: 'Nouveau',
      source: 'Site web',
      created_at: new Date().toISOString(),
    }]);

    if (dbError) {
      console.error('Supabase error:', dbError.message);
      alert('Erreur : ' + dbError.message);
      setSeminarSending(false);
      return;
    }

    try {
      const res = await fetch('/api/seminaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seminarData),
      });
      const json = await res.json();
      console.log('Email route response:', res.status, json);
    } catch (e) {
      console.error('Email fetch error:', e);
    }

    setSeminarSending(false);
    setSeminarSent(true);
  };
  
  // --- MOBILE EXPAND STATE ---
  const [mobileExpandLeft, setMobileExpandLeft] = useState(false);
  const [mobileExpandRight, setMobileExpandRight] = useState(false);
  const [mobileExpandVilla, setMobileExpandVilla] = useState(false);

  const vidRefLeft = useRef<HTMLVideoElement>(null);
  const vidRefRight = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    [vidRefLeft, vidRefRight].forEach(ref => {
      if (ref.current) {
          ref.current.defaultMuted = true;
          ref.current.muted = true;
          ref.current.play().catch(e => console.log("Autoplay prevented:", e));
      }
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    fetch(CONFIG.weatherApi).then(r => r.json()).then(d => setWeather({ air: d.air, sea: d.sea })).catch(() => {});
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- POPUP LOGIC ---
  useEffect(() => {
  const now = new Date();
  const limit = new Date(CONFIG.popup.endDate);
  // On change le nom ici 👇
  const hasSeen = localStorage.getItem("popup_soleil_seen");

  if (now < limit && !hasSeen) {
    const timer = setTimeout(() => setShowPopup(true), 2000); 
    return () => clearTimeout(timer);
  }
}, []);

  const closePopup = () => {
  setShowPopup(false);
  // Et ici aussi 👇
  localStorage.setItem("popup_soleil_seen", "true");
};

  const getFlexClass = (id: "corniche" | "voiles" | "villa") => {
    if (hoveredSection === null) return "md:flex-1";
    return hoveredSection === id ? "md:flex-[2]" : "md:flex-[1]";
  };

  return (
    <div className={`${serif.variable} ${sans.variable} font-sans min-h-screen bg-[#FDFCF8] text-slate-900 selection:bg-blue-100`}>
      
      {/* --- SCHEMA.ORG (JSON-LD) --- */}
      <Script id="hotel-schema" type="application/ld+json"
        dangerouslySetInnerHTML={{
            __html: JSON.stringify([
            {
                "@context": "https://schema.org",
                "@type": "Hotel",
                "name": "Best Western Plus La Corniche",
                "image": "https://www.hotels-toulon-bord-de-mer.com/images/corniche.jpg",
                "description": "Hôtel 4 étoiles face à la rade de Toulon.",
                "address": { "@type": "PostalAddress", "streetAddress": "17 Littoral Frédéric Mistral", "addressLocality": "Toulon", "postalCode": "83000", "addressCountry": "FR" },
                "starRating": { "@type": "Rating", "ratingValue": "4" }
            },
            {
                "@context": "https://schema.org",
                "@type": "Hotel",
                "name": "Hôtel Les Voiles",
                "image": "https://www.hotels-toulon-bord-de-mer.com/images/voiles.jpg",
                "description": "Boutique hôtel 3 étoiles calme sur les hauteurs du Mourillon.",
                "address": { "@type": "PostalAddress", "streetAddress": "124 rue Gubler", "addressLocality": "Toulon", "postalCode": "83000", "addressCountry": "FR" },
                "starRating": { "@type": "Rating", "ratingValue": "3" }
            }
            ])
        }}
      />

      {/* --- NAV --- */}
      <nav className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500 px-4 md:px-6 py-4 flex justify-between items-center",
        isScrolled ? "bg-white/95 backdrop-blur-md border-b border-black/5 py-3 shadow-sm" : "bg-transparent"
      )}>
        
        <Link href="/" className="flex items-center gap-3 z-50 relative group">
             <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shadow-sm border border-white/20 bg-white">
                <Image src="/logos/logo-bleu.png" alt="Logo HTBM" fill className="object-cover p-1" />
             </div>
             <div className="flex flex-col">
                <span className="font-serif font-bold text-sm md:text-base tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                    Hôtels Toulon Bord de Mer
                </span>
             </div>
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-1 bg-white/50 rounded-full px-2 py-1 border border-black/5 text-xs font-medium">
                <button onClick={() => setLang('fr')} className={cn("px-2 py-1 rounded-full transition-colors", lang === 'fr' ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900")}>FR</button>
                <button onClick={() => setLang('en')} className={cn("px-2 py-1 rounded-full transition-colors", lang === 'en' ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900")}>EN</button>
            </div>

            <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-500 uppercase tracking-widest border-l border-black/10 pl-6">
            {weather.air && <span className="flex items-center gap-2"><Wind className="w-3 h-3" /> {weather.air}°C Air</span>}
            {weather.sea && <span className="flex items-center gap-2"><Thermometer className="w-3 h-3" /> {weather.sea}°C Mer</span>}
            </div>

            <button onClick={() => setMenuOpen(true)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <Menu className="w-6 h-6 text-slate-800" />
            </button>
        </div>
      </nav>

      {/* --- MENU --- */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900 text-[#FDFCF8] flex flex-col justify-center items-center p-4"
          >
            <button onClick={() => setMenuOpen(false)} className="absolute top-6 right-6 p-4 hover:rotate-90 transition-transform duration-500">
              <X className="w-8 h-8" />
            </button>
            <div className="flex flex-col gap-4 md:gap-6 text-center font-serif text-3xl md:text-5xl">
              <a href="/group-packages" className="hover:text-amber-300 transition-colors">Packages Groupes</a>
              <a href={CONFIG.corniche.bookingUrl} className="hover:text-blue-300 transition-colors">{CONFIG.corniche.title}</a>
              <a href={CONFIG.voiles.bookingUrl} className="hover:text-green-300 transition-colors">{CONFIG.voiles.title}</a>
              <a href={CONFIG.villa.bookingUrl} className="hover:text-amber-300 transition-colors">{CONFIG.villa.title}</a>
              <Link href="/journal" className="text-2xl md:text-4xl italic text-white/60 hover:text-white transition-colors mt-2">
                  Le Journal
              </Link>
              <div className="h-px w-24 bg-white/20 mx-auto my-4"/>
              <div className="flex flex-col gap-3 font-sans text-lg md:text-xl font-light opacity-80">
                  <button onClick={() => { setMenuOpen(false); openSeminarForm(); }} className="hover:text-white flex items-center justify-center gap-2">
                      <Building2 className="w-5 h-5"/> {t.menu_pro}
                  </button>
                  <a href={`mailto:${CONFIG.corniche.email}`} className="hover:text-white flex items-center justify-center gap-2">
                      <Mail className="w-5 h-5"/> {t.menu_contact}
                  </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

   {/* --- POPUP FEVRIER (VERSION BILINGUE) --- */}
      <AnimatePresence>
        {showPopup && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col relative mx-4"
            >
              {/* Croix de fermeture */}
              <button onClick={closePopup} className="absolute top-3 right-3 z-30 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm">
                <X className="w-5 h-5" />
              </button>

              {/* L'IMAGE (Cliquable) */}
              <a href={CONFIG.popup.link} target="_blank" className="relative w-full aspect-video bg-slate-100 group overflow-hidden">
                <Image 
                    src={CONFIG.popup.image} 
                    alt="Offre Soleil" 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </a>

              {/* BARRE DU BAS (TRADUITE) */}
              <div className="p-4 md:p-6 bg-white flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100">
                <span className="text-sm text-slate-500 hidden md:block italic">
                    {lang === 'fr' 
                      ? "Offre valable uniquement en Février 2026." 
                      : "Offer valid only in February 2026."}
                </span>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={closePopup} className="hidden md:block text-slate-400 text-sm hover:text-slate-600 underline">
                        {lang === 'fr' ? "Non merci" : "No thanks"}
                    </button>
                    <a 
                      href={CONFIG.popup.link} 
                      target="_blank"
                      onClick={closePopup}
                      className="flex-1 md:flex-none bg-blue-700 text-white px-8 py-3 rounded-full font-bold text-sm md:text-base hover:bg-blue-800 hover:scale-105 transition-all shadow-lg text-center"
                    >
                      {lang === 'fr' ? "J'en profite (140€)" : "Book Now (140€)"}
                    </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HERO --- */}
      <header className="relative h-[45vh] md:h-[55vh] flex flex-col items-center justify-center text-center px-4 pt-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <h1 className="font-serif text-5xl md:text-8xl text-slate-900 leading-none mb-2">Bord de Mer</h1>
          <span className="font-serif text-4xl md:text-7xl italic text-slate-500 leading-none">Collection</span>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.4 }}
          className="mt-8 text-xs md:text-sm uppercase tracking-[0.3em] text-slate-400 font-sans"
        >
          {t.subtitle}
        </motion.p>
      </header>

      {/* --- TRIPLE SPLIT SECTION (CORNICHE / VOILES / VILLA) --- */}
      <section className="relative w-full max-w-[1900px] mx-auto min-h-[85vh] md:h-[800px] flex flex-col md:flex-row px-2 md:px-6 pb-6 gap-2 md:gap-4">
        
        {/* --- 1. CORNICHE --- */}
        <div 
          className={cn(
            "group relative overflow-hidden rounded-2xl transition-all duration-700 ease-in-out cursor-pointer bg-slate-200",
            "flex-1 min-h-[420px] md:h-full", 
            getFlexClass("corniche")
          )}
          onMouseEnter={() => setHoveredSection("corniche")}
          onMouseLeave={() => setHoveredSection(null)}
        >
            <Link href="/wifi" className="absolute inset-0 z-10" aria-label="L'Horizon – WiFi" />
            
            <div className="absolute inset-0 pointer-events-none">
                <Image src={CONFIG.corniche.image} alt="Corniche" fill className="object-cover transition-transform duration-1000 group-hover:scale-105 z-0"/>
                <video ref={vidRefLeft} src={CONFIG.corniche.video} poster={CONFIG.corniche.image} muted loop playsInline className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out z-10" style={{ opacity: hoveredSection === 'corniche' ? 1 : 0 }} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/60 z-20" />
            </div>

            <div className="relative z-30 h-full flex flex-col justify-between p-6 md:p-10 text-white pointer-events-none">
                <div className="transform transition-all duration-500 translate-y-0 group-hover:-translate-y-2 pt-4 md:pt-0">
                    <div className="flex items-center justify-between mb-3 opacity-90 gap-4"> 
                        <div className="flex items-center gap-3">
                            <span className="uppercase tracking-[0.2em] text-xs font-bold text-white drop-shadow-md">{CONFIG.corniche.title}</span>
                            <div className="flex text-[#FFD84D] drop-shadow-md">
                                <Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/>
                            </div>
                        </div>
                        
                        {/* BOUTON + (MOBILE ONLY) */}
                        <button 
                            onClick={(e) => {
                                e.preventDefault(); 
                                e.stopPropagation();
                                setMobileExpandLeft(!mobileExpandLeft);
                            }}
                            className="md:hidden pointer-events-auto mr-1 p-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white active:bg-white/40 transition-colors flex-shrink-0"
                            aria-label="Voir les détails"
                        >
                            {mobileExpandLeft ? <Minus className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                        </button>
                    </div>

                    <h2 className="font-serif text-5xl md:text-7xl leading-none drop-shadow-lg text-white mb-2">{CONFIG.corniche.shortTitle}</h2>
                    <p className="font-serif italic text-xl md:text-2xl text-amber-50 font-medium drop-shadow-lg">{CONFIG.corniche.tagline[lang]}</p>
                </div>

                <div className={cn(
                    "space-y-6 transition-all duration-500",
                    mobileExpandLeft ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0 overflow-hidden mt-0",
                    "md:max-h-full md:mt-0 md:transform md:translate-y-4 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0"
                )}>
                    {/* TAGS FEATURES + BOUTON SOLEIL CORRIGÉ */}
                    <div className="flex flex-wrap gap-2">
                        {CONFIG.corniche.features[lang].map((feature, i) => (
                            <span key={i} className="px-3 py-1 rounded-md border border-white/30 bg-white/10 backdrop-blur-md text-white text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-sm">
                            {feature}
                            </span>
                        ))}
                        
                    </div>

                    <p className="text-sm md:text-base leading-relaxed text-white font-medium drop-shadow-md max-w-md">
                        {CONFIG.corniche.desc[lang]}
                    </p>
                    <div className="flex flex-col gap-3 text-sm font-bold text-white border-l-2 border-white/60 pl-4 pointer-events-auto relative z-20">
                        <a href={`tel:${CONFIG.corniche.phone.replace(/\s/g,"")}`} className="flex items-center gap-2 hover:text-blue-200 transition-colors w-fit drop-shadow-md" style={{color:'white'}}>
                            <Phone className="w-4 h-4"/> <span>{CONFIG.corniche.phone}</span>
                        </a>
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(CONFIG.corniche.address)}`} target="_blank" className="flex items-center gap-2 hover:text-blue-200 transition-colors w-fit drop-shadow-md" style={{color:'white'}}>
                            <MapPin className="w-4 h-4"/> <span>{t.viewMap}</span>
                        </a>
                    </div>
                    <div className="bg-white text-slate-900 px-8 py-4 rounded-full text-sm font-bold tracking-wide flex items-center gap-2 w-fit shadow-lg hover:scale-105 transition-transform">
                        {t.book} <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>

        {/* --- 2. VOILES (CORRIGÉ ALIGNEMENT) --- */}
        <div 
          className={cn(
            "group relative overflow-hidden rounded-2xl transition-all duration-700 ease-in-out cursor-pointer bg-slate-200",
            "flex-1 min-h-[420px] md:h-full",
            getFlexClass("voiles")
          )}
          onMouseEnter={() => setHoveredSection("voiles")}
          onMouseLeave={() => setHoveredSection(null)}
        >
           <Link href={CONFIG.voiles.bookingUrl} target="_blank" className="absolute inset-0 z-10" aria-label="Book Voiles" />
           
           <div className="absolute inset-0 pointer-events-none">
             <Image src={CONFIG.voiles.image} alt="Voiles" fill className="object-cover transition-transform duration-1000 group-hover:scale-105 z-0"/>
             <video ref={vidRefRight} src={CONFIG.voiles.video} poster={CONFIG.voiles.image} muted loop playsInline className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out z-10" style={{ opacity: hoveredSection === 'voiles' ? 1 : 0 }} />
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/60 z-20" />
          </div>

          <div className="relative z-30 h-full flex flex-col justify-between p-6 md:p-10 text-white pointer-events-none">
            <div className="transform transition-all duration-500 translate-y-0 group-hover:-translate-y-2 pt-4 md:pt-0">
              <div className="flex items-center justify-between mb-3 opacity-90">
                <div className="flex items-center gap-3">
                    <span className="uppercase tracking-[0.2em] text-xs font-bold text-white drop-shadow-md">{CONFIG.voiles.title}</span>
                    <div className="flex text-[#FFD84D] drop-shadow-md"><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/></div>
                </div>
                {/* BOUTON + (MOBILE ONLY) */}
                <button 
                    onClick={(e) => {
                        e.preventDefault(); 
                        e.stopPropagation();
                        setMobileExpandRight(!mobileExpandRight);
                    }}
                    className="md:hidden pointer-events-auto p-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white active:bg-white/40 transition-colors"
                    aria-label="Voir les détails"
                >
                    {mobileExpandRight ? <Minus className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                </button>
              </div>
              
              {/* J'ai déplacé le badge APRES le titre et la tagline pour ne pas casser l'alignement */}
              <h2 className="font-serif text-5xl md:text-7xl leading-none drop-shadow-lg text-white mb-2">{CONFIG.voiles.shortTitle}</h2>
              <p className="font-serif italic text-xl md:text-2xl text-amber-50 font-medium drop-shadow-lg mb-4">{CONFIG.voiles.tagline[lang]}</p>

              {CONFIG.voiles.isClosed && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white text-[10px] font-medium uppercase tracking-widest shadow-sm">
                       <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse"/>
                       {t.winter_closure}
                  </div>
              )}
            </div>

            <div className={cn(
                "space-y-6 transition-all duration-500",
                mobileExpandRight ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0 overflow-hidden mt-0",
                "md:max-h-full md:mt-0 md:transform md:translate-y-4 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0"
            )}>
                 {/* TAGS FEATURES */}
                 <div className="flex flex-wrap gap-2">
                    {CONFIG.voiles.features[lang].map((feature, i) => (
                        <span key={i} className="px-3 py-1 rounded-md border border-white/30 bg-white/10 backdrop-blur-md text-white text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-sm">
                        {feature}
                        </span>
                    ))}
                </div>

              <p className="text-sm md:text-base leading-relaxed text-white font-medium drop-shadow-md max-w-md">
                  {CONFIG.voiles.desc[lang]}
              </p>
              
               <div className="flex flex-col gap-3 text-sm font-bold text-white border-l-2 border-white/60 pl-4 pointer-events-auto relative z-20">
                 <a href={`tel:${CONFIG.voiles.phone.replace(/\s/g,"")}`} className="flex items-center gap-2 hover:text-green-200 transition-colors w-fit drop-shadow-md" style={{color:'white'}}>
                    <Phone className="w-4 h-4"/> <span>{CONFIG.voiles.phone}</span>
                 </a>
                 <a href={`https://maps.google.com/?q=${encodeURIComponent(CONFIG.voiles.address)}`} target="_blank" className="flex items-center gap-2 hover:text-green-200 transition-colors w-fit drop-shadow-md" style={{color:'white'}}>
                    <MapPin className="w-4 h-4"/> <span>{t.viewMap}</span>
                 </a>
              </div>
              <div className="bg-white text-slate-900 px-8 py-4 rounded-full text-sm font-bold tracking-wide flex items-center gap-2 w-fit shadow-lg hover:scale-105 transition-transform">
                {t.book} <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. VILLA --- */}
        <div 
          className={cn(
            "group relative overflow-hidden rounded-2xl transition-all duration-700 ease-in-out cursor-pointer bg-slate-200",
            "flex-1 min-h-[420px] md:h-full",
            getFlexClass("villa")
          )}
          onMouseEnter={() => setHoveredSection("villa")}
          onMouseLeave={() => setHoveredSection(null)}
        >
           <Link href={CONFIG.villa.bookingUrl} target="_blank" className="absolute inset-0 z-10" aria-label="Book Villa" />
           
           <div className="absolute inset-0 pointer-events-none">
             <Image src={CONFIG.villa.image} alt="Villa" fill className="object-cover transition-transform duration-1000 group-hover:scale-105 z-0"/>
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/60 z-20" />
          </div>

          <div className="relative z-30 h-full flex flex-col justify-between p-6 md:p-10 text-white pointer-events-none">
            <div className="transform transition-all duration-500 translate-y-0 group-hover:-translate-y-2 pt-4 md:pt-0">
              <div className="flex items-center justify-between mb-3 opacity-90">
                <div className="flex items-center gap-3">
                    <span className="uppercase tracking-[0.2em] text-xs font-bold text-amber-200 drop-shadow-md">Collection Privée</span>
                </div>
                {/* BOUTON + (MOBILE ONLY) */}
                <button 
                    onClick={(e) => {
                        e.preventDefault(); 
                        e.stopPropagation();
                        setMobileExpandVilla(!mobileExpandVilla);
                    }}
                    className="md:hidden pointer-events-auto p-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white active:bg-white/40 transition-colors"
                    aria-label="Voir les détails"
                >
                    {mobileExpandVilla ? <Minus className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                </button>
              </div>

              <h2 className="font-serif text-5xl md:text-7xl leading-none drop-shadow-lg text-white mb-2">{CONFIG.villa.shortTitle}</h2>
              <p className="font-serif italic text-xl md:text-2xl text-amber-50 font-medium drop-shadow-lg">{CONFIG.villa.tagline[lang]}</p>
            </div>

            <div className={cn(
                "space-y-6 transition-all duration-500",
                mobileExpandVilla ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0 overflow-hidden mt-0",
                "md:max-h-full md:mt-0 md:transform md:translate-y-4 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0"
            )}>
              {/* --- C'EST ICI QUE JE L'AI RAJOUTÉ --- */}
              <div className="flex flex-wrap gap-2">
                    {CONFIG.villa.features[lang].map((feature, i) => (
                        <span key={i} className="px-3 py-1 rounded-md border border-white/30 bg-white/10 backdrop-blur-md text-white text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-sm">
                        {feature}
                        </span>
                    ))}
              </div>
              
              <p className="text-sm md:text-base leading-relaxed text-white font-medium drop-shadow-md max-w-md">
                  {CONFIG.villa.desc[lang]}
              </p>
              
               <div className="flex flex-col gap-3 text-sm font-bold text-white border-l-2 border-white/60 pl-4 pointer-events-auto relative z-20">
                 <a href={`tel:${CONFIG.villa.phone.replace(/\s/g,"")}`} className="flex items-center gap-2 hover:text-amber-200 transition-colors w-fit drop-shadow-md" style={{color:'white'}}>
                    <Phone className="w-4 h-4"/> <span>{CONFIG.villa.phone}</span>
                 </a>
                 <a href={`mailto:${CONFIG.villa.email}`} className="flex items-center gap-2 hover:text-amber-200 transition-colors w-fit drop-shadow-md" style={{color:'white'}}>
                    <Mail className="w-4 h-4"/> <span>{CONFIG.villa.email}</span>
                 </a>
              </div>
              <div className="flex gap-2">
                <div className="bg-amber-100 text-slate-900 px-6 py-4 rounded-full text-sm font-bold tracking-wide flex items-center gap-2 w-fit shadow-lg hover:scale-105 transition-transform">
                    Privatiser <ArrowRight className="w-4 h-4" />
                </div>
                 <a href={CONFIG.villa.infoUrl} target="_blank" className="pointer-events-auto inline-flex items-center gap-2 border border-white/30 text-white px-6 py-4 rounded-full text-sm font-bold hover:bg-white/10 transition-colors backdrop-blur-sm" style={{color:'white'}}>
                    <FileText className="w-4 h-4"/> {t.info}
                </a>
              </div>
            </div>
          </div>
        </div>

      </section>

     {/* --- SECTION PRO (VERSION ILLUSTRÉE) --- */}
      <section className="py-12 px-4 bg-[#FDFCF8]">
         <div className="max-w-[1900px] mx-auto">
             {/* Ajout de overflow-hidden pour que l'image ne dépasse pas des coins arrondis */}
             <div className="group bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-sm hover:shadow-md transition-shadow">
                  
                  {/* COLONNE IMAGE (Nouvel élément) */}
                  <div className="relative w-full md:w-1/3 min-h-[300px] md:min-h-full bg-slate-100">
                      {/* J'utilise l'image de la corniche en N&B par défaut, idéalement mets une photo de salle de réunion ici */}
                      <Image 
                        src={CONFIG.pro.image}
                        alt="Espace Pro" 
                        fill 
                        className="object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
                      />
                      <div className="absolute inset-0 bg-slate-900/10 mix-blend-multiply" />
                  </div>

                  {/* COLONNE CONTENU */}
                  <div className="flex-1 p-8 md:p-12 flex flex-col justify-center gap-8">
                      <div>
                          <div className="flex items-center gap-3 mb-4">
                             <Building2 className="w-5 h-5 text-slate-400" />
                             <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">{t.pro_title}</span>
                          </div>
                          <h3 className="font-serif text-3xl md:text-4xl text-slate-900 mb-4 leading-tight">
                             Des espaces qui inspirent.
                          </h3>
                          <p className="text-slate-600 text-base md:text-lg max-w-xl leading-relaxed">
                             {t.pro_desc}
                          </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 w-full pt-4 border-t border-slate-100">
                         <button onClick={openSeminarForm} className="flex-1 flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-bold text-slate-700 border border-slate-100 group/btn">
                            {t.seminar} <ArrowRight className="w-4 h-4 opacity-50 group-hover/btn:translate-x-1 transition-transform"/>
                        </button>
                        <button onClick={() => setShowCoworkModal(true)} className="flex-1 flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-bold text-slate-700 border border-slate-100 group/btn">
                            {t.cowork} <ArrowRight className="w-4 h-4 opacity-50 group-hover/btn:translate-x-1 transition-transform"/>
                        </button>
                      </div>
                  </div>

             </div>
         </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#FDFCF8] pt-10 pb-6 px-6 border-t border-slate-100">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-xs">
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
    <a href="/mentions" className="hover:text-slate-900">Mentions Légales</a>
    <a href="mailto:contact-corniche@htbm.fr" className="hover:text-slate-900">contact-corniche@htbm.fr</a>
    <a href="tel:0494413512" className="hover:text-slate-900 font-bold">04 94 41 35 12</a>
</div>
            <div className="font-serif italic opacity-50">
                Designed in Toulon.
            </div>
        </div>
      </footer>

      {/* ── MODAL COWORKING ── */}
      <AnimatePresence>
        {showCoworkModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowCoworkModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="bg-white rounded-3xl max-w-sm w-full relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 text-center overflow-hidden" style={{ backgroundImage: "url('/images/pagewifi.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-black/50" />
                <button onClick={() => setShowCoworkModal(false)} className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors z-10">
                  <X className="w-5 h-5" />
                </button>
                <div className="relative z-10">
                  <p className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase mb-2">Coworking · BW+ La Corniche</p>
                  <h3 className="font-serif text-2xl text-white leading-tight">Face à la mer.<br/>Sans réservation.</h3>
                </div>
              </div>

              {/* Atouts */}
              <div className="px-8 py-6 space-y-2.5 border-b border-slate-100">
                {[
                  '🌊 Vue mer depuis votre poste de travail',
                  '🛋️ Multi-espaces selon votre humeur',
                  '☕ Soft & grignotage inclus dans le tarif',
                  '📶 Wifi haut débit · Imprimante à dispo',
                  '🕘 Ouvert 9h – 18h, 7j/7',
                  '🎁 1 journée offerte tous les 10 passages',
                ].map(item => (
                  <div key={item} className="text-sm text-slate-600 text-center">{item}</div>
                ))}
              </div>

              {/* Tarifs */}
              <div className="px-8 py-5 border-b border-slate-100">
                <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase mb-3 text-center">Tarifs TTC</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Heure', price: '6 €' },
                    { label: 'Demi-journée', price: '12 €' },
                    { label: 'Journée', price: '18 €' },
                    { label: 'Mensuel', price: '200 €' },
                  ].map(t => (
                    <div key={t.label} className="bg-slate-50 rounded-xl px-4 py-3 text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{t.label}</p>
                      <p className="font-black text-slate-900 text-lg">{t.price}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="px-8 py-5">
                <a
                  href="tel:0494413512"
                  className="w-full bg-slate-900 hover:bg-slate-700 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2" style={{color:'#fff'}}
                >
                  <Phone className="w-4 h-4" style={{color:'#fff'}} /> 04 94 41 35 12
                </a>
                <p className="text-center text-[11px] text-slate-400 mt-3">Pas de réservation — venez directement.</p>
                <p className="text-center text-[11px] text-slate-400 mt-1">Promis, on sera des collègues sympas 😊</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FORMULAIRE SÉMINAIRE ── */}
    <AnimatePresence>
      {showSeminarForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowSeminarForm(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="bg-white rounded-3xl p-10 max-w-md w-full relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Fermer */}
            <button
              onClick={() => setShowSeminarForm(false)}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Barre de progression */}
            {!seminarSent && (
              <div className="flex gap-1.5 mb-10">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="h-0.5 flex-1 rounded-full"
                    animate={{ backgroundColor: i <= seminarStep ? '#0f172a' : '#e2e8f0' }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>
            )}

            {seminarSent ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-6"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-serif text-2xl text-slate-900 mb-2">Demande envoyée</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Nous revenons vers vous rapidement<br/>pour construire votre séminaire.</p>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                {seminarStep === 0 && (
                  <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
                    <h3 className="font-serif text-3xl text-slate-900 mb-8 leading-tight text-center">Vous êtes&nbsp;?</h3>
                    <div className="space-y-5">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Votre nom *"
                        value={seminarData.nom}
                        onChange={e => setSeminarData(p => ({ ...p, nom: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && seminarData.nom.trim() && setSeminarStep(1)}
                        className="w-full border-b border-slate-200 pb-3 text-base focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300 bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Société (optionnel)"
                        value={seminarData.societe}
                        onChange={e => setSeminarData(p => ({ ...p, societe: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && seminarData.nom.trim() && setSeminarStep(1)}
                        className="w-full border-b border-slate-200 pb-3 text-base focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300 bg-transparent"
                      />
                    </div>
                    <button
                      disabled={!seminarData.nom.trim()}
                      onClick={() => setSeminarStep(1)}
                      className="mt-10 w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-20 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      Continuer <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {seminarStep === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
                    <h3 className="font-serif text-3xl text-slate-900 mb-1 leading-tight text-center">Comment vous<br/>joindre&nbsp;?</h3>
                    <p className="text-sm text-slate-400 mb-8 italic text-center">Promis, pas de newsletter, pas de harcèlement&nbsp;😊</p>
                    <div className="space-y-5">
                      <input
                        autoFocus
                        type="email"
                        placeholder="Email *"
                        value={seminarData.email}
                        onChange={e => setSeminarData(p => ({ ...p, email: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && seminarData.email.trim() && setSeminarStep(2)}
                        className="w-full border-b border-slate-200 pb-3 text-base focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300 bg-transparent"
                      />
                      <input
                        type="tel"
                        placeholder="Téléphone (optionnel)"
                        value={seminarData.telephone}
                        onChange={e => setSeminarData(p => ({ ...p, telephone: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && seminarData.email.trim() && setSeminarStep(2)}
                        className="w-full border-b border-slate-200 pb-3 text-base focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300 bg-transparent"
                      />
                    </div>
                    <div className="flex gap-3 mt-10">
                      <button onClick={() => setSeminarStep(0)} className="px-5 py-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors">
                        ←
                      </button>
                      <button
                        disabled={!seminarData.email.trim()}
                        onClick={() => setSeminarStep(2)}
                        className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-20 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                      >
                        Continuer <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {seminarStep === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
                    <h3 className="font-serif text-3xl text-slate-900 mb-6 leading-tight text-center">Votre projet</h3>

                    <div className="space-y-6 overflow-y-auto max-h-[55vh] pr-1">
                      {/* Type d'événement */}
                      <div>
                        <p className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase mb-2.5">Type d'événement</p>
                        <div className="flex flex-wrap gap-2">
                          {['Location de salle sèche', 'Journée d\'étude', 'Event', 'Mariage', 'Soirée cocktail', 'Location de chambres'].map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleSeminarType(type)}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                seminarData.types.includes(type)
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Nombre de personnes */}
                      <div>
                        <p className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase mb-2.5">Nombre de personnes</p>
                        <div className="flex gap-2 flex-wrap">
                          {['< 10', '10 – 30', '30 – 60', '60+'].map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setSeminarData(prev => ({ ...prev, pax: prev.pax === p ? '' : p }))}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                seminarData.pax === p
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Budget */}
                      <div>
                        <p className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase mb-2.5">Budget indicatif</p>
                        <div className="flex gap-2 flex-wrap">
                          {['< 5 000 €', '5 – 15 000 €', '15 – 30 000 €', '30 000 € +'].map(b => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setSeminarData(prev => ({ ...prev, budget: prev.budget === b ? '' : b }))}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                seminarData.budget === b
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dates */}
                      <div>
                        <p className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase mb-2.5">Date(s)</p>
                        <div className="space-y-2">
                          {seminarData.dates.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="date"
                                value={d}
                                onChange={e => {
                                  const next = [...seminarData.dates];
                                  next[i] = e.target.value;
                                  setSeminarData(p => ({ ...p, dates: next }));
                                }}
                                className="flex-1 border-b border-slate-200 pb-2 text-sm focus:outline-none focus:border-slate-900 transition-colors bg-transparent text-slate-600"
                              />
                              {seminarData.dates.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setSeminarData(p => ({ ...p, dates: p.dates.filter((_, j) => j !== i) }))}
                                  className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
                                >×</button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSeminarData(p => ({ ...p, dates: [...p.dates, ''] }))}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 mt-1"
                          >
                            <Plus className="w-3 h-3" /> Ajouter une date
                          </button>
                        </div>
                      </div>

                      {/* Notes libres */}
                      <div>
                        <p className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase mb-2.5">Précisions (optionnel)</p>
                        <textarea
                          placeholder="Racontez-nous votre séjour idéal :)"
                          value={seminarData.notes}
                          onChange={e => setSeminarData(p => ({ ...p, notes: e.target.value }))}
                          rows={2}
                          className="w-full border-b border-slate-200 pb-2 text-sm focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-300 bg-transparent resize-none leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button onClick={() => setSeminarStep(1)} className="px-5 py-3.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors">
                        ←
                      </button>
                      <button
                        disabled={seminarData.types.length === 0 || seminarSending}
                        onClick={handleSeminarSubmit}
                        className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-20 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                      >
                        {seminarSending ? 'Envoi…' : 'Envoyer la demande'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}