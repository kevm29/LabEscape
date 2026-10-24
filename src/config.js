// Réglages de partie. Tout ce qui est "contenu d'énigme" se règle ici.
export const CONFIG = {
  // Énigme 2 : résultat du gel (lu sous UV) à saisir sur le PC
  gelCode: 'TTGACG',
  // Énigme 3 : cadenas du tiroir de Tom = numéro de poste sur le compte rendu (51.23)
  tomPadlock: '5123',
  // Énigme 3 → 4 : comptage des cellules vivantes = code du frigo +4 °C
  fridgeCode: '7764',
  cellCounts: { live: [7, 7, 6, 4], dead: [3, 4, 2, 5] },
  // Mot de passe de la session du PC (carnet de Paul)
  pcPassword: 'LB_026',
  // Numéro de la salle = code de la porte de sortie (affiche : « code des portes = n° de la salle »)
  roomNumber: '542A',
  exitCode: '542A',
  // Durée simulée du run de séquençage (ellipse), en heures
  runHours: 3,
  // Taille max de l'inventaire (touches 1 à 0)
  inventorySize: 10,
  // Index de la blouse du Dr. P. Hemick (celle qui a la clé)
  keyCoat: 0,
  // Délai (s) avant l'indice "regardez vos poches" une fois équipé
  pocketHintDelay: 45,
  // Distance max d'interaction (m)
  reach: 2.3,
};
