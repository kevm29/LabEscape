// Textures générées par canvas : pas d'images externes.
import * as THREE from 'three';

const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function toTexture(canvas, { repeat = null, srgb = true, aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

function speckle(g, w, h, count, colors, sizeMin = 0.5, sizeMax = 1.6) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    const s = sizeMin + Math.random() * (sizeMax - sizeMin);
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}

// Sol en lino de labo, gris-vert moucheté, avec joints de lés
export function floorTexture() {
  const c = makeCanvas(1024, 1024), g = c.getContext('2d');
  g.fillStyle = '#a3aeaa';
  g.fillRect(0, 0, 1024, 1024);
  // variations douces
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024, r = 80 + Math.random() * 200;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const a = Math.random() * 0.06;
    grd.addColorStop(0, `rgba(${Math.random() < 0.5 ? '255,255,255' : '60,70,70'},${a})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  speckle(g, 1024, 1024, 14000, ['#8f9995', '#d9dfdc', '#7d8784', '#e9edeb', '#a5b0ac', '#5f6a67']);
  // joints de lés (soudures)
  g.strokeStyle = 'rgba(80,90,88,0.35)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 2); g.lineTo(1024, 2);
  g.stroke();
  return toTexture(c, { repeat: [5, 4] });
}

// Peinture murale blanc cassé légèrement texturée
export function wallTexture() {
  const c = makeCanvas(512, 512), g = c.getContext('2d');
  g.fillStyle = '#dedbd2';
  g.fillRect(0, 0, 512, 512);
  speckle(g, 512, 512, 9000, ['rgba(0,0,0,0.035)', 'rgba(255,255,255,0.06)'], 1, 2.5);
  return toTexture(c, { repeat: [4, 2] });
}

// Plafond en dalles 60x60
export function ceilingTexture() {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#efefec';
  g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, 2500, ['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.04)'], 1, 2);
  g.fillStyle = '#c9cbc8';
  g.fillRect(0, 0, 256, 5);
  g.fillRect(0, 0, 5, 256);
  return toTexture(c, { repeat: [10 / 0.6, 8 / 0.6] });
}

// Carton brun
export function cardboardCanvas(w, h) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#b98d5a';
  g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 3) {
    g.fillStyle = `rgba(90,60,30,${0.03 + Math.random() * 0.04})`;
    g.fillRect(x, 0, 1, h);
  }
  speckle(g, w, h, (w * h) / 60, ['rgba(60,40,20,0.15)', 'rgba(255,240,210,0.12)'], 1, 2);
  return { c, g };
}

// Face avant de la boîte de gants
export function gloveBoxTexture() {
  const { c, g } = cardboardCanvas(512, 256);
  g.fillStyle = '#ffffff';
  g.fillRect(16, 16, 480, 52);
  g.fillStyle = '#1f5fbf';
  g.font = `bold 34px ${FONT}`;
  g.fillText('GANTS NITRILE', 30, 55);
  g.fillStyle = '#1f2a33';
  g.font = `bold 26px ${FONT}`;
  g.fillText('Taille M  •  100 pcs  •  Non poudrés', 30, 236);
  // fente ovale (sombre) au centre
  g.fillStyle = '#2a1f14';
  g.beginPath();
  g.ellipse(256, 140, 150, 42, 0, 0, Math.PI * 2);
  g.fill();
  // gants bleus qui dépassent
  g.fillStyle = '#3d7fe0';
  g.beginPath();
  g.ellipse(230, 135, 90, 26, -0.1, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#5b97ee';
  g.beginPath();
  g.ellipse(290, 128, 70, 18, 0.15, 0, Math.PI * 2);
  g.fill();
  return toTexture(c);
}

export function gogglesBoxTexture() {
  const { c, g } = cardboardCanvas(512, 160);
  g.fillStyle = '#f5f5f0';
  g.fillRect(12, 12, 488, 136);
  g.fillStyle = '#0b5aa6';
  g.font = `bold 40px ${FONT}`;
  g.fillText('LUNETTES', 30, 64);
  g.font = `bold 26px ${FONT}`;
  g.fillStyle = '#333';
  g.fillText('de protection — EN 166', 30, 112);
  return toTexture(c);
}

// Panneau d'obligation (cercle bleu) avec pictogramme
function mandatorySign(g, cx, cy, r, kind) {
  g.fillStyle = '#1e5bb8';
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.fillStyle = '#fff';
  g.lineWidth = r * 0.07;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (kind === 'coat') {
    g.beginPath();
    g.moveTo(cx - r * 0.25, cy - r * 0.55);
    g.lineTo(cx - r * 0.55, cy - r * 0.35);
    g.lineTo(cx - r * 0.62, cy + r * 0.2);
    g.lineTo(cx - r * 0.42, cy + r * 0.22);
    g.lineTo(cx - r * 0.38, cy + r * 0.6);
    g.lineTo(cx + r * 0.38, cy + r * 0.6);
    g.lineTo(cx + r * 0.42, cy + r * 0.22);
    g.lineTo(cx + r * 0.62, cy + r * 0.2);
    g.lineTo(cx + r * 0.55, cy - r * 0.35);
    g.lineTo(cx + r * 0.25, cy - r * 0.55);
    g.lineTo(cx, cy - r * 0.15);
    g.closePath();
    g.fill();
    g.strokeStyle = '#1e5bb8';
    g.beginPath(); g.moveTo(cx, cy - r * 0.15); g.lineTo(cx, cy + r * 0.6); g.stroke();
  } else if (kind === 'goggles') {
    g.beginPath(); g.ellipse(cx - r * 0.28, cy, r * 0.26, r * 0.2, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx + r * 0.28, cy, r * 0.26, r * 0.2, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - r * 0.55, cy - r * 0.05); g.lineTo(cx - r * 0.75, cy - r * 0.15); g.stroke();
    g.beginPath(); g.moveTo(cx + r * 0.55, cy - r * 0.05); g.lineTo(cx + r * 0.75, cy - r * 0.15); g.stroke();
  } else if (kind === 'gloves') {
    // main stylisée
    g.beginPath();
    g.roundRect(cx - r * 0.3, cy - r * 0.05, r * 0.6, r * 0.6, r * 0.08);
    g.fill();
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.roundRect(cx - r * 0.3 + i * r * 0.155, cy - r * 0.55 + (i === 0 || i === 3 ? r * 0.12 : 0), r * 0.12, r * 0.6, r * 0.06);
      g.fill();
    }
    g.save();
    g.translate(cx - r * 0.28, cy + r * 0.15);
    g.rotate(-0.8);
    g.beginPath(); g.roundRect(-r * 0.06, -r * 0.35, r * 0.13, r * 0.38, r * 0.06); g.fill();
    g.restore();
  }
}

export function ppeSignTexture() {
  const c = makeCanvas(768, 384), g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 768, 384);
  g.fillStyle = '#1e5bb8';
  g.fillRect(0, 0, 768, 70);
  g.fillStyle = '#fff';
  g.font = `bold 40px ${FONT}`;
  g.textAlign = 'center';
  g.fillText('PORT OBLIGATOIRE', 384, 50);
  mandatorySign(g, 140, 200, 85, 'coat');
  mandatorySign(g, 384, 200, 85, 'goggles');
  mandatorySign(g, 628, 200, 85, 'gloves');
  g.fillStyle = '#1a2530';
  g.font = `bold 30px ${FONT}`;
  g.fillText('Blouse', 140, 340);
  g.fillText('Lunettes', 384, 340);
  g.fillText('Gants', 628, 340);
  g.strokeStyle = '#1e5bb8';
  g.lineWidth = 8;
  g.strokeRect(4, 4, 760, 376);
  return toTexture(c);
}

// Symbole de risque biologique dessiné à la main
export function drawBiohazard(g, cx, cy, r, color) {
  g.save();
  g.translate(cx, cy);
  g.fillStyle = color;
  g.strokeStyle = color;
  // trois croissants
  for (let i = 0; i < 3; i++) {
    g.save();
    g.rotate((i * Math.PI * 2) / 3);
    g.beginPath();
    g.arc(0, -r * 0.48, r * 0.42, 0, Math.PI * 2);
    g.arc(0, -r * 0.6, r * 0.32, 0, Math.PI * 2, true);
    g.fill('evenodd');
    g.restore();
  }
  // anneau central
  g.lineWidth = r * 0.1;
  g.beginPath();
  g.arc(0, 0, r * 0.36, 0, Math.PI * 2);
  g.stroke();
  // trou central + fentes
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.arc(0, 0, r * 0.13, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 3; i++) {
    g.save();
    g.rotate((i * Math.PI * 2) / 3);
    g.fillRect(-r * 0.035, -r * 0.62, r * 0.07, r * 0.5);
    g.restore();
  }
  g.restore();
}

export function dasriLabelTexture() {
  const c = makeCanvas(512, 512), g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);
  const icon = makeCanvas(512, 512);
  const ig = icon.getContext('2d');
  drawBiohazard(ig, 256, 200, 150, '#111');
  g.drawImage(icon, 0, 0);
  g.fillStyle = '#111';
  g.textAlign = 'center';
  g.font = `bold 92px ${FONT}`;
  g.fillText('DASRI', 256, 440);
  g.font = `bold 30px ${FONT}`;
  g.fillText('RISQUE INFECTIEUX', 256, 490);
  return toTexture(c);
}

export function biohazardDoorSignTexture() {
  const c = makeCanvas(256, 300), g = c.getContext('2d');
  g.fillStyle = '#f7c600';
  g.beginPath();
  g.moveTo(128, 10); g.lineTo(246, 215); g.lineTo(10, 215); g.closePath();
  g.fill();
  g.strokeStyle = '#111'; g.lineWidth = 10; g.stroke();
  const icon = makeCanvas(256, 300);
  drawBiohazard(icon.getContext('2d'), 128, 145, 58, '#111');
  g.drawImage(icon, 0, 0);
  g.fillStyle = '#fff'; g.fillRect(10, 230, 236, 60);
  g.fillStyle = '#111'; g.font = `bold 26px ${FONT}`; g.textAlign = 'center';
  g.fillText('NSB2 — L2', 128, 270);
  return toTexture(c);
}

export function nameTagTexture(name, role) {
  const c = makeCanvas(256, 96), g = c.getContext('2d');
  g.fillStyle = '#fbfbfb';
  g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#1e5bb8';
  g.fillRect(0, 0, 256, 18);
  g.fillStyle = '#1a2530';
  g.textAlign = 'center';
  g.font = `bold 30px ${FONT}`;
  g.fillText(name, 128, 54);
  g.font = `20px ${FONT}`;
  g.fillStyle = '#5a6670';
  g.fillText(role, 128, 82);
  return toTexture(c);
}

export function floorLineTexture() {
  const c = makeCanvas(2048, 32), g = c.getContext('2d');
  g.fillStyle = '#f2c200';
  g.fillRect(0, 0, 2048, 32);
  g.fillStyle = '#1b1b1b';
  for (let x = -40; x < 2048; x += 48) {
    g.beginPath();
    g.moveTo(x, 32); g.lineTo(x + 24, 32); g.lineTo(x + 48, 0); g.lineTo(x + 24, 0);
    g.closePath(); g.fill();
  }
  speckle(g, 2048, 32, 3000, ['rgba(255,255,255,0.15)', 'rgba(0,0,0,0.15)']);
  return toTexture(c);
}

export function floorTextTexture() {
  const c = makeCanvas(1024, 160), g = c.getContext('2d');
  g.clearRect(0, 0, 1024, 160);
  g.fillStyle = 'rgba(242,194,0,0.92)';
  g.textAlign = 'center';
  g.font = `bold 64px ${FONT}`;
  g.fillText('ZONE DE MANIPULATION', 512, 70);
  g.font = `bold 46px ${FONT}`;
  g.fillText('EPI OBLIGATOIRES', 512, 135);
  return toTexture(c);
}

export function posterTexture() {
  const c = makeCanvas(600, 840), g = c.getContext('2d');
  g.fillStyle = '#fdfdf8';
  g.fillRect(0, 0, 600, 840);
  g.fillStyle = '#c62828';
  g.fillRect(0, 0, 600, 110);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = `bold 46px ${FONT}`;
  g.fillText('RÈGLES DU LABO', 300, 72);
  g.textAlign = 'left';
  const rules = [
    'Blouse fermée, lunettes, gants',
    'Ni boire, ni manger, ni fumer',
    'Cheveux longs attachés',
    'Pipetage à la bouche interdit',
    'Déchets piquants → DASRI',
    'Jamais de mains dans un DASRI',
    'Manip sous hotte (PSM) si risque',
    'Code des portes = n° de la salle',
  ];
  g.font = `28px ${FONT}`;
  rules.forEach((r, i) => {
    const y = 175 + i * 80;
    g.fillStyle = '#c62828';
    g.beginPath(); g.arc(50, y - 10, 18, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = `bold 22px ${FONT}`; g.textAlign = 'center';
    g.fillText(String(i + 1), 50, y - 2);
    g.textAlign = 'left'; g.fillStyle = '#1a2530'; g.font = `28px ${FONT}`;
    g.fillText(r, 85, y);
  });
  g.fillStyle = '#8a949c';
  g.font = `italic 20px ${FONT}`;
  g.fillText('Le responsable sécurité — Dr. Leroy', 40, 810);
  return toTexture(c);
}

export function clockTexture() {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#fafafa';
  g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#222';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const long = i % 5 === 0;
    g.lineWidth = long ? 6 : 2;
    g.beginPath();
    g.moveTo(128 + Math.sin(a) * (long ? 96 : 106), 128 - Math.cos(a) * (long ? 96 : 106));
    g.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116);
    g.stroke();
  }
  return toTexture(c);
}

export function textPlaneTexture(text, { w = 512, h = 128, bg = '#0b7a3b', fg = '#fff', size = 64 } = {}) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `bold ${size}px ${FONT}`;
  g.fillText(text, w / 2, h / 2 + 2);
  return toTexture(c);
}

export const KEYS_STD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];
export const KEYS_ROOM = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', '0', 'B'];

export function keypadTexture(keys = KEYS_STD) {
  const c = makeCanvas(256, 384), g = c.getContext('2d');
  g.fillStyle = '#2b3036';
  g.fillRect(0, 0, 256, 384);
  g.fillStyle = '#0d1a12';
  g.fillRect(28, 26, 200, 60);
  g.fillStyle = '#39ff8a';
  g.font = `bold 38px monospace`;
  g.textAlign = 'center';
  g.fillText('- - - -', 128, 68);
  keys.forEach((k, i) => {
    const x = 34 + (i % 3) * 66, y = 108 + Math.floor(i / 3) * 66;
    g.fillStyle = '#c9ced3';
    g.beginPath(); g.roundRect(x, y, 56, 56, 8); g.fill();
    g.fillStyle = '#222';
    g.font = `bold ${k.length > 1 ? 20 : 28}px ${FONT}`;
    g.fillText(k, x + 28, y + 38);
  });
  return toTexture(c);
}

export function fridgeLabelTexture() {
  const c = makeCanvas(256, 128), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#1e5bb8'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 122);
  g.fillStyle = '#1e5bb8'; g.textAlign = 'center';
  g.font = `bold 44px ${FONT}`; g.fillText('+4 °C', 128, 58);
  g.font = `bold 22px ${FONT}`; g.fillStyle = '#333';
  g.fillText('Réactifs — Pas de nourriture', 128, 98);
  return toTexture(c);
}

export function cabinetLabelTexture() {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#f7c600'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#c62828';
  g.beginPath(); g.moveTo(128, 20); g.lineTo(236, 128); g.lineTo(128, 236); g.lineTo(20, 128); g.closePath(); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(128, 34); g.lineTo(222, 128); g.lineTo(128, 222); g.lineTo(34, 128); g.closePath(); g.fill();
  // flamme
  g.fillStyle = '#111';
  g.beginPath();
  g.moveTo(128, 70);
  g.bezierCurveTo(165, 110, 170, 150, 128, 175);
  g.bezierCurveTo(86, 150, 98, 115, 115, 100);
  g.bezierCurveTo(112, 125, 125, 130, 128, 70);
  g.fill();
  g.fillRect(85, 180, 86, 8);
  return toTexture(c);
}
