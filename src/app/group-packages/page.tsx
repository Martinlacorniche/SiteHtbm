"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Star, Menu, X, Instagram, Facebook, Phone, Mail, Droplet, Bike, Utensils, Zap } from "lucide-react"; 
import { Playfair_Display, Inter } from 'next/font/google';
import { cn } from "@/lib/utils";

// --- TYPOGRAPHIE (Reprise de page.tsx) ---
const serif = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-serif' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

// --- DATA ---
const CONFIG = {
  email: "commercial@htbm.fr",
  phone: "04 94 41 36 23", 
  
  texts: {
    fr: {
      subtitle: "Packages et Incentives Groupes",
      accroche: "Laissez l'ennui aux autres. Le vrai week-end commence ici.",
      cta_main: "Demander un Devis Sur Mesure",
      details_title: "Une Offre Clé en Main",
      details_desc: "Créez l'événement parfait pour vos équipes ou votre tribu. Nos forfaits 'Expérience' incluent une activité premium, une nuit douce et le petit déjeuner, dans l'écrin de notre Collection Bord de Mer.",
      price_tag: "À partir de 169€ TTC par personne",
      group_size: "Groupes de 15 à 30 personnes",
      // --- NOUVEAUX TEXTES TRADUITS ---
      contact_commercial: "Contact Commercial",
      cta_contact: "Contactez-nous",
      or_call_us: "Ou appelez-nous :",
      incl_night: "Nuit douce en chambre individuelle (Hôtel Les Voiles ou Corniche)",
      incl_breakfast: "Petit déjeuner inclus",
      incl_activity: "Accès à l'activité premium choisie",
      legal_mentions: "Mentions Légales",
      contact_footer: "Contact",
      designed_in: "Conçu à Toulon.", 
    },
    en: {
        subtitle: "Group Packages & Incentives",
        accroche: "Leave the boredom to others. The real weekend starts here.",
        cta_main: "Request a Custom Quote",
        details_title: "A Turnkey Offer",
        details_desc: "Create the perfect event for your teams or your tribe. Our 'Experience' packages include a premium activity, a soft night's stay, and breakfast, set within our Bord de Mer Collection.",
        price_tag: "Starting from €169 Incl. Tax per person",
        group_size: "Groups of 15 to 30 people",
        // --- NOUVEAUX TEXTES TRADUITS ---
        contact_commercial: "Commercial Contact",
        cta_contact: "Contact Us",
        or_call_us: "Or call us:",
        incl_night: "Soft night in a single room (Hôtel Les Voiles ou Corniche)",
        incl_breakfast: "Breakfast included",
        incl_activity: "Access to the chosen premium activity",
        legal_mentions: "Legal Mentions",
        contact_footer: "Contact",
        designed_in: "Designed in Toulon.",
    }
  },

  packages: [
    { 
      title: "Paddle & Yacht Club", 
      image: "/images/package-paddle.jpg",
      desc: { fr: "La Méditerranée comme terrain de jeu. Échappée en mer, voiles et couchers de soleil.", en: "The Mediterranean as your playground. Sea escape, sailing, and sunsets." },
      color: "text-blue-200", 
      tag: { fr: "Sur l'eau", en: "On the water" },
      // SEO OPTIMISATION
      alt_fr: "Activité nautique de paddle et yacht club pour incentive de groupe à Toulon.",
      alt_en: "Paddle and Yacht Club nautical activity for a group incentive in Toulon.",
    },
    { 
      title: "Vélo Club", 
      image: "/images/package-bike.jpg", 
      desc: { fr: "Itinéraire sur mesure entre littoral varois et arrière-pays. VTT ou vélos de route.", en: "Custom itinerary between the Var coast and the hinterland. Mountain or road bikes." },
      color: "text-green-200",
      tag: { fr: "Sur la terre", en: "On the land" },
      // SEO OPTIMISATION
      alt_fr: "Sortie VTT et vélo de route pour groupe d'entreprise près de Toulon.",
      alt_en: "Mountain and road bike tour for a corporate group near Toulon.",
    },
    { 
      title: "Master Class Cocktail", 
      image: "/images/package-cocktail.jpg", 
      desc: { fr: "Derrière le bar, apprenez l'art de la mixologie. Création signature face à la mer.", en: "Behind the bar, learn the art of mixology. Signature creation facing the sea." },
      color: "text-red-200",
      tag: { fr: "Sur mesure", en: "Tailor-made" },
      // SEO OPTIMISATION
      alt_fr: "Master class de cocktail en bord de mer pour événement incentive.",
      alt_en: "Seaside cocktail master class for an incentive event.",
    },
    { 
      title: "Soirée Rooftop", 
      image: "/images/package-rooftop.jpg", 
      desc: { fr: "Apéritif privatisé au sommet, dîner léger et ambiance musicale élégante.", en: "Private sunset aperitif, light dinner, and elegant musical atmosphere." },
      color: "text-amber-200",
      tag: { fr: "Au sommet", en: "At the top" },
      // SEO OPTIMISATION
      alt_fr: "Soirée privée en rooftop vue mer pour événement de groupe à l'hôtel.",
      alt_en: "Private rooftop evening with sea view for a group hotel event.",
    }
  ],
  
  socials: {
    instagram: "https://www.instagram.com/hotels_toulon_mer/",
    facebook: "https://www.facebook.com/hotelstbm",
  }
};

// --- Composant des Bulles de Forfait (Logique d'agrandissement et lisibilité OK) ---
const PackageGridItem = ({ pkg, email, lang, index, hoveredIndex, setHoveredIndex }: { 
    pkg: typeof CONFIG.packages[0], 
    email: string, 
    lang: "fr" | "en",
    index: number,
    hoveredIndex: number | null,
    setHoveredIndex: (index: number | null) => void 
}) => {
    
    const t = CONFIG.texts[lang]; 
    const isHovered = hoveredIndex === index;
    const isOtherHovered = hoveredIndex !== null && hoveredIndex !== index;

    const flexClasses = isHovered 
        ? "lg:flex-[1.5] shadow-2xl" 
        : isOtherHovered
            ? "lg:flex-[0.5] opacity-80" 
            : "lg:flex-1"; 

    return (
        <div 
            className={cn(
                "group relative overflow-hidden rounded-2xl cursor-pointer min-h-[250px] md:min-h-[350px] bg-slate-200 shadow-lg",
                "transition-all duration-700 ease-in-out", 
                flexClasses
            )}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
        >
            {/* Lien actif sur toute la surface : redirige vers l'ancre */}
            <Link 
                href="#cta-contact-section"
                className="absolute inset-0 z-20" 
                aria-label={`Réserver le package ${pkg.title}`} 
            />

            {/* Image de fond avec effet de zoom au hover */}
            <div className="absolute inset-0 pointer-events-none">
                <Image 
                    src={pkg.image} 
                    // --- CORRECTION SEO: Utilisation de la nouvelle balise alt ---
                    alt={pkg[`alt_${lang}` as keyof typeof pkg] as string}
                    fill 
                    className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110 z-0" 
                    sizes="(max-width: 768px) 50vw, 25vw"
                />
                {/* Voile de fond pour la lisibilité du texte */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-700 ease-in-out z-10" />
            </div>

            {/* Contenu (Affiché en permanence + détail au hover) */}
            <div className="relative z-30 h-full flex flex-col justify-end p-6 text-white pointer-events-none">
                
                {/* Titre principal toujours visible */}
                <div className="transition-opacity duration-300"> 
                    <span className="uppercase tracking-[0.2em] text-xs font-bold text-white drop-shadow-md opacity-70 mb-2 block">{pkg.tag[lang]}</span>
                    <h3 className="font-serif text-3xl md:text-4xl leading-snug drop-shadow-lg text-white mb-4">
                        {pkg.title}
                    </h3>
                </div>

                {/* Texte descriptif et CTA apparaissant au hover (Lisibilité OK) */}
                <div className="space-y-4 transition-opacity duration-500 opacity-0 group-hover:opacity-100">
                    <p className="text-base font-medium leading-relaxed text-white/90 drop-shadow-md">
                        {pkg.desc[lang]}
                    </p>
                    <div className="flex items-center gap-2 text-sm font-bold text-white/90 drop-shadow-md">
                        {t.cta_contact} <ArrowRight className="w-4 h-4" /> 
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function GroupPackagesPage() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const t = CONFIG.texts[lang];
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const NAV_CONFIG = { contactEmail: CONFIG.email };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- Préparation du contenu du mail pour le CTA principal ---
  const subject = "DEMANDE DE DEVIS GROUPE - Expériences Incentive HTBM";
    
  const body_fr = `Bonjour l'équipe commerciale,\n\nNous souhaiterions obtenir un devis personnalisé pour un événement incentive.\n\n- Nombre de personnes (estimé) : [À PRÉCISER]\n- Date ou période souhaitée : [À PRÉCISER]\n- Forfait envisagé (Paddle, Vélo, Cocktail, Rooftop) : [À PRÉCISER]\n\nMerci de nous recontacter pour discuter des détails.\n\nCordialement,\n[VOTRE NOM ET SOCIÉTÉ]`;
  
  const body_en = `Hello Commercial Team,\n\nWe would like to request a personalized quote for a group incentive event.\n\n- Estimated number of people: [PLEASE SPECIFY]\n- Desired date or period: [PLEASE SPECIFY]\n- Package considered (Paddle, Bike, Cocktail, Rooftop): [PLEASE SPECIFY]\n\nThank you for contacting us to discuss the details.\n\nBest regards,\n[YOUR NAME AND COMPANY]`;
  
  const bodyContent = lang === 'fr' ? body_fr : body_en;

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(bodyContent);
  
  const mailtoLink = `mailto:${CONFIG.email}?subject=${encodedSubject}&body=${encodedBody}`;


  return (
    <div className={`${serif.variable} ${sans.variable} font-sans min-h-screen bg-[#FDFCF8] text-slate-900 selection:bg-blue-100`}>
      
      {/* --- NAV (Inchangé) --- */}
      <nav className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500 px-4 md:px-6 py-4 flex justify-between items-center",
        isScrolled ? "bg-white/95 backdrop-blur-md border-b border-black/5 py-3 shadow-sm" : "bg-transparent"
      )}>
        <Link href="/" className="flex items-center gap-3 z-50 relative group">
             <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shadow-sm border border-white/20 bg-white">
                {/* --- CORRECTION SEO: Ajout de mots-clés dans la balise alt du logo --- */}
                <Image src="/logos/logo-bleu.png" alt="Logo HTBM Hôtels Toulon Bord de Mer" fill className="object-cover p-1" />
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
            <button onClick={() => setMenuOpen(true)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <Menu className="w-6 h-6 text-slate-800" />
            </button>
        </div>
      </nav>

      {/* --- MENU (Corrigé pour la traduction) --- */}
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
              <a href="#" className="hover:text-amber-300 transition-colors">Packages Groupes</a>
              <div className="h-px w-24 bg-white/20 mx-auto my-4"/>
              <div className="flex flex-col gap-3 font-sans text-lg md:text-xl font-light opacity-80">
                  <a href={`mailto:${NAV_CONFIG.contactEmail}`} className="hover:text-white flex items-center justify-center gap-2">
                      <Mail className="w-5 h-5"/> {t.contact_commercial}
                  </a>
              </div>
            </div>
            <div className="absolute bottom-10 flex gap-6">
              <a href={CONFIG.socials.instagram} target="_blank"><Instagram className="hover:text-blue-300"/></a>
              <a href={CONFIG.socials.facebook} target="_blank"><Facebook className="hover:text-blue-300"/></a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HERO (Hauteur réduite conservée) --- */}
      <header className="relative h-[25vh] md:h-[30vh] flex flex-col items-center justify-center text-center px-4 pt-20 bg-[#FDFCF8]">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <h1 className="font-serif text-4xl md:text-7xl text-slate-900 leading-none mb-1">
            Expériences
          </h1>
          <span className="font-serif text-3xl md:text-6xl italic text-slate-500 leading-none">
            Incentive
          </span>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-4 text-xs md:text-sm uppercase tracking-[0.3em] text-slate-400 font-sans"
        >
          {t.subtitle}
        </motion.p>
      </header>


      {/* --- ACCROCHE & PACKAGES (Marges réduites conservées) --- */}
      <section className="py-6 md:py-10 px-4 md:px-6 max-w-[1800px] mx-auto">
        
        {/* Accroche */}
        <motion.div
            initial={{ opacity: 0, y: 10 }} 
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto mb-6 md:mb-8"
        >
            <h2 className="font-serif text-3xl md:text-5xl text-slate-900 leading-tight italic">
                {t.accroche}
            </h2>
        </motion.div>

        {/* 4 Bulles interactives */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row gap-4 md:gap-6" 
        >
          {CONFIG.packages.map((pkg, index) => (
            <PackageGridItem 
              key={index} 
              pkg={pkg} 
              email={CONFIG.email} 
              lang={lang}
              index={index} 
              hoveredIndex={hoveredIndex} 
              setHoveredIndex={setHoveredIndex} 
            />
          ))}
        </motion.div>
      </section>

      {/* --- DÉTAILS DE L'OFFRE ET CTA (ID ANCRE) --- */}
      <section id="cta-contact-section" className="bg-slate-900 text-white py-16 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
          
          <div className="md:w-1/2">
            <h3 className="font-serif text-4xl mb-4 leading-snug">{t.details_title}</h3>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              {t.details_desc}
            </p>

            <div className="space-y-3 font-sans font-medium text-sm">
                <div className="flex items-center gap-3 text-amber-300">
                    <Star className="w-4 h-4"/> {t.incl_night}
                </div>
                <div className="flex items-center gap-3 text-amber-300">
                    <Star className="w-4 h-4"/> {t.incl_breakfast}
                </div>
                <div className="flex items-center gap-3 text-amber-300">
                    <Star className="w-4 h-4"/> {t.incl_activity}
                </div>
            </div>
          </div>
          
          <div className="md:w-1/2 flex flex-col items-start md:items-end text-left md:text-right space-y-4">
              <p className="font-serif text-5xl font-bold text-amber-300">
                  {t.price_tag}
              </p>
              <p className="text-white/60 text-lg uppercase tracking-wider font-bold border-b border-white/20 pb-2">
                  {t.group_size}
              </p>
              <a 
                href={mailtoLink}
                className="inline-flex items-center gap-3 bg-amber-300 text-slate-900 px-8 py-4 mt-6 rounded-full text-lg font-bold hover:bg-white transition-colors shadow-xl"
              >
                  {t.cta_main} <ArrowRight className="w-5 h-5"/>
              </a>
              <a href={`tel:${CONFIG.phone.replace(/\s/g,"")}`} className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-2 mt-2">
                <Phone className="w-3 h-3"/> {t.or_call_us} {CONFIG.phone}
              </a>
          </div>

        </div>
      </section>

      {/* --- FOOTER (Corrigé pour la traduction) --- */}
      <footer className="bg-[#FDFCF8] pt-10 pb-6 px-6 border-t border-slate-100">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-xs">
            <div className="flex gap-6">
                <span className="opacity-50">© {new Date().getFullYear()} HTBM</span>
                <Link href="#" className="hover:text-slate-900">{t.legal_mentions}</Link>
                <a href={`mailto:${CONFIG.email}`} className="hover:text-slate-900">{t.contact_footer}</a>
            </div>
            <div className="font-serif italic opacity-50">
                {t.designed_in}
            </div>
        </div>
      </footer>
    </div>
  );
}