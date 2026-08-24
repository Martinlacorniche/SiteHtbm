// Traductions de la page publique « groupe » (mariages, tournages, séminaires).
//
// Un mariage international, c'est la moitié des invités qui ne lit pas le
// français. Trois langues suffisent ici : FR, EN, ES.
//
// ⚠️ CE QUI N'EST PAS TRADUIT : les textes SAISIS par l'hôtel (nom du groupe,
// mot d'accueil, conditions d'annulation, libellés de catégories de chambre).
// Ils vivent en base dans la langue de saisie — les traduire demanderait des
// champs par langue côté back-office. La page les affiche tels quels.

export type Lang = "fr" | "en" | "es";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

// Locale pour les dates et les montants. L'euro reste l'euro ; seule la façon de
// l'écrire change (1 234,00 € / €1,234.00).
export const LOCALE: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES" };

export type Dict = {
  // — en-tête / états
  oups: string; closed: string; noGroup: string; noResa: string; linkInvalid: string;
  // — liste des chambres
  filterAll: string; filterFree: string; filterTaken: string; perNight: string;
  noRoomInFilter: string; book: string; room: string; notOffered: string;
  roomTaken: string; twin: string;
  // — calendrier (mode pro)
  block: string; ofWhich: string; forYourSelection: string; dragHint: string;
  roomNotThatNight: string; remove: string;
  // — formulaire
  firstName: string; lastName: string; email: string; emailOptional: string;
  phone: string; arrival: string; departure: string; yourRooms: string;
  persons: string; perPerson: string; oneBed: string; twoBeds: string; breakfast: string;
  breakfastFree: string; allMornings: string; removeAll: string;
  morning: string; mornings: string; ofWhichBreakfast: string;
  pinCreate: string; pinOptional: string; pinConfirm: string;
  pinHintRequired: string; pinHintOptional: string;
  cancellationTerms: string; acceptTerms: string;
  validate: string; totalStay: string; totalAccommodation: string;
  night: string; nights: string; rooms: string;
  taxeSejour: string; taxeIncluded: string; taxeAdded: string;
  // — erreurs de saisie
  errName: string; errNameEmail: string; errEmail: string; errEmailAccent: string;
  errPin4: string; errPinDigits: string; errPinMatch: string; errTerms: string;
  errConnection: string;
  // — paiement
  payTitle: string; payTwoHotels: string; payStripeNote: string; pay: string;
  payOnline: string; payOnlineNote: string; payToConfirm: string;
  payThanks: string; payThanksNote: string;
  // — confirmation
  confirmed: string; yourPin: string; keepPin: string; yourLink: string;
  manageLink: string; copied: string;
  // — accès / gestion
  enterPin: string; manageResa: string; roomTakenEnterPin: string; access: string;
  myResa: string; pinAsked: string; deadlinePassed: string;
  stay: string; beds: string; edit: string; cancel: string; back: string; save: string; close: string;
  cancelRoom: string; cancelDefinitive: string; modified: string;
  statusCanceled: string; statusPending: string; statusConfirmed: string;
  yourPinLabel: string;
  // — statuts d'une chambre, sous chaque carte
  available: string; selected: string; booked: string; availableShort: string;
  roomSelected: string; roomsSelected: string; clickIfYours: string;
};

export const T: Record<Lang, Dict> = {
  fr: {
    oups: "Oups", closed: "Les inscriptions sont closes pour ce groupe.",
    noGroup: "Ce lien ne correspond à aucun groupe.", noResa: "Cette réservation n'existe pas.",
    linkInvalid: "Lien invalide",
    filterAll: "Toutes", filterFree: "Disponibles", filterTaken: "Réservées", perNight: "/ nuit",
    noRoomInFilter: "Aucune chambre dans ce filtre.", book: "Réserver →", room: "Chambre",
    notOffered: "Non proposée", roomTaken: "C'est réservé !", twin: "twin",
    block: "Le bloc", ofWhich: "Dont", forYourSelection: "pour votre sélection en cours.",
    dragHint: "Glissez sur la ligne d’une chambre pour choisir vos nuits.",
    roomNotThatNight: "Cette chambre n’est pas proposée cette nuit-là", remove: "Retirer",
    firstName: "Prénom", lastName: "Nom *", email: "Email *", emailOptional: "Email (facultatif)",
    phone: "Téléphone", arrival: "Arrivée", departure: "Départ", yourRooms: "Vos chambres",
    persons: "Personnes", perPerson: "par personne", oneBed: "1 grand lit", twoBeds: "2 lits séparés",
    breakfast: "Petit-déjeuner", breakfastFree: "offert",
    allMornings: "Tous les matins", removeAll: "Tout retirer",
    morning: "matin", mornings: "matins", ofWhichBreakfast: "dont petit-déjeuner",
    pinCreate: "Créez un code à 4 chiffres", pinOptional: "Code à 4 chiffres (facultatif)",
    pinConfirm: "Confirmez le code",
    pinHintRequired: "Ce code vous servira à modifier ou annuler votre réservation.",
    pinHintOptional: "Facultatif : avec un code, vous seul pourrez modifier ou annuler votre réservation.",
    cancellationTerms: "Conditions d'annulation :",
    acceptTerms: "J'accepte les conditions de réservation et d'annulation.",
    validate: "Valider ma réservation",
    totalStay: "Total séjour", totalAccommodation: "Total hébergement",
    night: "nuit", nights: "nuits", rooms: "ch.",
    taxeSejour: "Taxe de séjour", taxeIncluded: "incluse dans le tarif — rien à régler en plus.",
    taxeAdded: "comprise dans le total ci-dessus :",
    errName: "Merci d'indiquer votre nom.", errNameEmail: "Nom et email sont requis.",
    errEmail: "Adresse e-mail invalide.",
    errEmailAccent: "Votre e-mail contient un caractère accentué (ex. « é »). Vérifiez l'adresse, ou cliquez à nouveau pour confirmer.",
    errPin4: "Choisissez un code à 4 chiffres.", errPinDigits: "Le code doit faire 4 chiffres.",
    errPinMatch: "Les deux codes ne correspondent pas.",
    errTerms: "Merci d'accepter les conditions.",
    errConnection: "Connexion impossible.",
    payThanks: "Paiement bien reçu", payThanksNote: "On enregistre votre règlement — le statut se met à jour dans quelques secondes, et vous recevez la confirmation par email.",
    payTitle: "Plus qu'une étape", payTwoHotels: "Deux établissements = deux paiements distincts.",
    payStripeNote: "Paiement sécurisé par Stripe. Vos chambres sont tenues 30 minutes ; passé ce délai sans paiement, elles sont relibérées.",
    pay: "Payer", payOnline: "Régler en ligne",
    payOnlineNote: "Payez votre séjour dès maintenant, en toute sécurité (sinon, règlement à l’hôtel).",
    payToConfirm: "Réglez ci-dessus pour confirmer cette chambre.",
    confirmed: "C'est réservé !", yourPin: "Votre code personnel",
    keepPin: "Gardez-le : il est demandé pour modifier ou annuler.",
    yourLink: "Votre lien personnel :", manageLink: "Voir / gérer ma réservation →", copied: "Copié",
    enterPin: "Entrez votre code à 4 chiffres.", manageResa: "Gérer ma réservation",
    roomTakenEnterPin: "Cette chambre est réservée. Si c'est la vôtre, entrez votre code à 4 chiffres pour la gérer.",
    access: "Accéder", myResa: "Ma réservation",
    pinAsked: "Demandé pour modifier ou annuler vos chambres.",
    deadlinePassed: "La date limite est passée. Pour toute modification, contactez l'hôtel.",
    stay: "Séjour", beds: "Lits", edit: "Modifier", cancel: "Annuler",
    back: "Retour", save: "Enregistrer", close: "Fermer",
    cancelRoom: "Annuler cette chambre ?", cancelDefinitive: "— cette action est définitive.",
    modified: "Modifié ✓",
    statusCanceled: "Annulée", statusPending: "En attente de paiement", statusConfirmed: "Confirmée",
    yourPinLabel: "Votre code à 4 chiffres",
    available: "Disponible", selected: "Sélectionnée", booked: "Réservée", availableShort: "dispo.",
    roomSelected: "chambre sélectionnée", roomsSelected: "chambres sélectionnées",
    clickIfYours: "cliquez si c’est votre réservation",
  },
  en: {
    oups: "Oops", closed: "Bookings are closed for this group.",
    noGroup: "This link doesn't match any group.", noResa: "This booking doesn't exist.",
    linkInvalid: "Invalid link",
    filterAll: "All", filterFree: "Available", filterTaken: "Booked", perNight: "/ night",
    noRoomInFilter: "No room in this filter.", book: "Book →", room: "Room",
    notOffered: "Not available", roomTaken: "You're booked!", twin: "twin",
    block: "The block", ofWhich: "Of which", forYourSelection: "for your current selection.",
    dragHint: "Drag along a room's row to pick your nights.",
    roomNotThatNight: "This room isn't available that night", remove: "Remove",
    firstName: "First name", lastName: "Last name *", email: "Email *", emailOptional: "Email (optional)",
    phone: "Phone", arrival: "Arrival", departure: "Departure", yourRooms: "Your rooms",
    persons: "Guests", perPerson: "per person", oneBed: "1 double bed", twoBeds: "2 single beds",
    breakfast: "Breakfast", breakfastFree: "complimentary",
    allMornings: "Every morning", removeAll: "Remove all",
    morning: "morning", mornings: "mornings", ofWhichBreakfast: "including breakfast",
    pinCreate: "Create a 4-digit code", pinOptional: "4-digit code (optional)",
    pinConfirm: "Confirm the code",
    pinHintRequired: "You'll need this code to change or cancel your booking.",
    pinHintOptional: "Optional: with a code, only you can change or cancel your booking.",
    cancellationTerms: "Cancellation terms:",
    acceptTerms: "I accept the booking and cancellation terms.",
    validate: "Confirm my booking",
    totalStay: "Stay total", totalAccommodation: "Accommodation total",
    night: "night", nights: "nights", rooms: "rooms",
    taxeSejour: "City tax", taxeIncluded: "included in the rate — nothing more to pay.",
    taxeAdded: "included in the total above:",
    errName: "Please enter your name.", errNameEmail: "Name and email are required.",
    errEmail: "Invalid email address.",
    errEmailAccent: "Your email contains an accented character (e.g. « é »). Please check it, or click again to confirm.",
    errPin4: "Please choose a 4-digit code.", errPinDigits: "The code must be 4 digits.",
    errPinMatch: "The two codes don't match.",
    errTerms: "Please accept the terms.",
    errConnection: "Connection failed.",
    payThanks: "Payment received", payThanksNote: "We are recording your payment — the status updates in a few seconds and you will get a confirmation email.",
    payTitle: "One last step", payTwoHotels: "Two properties = two separate payments.",
    payStripeNote: "Secure payment by Stripe. Your rooms are held for 30 minutes; after that, without payment, they are released.",
    pay: "Pay", payOnline: "Pay online",
    payOnlineNote: "Pay for your stay now, securely (otherwise, payment at the hotel).",
    payToConfirm: "Pay above to confirm this room.",
    confirmed: "You're booked!", yourPin: "Your personal code",
    keepPin: "Keep it: it's required to change or cancel.",
    yourLink: "Your personal link:", manageLink: "View / manage my booking →", copied: "Copied",
    enterPin: "Enter your 4-digit code.", manageResa: "Manage my booking",
    roomTakenEnterPin: "This room is booked. If it's yours, enter your 4-digit code to manage it.",
    access: "Access", myResa: "My booking",
    pinAsked: "Required to change or cancel your rooms.",
    deadlinePassed: "The deadline has passed. For any change, please contact the hotel.",
    stay: "Stay", beds: "Beds", edit: "Change", cancel: "Cancel",
    back: "Back", save: "Save", close: "Close",
    cancelRoom: "Cancel this room?", cancelDefinitive: "— this cannot be undone.",
    modified: "Updated ✓",
    statusCanceled: "Cancelled", statusPending: "Awaiting payment", statusConfirmed: "Confirmed",
    yourPinLabel: "Your 4-digit code",
    available: "Available", selected: "Selected", booked: "Booked", availableShort: "left",
    roomSelected: "room selected", roomsSelected: "rooms selected",
    clickIfYours: "click if this is your booking",
  },
  es: {
    oups: "Vaya", closed: "Las inscripciones están cerradas para este grupo.",
    noGroup: "Este enlace no corresponde a ningún grupo.", noResa: "Esta reserva no existe.",
    linkInvalid: "Enlace no válido",
    filterAll: "Todas", filterFree: "Disponibles", filterTaken: "Reservadas", perNight: "/ noche",
    noRoomInFilter: "Ninguna habitación en este filtro.", book: "Reservar →", room: "Habitación",
    notOffered: "No disponible", roomTaken: "¡Reservado!", twin: "camas separadas",
    block: "El bloque", ofWhich: "De los cuales", forYourSelection: "por su selección actual.",
    dragHint: "Deslice sobre la fila de una habitación para elegir sus noches.",
    roomNotThatNight: "Esta habitación no está disponible esa noche", remove: "Quitar",
    firstName: "Nombre", lastName: "Apellidos *", email: "Correo *", emailOptional: "Correo (opcional)",
    phone: "Teléfono", arrival: "Llegada", departure: "Salida", yourRooms: "Sus habitaciones",
    persons: "Personas", perPerson: "por persona", oneBed: "1 cama grande", twoBeds: "2 camas separadas",
    breakfast: "Desayuno", breakfastFree: "cortesía",
    allMornings: "Todas las mañanas", removeAll: "Quitar todo",
    morning: "mañana", mornings: "mañanas", ofWhichBreakfast: "desayuno incluido",
    pinCreate: "Cree un código de 4 cifras", pinOptional: "Código de 4 cifras (opcional)",
    pinConfirm: "Confirme el código",
    pinHintRequired: "Este código le servirá para modificar o cancelar su reserva.",
    pinHintOptional: "Opcional: con un código, solo usted podrá modificar o cancelar su reserva.",
    cancellationTerms: "Condiciones de cancelación:",
    acceptTerms: "Acepto las condiciones de reserva y cancelación.",
    validate: "Confirmar mi reserva",
    totalStay: "Total estancia", totalAccommodation: "Total alojamiento",
    night: "noche", nights: "noches", rooms: "hab.",
    taxeSejour: "Tasa turística", taxeIncluded: "incluida en la tarifa — nada más que pagar.",
    taxeAdded: "incluida en el total anterior:",
    errName: "Indique su nombre, por favor.", errNameEmail: "Nombre y correo son obligatorios.",
    errEmail: "Correo electrónico no válido.",
    errEmailAccent: "Su correo contiene un carácter acentuado (p. ej. « é »). Verifíquelo o vuelva a hacer clic para confirmar.",
    errPin4: "Elija un código de 4 cifras.", errPinDigits: "El código debe tener 4 cifras.",
    errPinMatch: "Los dos códigos no coinciden.",
    errTerms: "Acepte las condiciones, por favor.",
    errConnection: "Conexión imposible.",
    payThanks: "Pago recibido", payThanksNote: "Estamos registrando su pago — el estado se actualiza en unos segundos y recibirá un correo de confirmación.",
    payTitle: "Un último paso", payTwoHotels: "Dos establecimientos = dos pagos distintos.",
    payStripeNote: "Pago seguro con Stripe. Sus habitaciones se mantienen 30 minutos; pasado ese plazo sin pago, se liberan.",
    pay: "Pagar", payOnline: "Pagar en línea",
    payOnlineNote: "Pague su estancia ahora, de forma segura (si no, pago en el hotel).",
    payToConfirm: "Pague arriba para confirmar esta habitación.",
    confirmed: "¡Reservado!", yourPin: "Su código personal",
    keepPin: "Consérvelo: se pide para modificar o cancelar.",
    yourLink: "Su enlace personal:", manageLink: "Ver / gestionar mi reserva →", copied: "Copiado",
    enterPin: "Introduzca su código de 4 cifras.", manageResa: "Gestionar mi reserva",
    roomTakenEnterPin: "Esta habitación está reservada. Si es la suya, introduzca su código de 4 cifras para gestionarla.",
    access: "Acceder", myResa: "Mi reserva",
    pinAsked: "Se pide para modificar o cancelar sus habitaciones.",
    deadlinePassed: "La fecha límite ha pasado. Para cualquier cambio, contacte con el hotel.",
    stay: "Estancia", beds: "Camas", edit: "Modificar", cancel: "Cancelar",
    back: "Volver", save: "Guardar", close: "Cerrar",
    cancelRoom: "¿Cancelar esta habitación?", cancelDefinitive: "— esta acción es definitiva.",
    modified: "Modificado ✓",
    statusCanceled: "Cancelada", statusPending: "Pendiente de pago", statusConfirmed: "Confirmada",
    yourPinLabel: "Su código de 4 cifras",
    available: "Disponible", selected: "Seleccionada", booked: "Reservada", availableShort: "disp.",
    roomSelected: "habitación seleccionada", roomsSelected: "habitaciones seleccionadas",
    clickIfYours: "haga clic si es su reserva",
  },
};

// Langue retenue : ?lang= (on peut envoyer un lien déjà en anglais), sinon le
// choix mémorisé, sinon la langue du navigateur. Défaut FR.
export function detectLang(search?: string): Lang {
  const ok = (v: string | null | undefined): Lang | null =>
    v && ["fr", "en", "es"].includes(v.slice(0, 2).toLowerCase()) ? (v.slice(0, 2).toLowerCase() as Lang) : null;
  if (typeof window === "undefined") return "fr";
  const fromUrl = ok(new URLSearchParams(search ?? window.location.search).get("lang"));
  if (fromUrl) return fromUrl;
  try {
    const saved = ok(localStorage.getItem("groupe_lang"));
    if (saved) return saved;
  } catch { /* stockage refusé (navigation privée) : on continue */ }
  return ok(navigator.language) ?? "fr";
}

export function rememberLang(l: Lang) {
  try { localStorage.setItem("groupe_lang", l); } catch { /* sans conséquence */ }
}
