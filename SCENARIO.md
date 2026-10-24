# Scénario — Lab Escape

Trame définie par Kevin (24/10/2026). **Énigmes 1 à 5 implémentées** (version de test). Codes dans `src/config.js`.

## Énigme 1 — S'équiper
- Mettre les 3 EPI : blouse, lunettes, gants.
- Si on met la blouse du **Dr. P. Hemick**, on trouve dans sa poche la **clé de son tiroir** (bureau, tiroir annoté « Paul »).

## Énigme 2 — Le PC et le gel sous UV
- Appuyer sur le bouton d'allumage du PC portable (sur le bureau).
- Le PC s'allume, bloqué sur un **résultat d'analyse manquant** : « le résultat du gel d'électrophorèse est … », sans réponse.
- Tenter de fermer la fenêtre → pop-up « Résultat manquant, merci de renseigner … ».
- Solution : **éteindre la lumière** (interrupteur), aller au **transilluminateur**, **allumer les UV**, lire le résultat **à travers la vitre** : migration dans le sens **TTGACG**.
- Saisir TTGACG sur le PC :
  - **bon code** → on peut enregistrer le compte rendu et l'**imprimer** ;
  - **mauvais code** → le Dr. Leroy demande si on est sûr et où on a trouvé ce code.
- Le compte rendu s'imprime (imprimante à côté). En-tête : Laboratoire …, date et lieu, le compte rendu, signé **T. ATTOT**, tom.attot@….fr, **Poste 51.23**.

## Énigme 3 — Le tiroir de Tom et le microscope
- Le tiroir annoté « Tom » est fermé par un **cadenas à 4 chiffres** : combinaison **5123** (le numéro de poste).
- Dedans : un papier avec une **lame de microscope scotchée**, annoté « Coïncidence ! Pile le code du congélateur 1 ! ».
- On décroche la lame et on la met sous le **microscope**.
- Au microscope : des cellules **rosées** et **mauve foncé** sur une **cellule de Malassez**.
- Le nombre de cellules rosées par quart de comptage, lu de gauche à droite et de haut en bas, donne le code : **7 7 6 4**.

### Mécanique d'inventaire nécessaire
- Maintenir la touche **1** affiche l'objet 1 en gros plan (on peut le regarder), **2** pour l'objet 2, etc.
- Le **dernier objet regardé** est l'objet **sélectionné** pour l'action suivante (ex. poser la lame sous le microscope).

## Énigme 4 — Le frigo et le -80 °C
- Le frigo 1 s'ouvre avec le code **7764** sur son clavier.
- Dedans il fait froid (effet de froid), beaucoup de réactifs. L'un est marqué **-80 °C**.
- On peut prendre plusieurs réactifs, dont celui-ci.
- Il faut le ranger dans le **congélateur -80 °C**. En le mettant, un **bloc de glace** tombe ; on peut le ramasser.

## Énigme 5 — Le bloc de glace
- Faire **fondre la glace sous l'eau du robinet** (évier) → on y trouve une **clé**.

## Décisions (24/10/2026)
- Le code 7764 ouvre le **frigo +4 °C** (le papier de Tom dit « Pile le code du frigo ! »). Seul le dernier réactif va au **-80 °C**.
- Gel : 4 pistes étiquetées **A C G T**, puits (−) en haut, (+) en bas, « migration ↓ ». Lecture du bas vers le haut. Les bandes ne sont bien visibles qu'UV allumés **et** lumière éteinte.
- Cellules : **coloration de viabilité**. Rosées = vivantes (comptées), mauve foncé = mortes. Comptage 7 / 7 / 6 / 4 (+ 3 / 4 / 2 / 5 mortes) → 63 % de viabilité, expliqué par le Dr. Leroy.
- Pas d'aimants.
- Tous les codes se tournent / se cliquent à la souris, sauf TTGACG qui se tape sur le PC.
- Ligne au sol en L : le bureau et le vestiaire sont hors zone ; l'évier, le frigo, la poubelle à gants et la sortie sont en zone de manip.
- Objet utilisé au mauvais endroit : 4 messages qui tournent en boucle (« Mais que ferais-je avec ça ? »…).

## Ajouts faits pour relier les énigmes (à valider)
- **Tiroir de Paul** : contient son carnet de labo, qui rappelle que Tom doit finir le compte rendu et que le gel est resté sur le transilluminateur.
- **Brouillon de la corbeille** : note de Tom sur le sens de lecture du gel (indice facultatif).
- **Tiroir du bas** (sans étiquette) : s'ouvre, ne contient rien d'utile.
- **Poubelle à gants** (mur est) : on y retire et jette ses gants ; la porte de sortie refuse qu'on la touche avec des gants.
- Fin de la version de test : un message s'affiche quand on obtient la petite clé.

## Points encore ouverts
- **Clé de l'énigme 5** : qu'ouvre-t-elle ?
- Énigme finale et **code de la porte de sortie**.

## Éléments construits pour ce scénario
Bureau (PC portable, tiroirs Paul / Tom / libre, poubelle à papier), imprimante, interrupteur + pénombre, transilluminateur UV avec vitre, gel, microscope utilisable, cadenas 4 chiffres, clavier du frigo, frigo ouvrable, congélateur -80 °C ouvrable, évier avec eau, inventaire à touches 1–6 avec vue rapprochée.
Voir aussi `BACKLOG.md`.
