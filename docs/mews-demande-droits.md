# Demande à Mews — droits API et préautorisation automatique

*Hôtel-Rooftop Les Voiles (SAS LES VOILES) · Enterprise `0a876d46-7b1a-4164-aafa-aaa90086e8bf`
· intégration `Hotel Les Voiles Integration INT004073` · constaté le 27/08/2026*

Ce fichier est un **brouillon à envoyer au support Mews**. Il rassemble les
mesures faites sur la production ; tout ce qui y figure a été vérifié, rien n'y
est supposé. Le garder à jour si les réponses arrivent.

---

## 1. La préautorisation automatique ne s'exécute jamais

**Configuration en place** (lue sur `hotels/getAvailability`, Booking Engine API) :

| Groupe tarifaire | SettlementType | SettlementAction | SettlementTrigger | Offset | Value |
|---|---|---|---|---|---|
| Flexible `885e90be…` | `Automatic` | `CreatePreauthorization` | `Confirmation` | `P0M0DT0H0M0S` | `0.01` |
| Prépayé `d9234a0d…` | `Automatic` | `ChargeCreditCard` | `Confirmation` | `P0M0DT0H0M0S` | `1` |

**Ce qui est observé sur le tarif flexible**, réservation **29843** du 27/08/2026 :

1. `reservationGroups/create` avec `CreditCardData` (jeton PciProxy) → réservation créée,
   carte `602fd2f7-367a-4ca8-a942-b4b3009845f3` attachée.
2. `paymentCards/authorize` puis 3-D Secure complété par le client sur la page
   `app.mews.com/navigator/card-authorization/…` → **`AuthorizationState: "Authorized"`**.
3. `reservations/confirm` → réservation **`Confirmed`**.
4. **Aucune préautorisation n'est créée.** `preauthorizations/getAllByCustomers`
   renvoie une liste vide. `payments/getAll` ne montre rien.
   La demande de paiement créée par Mews (`Type: Preauthorization`, 1,68 €)
   reste **`Pending`** jusqu'à son expiration, quinze minutes plus tard.

Le même scénario s'est reproduit sur les réservations **29816**, **29841** et **29843**,
et sur **28 demandes** de type `Preauthorization` créées le 26/08 — **aucune** n'est
jamais passée `Completed`.

> **Question 1.** Avec `SettlementType: Automatic`, `SettlementAction: CreatePreauthorization`,
> `SettlementTrigger: Confirmation` et un offset nul, Mews doit-il exécuter la
> préautorisation lui-même depuis la carte attachée ? Si oui, pourquoi ne le
> fait-il pas ici, alors que la carte est `Authorized` et la réservation `Confirmed` ?
> Si non, quel est le mécanisme attendu pour qu'une empreinte soit réellement prise ?

## 2. Mews Payments Checkout ne conclut pas une demande `Preauthorization`

Le checkout embarqué (`cdn.mews.com/payments/checkout-embed.js`) s'affiche et
accepte la saisie, mais **son bouton ne soumet rien** sur une demande de type
`Preauthorization` : aucune requête, aucun rappel, pas même `onFailure`. Sur les
portefeuilles, Mews répond au moins « Only PaymentCard is supported for
preauthorizations ». Sur la carte, c'est le silence.

Sur une demande de type **`Payment`**, le même code fonctionne parfaitement —
vérifié le 26/08 : demande `Completed`, débit à 15:19:52, remboursement à 15:21:03.

La documentation ne liste d'ailleurs que trois événements de succès
(`payment-charged`, `payment-submitted`, `payment-method-collected`) et aucun
pour la préautorisation.

> **Question 2.** Mews Payments Checkout prend-il en charge les demandes de type
> `Preauthorization` ? Si non, est-ce documenté quelque part, et quelle est
> l'alternative recommandée pour une empreinte sur un tarif flexible ?

## 3. Droits manquants sur l'intégration

Sondage à vide de chaque opération (401 = droit manquant, 400 = autorisée) :

| Opération | État |
|---|---|
| `creditCards/charge` | ❌ **No permission to use this operation.** |
| `creditCards/addTokenized` | ❌ No permission |
| `paymentMethodRequests/add` | ❌ No permission |
| `paymentPolicies/getAll` | ❌ No permission |
| `paymentPolicyAssignments/getAll` | ❌ No permission |
| `paymentRequests/add` · `cancel` · `getAll` | ✅ autorisées |
| `reservations/confirm` · `cancel` | ✅ autorisées |
| `creditCards/getAll` · `disable` | ✅ autorisées |
| `payments/getAll` · `preauthorizations/getAllByCustomers` | ✅ autorisées |

> **Question 3 — la demande principale.** Merci d'activer sur cette intégration :
>
> - **`paymentMethodRequests/add`** — c'est le chemin le plus propre pour notre
>   cas : collecter une carte avec le consentement du client par le checkout
>   (`payment-method-collected`), puis laisser l'automatisation de Mews
>   appliquer la règle du tarif. Cela nous permettrait d'utiliser **un seul**
>   moyen de collecte pour les deux tarifs, au lieu de deux.
> - **`creditCards/charge`** — pour encaisser une carte déjà enregistrée.
> - **`paymentPolicies/getAll`** et **`paymentPolicyAssignments/getAll`** — en
>   lecture, pour pouvoir vérifier nous-mêmes les règles en vigueur avant de
>   vous solliciter.

---

## Contexte

L'hôtel remplace son moteur de réservation par un tunnel développé en interne,
sur la **Booking Engine API** pour la vente et la **Connector API** pour ce
qu'elle ne sait pas faire (confirmer, annuler, annoter). Les cartes sont
tokenisées par **PciProxy** dans le navigateur et ne transitent jamais par nos
serveurs.

Le point 1 est **bloquant** : sans empreinte, le tarif flexible est vendu sans
garantie.
