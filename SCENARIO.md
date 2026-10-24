# Scénario — Lab Escape

Trame définie par Kevin (24/10/2026). **Partie complète jouable**, de l'entrée à la sortie. Codes et réglages dans `src/config.js`.

## Histoire
Tom, le doctorant, est tombé malade avant d'avoir fini ses manips. Le joueur est le stagiaire du moment : le Dr. Leroy (responsable sécurité, par l'interphone) lui a ouvert le labo pour finaliser les analyses de Tom avant le week-end. D'après Tom, « tout est accessible, d'une façon ou d'une autre ».

## Chaîne d'énigmes
1. **S'équiper** : blouse, lunettes, gants (gants en dernier). La blouse du **Dr. P. Hemick** a une **clé dorée** dans la poche (visible en baissant la tête).
2. **Tiroir « Paul »** (clé dorée) → **carnet de Paul** avec un post-it : mot de passe du PC **LB_026**.
3. **PC portable** : allumage → session verrouillée → **LB_026** → compte rendu bloqué sur « résultat manquant » (pop-up si on veut fermer).
4. **Gel** : éteindre la lumière (interrupteur près de l'entrée) + allumer les UV du transilluminateur. Les bandes sont **invisibles sans UV**. Lecture du bas (+) vers le haut (−) : **TTGACG**. Mauvais code → « Vous êtes sûr ? Où avez-vous trouvé ce code ? ».
5. **Compte rendu imprimé** au bureau : signé T. ATTOT, **Poste 51.23**.
6. **Tiroir « Tom »** : cadenas à molettes **5123** → **note de Tom** avec une lame scotchée. On regarde la note (touche maintenue) et un **clic décroche la lame**.
7. **Microscope** : cellule de Malassez, coloration de viabilité. Cellules rosées (vivantes) par quart, de gauche à droite et de haut en bas : **7 7 6 4**.
8. **Frigo +4 °C** (clavier) **7764** → réactifs, dont l'**ARN -80 °C** et le **kit d'extraction d'ADN**.
9. **Congélateur -80 °C** : on y range l'ARN (tube visible dans son portoir) → nuage de froid → un **bloc de glace** glisse, tombe et rebondit.
10. **Évier** : faire fondre la glace sous le robinet → **petite clé argentée**.
11. **Placard de la paillasse centrale** (côté sud, 3ᵉ porte depuis l'ouest) → **protocole** de séquençage de Tom.
12. **Incubateur CO₂** (petite clé) → **flasque T-07** (les flasques T-05 et T-06 sont des leurres).
13. **Hotte (PSM)** : flasque + kit → extraction (ellipse « 30 minutes plus tard ») → **tube d'ADN**.
14. **Clé de secours** scotchée au fond, **sous la paillasse de la hotte**, près de la DASRI : visible seulement **accroupi (Ctrl)**.
15. **Armoire de sécurité** (jaune, à gauche en arrivant) → **éthanol 80 %** (autres solvants = leurres).
16. **Robot de pipetage vitré** : ADN + éthanol → préparation des librairies (fragmentation, adaptateurs, purification sur billes magnétiques, lavages à l'éthanol) → **flowcell**.
17. **Séquenceur NX-7** : flowcell → ellipse « Trois heures plus tard… » (l'horloge avance) → statistiques + **Imprimer le compte rendu**.
18. **Rapport de run** imprimé au bureau : « Séquenceur NX-7 — **Labo 542A** ».
19. **Affiche** : « le code des digicodes de salle est le numéro de la pièce » → digicode de sortie (1 2 3 / 4 5 6 / 7 8 9 / A 0 B) : **542A**.
20. **Jeter ses gants** dans la poubelle à gants avant de toucher la poignée → sortie.

## Disposition
- Baie 1 (gauche) : **séquenceur**. Baie 2 : **robot vitré**. Baie 3 : **hotte**, avec la DASRI dessous.
- Ligne au sol en L : vestiaire et bureau hors zone de manip.
- Le numéro de salle n'apparaît que sur le rapport de run.

## Mécaniques
- Inventaire 10 cases, touches **1 à 0** maintenues pour regarder un objet (il passe en main).
- Avec un objet en main : clic sur une cible = l'utiliser ; clic sur le sol / un meuble / un tiroir ouvert = **le poser** (on le reprend d'un clic) ; clic sur une cible inadaptée = message en boucle (« Mais que ferais-je avec ça ? »…). Clic droit = ranger.
- **Ctrl** maintenu = s'accroupir.
- Tous les tiroirs et placards se ferment et se rouvrent.

## Pistes ouvertes
- Rien de bloquant. Idées : indices gradués du Dr. Leroy si on bloque longtemps, sauvegarde de la progression.
