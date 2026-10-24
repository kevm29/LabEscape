// Objets d'inventaire : nom, icône (SVG), vue rapprochée (HTML).
import { CONFIG } from './config.js';

const keySvg = (color, size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <circle cx="20" cy="32" r="12" fill="none" stroke="${color}" stroke-width="7"/>
  <rect x="30" y="28.5" width="28" height="7" rx="2" fill="${color}"/>
  <rect x="46" y="35" width="5" height="9" fill="${color}"/><rect x="53" y="35" width="5" height="6" fill="${color}"/>
</svg>`;

const tubeSvg = (liquid, cap, size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <rect x="24" y="6" width="16" height="9" rx="2" fill="${cap}"/>
  <path d="M25 15h14v34a7 7 0 0 1-14 0z" fill="#e8f3fa" stroke="#9fb8c8" stroke-width="1.5"/>
  <path d="M26 32h12v17a6 6 0 0 1-12 0z" fill="${liquid}"/>
  <rect x="25" y="20" width="14" height="9" fill="#fff" stroke="#9fb8c8" stroke-width="1"/>
</svg>`;

const microTubeSvg = (size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <rect x="23" y="6" width="18" height="8" rx="2" fill="#1e5bb8"/>
  <path d="M24 14h16v22l-8 20-8-20z" fill="#f2f6f9" stroke="#9fb8c8" stroke-width="1.5"/>
  <path d="M27 38h10l-5 13z" fill="#d8ecff"/>
</svg>`;

const paperSvg = (size = 30, stripe = '#8a8f96') => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <path d="M14 6h26l10 10v42H14z" fill="#f7f5ef" stroke="#b9b3a3" stroke-width="2"/>
  <path d="M20 24h24M20 31h24M20 38h18M20 45h22" stroke="${stripe}" stroke-width="2.5"/>
</svg>`;

const bookSvg = (color, size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <rect x="14" y="8" width="38" height="48" rx="3" fill="${color}"/>
  <rect x="14" y="8" width="7" height="48" fill="rgba(0,0,0,0.25)"/>
  <rect x="26" y="18" width="20" height="9" rx="1.5" fill="#fff" opacity=".9"/>
</svg>`;

const slideSvg = (size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <rect x="4" y="22" width="56" height="20" rx="2" fill="#dff2fb" stroke="#8fb6c8" stroke-width="2"/>
  <rect x="6" y="24" width="14" height="16" fill="#f4f4f4"/>
  <circle cx="40" cy="32" r="6" fill="#d9a3c6" opacity=".8"/>
</svg>`;

const iceSvg = (size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <path d="M10 20l22-10 22 10v26L32 56 10 46z" fill="#cfeeff" stroke="#8ccbe8" stroke-width="2"/>
  <path d="M10 20l22 10 22-10M32 30v26" stroke="#a9dcf3" stroke-width="2" fill="none"/>
  <g opacity=".55" transform="translate(16 28) scale(.5)"><circle cx="20" cy="32" r="10" fill="none" stroke="#7a8590" stroke-width="6"/><rect x="28" y="29" width="26" height="6" fill="#7a8590"/></g>
</svg>`;

const flaskSvg = (size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <path d="M6 22h36l10 6v8l-10 6H6z" fill="#eef5f9" stroke="#9fb8c8" stroke-width="1.5"/>
  <path d="M8 32h33v8H8z" fill="#f08aa8"/>
  <rect x="52" y="27" width="8" height="10" rx="2" fill="#c62828"/>
</svg>`;

const kitSvg = (size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <rect x="8" y="16" width="48" height="34" rx="3" fill="#f6f7f9" stroke="#9fb8c8" stroke-width="1.5"/>
  <rect x="8" y="16" width="48" height="8" fill="#1e5bb8"/>
  <text x="32" y="42" font-size="11" font-weight="700" text-anchor="middle" fill="#1e5bb8" font-family="sans-serif">ADN</text>
</svg>`;

const bottleSvg = (size = 30, color = '#c62828', text = 'EtOH') => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <rect x="25" y="4" width="14" height="8" rx="2" fill="${color}"/>
  <path d="M26 12h12v6l6 6v32a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V24l6-6z" fill="#eef5fb" stroke="#9fb8c8" stroke-width="1.5"/>
  <rect x="20" y="30" width="24" height="16" fill="#fff" stroke="${color}" stroke-width="1"/>
  <text x="32" y="41" font-size="8" font-weight="700" text-anchor="middle" fill="${color}" font-family="sans-serif">${text}</text>
</svg>`;

const flowcellSvg = (size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <rect x="4" y="20" width="56" height="24" rx="3" fill="#2b3036"/>
  <rect x="14" y="26" width="40" height="12" fill="#bfe6ff"/>
  <path d="M16 29h36M16 32h36M16 35h36" stroke="#3fa9ff" stroke-width="1"/>
  <rect x="6" y="22" width="6" height="20" fill="#f2c200"/>
</svg>`;

const doc = (inner, cls = '') => `<div class="paper ${cls}">${inner}</div>`;

function today() {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const ITEMS = {
  clePaul: {
    name: 'Clé dorée',
    icon: keySvg('#c9a227'),
    model: 'keyGold',
    view: () => `<div class="obj">${keySvg('#c9a227', 160)}</div>
      <p>Une petite clé dorée, trouvée dans la poche de la blouse du <b>Dr. P. Hemick</b>.</p>`,
  },
  carnetPaul: {
    name: 'Carnet de Paul',
    icon: bookSvg('#8a2d2d'),
    model: 'notebook',
    doc: true,
    view: () => doc(`<div class="hand">Carnet de labo — P. Hemick</div>
      <div class="postit">PC labo<br>mdp : <b>LB_026</b></div>
      <p class="hand">23/10 — Tom malade, arrêté jusqu’à mercredi. Il reste à finir :</p>
      <p class="hand">• le <b>séquençage du patient T-07</b> (son protocole est rangé dans un placard de la paillasse centrale) ;</p>
      <p class="hand">• le <b>compte rendu du gel du patient T-08</b> : resté en plan sur le PC, le gel est encore sur le transilluminateur.</p>
      <p class="hand">Pas le temps de m’en occuper avant de partir…</p>`, 'notebook'),
  },
  compteRendu: {
    name: 'Compte rendu',
    icon: paperSvg(),
    model: 'paperA4',
    doc: true,
    view: () => doc(`<header><b>Laboratoire de Biologie Cellulaire et Moléculaire</b></header>
      <div class="meta">Le ${today()}</div>
      <h4>Compte rendu d’analyse</h4>
      <table>
        <tr><td>Patient</td><td>T-08</td></tr>
        <tr><td>Analyse</td><td>Électrophorèse (gel 4 pistes A/C/G/T)</td></tr>
        <tr><td>Résultat du gel</td><td><b>${CONFIG.gelCode}</b></td></tr>
      </table>
      <footer>T. ATTOT — Doctorant<br>tom.attot@labo-bcm.fr<br>Poste <b>51.23</b></footer>`, 'report'),
  },
  noteTom: {
    name: 'Note de Tom',
    icon: paperSvg(30, '#1e3a8a'),
    model: 'note',
    doc: true,
    slide: true, // la lame est encore scotchée dessus
    view: (it) => doc(`<div class="slide-zone">${it.slide ? '<div class="taped-slide"></div>' : ''}<div class="tape l"></div><div class="tape r"></div></div>
      <p class="hand big">Coïncidence !<br>Pile le code du frigo !</p>
      <p class="hand small">Je la garde pour m’en souvenir.</p>`, 'note')
      + (it.slide ? '<p class="act"><kbd>Clic</kbd> Décrocher la lame scotchée</p>' : ''),
  },
  lame: {
    name: 'Lame',
    icon: slideSvg(),
    model: 'slide',
    view: () => `<div class="obj">${slideSvg(200)}</div>
      <p>Une lame de comptage quadrillée. Il faudrait la regarder au microscope.</p>`,
  },
  brouillon: {
    name: 'Brouillon',
    icon: paperSvg(),
    model: 'crumpled',
    doc: true,
    view: () => doc(`<p class="hand">Gel T-08 — à lire :</p>
      <p class="hand">puits (−) en haut → les fragments migrent vers le (+)</p>
      <p class="hand">les <b>petits</b> vont le plus loin ⇒ lire du <b>BAS</b> vers le <b>HAUT</b> !</p>
      <p class="hand"><s>lire de haut en bas</s> → NON</p>
      <p class="hand small">PS : sous UV, toujours les lunettes ! Et éteindre la lumière pour bien voir les bandes.</p>`, 'crumpled'),
  },
  protocole: {
    name: 'Protocole',
    icon: bookSvg('#1e5bb8'),
    model: 'binder',
    doc: true,
    view: () => doc(`<header><b>Protocole de séquençage</b><br><span class="small">T. Attot · v3</span></header>
      <ol class="steps">
        <li><b>Culture cellulaire</b> : les cellules sont en culture dans l’<b>incubateur CO₂</b> à 37 °C.</li>
        <li><b>Extraction d’ADN</b> : travailler sous la <b>hotte</b> avec le <b>kit d’extraction</b> (conservé à 4 °C) : lyse → fixation sur colonne → lavage → élution.</li>
        <li><b>Préparation des librairies</b> : automatique via le <b>PipetBot</b> : fragmentation de l’ADN → ajout des adaptateurs → purification → chargement sur flowcell. Ne pas oublier de mettre de l’<b>éthanol</b> (armoire de sécurité) dans le PipetBot pour laver les billes.</li>
        <li><b>Séquençage</b> : insérer la <b>flowcell</b> dans le séquenceur et lancer le run (≈ 3 h).</li>
      </ol>`, 'protocol'),
  },
  pbs: {
    name: 'PBS 1X', temp: '+4', icon: tubeSvg('#bfe3ff', '#1e5bb8'), model: 'tube', color: 0xbfe3ff,
    view: () => `<div class="obj">${tubeSvg('#bfe3ff', '#1e5bb8', 160)}</div><p>Tampon PBS 1X. Étiquette : <b>conserver à +4 °C</b>.</p>`,
  },
  milieu: {
    name: 'Milieu de culture', temp: '+4', icon: tubeSvg('#f3a6b8', '#c62828'), model: 'tube', color: 0xf3a6b8,
    view: () => `<div class="obj">${tubeSvg('#f3a6b8', '#c62828', 160)}</div><p>Milieu de culture DMEM (rose : indicateur de pH). <b>+4 °C</b>.</p>`,
  },
  anticorps: {
    name: 'Anticorps', temp: '+4', icon: tubeSvg('#efe9d8', '#7b3fb8'), model: 'tube', color: 0xefe9d8,
    view: () => `<div class="obj">${tubeSvg('#efe9d8', '#7b3fb8', 160)}</div><p>Anticorps anti-GFP. <b>+4 °C</b>, ne jamais congeler.</p>`,
  },
  arn: {
    name: 'ARN (-80 °C)', temp: '-80', icon: tubeSvg('#f8f8f8', '#f2c200'), model: 'tube', color: 0xf8f8f8,
    view: () => `<div class="obj">${tubeSvg('#f8f8f8', '#f2c200', 160)}</div>
      <p>ARN extrait — T-03. Étiquette en rouge : <b style="color:#ef4444">À CONSERVER À -80 °C</b>.</p>`,
  },
  kit: {
    name: 'Kit extraction ADN', temp: '+4', icon: kitSvg(), model: 'kit',
    view: () => `<div class="obj">${kitSvg(170)}</div><p>Kit d’extraction d’ADN sur colonne : tampon de lyse, colonnes de silice, tampons de lavage, tampon d’élution. <b>+4 °C</b>.</p>`,
  },
  glace: {
    name: 'Bloc de glace', icon: iceSvg(), model: 'ice',
    view: () => `<div class="obj">${iceSvg(180)}</div><p>Un bloc de glace tombé du -80 °C. On devine une forme métallique à l’intérieur…</p>`,
  },
  petiteCle: {
    name: 'Petite clé', icon: keySvg('#aab4bd'), model: 'keySilver',
    view: () => `<div class="obj">${keySvg('#aab4bd', 160)}</div><p>Une petite clé argentée, encore froide. Qu’ouvre-t-elle ?</p>`,
  },
  flasque: {
    name: 'Flasque T-07', icon: flaskSvg(), model: 'flask',
    view: () => `<div class="obj">${flaskSvg(190)}</div><p>Flasque de culture <b>T-07</b>. Le milieu est rose : les cellules sont en bonne santé. À n’ouvrir que sous la hotte.</p>`,
  },
  adn: {
    name: 'ADN T-07', icon: microTubeSvg(), model: 'microtube',
    view: () => `<div class="obj">${microTubeSvg(170)}</div><p>Tube d’ADN purifié, échantillon <b>T-07</b>. Prêt pour la préparation des librairies.</p>`,
  },
  cleSecours: {
    name: 'Clé de secours', icon: keySvg('#c62828'), model: 'keySilver',
    view: () => `<div class="obj">${keySvg('#aab4bd', 160)}</div><p>Une clé avec une étiquette rouge « SECOURS — armoire sécurité ».</p>`,
  },
  ethanol: {
    name: 'Éthanol 80 %', solvent: true, icon: bottleSvg(), model: 'bottle', labelColor: 0xc62828,
    view: () => `<div class="obj">${bottleSvg(170)}</div><p>Flacon d’<b>éthanol 80 %</b>. Inflammable.</p>`,
  },
  acetone: { name: 'Acétone', solvent: true, icon: bottleSvg(30, '#1e5bb8', 'ACÉT.'), model: 'bottle', labelColor: 0x1e5bb8,
    view: () => `<div class="obj">${bottleSvg(170, '#1e5bb8', 'ACÉT.')}</div><p>Acétone. Inflammable.</p>` },
  isopropanol: { name: 'Isopropanol', solvent: true, icon: bottleSvg(30, '#1e5bb8', 'IPA'), model: 'bottle', labelColor: 0x1e5bb8,
    view: () => `<div class="obj">${bottleSvg(170, '#1e5bb8', 'IPA')}</div><p>Isopropanol (propan-2-ol). Inflammable.</p>` },
  methanol: { name: 'Méthanol', solvent: true, icon: bottleSvg(30, '#111', 'MeOH'), model: 'bottle', labelColor: 0x111111,
    view: () => `<div class="obj">${bottleSvg(170, '#111', 'MeOH')}</div><p>Méthanol. Inflammable et toxique.</p>` },
  xylene: { name: 'Xylène', solvent: true, icon: bottleSvg(30, '#111', 'XYL.'), model: 'bottle', labelColor: 0x111111,
    view: () => `<div class="obj">${bottleSvg(170, '#111', 'XYL.')}</div><p>Xylène. Inflammable, nocif.</p>` },
  flowcell: {
    name: 'Flowcell', icon: flowcellSvg(), model: 'flowcell',
    view: () => `<div class="obj">${flowcellSvg(190)}</div><p>La <b>flowcell</b> chargée par le robot : des millions de fragments d’ADN y sont fixés, prêts à être lus par le séquenceur.</p>`,
  },
  crSequencage: {
    name: 'Rapport de run',
    icon: paperSvg(30, '#14b8a6'),
    model: 'paperA4',
    doc: true,
    view: () => doc(`<header><b>Compte rendu de run</b> · Échantillon T-07</header>
      <div class="meta">Séquenceur NX-7 — Labo ${CONFIG.roomNumber} · ${today()}</div>
      <table>
        <tr><td>Lectures</td><td>412 M</td></tr>
        <tr><td>Bases ≥ Q30</td><td>93,4 %</td></tr>
        <tr><td>Densité de clusters</td><td>1 840 K/mm²</td></tr>
        <tr><td>Couverture moyenne</td><td>38 ×</td></tr>
        <tr><td>Statut</td><td><b style="color:#166534">PASS</b></td></tr>
      </table>
      <footer>Opérateur : stagiaire, pour T. Attot</footer>`, 'report'),
  },
};

export function makeItem(id) {
  return { id, ...ITEMS[id] };
}
