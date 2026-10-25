/**
 * Lab Escape — réception des résultats dans une feuille Google Sheets.
 *
 * À coller dans : Google Sheets > Extensions > Apps Script (remplacer tout le contenu),
 * puis Déployer > Nouveau déploiement > Application Web
 *   (Exécuter en tant que : Moi ; Qui a accès : Tout le monde).
 * Mode d'emploi détaillé : tools/README-statistiques.md
 */

const SHEET_NAME = 'Parties';

const COLUMNS = [
  'Date', 'Nom', 'Statut', 'Dernière étape atteinte', 'Temps total',
  'EPI mis', 'Carnet lu', 'Gel rendu (T-08)', 'Séquençage fini (T-07)', 'Sortie',
  'Avertissements DASRI', 'Tasse confisquée', 'Codes faux', 'Objets mal utilisés', 'Version',
];

// Colonnes contenant des durées (affichées en h:mm:ss, utilisables dans MOYENNE, MIN…)
const TIME_COLUMNS = [5, 6, 7, 8, 9, 10];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    const asDuration = (s) => (typeof s === 'number' ? s / 86400 : '');
    sheet.appendRow([
      new Date(),
      safeText_(d.name),
      safeText_(d.status),
      safeText_(d.lastStep),
      asDuration(d.total),
      asDuration(d.epi),
      asDuration(d.carnet),
      asDuration(d.gel),
      asDuration(d.seq),
      asDuration(d.exit),
      Number(d.dasri) || 0,
      d.mug ? 'oui' : 'non',
      Number(d.wrongCodes) || 0,
      Number(d.useless) || 0,
      safeText_(d.version),
    ]);
    const row = sheet.getLastRow();
    TIME_COLUMNS.forEach((c) => sheet.getRange(row, c).setNumberFormat('[h]:mm:ss'));
    sheet.getRange(row, 1).setNumberFormat('dd/MM/yyyy HH:mm');
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('erreur : ' + err);
  } finally {
    lock.releaseLock();
  }
}

// Ouvrir l'adresse /exec dans un navigateur affiche ce message : pratique pour vérifier le déploiement.
function doGet() {
  return ContentService.createTextOutput('Lab Escape : le script de statistiques est en ligne.');
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#f2c200');
  }
  return sheet;
}

// Empêche qu'un nom commençant par =, +, - ou @ soit interprété comme une formule
function safeText_(v) {
  const s = String(v == null ? '' : v).slice(0, 80);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
