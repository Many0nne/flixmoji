# Flixmoji — Spec v0.2

> Statut : Draft finalisé post-interview · 2026-03-14

---

## 1. Pitch

Flixmoji est une application web de jeu multijoueur. Un joueur (le **décriveur**) reçoit le titre d'un film et doit le faire deviner aux autres joueurs en utilisant uniquement une série d'émoticônes. Les autres joueurs (les **guetteurs**) tentent de deviner le film.

---

## 2. Cible & contexte

- **Audience** : tout public, jeu entre amis / en soirée.
- **Distribution** : application web publique accessible sur Internet.
- **Modèle économique** : gratuit, projet personnel/portfolio. Pas de monétisation prévue.
- **Langues** : français et anglais dès le MVP (UI + base de films).
- **Timeline MVP** : < 2 mois.

---

## 3. Mécanique de jeu

### 3.1 Rôles

| Rôle | Description |
|---|---|
| **Hôte** | Crée le salon, configure la partie, démarre les manches. Peut être décriveur selon le mode. |
| **Décriveur** | Reçoit le titre du film et soumet une séquence d'emojis. |
| **Guetteur** | Tente de deviner le film via l'autocomplete TMDB. |

### 3.2 Modes de désignation du décriveur

Deux modes configurables par l'hôte avant la partie :

1. **Mode Hôte décideur** — L'hôte est le décriveur à chaque manche.
2. **Mode Rotation aléatoire** — À chaque manche, un joueur est tiré au sort comme décriveur.

### 3.3 Déroulement d'une manche

1. Le décriveur choisit le film (catégorie thématique ou choix libre depuis TMDB).
2. Le film est envoyé **uniquement** au décriveur via WebSocket — les guetteurs ne reçoivent aucune information.
3. Le décriveur compose une séquence d'emojis via un emoji picker et valide **en une seule fois**.
4. La séquence d'emojis est révélée simultanément à tous les guetteurs. Le timer démarre.
5. Les guetteurs filtrent via un champ autocomplete connecté à TMDB et **sélectionnent** un film dans les suggestions. La soumission en texte libre n'est pas possible — on soumet uniquement un item sélectionné.
6. Le timer s'écoule. À la fin, un **overlay de révélation** s'affiche sur l'écran de jeu avec le film, les scores de la manche, et un bouton pour passer à la manche suivante (hôte uniquement).
7. La partie enchaîne les manches jusqu'à épuisement du nombre configuré.

### 3.4 Scoring

- La comparaison de la bonne réponse se fait par **ID TMDB** (langue-agnostique). Le titre affiché est stocké à des fins d'affichage uniquement.
- La manche **ne s'arrête pas** à la première bonne réponse — le timer continue jusqu'au bout.
- Les guetteurs peuvent soumettre **plusieurs fois**, mais chaque mauvais essai entraîne une **pénalité de points**.
- Les points pour une bonne réponse sont **décroissants selon la rapidité** (bonus speed).
- Le **décriveur gagne des points** si au moins un guetteur trouve la réponse.

### 3.5 Vue du décriveur pendant la manche

Pendant que les guetteurs devinent, le décriveur voit :
- Sa séquence d'emojis soumise.
- Le timer en cours.
- Un compteur **"X joueur(s) ont trouvé"** mis à jour en temps réel (sans révéler qui ni leur réponse).

### 3.6 Sélection du film

Deux modes, choisis par le décriveur à chaque manche :

1. **Catégories thématiques** — Le décriveur choisit une catégorie, le système tire un film au sort depuis TMDB.
   - Catégories disponibles au MVP :
     - **Genres** : Action, Comédie, Drame, Horreur, Science-Fiction, Thriller… (via `with_genres` TMDB)
     - **Décennies** : 80s, 90s, 2000s, 2010s, 2020s (via `primary_release_date` TMDB)
     - **Pays / cinéma national** : Français, Américain, etc. (via `with_origin_country` TMDB)
2. **Choix libre** — Le décriveur recherche et sélectionne lui-même un film dans la base TMDB.

### 3.7 Contraintes sur les emojis

- Nombre maximum d'emojis configurable par l'hôte. **Défaut : 5 emojis.**
- Pas de restriction sur la liste d'emojis (hors scope MVP).

### 3.8 Valeurs par défaut de la configuration

| Paramètre | Valeur par défaut |
|---|---|
| Durée du timer | 60 secondes |
| Nombre d'emojis max | 5 |
| Nombre de manches | 5 |
| Mode décriveur | Rotation aléatoire |

---

## 4. Flux d'écrans

```
Accueil
  ├─ Créer un salon → Lobby (hôte)
  └─ Rejoindre (code / lien / partie publique) → Lobby (joueur)

Lobby
  └─ Hôte lance la config → Configuration

Configuration (hôte uniquement)
  └─ Valider → Écran de jeu

Écran de jeu  [boucle pour N manches]
  ├─ Phase décriveur : sélection film + composition emojis
  ├─ Phase guetteurs : timer + autocomplete + soumissions
  └─ Overlay révélation : film + scores de la manche → manche suivante ou fin

Classement final
  ├─ Classement + scores totaux
  ├─ Replay des emojis par manche
  └─ Bouton "Rejouer" → retour Config (mêmes joueurs)
```

---

## 5. Sessions & lobby

### 5.1 Rejoindre une partie

- **Code de salon court** + **lien d'invitation URL** partageable (WhatsApp, Discord…).
- Option : rejoindre une **partie publique ouverte** sans invitation.

### 5.2 Rejoindre en cours de partie

- Un joueur qui arrive pendant une manche est placé en **file d'attente**.
- Il est intégré à la partie au début de la manche suivante.

---

## 6. Gestion des déconnexions

| Cas | Comportement |
|---|---|
| **Décriveur non-hôte se déconnecte** | Timer continue jusqu'au bout. Film révélé à la fin de la manche. Nouveau décriveur assigné aléatoirement pour la manche suivante. |
| **Décriveur-hôte se déconnecte** | Même comportement + rôle d'hôte transféré automatiquement à un autre joueur présent. |
| **Guetteur se déconnecte** | Manche continue normalement. |

> **Risque** : si plusieurs joueurs se déconnectent simultanément, la logique de transfert d'hôte doit être déterministe (ex : premier joueur dans la liste de connexion). À implémenter soigneusement.

---

## 7. Authentification & identité

- **Pas de compte utilisateur** pour le MVP.
- Chaque joueur entre un **pseudo** à l'entrée du salon.
- Pas de persistance d'identité entre les sessions.

---

## 8. Architecture technique

### 8.1 Stack

| Couche | Choix | Hébergement |
|---|---|---|
| **Frontend** | Next.js (React) | Vercel |
| **Serveur temps réel** | Node.js + socket.io | Railway ou Render |
| **Base de données** | Supabase (PostgreSQL) | Supabase Cloud |
| **Données films** | API TMDB | — |

### 8.2 Architecture des données — modèle hybride

L'état de jeu temps réel vit **en mémoire du serveur Node** (Map d'objets) :

```
Room {
  id, code, hostSocketId, config, status,
  players: Player[],
  currentRound: Round | null,
  roundHistory: RoundSummary[]
}

Player {
  socketId, pseudo, score, isHost, isDescriber
}

Round {
  movieId (TMDB), movieTitle, movieTitleDisplay,
  emojiSequence: string[],
  guesses: Guess[],
  timerStartedAt, timerDuration,
  status: 'composing' | 'guessing' | 'revealed'
}

Guess {
  playerSocketId, movieId (TMDB), submittedAt,
  isCorrect, pointsAwarded, attemptNumber
}
```

**Persistence DB (Supabase)** : uniquement les scores finaux par partie — pas de reconstitution d'état depuis la DB. Un redémarrage du serveur Node = les parties en cours sont perdues (tradeoff accepté pour le MVP).

### 8.3 Sécurité du film secret

Le serveur Node n'envoie l'ID et le titre du film **qu'au socket du décriveur**. Aucun autre événement WS ne diffuse cette information. Les guetteurs reçoivent uniquement la séquence d'emojis au moment de la révélation.

### 8.4 Validation des réponses

- Comparaison par **ID TMDB** uniquement (insensible à la langue, aux accents, aux articles).
- Le titre affiché (pour la révélation et l'historique) est stocké avec l'ID au moment de la sélection du film.

### 8.5 Multi-langue

- L'autocomplete TMDB est appelé avec la langue de l'interface du joueur (FR ou EN).
- La bonne réponse étant validée par ID TMDB, un joueur qui tape le titre dans l'autre langue et tombe sur le bon film (même ID) verra sa réponse acceptée.

### 8.6 Intégration TMDB

- **Autocomplete** : `GET /search/movie` avec le paramètre `language` selon la langue de l'UI.
- **Catégories** : `GET /discover/movie` avec `with_genres`, `primary_release_date.gte/lte`, `with_origin_country`.
- Attribution TMDB affichée conformément à leurs conditions d'utilisation (logo + mention).

---

## 9. Scalabilité & déploiement

- **Taille de salon cible** : 2–8 joueurs.
- Pas de stratégie de scaling horizontal pour le MVP (une seule instance du serveur Node).
- Limitation : socket.io en mémoire ne scale pas en multi-instances sans adapter (Redis adapter). À traiter post-MVP si nécessaire.

---

## 10. Accessibilité & UX

- UI responsive (desktop + mobile web).
- Jeu visuel par nature — pas de support lecteur d'écran sur les emojis au MVP.
- Pas d'application mobile native pour le MVP.

---

## 11. Hors scope MVP

| Feature | Raison |
|---|---|
| Comptes utilisateurs / profils persistants | Complexité d'auth disproportionnée |
| Chat texte en jeu | Pas nécessaire pour la mécanique de base |
| Application mobile native (iOS/Android) | Web suffit |
| Modération / signalement d'emojis | Risque faible en contexte ami |
| Mode spectateur | Post-MVP |
| Restriction de la liste d'emojis | Post-MVP |
| Partage réseaux sociaux des résultats | Post-MVP |
| Scaling multi-instances Node (Redis adapter) | Post-MVP |

---

## 12. Risques & mitigations

| Risque | Mitigation |
|---|---|
| **Redémarrage serveur Node = parties perdues** | Tradeoff accepté (MVP, projet perso). Prévoir un redémarrage gracieux (signal SIGTERM) en dehors des heures de jeu si possible. |
| **Timer côté serveur vs drift client** | Timer autoritaire côté serveur. Les clients affichent le temps restant calculé depuis `timerStartedAt` reçu via WS, synchronisé avec un event `tick` ou recalculé localement depuis le timestamp. |
| **Transfert d'hôte concurrent** | Ordre déterministe : premier joueur dans l'ordre d'arrivée dans le salon. Vérifier l'atomicité dans la Map en mémoire. |
| **TMDB autocomplete lent ou indisponible** | Afficher un spinner avec message d'erreur gracieux. Pas de fallback offline (hors scope MVP). |
| **Titres courts ambigus dans TMDB** ("It", "Her", "Us") | L'autocomplete retourne une liste avec affiche + année — le joueur peut identifier le bon film visuellement. |
| **Dépendance TMDB** | API gratuite non-commercial. ToS vérifiées. Si commercialisation future : réévaluer ou basculer sur OMDb. |

---

## 13. Questions ouvertes (post-MVP)

- Mode spectateur : permettre à des joueurs d'observer sans participer ?
- Replay public : lien partageable vers l'historique d'une partie ?
- Salles publiques : liste des parties ouvertes consultable depuis l'accueil ?
- Deck personnalisé : l'hôte constitue une liste de films avant la partie ?
- "Like" sur les séquences d'emojis les plus créatives ?
- Scaling multi-instances avec Redis adapter si charge croissante ?

---

*Spec rédigée via interview structurée avec Claude Code — 2026-03-14*
