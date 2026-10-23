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
| Pause | `Échap` |

## Ce qui existe (salle 1 — le sas d'équipement)

- Entrée dans le labo, consigne du Dr. Leroy (responsable sécurité) par l'interphone.
- **Vestiaire** (mur de gauche) : 3 blouses sur un porte-manteau mural, une boîte de lunettes de protection, un distributeur de gants nitrile en carton, panneau « Port obligatoire ».
- **Blouse** : elle vient vers soi, on l'enfile (on voit ses manches blanches). Baisser la tête montre ses jambes et la blouse portée. Une des trois blouses (tirée au hasard à chaque partie) cache un **aimant** dans sa poche : on le voit dépasser et on peut le prendre. On peut changer de blouse.
- **Lunettes** : on les voit s'approcher du visage, puis la vue passe « à travers » la monture.
- **Gants** : il faut avoir mis la blouse avant ; on voit ses mains et chaque gant bleu s'enfiler par-dessus le poignet.
- **Ligne jaune et noire au sol** : impossible d'entrer en zone de manip sans les 3 EPI.
- **Paillasses vitrées** (hottes avec vitre guillotine) au fond. Sous celle du milieu, une **poubelle DASRI jaune** : tenter de la fouiller déclenche une engueulade (avertissements cumulés).
- Décor : paillasse centrale avec étagère à réactifs, incubateur, centrifugeuse, congélateur -80 °C, armoire de sécurité, évier, frigo, affiche des règles, horloge à l'heure réelle.
- **Porte de sortie avec digicode** fonctionnel (code dans `src/config.js`, l'énigme qui y mène reste à écrire).

## Organisation du code

```
index.html          interface (HUD, fenêtres, écran titre) + styles
src/main.js         rendu, lumières, boucle, capture de la souris
src/room.js         construction de la salle et de tous les objets
src/player.js       déplacements, collisions, corps visible, mains animées
src/game.js         état de partie, interactions, animations d'équipement
src/ui.js           toasts, dialogues, digicode, inventaire, objectifs
src/textures.js     textures dessinées par canvas (aucune image externe)
src/audio.js        bruitages synthétisés (Web Audio)
src/config.js       code de sortie, nombre d'aimants, réglages
lib/three/          Three.js r160 (licence MIT), embarqué pour fonctionner hors ligne
```

### Ajouter un objet interactif

Dans `src/room.js`, construire l'objet et l'exposer dans `refs`. Puis dans `Game.registerAll()` (`src/game.js`) :

```js
this.register(refs.monObjet, {
  label: () => 'Ouvrir le tiroir',          // texte sous le viseur
  action: () => this.ui.toast('Il est vide.'),
});
```

En console, `window.lab` donne accès à la scène, au joueur et à l'état de la partie pour déboguer.
