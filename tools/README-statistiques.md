# Statistiques des parties dans Google Sheets

À la fin de chaque partie (et quand un joueur ferme l'onglet en cours de route), le jeu ajoute une ligne dans une feuille Google Sheets : nom, date, statut (terminée / abandon), temps total, temps de chaque étape, avertissements DASRI, tasse confisquée, codes faux, objets mal utilisés.

Les envois ne fonctionnent que depuis la **version GitHub Pages** du jeu (la version publiée dans Claude bloque les envois vers d'autres sites).

## Mise en place (une seule fois, ~5 minutes)

1. Créer une feuille Google Sheets vide (par exemple « Lab Escape — Résultats »).
2. Menu **Extensions → Apps Script**.
3. Effacer le contenu de l'éditeur, coller tout le fichier [`google-sheet-stats.gs`](google-sheet-stats.gs), puis cliquer sur l'icône **Enregistrer**.
4. En haut à droite : **Déployer → Nouveau déploiement**.
   - Roue dentée « Sélectionner le type » → **Application Web**.
   - Description : `Lab Escape`.
   - Exécuter en tant que : **Moi**.
   - Qui a accès : **Tout le monde**.
   - **Déployer**, puis **Autoriser l'accès** et choisir son compte Google. Si Google affiche « Cette application n'a pas été validée » : **Paramètres avancés → Accéder à … (non sécurisé)** — c'est votre propre script.
5. Copier l'**URL de l'application Web** (elle se termine par `/exec`).
6. Vérification : ouvrir cette URL dans un navigateur, elle doit afficher « Lab Escape : le script de statistiques est en ligne. ».
7. Mettre cette URL dans `src/config.js`, ligne `statsUrl: '...'` (ou la donner à Claude, qui le fera).

La feuille « Parties » et ses en-têtes se créent toutes seules au premier envoi.

## Bon à savoir

- Les temps sont des durées : `=MOYENNE(E2:E)`, `=MIN(E2:E)` ou un graphique fonctionnent directement.
- Si vous modifiez le script plus tard : **Déployer → Gérer les déploiements → crayon → Version : Nouvelle version**, pour garder la même URL.
- L'URL est visible dans le code du jeu : quelqu'un de mal intentionné pourrait y envoyer de fausses lignes. Sans gravité pour des statistiques de jeu ; il suffit de les supprimer.
- Données personnelles : un prénom ou un pseudo suffit pour les statistiques.
