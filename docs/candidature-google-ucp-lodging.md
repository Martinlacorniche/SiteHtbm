# Liste d'attente Google — UCP for Lodging

**Formulaire** : https://services.google.com/fb/forms/ucp_for_lodging_interest_form/
(bouton « Join the waitlist » sur https://developers.google.com/hotels/ucp)

⚠️ **À remplir par Martin** : le formulaire demande une identité d'entreprise.
Ce fichier n'est que ce qu'il y a à y mettre — rien ici n'est envoyé tout seul.

## Pourquoi cette candidature n'est pas comme les autres

Le conseil qui a façonné le brouillon compte sept membres : Amadeus,
Booking.com, Expedia, Google, Hilton, Marriott, Trip.com. Les partenaires de
lancement d'AI Mode sont des OTA et des chaînes. **Aucun indépendant.**

Or Google écrit que l'hôtel reste marchand de référence et garde la relation
client — c'est exactement l'architecture déjà en service ici. Un indépendant qui
a DÉJÀ un profil UCP public et un serveur MCP qui vend est précisément le cas
que leur protocole prétend servir, et personne ne le leur a montré.

⚠️ Et l'enjeu est direct : sans chemin d'intégration, un indépendant n'atteint
les agents que par le tuyau d'une OTA, à ses conditions de commission. C'est la
mécanique que ce travail existe pour éviter.

## Ce qu'on peut dire, et qui est vérifiable

- **Profil UCP public** : https://hotels-toulon-mer.com/.well-known/ucp
  Déclare `dev.ucp.lodging` (version 2026-09-25), transport MCP, avec le schéma
  OpenRPC de référence.
- **Serveur MCP en service** : https://hotels-toulon-mer.com/mcp
  12 outils, annotations `readOnlyHint` / `destructiveHint` / `openWorldHint`
  explicites. Recherche de chambre avec prix réels, dates de repli,
  description de l'établissement, réservation de table au rooftop, relecture
  d'un séjour, codes d'arrivée, note.
- **Deux portes, une seule logique** : `/mcp` sans les outils qui débitent
  (pour les annuaires qui interdisent d'encaisser), `/ucp/mcp` complète.
- **Paiement** : Stripe, sur le compte de l'hôtel. L'hôtel est marchand de
  référence, conformément à UCP.
- **Inventaire réel** : les prix et disponibilités viennent du PMS, pas d'un
  cache. Ce que l'agent voit est ce que la facture portera.
- **Journal d'audience** depuis le 06/10/2026 : on mesure les appels d'agents,
  donc on peut rendre compte de l'usage.

## L'établissement

Hôtel-Rooftop Les Voiles — 124 rue Gubler, 83000 Toulon, France.
Boutique-hôtel 3★, 16 chambres. Groupe de deux hôtels indépendants
(avec le Best Western Plus La Corniche). Vente directe, sans intermédiaire.

Éditeur du logiciel : NWH.os / lessclic (PMS maison). ⚠️ C'est un argument à
donner : la candidature n'est pas celle d'un hôtel isolé mais d'un **éditeur**
qui pourra brancher ses clients — c'est le profil qu'ils cherchent.

## Ce qu'on demande

L'accès aux spécifications d'intégration et au programme, pour qu'un hôtel
indépendant puisse être réservable dans AI Mode **en direct**, sans passer par
une OTA.
