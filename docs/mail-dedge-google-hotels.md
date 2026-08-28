# Mail à envoyer au gestionnaire de compte D-EDGE

Objet : **Les Voiles (Toulon) — activation des liens de réservation gratuits Google Hotels vers notre moteur direct**

---

Bonjour,

L'Hôtel-Rooftop Les Voiles (Toulon) dispose depuis le 27/08/2026 de son propre
moteur de réservation en direct. Nous souhaitons activer les **liens de
réservation gratuits (free booking links)** de Google Hotels, qui passent
obligatoirement par un partenaire de connectivité agréé — vous, en l'occurrence.

Trois points, dans l'ordre d'importance :

**1. Le tarif poussé dans le flux doit être notre tarif DIRECT BB (petit-déjeuner
inclus), pas le tarif OTA — ni le direct sans petit-déjeuner.**
Un lien de réservation gratuit pointe sur le site de l'hôtel, ce n'est pas une
OTA : la règle de parité qui justifie de ne pas distribuer le direct aux OTA ne
s'applique pas ici. Si le flux part avec le tarif OTA, notre propre lien
affichera le plus mauvais prix de la maison à côté de celui de Booking.com, et
perdra la comparaison qu'il est censé gagner. Merci de confirmer explicitement
quel plan tarifaire alimentera le flux Google.

**2. La taxe de séjour doit être déclarée dans le flux.**
Notre moteur affiche des totaux **taxe de séjour comprise** (1,86 €/adulte/nuit).
Si le flux annonce un prix hors taxe, Google constatera un écart entre le prix
annoncé et le prix payé, et peut suspendre la fiche pour inexactitude tarifaire.

**3. Le gabarit d'URL (point de vente) à configurer** — notre moteur décode déjà
ce format :

```
https://hotels-toulon-mer.com/reserver?checkinYear=(CHECKINYEAR)&checkinMonth=(CHECKINMONTH)&checkinDay=(CHECKINDAY)&nuits=(LENGTH)&adultes=(NUM-ADULTS)
```

Question : est-il possible de déclarer **un second gabarit pour les visiteurs
anglophones**, pointant sur `https://hotels-toulon-mer.com/en/book` avec les
mêmes variables ? (Notre version anglaise n'est pas `/en/reserver`.)

**Enfin :** nous souhaitons commencer par les **liens gratuits seuls**, sans
campagne Hotel Ads. La documentation Google confirme qu'ils fonctionnent
indépendamment des annonces payantes. Merci de ne pas conditionner l'activation
à l'ouverture d'un budget.

Pouvez-vous nous confirmer le délai de mise en service et ce que vous attendez
de notre côté ?

Bien cordialement,
