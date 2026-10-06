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
