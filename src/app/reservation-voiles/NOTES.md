# Notes de travail — Booking engine Les Voiles
_Dernière mise à jour : 2026-03-27_

---

## Concept général

Remplacer l'interface D-edge (obsolète) par un tunnel de réservation sur mesure pour l'Hôtel Les Voiles.
Philosophie : **l'hôtel propose, le client valide** — pas de formulaire à remplir, pas d'étapes numérotées.

Trois insights à l'origine du design :
1. L'humain est impatient → une seule chose à la fois, zéro friction
2. L'humain aime gagner → sentiment de deal personnalisé, pas un prix catalogue
3. L'humain aime le scroll réseaux sociaux → format vertical, décision binaire (je prends / je passe)

---

## Flow actuel (4 étapes)

```
Booking → Cartes → Deal (curseur live) → Paiement → Confirmé
```

### Étape 1 — Booking
- Date d'arrivée (date picker)
- Nuits (+/−)
- Personnes (+/−)
Tout sur le même slide.

### Étape 2 — Cartes
10 cartes à jouer. **Tap = sélectionné, retap = verrouillé (⚑), retap = off.**
- Verrouillée = non négociable, le curseur ne peut pas l'enlever
- Normale = active seulement si le curseur dépasse son seuil

Cartes triées par intérêt potentiel (les plus demandées en premier) :
| id | Label | Threshold curseur |
|---|---|---|
| petit_dej | Je ne zappe jamais un petit-déj | 30 |
| vue_mer | Jamais sans la vue mer | 60 |
| late_checkout | Je pars à mon rythme | 45 |
| paiement_immediat | Je suis certain de venir | 0 |
| arrivee_tardive | J'arrive tard le soir | 0 |
| early_checkin | J'arrive tôt | 50 |
| parking | J'ai besoin du parking | 20 |
| champagne | Champagne à l'arrivée | 78 |
| fidelite | On se connaît déjà | 0 |
| suite | La suite si elle est libre | 85 |

Threshold = position minimale du curseur pour que la carte soit active (0–100).
Threshold 0 = toujours actif (atout de négociation, coût zéro pour l'hôtel).

### Étape 3 — Deal (curseur live)
**Phase "live" :** tout calculé localement, zéro appel API.
- Curseur Budget (0) ↔ Expérience (100)
- La chambre change en temps réel selon le curseur + cartes actives
- Les cartes sélectionnées s'affichent : actives (amber) vs inactives barrées ("curseur trop bas")
- Comparaison OTA en temps réel (voir logique ci-dessous)
- Prix s'anime à chaque changement

**Phase "personalizing" :** bouton "C'est mon deal" → appel API Claude Haiku
- L'API reçoit la chambre déjà déterminée localement (ne peut pas la changer)
- Retourne : dealPhrase, dealClose, otaAddon, otaMessage

**Phase "ready" :** deal final avec la phrase IA + bouton "Oui, je prends ça"

#### Logique chambre (locale)
- vue_mer ou suite active → rooftop obligatoire
- vibe >= 65 → rooftop
- vibe >= 28 → superieure
- vibe < 28 → cosy

#### Logique OTA 3-way
Mock OTA = parité tarifaire (même prix que nous, Booking prend sa commission côté hôtel, invisible client).

| Cas | Action |
|---|---|
| ourPrice < otaPrice | "Déjà X€ moins cher" — pas d'addon |
| ourPrice == otaPrice + perks présents | "Même prix, mais avec tout ça en plus" — pas d'addon |
| ourPrice == otaPrice + AUCUN perk | Offrir addon le moins cher (bouteille de bienvenue, late checkout +1h) |
| ourPrice > otaPrice | Addon calibré pour couvrir le gap en valeur perçue |

---

## Fichiers

```
src/app/reservation-voiles/page.tsx   — toute l'UI (client component)
src/app/api/recommande/route.ts       — API route Claude Haiku
```

### Architecture du composant page
- `computeLiveDeal(vibe, cardStates, nights)` → calcul synchrone, sans API
- `personalizeDeal()` → appel async vers /api/recommande
- State principal : step / cardStates (map id→off|on|locked) / vibe (0–100) / dealPhase / aiDeal

### API /api/recommande
Entrées : `{ checkIn, nights, guests, vibe, atouts[], roomId, otaPrice, ourPrice }`
Sorties : `{ roomId, dealPhrase, perks[], dealClose, otaAddon, otaMessage }`
Modèle : claude-haiku-4-5 (choix délibéré : vitesse ~500ms, tâche simple)
Clé requise : `ANTHROPIC_API_KEY` dans `.env.local`

---

## Données mockées (à remplacer par API D-edge)

```
Chambres : Cosy 80€ / Supérieure 100€ / Rooftop 150€
Prix OTA : parité tarifaire (même prix)
```

Les vraies données (dispo, tarifs, restrictions) viendront de l'API D-edge une fois l'accès obtenu.

---

## Ce qui reste à faire

### Court terme (prototype)
- [ ] Améliorer le rendu visuel de la phase "live" (animation du prix plus prononcée ?)
- [ ] Tester les 3 scénarios OTA sur desktop + mobile
- [ ] Ajouter des images par chambre (actuellement toutes la même photo voiles.jpg)
- [ ] Valider le wording des cartes avec Martin

### Moyen terme (prod)
- [ ] Brancher l'API D-edge en lecture (disponibilités, tarifs temps réel)
  - Contacter l'account manager D-edge pour l'accès Connect API / Distribution API
  - Questions clés : format (OpenTravel / propriétaire ?), certification partenaire ?
- [ ] Brancher l'API D-edge en écriture (création de réservation)
- [ ] Remplacer le mock OTA par une vraie veille tarifaire (OTA Insight ou Rateboard)
- [ ] Intégrer un vrai système de paiement (Stripe recommandé)
- [ ] Envoyer un email de confirmation réel (Resend ou SendGrid)

### Long terme
- [ ] Dupliquer pour La Corniche (nécessite accord Best Western pour accès API D-edge)
- [ ] Analytics sur les cartes jouées (quelles cartes convertissent le mieux ?)
- [ ] A/B test curseur position initiale (50 vs 65 vs 75)

---

## Décisions techniques prises

| Décision | Raison |
|---|---|
| Haiku vs Opus pour l'IA | Temps réel, tâche simple de personnalisation |
| Calcul deal local (pas d'API sur curseur) | Zéro latence, fluidité de l'UX |
| Parité tarifaire dans le mock OTA | Plus réaliste que +12%, différenciateur = inclus pas prix |
| Cartes 3 états (off/on/locked) | "Non négociable" = besoin UX fort exprimé par Martin |
| Bottom sheet → même page | Pas de navigation, tout dans le même écran |
| Prototype en données mockées | Architecture prête pour D-edge sans bloquer le design |

---

## Réflexion UX originelle (à garder en tête)

> "L'humain est bête parfois, l'humain n'est pas patient, l'humain aime avoir l'impression de gagner.
> Et l'humain aime le scroll réseaux sociaux."
>
> → Format vertical, une décision à la fois, sensation de deal exclusif,
>   l'hôtel propose — le client confirme.

Le différenciateur vs un formulaire classique : **la négociation perçue**.
Le client pense avoir construit son deal. En réalité, l'hôtel ne cède que sur ce qui l'arrange
(chambres difficiles à vendre, créneaux creux, services à coût marginal nul).
