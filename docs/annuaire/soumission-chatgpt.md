# Soumission à l'annuaire ChatGPT — Hôtel-Rooftop Les Voiles

**Où** : plateforme développeur OpenAI, section Apps.
⚠️ **À faire par Martin** : il faut un compte développeur OpenAI vérifié.

## Ce qui est DÉJÀ conforme (vérifié en ligne le 06/10/2026)

| Exigence | État |
|---|---|
| Serveur MCP public en HTTPS | ✅ `https://hotels-toulon-mer.com/mcp` |
| `readOnlyHint` / `destructiveHint` / `openWorldHint` explicites | ✅ sur les 12 outils |
| Politique de confidentialité | ✅ `/confidentialite` |
| Conditions | ✅ `/cgv` |
| Page de documentation du connecteur | ✅ `/connecteur` |
| Site vérifiable | ✅ domaine de l'hôtel |
| Pas d'encaissement dans l'app | ✅ `/mcp` exclut les outils qui débitent |
| Compte de démonstration | ✅ sans objet : aucune authentification sur cette porte |

🔑 **Le point qui aurait fait refuser, et qui est déjà traité** : leurs règles
limitent le commerce aux BIENS PHYSIQUES et excluent les services de voyage.
La porte `/mcp` ne porte donc ni `complete_booking_session` ni `pay_folio` :
l'agent cherche, obtient un vrai prix, réserve une table au rooftop — et pour
la chambre, il renvoie sur le tunnel de l'hôtel, où le paiement a lieu. L'app
ne touche pas d'argent.

## Les textes de la fiche

**Nom** (≤ 30 caractères) :
```
Les Voiles Toulon
```

**Description courte** :
```
Chambres et tables au rooftop de l’Hôtel-Rooftop Les Voiles, à Toulon : disponibilité et prix réels, en direct de l’hôtel.
```

**Description longue** :
```
L’Hôtel-Rooftop Les Voiles est un boutique-hôtel indépendant de 16 chambres à
Toulon, dans le quartier du Mourillon, à 300 m des plages.

Ce connecteur interroge directement le logiciel de l’hôtel. Les disponibilités
et les prix sont donc réels, et ils changent quand une chambre se vend : rien
n’est estimé ni mis en cache.

Il permet de décrire l’hôtel et ses prestations, de chercher une chambre pour
des dates données, d’obtenir un prix tout compris (taxe de séjour incluse), de
proposer des dates de repli quand c’est complet, et de réserver une table au
rooftop — le seul rooftop de Toulon ouvert sur la rade.

La réservation de chambre se termine sur le site de l’hôtel, qui encaisse
lui-même : aucun paiement n’a lieu dans la conversation.

Un client déjà réservé peut relire son séjour, obtenir ses codes d’arrivée et
consulter sa note.
```

**Éditeur** : Hôtels Bord de Mer (HTBM) — Toulon, France
**Site** : https://hotels-toulon-mer.com
**Documentation** : https://hotels-toulon-mer.com/connecteur
**Confidentialité** : https://hotels-toulon-mer.com/confidentialite
**Conditions** : https://hotels-toulon-mer.com/cgv
**Icône** : `docs/annuaire/icone-64.png` (64×64, 1 534 octets)

## Ce qui reste à produire

- **Captures d'écran** : à faire depuis une conversation ChatGPT réelle, une
  fois le connecteur ajouté en mode développeur. C'est aussi le meilleur essai
  avant de soumettre.
- **Disponibilité par pays** : France au minimum ; l'hôtel reçoit des clients
  étrangers, le serveur répond en français et en anglais.

## L'essai avant la soumission

ChatGPT → Paramètres → Connecteurs → mode développeur → ajouter
`https://hotels-toulon-mer.com/mcp`.
Leurs règles exigent d'avoir éprouvé l'app avant de la soumettre ; c'est aussi
là qu'on prendra les captures.

⚠️ Chaque essai sera maintenant COMPTÉ dans `mcp_appels` : c'est normal, et ça
permet de distinguer nos propres essais (agent `ChatGPT`, avant la publication)
du trafic réel qui suivra.

---

# Le vrai parcours de soumission (relevé le 07/10/2026)

🔧 **CORRECTION DE CE QUE J'AI ÉCRIT LE 06/10.** J'avais annoncé « trois choses
à faire ». C'est davantage : la soumission n'est pas un formulaire, c'est un
paquet à téléverser avec des pièces de recette. Voici la liste réelle.

**Où** : https://platform.openai.com/plugins → « Upload new or existing plugin ».

**Prérequis bloquant** : être propriétaire de l'organisation (ou avoir le droit
« Apps Management Write »), **et avoir fait la vérification d'identité**
(individuelle ou entreprise) dans les réglages de l'organisation. Rien ne
commence avant ça — c'est la première chose à lancer, parce que c'est la seule
qui dépend d'un tiers.

| Pièce | Qui |
|---|---|
| Vérification d'identité de l'organisation | **toi** — à lancer en premier |
| Paquet (ZIP) + manifeste | moi, dès qu'on voit le gabarit attendu |
| Vérification du domaine, onglet « MCPs » | moi (fichier ou DNS) dès que tu as le jeton |
| Métadonnées, icône, descriptions | ✅ déjà faites, plus haut |
| **5 cas de test positifs** | ✅ ci-dessous |
| **3 cas de test négatifs** | ✅ ci-dessous |
| Vidéo de démonstration (URL) | **toi** — une capture d'écran filmée de la conversation |
| Identifiants pour le relecteur | sans objet : aucune authentification sur `/mcp` |
| Notes de version | ✅ ci-dessous |

## Les 5 cas positifs

1. **Décrire l'hôtel.** « Parle-moi de l'Hôtel-Rooftop Les Voiles à Toulon. »
   → `get_property_details`. Attendu : adresse au Mourillon, 16 chambres,
   rooftop, arrivée autonome à partir de 15 h, animaux acceptés. Rien
   d'inventé : tout vient de l'outil.

2. **Un prix réel, taxe comprise.** « Une chambre pour 2 personnes du 20 au 22
   novembre, c'est combien ? » → `create_booking_session`. Attendu : un total
   TTC taxe de séjour incluse, et le prix par nuit. ⚠️ Le prix doit changer si
   on repose la question à d'autres dates : il vient du PMS, pas d'un cache.

3. **Des dates de repli quand c'est complet.** Demander des dates saturées.
   → `get_alternative_dates`. Attendu : des séjours de même durée, proches, et
   réellement disponibles — pas un « aucune disponibilité » sec.

4. **Une table au rooftop.** « Une table au rooftop vendredi soir pour 4. »
   → `get_rooftop_availability` puis `create_rooftop_reservation`. Attendu :
   la table est tenue **fermement, sans paiement**, et l'agent rend la
   confirmation. C'est le cas qui montre une écriture réussie de bout en bout.

5. **Une question précise sur l'établissement.** « Est-ce que les chiens sont
   acceptés, et y a-t-il un parking ? » → `search` puis `fetch`. Attendu : la
   réponse dans les mots de l'hôtel, pas une généralité sur les hôtels.

## Les 3 cas négatifs

1. **On ne paie pas dans la conversation.** Demander à régler la chambre
   directement. Attendu : l'outil de paiement **n'existe pas** sur cette porte,
   et un appel direct est refusé avec le message qui renvoie sur le tunnel de
   l'hôtel. Aucun débit n'est possible depuis ChatGPT — c'est exactement ce que
   leurs règles sur le commerce exigent.

2. **Des dates impossibles.** Départ avant l'arrivée, ou dates passées.
   Attendu : un refus lisible dans le protocole (JSON-RPC), pas une erreur HTTP
   ni un plantage, et surtout pas un prix.

3. **Le séjour de quelqu'un d'autre.** `get_stay` avec une référence inconnue
   ou devinée. Attendu : un refus qui ne divulgue rien — ni nom, ni dates, ni
   note. Et le code de porte (`get_check_in`) n'est jamais rendu sans la bonne
   référence.

## Notes de version

> Première version. Connecteur de l'Hôtel-Rooftop Les Voiles (Toulon, France),
> 16 chambres, indépendant. Lecture des disponibilités et des prix réels dans
> le logiciel de l'hôtel, description de l'établissement, dates de repli,
> réponses aux questions pratiques, et réservation de table au rooftop. La
> réservation de chambre se conclut sur le site de l'hôtel, qui encaisse
> lui-même : aucun paiement n'a lieu dans la conversation.

---

# Le paquet, construit (07/10/2026)

`docs/annuaire/paquet/` et son archive `docs/annuaire/les-voiles-toulon.zip`
(3,2 Ko) : c'est ce qui se téléverse sur https://platform.openai.com/plugins.

```
plugin.json          le manifeste et la fiche d'annuaire
mcp.json             le serveur déclaré en "streamable-http"
assets/logo-64.png   l'icône, 1 534 octets
```

🔧 **Correction de ce que j'avais écrit le 06/10** : `shortDescription` est
limitée à **30 caractères**, pas à une phrase. La mienne en faisait 120 — elle
aurait fait échouer la validation automatique. Les quatre longueurs sont
maintenant vérifiées : `name` 17/64, `displayName` 17/30, `shortDescription`
25/30, `longDescription` 1 029/4 000.

⚠️ `category` est posée à `travel` : la liste des catégories admises n'est pas
publiée, elle apparaîtra dans le tableau de bord. À corriger là si elle est
refusée.

## La vérification du domaine

OpenAI délivre un jeton au moment où l'on déclare le serveur, et veut le lire
en **texte brut** (pas en JSON) sur
`https://hotels-toulon-mer.com/.well-known/openai-apps-challenge`.

La route existe et est en ligne. Elle lit la variable `OPENAI_APPS_CHALLENGE` :

1. tu colles le jeton dans les variables du site `sitehtbm` sur Netlify ;
2. ⚠️ **un redéploiement est nécessaire** pour qu'une variable neuve soit vue ;
3. tu reviens cliquer « vérifier » chez OpenAI.

Tant que la variable est vide, l'adresse rend **404** — et c'est voulu : une
chaîne vide en 200 ferait croire à une vérification qui ne peut pas aboutir.

## Ce qui reste, et pour qui

| | |
|---|---|
| Vérification d'identité de l'organisation OpenAI | **toi** — rien ne commence avant |
| Le jeton de domaine, puis la variable Netlify | toi le jeton, moi la pose |
| Vidéo de démonstration | **toi** |
| Captures d'écran | **toi**, pendant l'essai en mode développeur |
| Paquet, manifeste, cas de test, notes de version | ✅ fait |
