// Machines de la fin de partie : séquenceur (baie 1), robot de pipetage vitré (baie 2),
// incubateur CO2 à clé, armoire de sécurité, clé de secours sous la hotte.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../lib/three/addons/RoundedBoxGeometry.js';
import { mats, add, box, rbox, cyl, plane, bottle, tubeRack } from './room.js';
import * as T from './textures.js';
import { makeKey } from './props.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

function canvasTex(w, h, draw) {
  const c = T.makeCanvas(w, h);
  draw(c.getContext('2d'), w, h);
  return T.toTexture(c);
}
function labelTex(text, { w = 512, h = 96, bg = '#ffffff', fg = '#1a2530', size = 48 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${size}px ${FONT}`;
    g.fillText(text, w / 2, h / 2 + 2);
  });
}
function screen(w, h) {
  const canvas = T.makeCanvas(w, h);
  const tex = T.toTexture(canvas);
  const mat = std({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1, roughness: 0.25 });
  return { canvas, tex, mat };
}

// Soubassement fermé + plan de travail, comme les autres baies
function bench(g, W, D) {
  const front = D / 2;
  box(g, W - 0.02, 0.8, D - 0.06, mats.laminate, 0, 0.48, -0.02);
  box(g, W - 0.1, 0.08, D - 0.12, mats.baseboard, 0, 0.04, -0.02);
  for (const s of [-1, 1]) {
    box(g, W / 2 - 0.03, 0.76, 0.015, mats.laminateGrey, s * (W / 4), 0.48, front - 0.04);
    box(g, 0.012, 0.14, 0.02, mats.steel, s * 0.08, 0.6, front - 0.02);
  }
  box(g, W + 0.02, 0.04, D, mats.epoxy, 0, 0.9, 0);
}

// ---------- Flowcell (cartouche) ----------
export function makeFlowcell() {
  const g = new THREE.Group();
  rbox(g, 0.12, 0.012, 0.06, 0.004, std({ color: 0x2b3036, roughness: 0.4 }), 0, 0.006, 0);
  box(g, 0.09, 0.003, 0.03, std({ color: 0xbfe6ff, transparent: true, opacity: 0.7, roughness: 0.05, emissive: 0x2a6a8a, emissiveIntensity: 0.3 }), 0, 0.013, 0);
  for (let i = 0; i < 4; i++) box(g, 0.08, 0.001, 0.002, std({ color: 0x7fd3ff, emissive: 0x3fa9ff, emissiveIntensity: 0.6 }), 0, 0.0148, -0.011 + i * 0.0075);
  box(g, 0.02, 0.0035, 0.05, mats.yellow, -0.05, 0.013, 0);
  return g;
}

// ---------- Séquenceur (baie 1, à gauche) ----------
function buildSequencer(scene, refs, colliders) {
  const g = new THREE.Group();
  g.position.set(-3.2, 0, -3.575);
  scene.add(g);
  const W = 1.6, D = 0.85;
  bench(g, W, D);
  const body = std({ color: 0xf1f3f5, roughness: 0.35 });
  const dark = std({ color: 0x23272c, roughness: 0.4 });
  const m = new THREE.Group();
  m.position.set(0, 0.92, -0.04);
  g.add(m);
  rbox(m, 1.36, 1.05, 0.72, 0.05, body, 0, 0.525, 0);
  // bandeau sombre en façade, bande d'accent
  box(m, 1.28, 0.62, 0.01, dark, 0, 0.62, 0.36);
  const accent = std({ color: 0x14b8a6, emissive: 0x14b8a6, emissiveIntensity: 0.4, roughness: 0.3 });
  box(m, 1.3, 0.025, 0.012, accent, 0, 0.29, 0.362);
  // barre d'état lumineuse sur le dessus
  const statusMat = std({ color: 0x3f82e6, emissive: 0x3f82e6, emissiveIntensity: 1.2 });
  box(m, 1.2, 0.012, 0.03, statusMat, 0, 1.052, 0.3, { cast: false });
  // écran tactile
  const scr = screen(640, 400);
  plane(m, 0.5, 0.3125, scr.mat, 0.3, 0.64, 0.367);
  // nom de l'appareil
  plane(m, 0.34, 0.05, std({ map: labelTex('SÉQUENCEUR NX-7', { bg: '#23272c', fg: '#e9eef2', size: 50 }) }), -0.3, 0.84, 0.367);
  // trappe de la flowcell
  const bay = new THREE.Group();
  bay.position.set(-0.36, 0.48, 0.366);
  m.add(bay);
  box(bay, 0.3, 0.12, 0.004, std({ color: 0x0d1013, roughness: 0.6 }), 0, 0, 0.0, { cast: false });
  const flap = new THREE.Group();
  flap.position.set(0, -0.06, 0.004);
  bay.add(flap);
  box(flap, 0.3, 0.12, 0.01, std({ color: 0x3a4048, roughness: 0.35 }), 0, 0.06, 0.005);
  plane(flap, 0.14, 0.025, std({ map: labelTex('FLOWCELL', { bg: '#3a4048', fg: '#e9eef2', size: 54 }) }), 0, 0.075, 0.0105);
  box(flap, 0.08, 0.012, 0.012, mats.steel, 0, 0.025, 0.014);
  const fcInside = makeFlowcell();
  fcInside.position.set(0, -0.04, -0.03);
  fcInside.visible = false;
  bay.add(fcInside);
  // aérations latérales
  for (let i = 0; i < 6; i++) box(m, 0.006, 0.02, 0.4, dark, 0.682, 0.3 + i * 0.05, -0.05, { cast: false });
  refs.sequencer = { group: m, screen: scr, statusMat, flap, fcInside };
  colliders.push({ minX: -4.0, maxX: -2.4, minZ: -4, maxZ: -3.13 });
}

export function drawSequencer(refs, state, p = 0) {
  const { canvas: c, tex } = refs.sequencer.screen;
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.fillStyle = '#0c1520'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#14b8a6'; g.fillRect(0, 0, W, 46);
  g.fillStyle = '#04241f'; g.font = `bold 24px ${FONT}`; g.fillText('NX-7  ·  Run T-07', 18, 31);
  g.fillStyle = '#e9eef2';
  if (state === 'idle') {
    g.font = `bold 34px ${FONT}`; g.fillText('Prêt', 30, 120);
    g.font = `22px ${FONT}`; g.fillStyle = '#9fb3c3';
    g.fillText('Insérez une flowcell chargée', 30, 165);
    g.fillText('dans la trappe « FLOWCELL ».', 30, 195);
    g.strokeStyle = '#2a3a4a'; g.lineWidth = 3; g.strokeRect(30, 240, 260, 110);
    g.fillStyle = '#2a3a4a'; g.fillRect(50, 275, 220, 40);
  } else if (state === 'running') {
    g.font = `bold 30px ${FONT}`; g.fillText('Séquençage en cours…', 30, 115);
    g.fillStyle = '#1d2a38'; g.fillRect(30, 160, W - 60, 26);
    g.fillStyle = '#14b8a6'; g.fillRect(30, 160, (W - 60) * p, 26);
    g.fillStyle = '#9fb3c3'; g.font = `22px ${FONT}`;
    g.fillText(`Cycle ${Math.round(p * 300)} / 300   ·   temps restant ≈ ${Math.max(0, Math.round((1 - p) * 180))} min`, 30, 225);
  } else {
    g.font = `bold 30px ${FONT}`; g.fillStyle = '#4ade80'; g.fillText('✓ Run terminé', 30, 105);
    g.fillStyle = '#e9eef2'; g.font = `22px ${FONT}`;
    const rows = [['Lectures', '412 M'], ['Bases ≥ Q30', '93,4 %'], ['Densité de clusters', '1 840 K/mm²'], ['Couverture moyenne', '38 ×']];
    rows.forEach(([k, v], i) => { g.fillStyle = '#9fb3c3'; g.fillText(k, 30, 150 + i * 40); g.fillStyle = '#e9eef2'; g.fillText(v, 330, 150 + i * 40); });
    g.fillStyle = '#14b8a6'; g.fillRect(30, 320, 330, 52);
    g.fillStyle = '#04241f'; g.font = `bold 22px ${FONT}`; g.fillText('Imprimer le compte rendu', 46, 354);
  }
  tex.needsUpdate = true;
}

// ---------- Robot de pipetage vitré (baie 2) ----------
function buildRobot(scene, refs, colliders) {
  const g = new THREE.Group();
  g.position.set(-1.6, 0, -3.575);
  scene.add(g);
  const W = 1.6, D = 0.85;
  bench(g, W, D);
  const r = new THREE.Group();
  r.position.set(0, 0.92, -0.03);
  g.add(r);
  const frame = std({ color: 0x3a4048, metalness: 0.5, roughness: 0.4 });
  const RW = 1.4, RH = 0.95, RD = 0.72;
  // socle + cadre
  rbox(r, RW, 0.08, RD, 0.015, std({ color: 0xe9ecef, roughness: 0.4 }), 0, 0.04, 0);
  for (const x of [-RW / 2, RW / 2]) for (const z of [-RD / 2, RD / 2]) box(r, 0.03, RH, 0.03, frame, x, RH / 2 + 0.08, z);
  rbox(r, RW + 0.04, 0.1, RD + 0.04, 0.015, std({ color: 0xe9ecef, roughness: 0.4 }), 0, RH + 0.13, 0);
  // vitres (côtés, dos, porte avant)
  const glass = mats.glass;
  box(r, 0.006, RH, RD, glass, -RW / 2, RH / 2 + 0.08, 0, { cast: false, receive: false });
  box(r, 0.006, RH, RD, glass, RW / 2, RH / 2 + 0.08, 0, { cast: false, receive: false });
  box(r, RW, RH, 0.006, glass, 0, RH / 2 + 0.08, -RD / 2, { cast: false, receive: false });
  const door = new THREE.Group();
  door.position.set(0, RH + 0.08, RD / 2);
  r.add(door);
  box(door, RW - 0.04, RH - 0.02, 0.008, glass, 0, -RH / 2, 0, { cast: false, receive: false });
  box(door, 0.4, 0.02, 0.03, mats.steel, 0, -RH + 0.12, 0.02);
  // plateau de travail
  const deck = new THREE.Group();
  deck.position.y = 0.085;
  r.add(deck);
  box(deck, RW - 0.08, 0.01, RD - 0.08, std({ color: 0x9aa3ab, metalness: 0.4, roughness: 0.5 }), 0, 0.005, 0);
  // boîtes de cônes
  const tipBoxes = [];
  for (const [x, z] of [[-0.5, -0.15], [-0.5, 0.12]]) {
    const tb = new THREE.Group();
    tb.position.set(x, 0.01, z);
    deck.add(tb);
    rbox(tb, 0.13, 0.08, 0.09, 0.006, std({ color: 0x2f7fd6, roughness: 0.5 }), 0, 0.04, 0);
    const tipMat = std({ color: 0xf4f6f8, roughness: 0.3, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) cyl(tb, 0.006, 0.003, 0.05, tipMat, -0.05 + i * 0.02, 0.1, -0.03 + j * 0.02, { cast: false }, 6);
    tipBoxes.push(tb);
  }
  // module magnétique, plaque, réservoirs
  const magBlock = rbox(deck, 0.14, 0.05, 0.1, 0.008, std({ color: 0x8a1d1d, roughness: 0.4 }), -0.22, 0.035, -0.15);
  plane(deck, 0.1, 0.022, std({ map: labelTex('MAG', { w: 256, h: 64, bg: '#8a1d1d', fg: '#fff', size: 40 }) }), -0.22, 0.04, -0.099);
  rbox(deck, 0.13, 0.025, 0.09, 0.005, std({ color: 0xf2f2f2, roughness: 0.3 }), -0.22, 0.072, -0.15);
  rbox(deck, 0.13, 0.03, 0.09, 0.005, std({ color: 0xf2f2f2, roughness: 0.3 }), -0.22, 0.025, 0.12);
  // support échantillon (tube ADN)
  const sampleRack = new THREE.Group();
  sampleRack.position.set(0.05, 0.01, 0.15);
  deck.add(sampleRack);
  rbox(sampleRack, 0.12, 0.04, 0.06, 0.006, std({ color: 0xf2c200, roughness: 0.5 }), 0, 0.02, 0);
  plane(sampleRack, 0.1, 0.02, std({ map: labelTex('ÉCHANTILLON', { w: 512, h: 96, bg: '#f2c200', fg: '#111', size: 50 }) }), 0, 0.02, 0.031);
  const sampleTube = new THREE.Group();
  sampleTube.position.set(0, 0.04, 0);
  sampleTube.visible = false;
  sampleRack.add(sampleTube);
  cyl(sampleTube, 0.007, 0.004, 0.04, std({ color: 0xf4f6f8, transparent: true, opacity: 0.85 }), 0, 0.01, 0, {}, 10);
  cyl(sampleTube, 0.008, 0.008, 0.008, mats.blueCap, 0, 0.034, 0, {}, 10);
  // emplacement éthanol
  const etohSlot = new THREE.Group();
  etohSlot.position.set(0.32, 0.01, 0.15);
  deck.add(etohSlot);
  rbox(etohSlot, 0.14, 0.02, 0.1, 0.006, std({ color: 0xd9dee2, roughness: 0.4 }), 0, 0.01, 0);
  plane(etohSlot, 0.12, 0.02, std({ map: labelTex('ÉTHANOL 80 %', { w: 512, h: 96, bg: '#d9dee2', fg: '#c62828', size: 50 }) }), 0, 0.012, 0.051);
  const etohBottle = bottle(etohSlot, 0, 0.02, 0, { r: 0.035, h: 0.15, liquid: 0xf4f8ff, fill: 0.7, cap: mats.redCap });
  etohBottle.visible = false;
  // sortie flowcell
  const fcOut = new THREE.Group();
  fcOut.position.set(0.32, 0.01, -0.15);
  deck.add(fcOut);
  rbox(fcOut, 0.16, 0.015, 0.09, 0.006, std({ color: 0x2b3036, roughness: 0.4 }), 0, 0.0075, 0);
  plane(fcOut, 0.12, 0.018, std({ map: labelTex('FLOWCELL', { w: 512, h: 96, bg: '#2b3036', fg: '#fff', size: 50 }) }), 0, 0.008, 0.046);
  const flowcell = makeFlowcell();
  flowcell.position.y = 0.015;
  flowcell.visible = false;
  fcOut.add(flowcell);
  // portique : rail X, chariot, tête de pipetage
  const railY = RH - 0.05;
  box(r, RW - 0.06, 0.04, 0.05, frame, 0, railY, -0.2);
  const carriage = new THREE.Group();
  carriage.position.set(0, railY, -0.2);
  r.add(carriage);
  box(carriage, 0.08, 0.06, 0.6, frame, 0, -0.01, 0.2);
  const headBase = new THREE.Group();
  headBase.position.set(0, -0.04, 0.2);
  carriage.add(headBase);
  const head = new THREE.Group();
  headBase.add(head);
  rbox(head, 0.1, 0.22, 0.08, 0.01, std({ color: 0xf1f3f5, roughness: 0.35 }), 0, -0.13, 0);
  for (let i = 0; i < 4; i++) cyl(head, 0.006, 0.004, 0.06, std({ color: 0x9aa3ab, metalness: 0.6, roughness: 0.3 }), -0.03 + i * 0.02, -0.27, 0, {}, 8);
  // écran du robot (montant droit, en façade)
  const scr = screen(400, 260);
  const scrHolder = new THREE.Group();
  scrHolder.position.set(0.5, 0.6, RD / 2 + 0.045);
  r.add(scrHolder);
  rbox(scrHolder, 0.27, 0.18, 0.02, 0.008, std({ color: 0x23272c, roughness: 0.4 }), 0, 0, 0);
  plane(scrHolder, 0.24, 0.156, scr.mat, 0, 0, 0.011);
  box(scrHolder, 0.02, 0.02, 0.05, frame, 0, 0, -0.03);
  // gyrophare d'état
  const beaconMat = std({ color: 0x3f82e6, emissive: 0x3f82e6, emissiveIntensity: 1.5 });
  cyl(r, 0.025, 0.025, 0.05, beaconMat, RW / 2 - 0.1, RH + 0.205, 0.2, {}, 16);
  plane(r, 0.36, 0.05, std({ map: labelTex('PIPETBOT · Préparation de librairies', { w: 1024, h: 128, bg: '#e9ecef', fg: '#1a2530', size: 44 }) }), -0.35, RH + 0.13, RD / 2 + 0.021);
  const light = new THREE.PointLight(0xe9f4ff, 0.6, 1.6, 1.5);
  light.position.set(0, RH - 0.1, 0.1);
  light.userData.switchable = true;
  r.add(light);
  refs.robot = { group: r, carriage, head, sampleTube, etohBottle, flowcell, screen: scr, beaconMat, tipBoxes, magBlock, deckY: 0.085 };
  colliders.push({ minX: -2.4, maxX: -0.8, minZ: -4, maxZ: -3.13 });
}

export function drawRobot(refs, { dna, ethanol, running, done, p = 0, step = '' }) {
  const { canvas: c, tex } = refs.robot.screen;
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.fillStyle = '#0c1520'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#3f82e6'; g.fillRect(0, 0, W, 38);
  g.fillStyle = '#fff'; g.font = `bold 20px ${FONT}`; g.fillText('PipetBot · Librairies', 12, 26);
  g.font = `19px ${FONT}`;
  if (done) {
    g.fillStyle = '#4ade80'; g.font = `bold 26px ${FONT}`; g.fillText('✓ Flowcell prête', 16, 90);
    g.fillStyle = '#9fb3c3'; g.font = `19px ${FONT}`; g.fillText('Récupérez-la dans le bac', 16, 130); g.fillText('« FLOWCELL ».', 16, 156);
  } else if (running) {
    g.fillStyle = '#e9eef2'; g.font = `bold 22px ${FONT}`; g.fillText('Préparation en cours…', 16, 80);
    g.fillStyle = '#9fb3c3'; g.font = `18px ${FONT}`; g.fillText(step, 16, 116);
    g.fillStyle = '#1d2a38'; g.fillRect(16, 150, W - 32, 18);
    g.fillStyle = '#3f82e6'; g.fillRect(16, 150, (W - 32) * p, 18);
  } else {
    const line = (ok, t, y) => { g.fillStyle = ok ? '#4ade80' : '#f87171'; g.fillText(`${ok ? '✓' : '✗'} ${t}`, 16, y); };
    g.fillStyle = '#e9eef2'; g.font = `bold 20px ${FONT}`; g.fillText('Chargement requis :', 16, 74);
    g.font = `19px ${FONT}`;
    line(dna, 'Échantillon d’ADN', 110);
    line(ethanol, 'Éthanol 80 % (lavages billes)', 142);
    line(true, 'Cônes, billes, adaptateurs', 174);
    g.fillStyle = dna && ethanol ? '#4ade80' : '#9fb3c3';
    g.fillText(dna && ethanol ? '▶ Prêt : appuyez pour lancer' : 'En attente…', 16, 222);
  }
  tex.needsUpdate = true;
}

// ---------- Incubateur CO2 à clé (paillasse nord-est) ----------
function buildIncubator(scene, refs) {
  const ne = refs.neBench;
  const inc = new THREE.Group();
  inc.position.set(-0.75, 0.92, -0.02);
  ne.add(inc);
  const W = 0.7, H = 0.8, D = 0.62;
  const steel = mats.steel;
  const inner = std({ color: 0xc9d0d6, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide });
  box(inc, W, 0.03, D, steel, 0, 0.015, 0);
  box(inc, W, 0.03, D, steel, 0, H - 0.015, 0);
  box(inc, 0.03, H, D, steel, -W / 2 + 0.015, H / 2, 0);
  box(inc, 0.03, H, D, steel, W / 2 - 0.015, H / 2, 0);
  box(inc, W, H, 0.03, steel, 0, H / 2, -D / 2 + 0.015);
  box(inc, W - 0.07, H - 0.07, 0.005, inner, 0, H / 2, -D / 2 + 0.035, { cast: false });
  for (const y of [0.28, 0.54]) box(inc, W - 0.08, 0.008, D - 0.08, std({ color: 0xaab4bd, metalness: 0.7, roughness: 0.35 }), 0, y, 0, { cast: false });
  // flasques de culture (T75) : la T-07 se prend, les autres sont du décor
  const flasks = [];
  const flaskAt = (x, y, z, label) => {
    const f = makeFlask(label);
    f.position.set(x, y, z);
    inc.add(f);
    flasks.push(f);
    return f;
  };
  flaskAt(-0.15, 0.288, 0.0, 'T-05');
  const t07 = flaskAt(0.12, 0.288, 0.02, 'T-07');
  flaskAt(0.0, 0.548, -0.02, 'T-06');
  // porte pleine, charnière à gauche, serrure à droite
  const door = new THREE.Group();
  door.position.set(-W / 2, 0, D / 2);
  inc.add(door);
  rbox(door, W, H, 0.04, 0.015, steel, W / 2, H / 2, 0.02);
  box(door, 0.03, 0.3, 0.035, mats.darkSteel, W - 0.06, H / 2, 0.055);
  const disp = T.textPlaneTexture('37.0 °C  5 % CO₂', { w: 512, h: 128, bg: '#000', fg: '#ff9a5a', size: 52 });
  plane(door, 0.24, 0.06, std({ color: 0x0c1a12, emissive: 0xff7a3d, emissiveIntensity: 0.6, emissiveMap: disp }), W / 2, H - 0.12, 0.0415);
  plane(door, 0.26, 0.05, std({ map: labelTex('INCUBATEUR CO₂', { bg: '#c4cad0', fg: '#1a2530', size: 50 }) }), W / 2, H - 0.2, 0.0415);
  const lock = new THREE.Group();
  lock.position.set(W - 0.06, H / 2 - 0.22, 0.042);
  door.add(lock);
  cyl(lock, 0.016, 0.016, 0.01, std({ color: 0xc9a227, metalness: 0.9, roughness: 0.3 }), 0, 0, 0.005, { rx: Math.PI / 2 }, 16);
  box(lock, 0.003, 0.012, 0.003, mats.black, 0, 0, 0.011);
  const warm = new THREE.PointLight(0xffd9b0, 0, 1.0, 1.5);
  warm.position.set(0, H / 2, 0.1);
  inc.add(warm);
  refs.incubator = { group: inc, door, t07, warm };
}

export function makeFlask(label = 'T-07') {
  const f = new THREE.Group();
  const plastic = std({ color: 0xf4f8fb, transparent: true, opacity: 0.55, roughness: 0.15 });
  const medium = std({ color: 0xf08aa8, transparent: true, opacity: 0.85, roughness: 0.2 });
  box(f, 0.18, 0.045, 0.11, plastic, 0, 0.0225, 0, { cast: false });
  box(f, 0.175, 0.012, 0.105, medium, 0, 0.007, 0, { cast: false });
  cyl(f, 0.016, 0.018, 0.05, plastic, 0.11, 0.03, 0, { rz: Math.PI / 2 }, 12);
  cyl(f, 0.021, 0.021, 0.03, std({ color: 0xc62828, roughness: 0.4 }), 0.145, 0.03, 0, { rz: Math.PI / 2 }, 14);
  plane(f, 0.08, 0.04, std({ map: labelTex(label, { w: 256, h: 128, bg: '#ffffff', fg: '#1e3a8a', size: 64 }) }), -0.03, 0.0455, 0, { rx: -Math.PI / 2 });
  return f;
}

// ---------- Armoire de sécurité (produits inflammables), mur ouest ----------
function buildSafetyCabinet(scene, refs) {
  const ac = new THREE.Group();
  ac.position.set(-5 + 0.3, 0, -1.0);
  scene.add(ac);
  const W = 0.6, H = 1.95, D = 1.1; // W = profondeur (x), D = largeur (z)
  const y = mats.yellow, inner = std({ color: 0xe8e2c4, roughness: 0.7 });
  box(ac, 0.03, H, D, y, -W / 2 + 0.015, H / 2, 0);
  box(ac, W, 0.04, D, y, 0, H - 0.02, 0);
  box(ac, W, 0.08, D, y, 0, 0.04, 0);
  box(ac, W, H, 0.03, y, 0, H / 2, -D / 2 + 0.015);
  box(ac, W, H, 0.03, y, 0, H / 2, D / 2 - 0.015);
  box(ac, W - 0.06, 0.005, D - 0.06, inner, 0, 0.1, 0, { cast: false });
  // bac de rétention + étagères
  box(ac, W - 0.08, 0.06, D - 0.08, std({ color: 0xd9a800, roughness: 0.5 }), 0, 0.13, 0);
  for (const sy of [0.7, 1.3]) box(ac, W - 0.08, 0.02, D - 0.08, std({ color: 0xd9a800, roughness: 0.5 }), 0, sy, 0);
  // flacons (décor) + éthanol à prendre
  const solvent = (x, sy, z, label, liquid, cap, h = 0.24) => {
    const b = bottle(ac, x, sy + 0.01, z, { r: 0.05, h, liquid, fill: 0.75, cap, amber: false });
    const lt = labelTex(label, { w: 512, h: 160, bg: '#ffffff', fg: label.includes('ÉTHANOL') ? '#c62828' : '#1a2530', size: 52 });
    add(b, new THREE.CylinderGeometry(0.051, 0.051, h * 0.32, 20, 1, true, Math.PI * 0.05, Math.PI * 0.9), std({ map: lt }), 0, h * 0.45, 0, { cast: false });
    return b;
  };
  const decor = [
    solvent(0.02, 0.16, -0.32, 'ACÉTONE', 0xf8fbff, mats.blueCap),
    solvent(0.02, 0.16, 0.3, 'ISOPROPANOL', 0xf8fbff, mats.blueCap),
    solvent(0.0, 0.71, -0.3, 'MÉTHANOL', 0xf8fbff, mats.black, 0.2),
    solvent(0.0, 1.31, 0.0, 'XYLÈNE', 0xfdf6d8, mats.black, 0.2),
  ];
  const ethanol = solvent(0.02, 0.71, 0.12, 'ÉTHANOL 80 %', 0xf4f8ff, mats.redCap);
  // deux portes battantes vers la pièce (+x)
  const mkDoor = (hingeZ, dir) => {
    const pivot = new THREE.Group();
    pivot.position.set(W / 2, 0, hingeZ);
    ac.add(pivot);
    box(pivot, 0.03, H - 0.06, D / 2 - 0.01, y, 0.015, H / 2, dir * (D / 4));
    plane(pivot, 0.25, 0.25, std({ map: T.cabinetLabelTexture() }), 0.031, 1.6, dir * (D / 4), { ry: Math.PI / 2 });
    return pivot;
  };
  const left = mkDoor(-D / 2, 1);
  const right = mkDoor(D / 2, -1);
  box(left, 0.03, 0.25, 0.025, mats.black, 0.045, 1.05, D / 2 - 0.08);
  box(right, 0.03, 0.25, 0.025, mats.black, 0.045, 1.05, -D / 2 + 0.08);
  const lock = cyl(right, 0.016, 0.016, 0.012, std({ color: 0xc0c6cc, metalness: 0.9, roughness: 0.3 }), 0.04, 1.25, -D / 2 + 0.08, { rz: Math.PI / 2 }, 16);
  void lock;
  refs.safetyCabinet = ac;
  refs.cabinet = { group: ac, left, right, ethanol, decor };
}

// ---------- Clé de secours scotchée sous le plan de la hotte ----------
function buildEmergencyKey(refs) {
  // scotchée au fond, sous le plan de travail de la hotte : invisible debout, visible accroupi
  const hood = refs.hood;
  const k = new THREE.Group();
  k.position.set(-0.45, 0.6, -0.425 + 0.042);
  hood.add(k);
  const key = makeKey(0xaab4bd);
  key.scale.setScalar(2.4);
  key.rotation.z = 0.5;
  k.add(key);
  const tape = std({ color: 0xe8dcb0, roughness: 0.8, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  plane(k, 0.08, 0.028, tape, 0.0, 0.005, 0.004, { rz: -0.6 });
  plane(k, 0.06, 0.035, std({ map: labelTex('SECOURS', { w: 256, h: 128, bg: '#c62828', fg: '#fff', size: 52 }), side: THREE.DoubleSide }), 0.075, -0.04, 0.003, { rz: 0.15 });
  refs.emergencyKey = k;
}

export function buildMachines(scene, refs, colliders) {
  buildSequencer(scene, refs, colliders);
  buildRobot(scene, refs, colliders);
  buildIncubator(scene, refs);
  buildSafetyCabinet(scene, refs);
  buildEmergencyKey(refs);
  drawSequencer(refs, 'idle');
  drawRobot(refs, { dna: false, ethanol: false });
  void tubeRack; void RoundedBoxGeometry;
}
