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

const paperSvg = (size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <path d="M14 6h26l10 10v42H14z" fill="#f7f5ef" stroke="#b9b3a3" stroke-width="2"/>
  <path d="M20 24h24M20 31h24M20 38h18M20 45h22" stroke="#8a8f96" stroke-width="2.5"/>
</svg>`;

const slideSvg = (size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <rect x="4" y="22" width="56" height="20" rx="2" fill="#dff2fb" stroke="#8fb6c8" stroke-width="2"/>
  <rect x="6" y="24" width="14" height="16" fill="#f4f4f4"/>
  <circle cx="40" cy="32" r="6" fill="#d9a3c6" opacity=".8"/>
</svg>`;

const iceSvg = (size = 30) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <path d="M10 20l22-10 22 10v26L32 56 10 46z" fill="#cfeeff" stroke="#8ccbe8" stroke-width="2"/>
  <path d="M10 20l22 10 22-10M32 30v26" stroke="#a9dcf3" stroke-width="2" fill="none"/>
  <g opacity=".55" transform="translate(16 28) scale(.5)">${'<circle cx="20" cy="32" r="10" fill="none" stroke="#7a8590" stroke-width="6"/><rect x="28" y="29" width="26" height="6" fill="#7a8590"/>'}</g>
</svg>`;

const doc = (inner, cls = '') => `<div class="paper ${cls}">${inner}</div>`;

function today() {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const ITEMS = {
  clePaul: {
    name: 'Clé dorée',
    icon: keySvg('#c9a227'),
    view: () => `<div class="obj">${keySvg('#c9a227', 160)}</div>
      <p>Une petite clé dorée, trouvée dans la poche de la blouse du <b>Dr. P. Hemick</b>.</p>`,
  },
  carnetPaul: {
    name: 'Carnet de Paul',
    icon: paperSvg(),
    view: () => doc(`<div class="hand">Carnet de labo — P. Hemick</div>
      <p class="hand">23/10 — Séquençage échantillon T-07 lancé avec Tom.</p>
      <p class="hand">⚠ Rappel à Tom : finir le <b>compte rendu</b> avant de partir ! Le PC attend toujours le résultat.</p>
      <p class="hand">Le gel est resté sur le <b>transilluminateur</b>. Penser à éteindre les UV…</p>`),
  },
  compteRendu: {
    name: 'Compte rendu',
    icon: paperSvg(),
    view: () => doc(`<header><b>Laboratoire de Biologie Cellulaire et Moléculaire</b><br>Bâtiment C — Salle 214</header>
      <div class="meta">Fait au laboratoire, le ${today()}</div>
      <h4>Compte rendu d’analyse</h4>
      <table>
        <tr><td>Échantillon</td><td>T-07</td></tr>
        <tr><td>Analyse</td><td>Séquençage (gel 4 pistes A/C/G/T)</td></tr>
        <tr><td>Résultat du gel</td><td><b>${CONFIG.gelCode}</b></td></tr>
        <tr><td>Lecture</td><td>du bas (+) vers le haut (−)</td></tr>
      </table>
      <footer>T. ATTOT — Doctorant<br>tom.attot@labo-bcm.fr<br>Poste <b>51.23</b></footer>`, 'report'),
  },
  noteTom: {
    name: 'Note de Tom',
    icon: paperSvg(),
    view: () => doc(`<div class="tape"></div><div class="tape r"></div>
      <p class="hand big">Coïncidence !<br>Pile le code du frigo !</p>
      <p class="hand small">(lame de viabilité — 24 h)</p>`, 'note'),
  },
  lame: {
    name: 'Lame',
    icon: slideSvg(),
    view: () => `<div class="obj">${slideSvg(200)}</div>
      <p>Une lame de comptage, étiquetée « <i>Viabilité J+1</i> ». Il faudrait la regarder au microscope.</p>`,
  },
  brouillon: {
    name: 'Brouillon',
    icon: paperSvg(),
    view: () => doc(`<p class="hand">Gel séquence — à lire :</p>
      <p class="hand">puits (−) en haut → les fragments migrent vers le (+)</p>
      <p class="hand">les <b>petits</b> vont le plus loin ⇒ lire du <b>BAS</b> vers le <b>HAUT</b> !</p>
      <p class="hand"><s>lire de gauche à droite</s> NON</p>
      <p class="hand small">PS : sous UV, toujours les lunettes.</p>`, 'crumpled'),
  },
  pbs: {
    name: 'PBS 1X',
    temp: '+4',
    icon: tubeSvg('#bfe3ff', '#1e5bb8'),
    view: () => `<div class="obj">${tubeSvg('#bfe3ff', '#1e5bb8', 160)}</div><p>Tampon PBS 1X. Étiquette : <b>conserver à +4 °C</b>.</p>`,
  },
  milieu: {
    name: 'Milieu de culture',
    temp: '+4',
    icon: tubeSvg('#f3a6b8', '#c62828'),
    view: () => `<div class="obj">${tubeSvg('#f3a6b8', '#c62828', 160)}</div><p>Milieu de culture DMEM (rose : indicateur de pH). <b>+4 °C</b>.</p>`,
  },
  anticorps: {
    name: 'Anticorps',
    temp: '+4',
    icon: tubeSvg('#efe9d8', '#7b3fb8'),
    view: () => `<div class="obj">${tubeSvg('#efe9d8', '#7b3fb8', 160)}</div><p>Anticorps anti-GFP. <b>+4 °C</b>, ne jamais congeler.</p>`,
  },
  arn: {
    name: 'ARN (-80 °C)',
    temp: '-80',
    icon: tubeSvg('#f8f8f8', '#f2c200'),
    view: () => `<div class="obj">${tubeSvg('#f8f8f8', '#f2c200', 160)}</div>
      <p>ARN extrait — T-07. Étiquette en rouge : <b style="color:#ef4444">À CONSERVER À -80 °C</b>.</p>`,
  },
  glace: {
    name: 'Bloc de glace',
    icon: iceSvg(),
    view: () => `<div class="obj">${iceSvg(180)}</div><p>Un bloc de glace tombé du -80 °C. On devine une forme métallique à l’intérieur…</p>`,
  },
  petiteCle: {
    name: 'Petite clé',
    icon: keySvg('#aab4bd'),
    view: () => `<div class="obj">${keySvg('#aab4bd', 160)}</div><p>Une petite clé argentée, encore froide. Qu’ouvre-t-elle ?</p>`,
  },
};

export function makeItem(id) {
  return { id, ...ITEMS[id] };
}
