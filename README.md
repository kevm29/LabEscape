# Lab Escape

Escape game 3D dans un laboratoire de biologie, jouable dans le navigateur (Three.js, aucune installation).

## Jouer

Le jeu est une page web statique. Il faut juste la servir en HTTP (les modules JavaScript ne se chargent pas en `file://`) :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Ou activer **GitHub Pages** sur la branche `main` (Settings → Pages → Deploy from a branch → `main` / root) : le jeu sera en ligne sur `https://kevm29.github.io/LabEscape/`.

### Commandes

| Action | Touches |
| --- | --- |
| Se déplacer | `Z Q S D` (AZERTY), `W A S D` (QWERTY) ou flèches |
| Regarder | Souris |
| Zoomer | Molette |
| Interagir / fouiller / prendre | Clic gauche ou `E` |
| S'accroupir | Maintenir `Ctrl` |
| Regarder un objet de l'inventaire | Maintenir `1` à `0` (l'objet passe en main) |
| Utiliser l'objet en main | Clic gauche sur la cible |
| Poser l'objet en main | Clic gauche sur le sol, un meuble, un tiroir ouvert |
| Ranger l'objet en main | Clic droit |
| Pause | `Échap` |

## Contenu

Le scénario complet est décrit dans [`SCENARIO.md`](SCENARIO.md), les retours à intégrer dans [`BACKLOG.md`](BACKLOG.md). Les codes sont dans `src/config.js`.

## Statistiques des parties

M. Sé demande le nom du joueur à l'entrée. Le jeu chronomètre chaque étape (EPI, carnet lu, gel rendu, séquençage, sortie) et compte quelques erreurs, puis envoie une ligne par partie (terminée ou abandonnée) dans une feuille Google Sheets. Mise en place : [`tools/README-statistiques.md`](tools/README-statistiques.md). Fonctionne depuis GitHub Pages uniquement.

## Organisation du code

```
index.html          interface (HUD, fenêtres, écran titre) + styles
src/main.js         rendu, lumières, boucle, capture de la souris
src/room.js         construction de la salle (murs, vestiaire, hottes, paillasses)
src/props.js        mobilier des énigmes (bureau, PC, imprimante, transilluminateur,
                    frigo, -80 °C, évier, interrupteur, poubelle à gants)
src/machines.js     séquenceur, robot de pipetage, incubateur, armoire de sécurité
src/lighting.js     éclairage et mode pénombre
src/items.js        objets d'inventaire (icônes, vues rapprochées)
src/items3d.js      modèles 3D des objets posés
src/player.js       déplacements, collisions, corps visible, mains animées
src/game.js         état de partie, interactions, inventaire, énigmes
src/ui.js           toasts, dialogues, digicode, cadenas, PC, microscope, inventaire
src/textures.js     textures dessinées par canvas (aucune image externe)
src/audio.js        bruitages synthétisés (Web Audio)
src/config.js       codes des énigmes, réglages, adresse des statistiques
src/stats.js        chronométrage et envoi des résultats
tools/              script Google Sheets pour recevoir les statistiques
lib/three/          Three.js r160 (licence MIT), embarqué pour fonctionner hors ligne
```

### Ajouter un objet interactif

Dans `src/room.js`, construire l'objet et l'exposer dans `refs`. Puis dans `Game.registerAll()` (`src/game.js`) :

```js
this.register(refs.monObjet, {
  name: 'le tiroir',                       // utilisé dans « Utiliser X sur … »
  label: () => 'Ouvrir le tiroir',          // texte sous le viseur
  action: () => this.ui.toast('Il est vide.'),
  use: (item) => item.id === 'cle' ? (this.ouvrir(), true) : false, // objet en main ; false = « Mais que ferais-je avec ça ? »
});
```

Pour tester sur une machine lente, ajouter `?test` à l'adresse (pas de temps fixe, `?test=0.2` pour accélérer). En console, `window.lab` donne accès à la scène, au joueur et à l'état de la partie pour déboguer.
