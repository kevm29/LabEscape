// Mobilier et appareils interactifs des énigmes (bureau, PC, imprimante, transilluminateur,
// frigo, congélateur -80 °C, évier, interrupteur, poubelle à gants).
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../lib/three/addons/RoundedBoxGeometry.js';
import { mats } from './room.js';
import * as T from './textures.js';
import { CONFIG } from './config.js';

const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

function add(parent, geo, mat, x = 0, y = 0, z = 0, { cast = true, receive = true, rx = 0, ry = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}
const box = (p, w, h, d, mat, x, y, z, o) => add(p, new THREE.BoxGeometry(w, h, d), mat, x, y, z, o);
const rbox = (p, w, h, d, r, mat, x, y, z, o) => add(p, new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y, z, o);
const cyl = (p, rt, rb, h, mat, x, y, z, o, seg = 20) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, o);
const plane = (p, w, h, mat, x, y, z, o) => add(p, new THREE.PlaneGeometry(w, h), mat, x, y, z, { cast: false, receive: false, ...o });
const std = (o) => new THREE.MeshStandardMaterial(o);

function canvasTex(w, h, draw) {
  const c = T.makeCanvas(w, h);
  draw(c.getContext('2d'), w, h);
  return T.toTexture(c);
}
function labelTex(text, { w = 256, h = 64, bg = '#fffdf6', fg = '#1a2530', size = 34, font = FONT, italic = false } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${italic ? 'italic ' : ''}bold ${size}px ${font}`;
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

// ---------- Clé ----------
export function makeKey(color = 0xc9a227) {
  const g = new THREE.Group();
  const m = std({ color, metalness: 0.9, roughness: 0.3 });
  add(g, new THREE.TorusGeometry(0.011, 0.0035, 8, 18), m, 0, 0.034, 0);
  cyl(g, 0.0028, 0.0028, 0.045, m, 0, 0.0, 0, {}, 8);
  box(g, 0.008, 0.005, 0.002, m, 0.004, -0.014, 0);
  box(g, 0.006, 0.004, 0.002, m, 0.003, -0.005, 0);
  return g;
}

// ---------- Bureau (sous l'affiche, mur sud) ----------
function buildDesk(scene, refs, colliders) {
  const desk = new THREE.Group();
  desk.position.set(0.3, 0, 3.62);
  desk.rotation.y = Math.PI; // l'avant du bureau (local +z) regarde la pièce
  scene.add(desk);
  const wood = std({ color: 0xcfb48f, roughness: 0.6 });
  const carcass = std({ color: 0xdfe2e4, roughness: 0.55 });
  const metal = std({ color: 0x3a3f45, metalness: 0.6, roughness: 0.4 });

  box(desk, 1.5, 0.03, 0.7, wood, 0, 0.755, 0);
  box(desk, 0.03, 0.74, 0.66, carcass, -0.735, 0.37, 0);
  box(desk, 1.44, 0.4, 0.02, carcass, 0, 0.5, -0.32);
  // caisson à tiroirs (local x positif)
  const pedX = 0.5;
  box(desk, 0.46, 0.74, 0.66, carcass, pedX, 0.37, -0.01);
  const drawerDefs = [
    { id: 'paul', label: 'Paul', y: 0.6 },
    { id: 'tom', label: 'Tom', y: 0.37 },
    { id: 'free', label: null, y: 0.14 },
  ];
  refs.drawers = {};
  for (const d of drawerDefs) {
    const dr = new THREE.Group();
    dr.position.set(pedX, d.y, 0.33);
    desk.add(dr);
    box(dr, 0.42, 0.2, 0.02, wood, 0, 0, 0.0);
    // caisson du tiroir (visible à l'ouverture)
    box(dr, 0.38, 0.015, 0.5, carcass, 0, -0.085, -0.26);
    box(dr, 0.015, 0.15, 0.5, carcass, -0.185, -0.02, -0.26);
    box(dr, 0.015, 0.15, 0.5, carcass, 0.185, -0.02, -0.26);
    box(dr, 0.38, 0.15, 0.015, carcass, 0, -0.02, -0.505);
    box(dr, 0.16, 0.018, 0.025, metal, 0, 0.03, 0.022);
    if (d.label) plane(dr, 0.09, 0.032, std({ map: labelTex(d.label, { italic: true, font: '"Comic Sans MS", "Segoe Print", cursive', size: 38 }) }), -0.13, 0.055, 0.011);
    if (d.id === 'paul') {
      cyl(dr, 0.009, 0.009, 0.006, std({ color: 0xc9a227, metalness: 0.9, roughness: 0.3 }), 0.13, 0.055, 0.012, { rx: Math.PI / 2 }, 14);
      box(dr, 0.002, 0.008, 0.002, mats.black, 0.13, 0.055, 0.016);
    }
    if (d.id === 'tom') {
      // moraillon + cadenas à 4 molettes
      box(dr, 0.03, 0.05, 0.008, mats.steel, 0.13, 0.03, 0.015);
      const lock = new THREE.Group();
      lock.position.set(0.13, -0.02, 0.03);
      dr.add(lock);
      add(lock, new THREE.TorusGeometry(0.014, 0.003, 6, 14, Math.PI), mats.steel, 0, 0.022, 0);
      rbox(lock, 0.05, 0.035, 0.016, 0.004, std({ color: 0x2a4f9e, roughness: 0.4, metalness: 0.3 }), 0, 0, 0);
      for (let i = 0; i < 4; i++) cyl(lock, 0.005, 0.005, 0.01, mats.black, -0.015 + i * 0.01, -0.005, 0.009, { rx: Math.PI / 2 }, 10);
      refs.tomLock = lock;
    }
    refs.drawers[d.id] = { group: dr, home: dr.position.z, open: false };
  }
  // contenus des tiroirs
  const paper = std({ color: 0xf7f5ef, roughness: 0.9 });
  const carnet = new THREE.Group();
  carnet.position.set(0, -0.07, -0.2);
  refs.drawers.paul.group.add(carnet);
  box(carnet, 0.15, 0.012, 0.21, std({ color: 0x8a2d2d, roughness: 0.7 }), 0, 0, 0);
  box(carnet, 0.14, 0.004, 0.2, paper, 0.004, 0.008, 0);
  refs.carnet = carnet;

  const note = new THREE.Group();
  note.position.set(0, -0.075, -0.2);
  refs.drawers.tom.group.add(note);
  plane(note, 0.15, 0.2, std({
    map: canvasTex(256, 340, (g) => {
      g.fillStyle = '#fbfaf4'; g.fillRect(0, 0, 256, 340);
      g.fillStyle = 'rgba(240,230,170,0.85)'; g.fillRect(40, 90, 70, 26); g.fillRect(150, 90, 70, 26);
      g.fillStyle = '#1e3a8a'; g.font = 'bold 28px "Segoe Print", cursive'; g.textAlign = 'center';
      g.fillText('Coïncidence !', 128, 210); g.font = '22px "Segoe Print", cursive'; g.fillText('Pile le code du frigo !', 128, 250);
    }),
  }), 0, 0, 0, { rx: -Math.PI / 2 });
  const slide = box(note, 0.075, 0.002, 0.026, mats.labGlass, 0, 0.003, -0.045, { cast: false });
  slide.renderOrder = 3;
  refs.tomNote = note;
  refs.tomSlide = slide;

  // PC portable
  const lap = new THREE.Group();
  lap.position.set(-0.25, 0.77, 0.0);
  desk.add(lap);
  const shell = std({ color: 0x5a6068, metalness: 0.6, roughness: 0.35 });
  rbox(lap, 0.34, 0.018, 0.24, 0.006, shell, 0, 0.009, 0);
  plane(lap, 0.3, 0.12, std({ color: 0x1d2024, roughness: 0.7 }), 0, 0.0185, -0.03, { rx: -Math.PI / 2 });
  plane(lap, 0.1, 0.06, std({ color: 0x4a5058, roughness: 0.4 }), 0, 0.0185, 0.07, { rx: -Math.PI / 2 });
  const power = cyl(lap, 0.007, 0.007, 0.004, std({ color: 0x222222, emissive: 0x000000, roughness: 0.4 }), 0.145, 0.019, -0.105, {}, 14);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.018, -0.12);
  hinge.rotation.x = -0.28;
  lap.add(hinge);
  rbox(hinge, 0.34, 0.23, 0.01, 0.006, shell, 0, 0.115, 0);
  const screenCanvas = T.makeCanvas(512, 340);
  const screenTex = T.toTexture(screenCanvas);
  const screenMat = std({ color: 0x000000, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0, roughness: 0.25 });
  plane(hinge, 0.31, 0.205, screenMat, 0, 0.117, 0.0055);
  refs.laptop = { group: lap, power, screenCanvas, screenTex, screenMat };

  // pile d'articles
  const arts = new THREE.Group();
  arts.position.set(0.1, 0.77, -0.12);
  desk.add(arts);
  for (let i = 0; i < 6; i++) {
    const s = box(arts, 0.21, 0.004, 0.297, paper, (Math.random() - 0.5) * 0.02, i * 0.005, (Math.random() - 0.5) * 0.02, { ry: (Math.random() - 0.5) * 0.2 });
    s.castShadow = false;
  }
  plane(arts, 0.2, 0.28, std({
    map: canvasTex(256, 360, (g) => {
      g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 256, 360);
      g.fillStyle = '#7a1f2b'; g.fillRect(0, 0, 256, 26);
      g.fillStyle = '#111'; g.font = 'bold 19px Georgia, serif';
      g.fillText('Inosine: when A', 16, 62); g.fillText('reads as G', 16, 86);
      g.fillStyle = '#555'; g.font = 'italic 12px Georgia, serif'; g.fillText('Hemick P., Attot T. et al.', 16, 108);
      g.fillStyle = '#9aa'; for (let i = 0; i < 18; i++) g.fillRect(16, 128 + i * 12, 100 + Math.random() * 120, 4);
    }),
  }), 0, 0.034, 0, { rx: -Math.PI / 2, rz: 0.05 });

  // tasse de café vide, tachée
  const mug = new THREE.Group();
  mug.position.set(0.04, 0.77, 0.16);
  desk.add(mug);
  const ceramic = std({ color: 0xf2efe8, roughness: 0.35, side: THREE.DoubleSide });
  const cup = add(mug, new THREE.CylinderGeometry(0.04, 0.036, 0.095, 24, 1, true), ceramic, 0, 0.0475, 0);
  void cup;
  const stain = canvasTex(128, 128, (g) => {
    g.fillStyle = '#5a3418'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(30,15,5,0.8)'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
  });
  add(mug, new THREE.CircleGeometry(0.036, 24), std({ map: stain, roughness: 0.5 }), 0, 0.004, 0, { rx: -Math.PI / 2 });
  const drip = canvasTex(256, 64, (g) => {
    g.fillStyle = '#f2efe8'; g.fillRect(0, 0, 256, 64);
    g.fillStyle = 'rgba(110,60,25,0.55)';
    g.fillRect(0, 0, 256, 6);
    for (const x of [40, 46, 150]) { g.fillRect(x, 0, 5, 22 + (x % 7) * 3); }
    g.fillStyle = '#1e5bb8'; g.font = 'bold 18px sans-serif'; g.fillText('LAB', 190, 42);
  });
  add(mug, new THREE.CylinderGeometry(0.0405, 0.0365, 0.095, 24, 1, true), std({ map: drip, roughness: 0.35 }), 0, 0.0475, 0, { cast: false });
  add(mug, new THREE.TorusGeometry(0.022, 0.006, 8, 16, Math.PI * 1.3), ceramic, 0.045, 0.05, 0, { rz: -Math.PI * 0.65 });
  add(mug, new THREE.TorusGeometry(0.039, 0.004, 6, 24), std({ color: 0x6b3a18, roughness: 0.5 }), 0, 0.068, 0, { rx: Math.PI / 2, cast: false });

  // lampe de bureau
  const lamp = new THREE.Group();
  lamp.position.set(-0.6, 0.77, -0.2);
  desk.add(lamp);
  cyl(lamp, 0.07, 0.08, 0.02, metal, 0, 0.01, 0);
  const a1 = cyl(lamp, 0.008, 0.008, 0.36, metal, 0, 0.19, 0.05, { rx: 0.3 });
  void a1;
  cyl(lamp, 0.008, 0.008, 0.3, metal, 0.0, 0.42, 0.18, { rx: 1.25 });
  const head = new THREE.Group();
  head.position.set(0, 0.44, 0.32);
  head.rotation.x = 0.5;
  lamp.add(head);
  add(head, new THREE.ConeGeometry(0.06, 0.1, 20, 1, true), std({ color: 0x1f4e79, roughness: 0.4, side: THREE.DoubleSide }), 0, -0.02, 0);
  add(head, new THREE.SphereGeometry(0.022, 12, 8), std({ color: 0xffffff, emissive: 0xfff1c9, emissiveIntensity: 2.5 }), 0, -0.05, 0, { cast: false });
  const lampLight = new THREE.PointLight(0xffe1a8, 0.9, 2.2, 1.5);
  lampLight.position.set(0, -0.12, 0);
  head.add(lampLight);

  // imprimante
  const pr = new THREE.Group();
  pr.position.set(0.47, 0.77, -0.08);
  desk.add(pr);
  rbox(pr, 0.42, 0.17, 0.34, 0.02, std({ color: 0xe9ebee, roughness: 0.45 }), 0, 0.085, 0);
  box(pr, 0.3, 0.012, 0.02, mats.black, 0, 0.11, 0.171, { cast: false });
  box(pr, 0.28, 0.01, 0.12, std({ color: 0xcfd3d7, roughness: 0.5 }), 0, 0.06, 0.22);
  plane(pr, 0.06, 0.025, std({ color: 0x0c1a12, emissive: 0x45f58b, emissiveIntensity: 0.6 }), 0.14, 0.15, 0.172);
  const sheet = new THREE.Group();
  sheet.visible = false;
  pr.add(sheet);
  const reportTex = canvasTex(256, 360, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 360);
    g.fillStyle = '#1e5bb8'; g.fillRect(0, 0, 256, 8);
    g.fillStyle = '#111'; g.font = 'bold 13px sans-serif'; g.fillText('Laboratoire de Biologie Cellulaire', 14, 34);
    g.font = 'bold 18px sans-serif'; g.fillText('Compte rendu d’analyse', 14, 80);
    g.fillStyle = '#999'; for (let i = 0; i < 10; i++) g.fillRect(14, 110 + i * 16, 120 + Math.random() * 100, 5);
    g.fillStyle = '#111'; g.font = '12px sans-serif'; g.fillText('T. ATTOT — Poste 51.23', 14, 330);
  });
  plane(sheet, 0.21, 0.28, std({ map: reportTex, side: THREE.DoubleSide }), 0, 0, 0, { rx: -Math.PI / 2 });
  const seqSheet = new THREE.Group();
  seqSheet.visible = false;
  pr.add(seqSheet);
  const seqTex = canvasTex(256, 360, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 360);
    g.fillStyle = '#14b8a6'; g.fillRect(0, 0, 256, 8);
    g.fillStyle = '#111'; g.font = 'bold 17px sans-serif'; g.fillText('Compte rendu de run', 14, 40);
    g.font = '12px sans-serif'; g.fillText('Séquenceur NX-7', 14, 62);
    g.fillStyle = '#999'; for (let i = 0; i < 9; i++) g.fillRect(14, 90 + i * 18, 110 + Math.random() * 110, 5);
    g.fillStyle = '#14b8a6'; g.fillRect(14, 270, 120, 40);
  });
  plane(seqSheet, 0.21, 0.28, std({ map: seqTex, side: THREE.DoubleSide }), 0, 0, 0, { rx: -Math.PI / 2 });
  refs.printer = { group: pr, sheet, seqSheet };

  // chaise à roulettes
  const ch = new THREE.Group();
  ch.position.set(-0.15, 0, 0.55);
  ch.rotation.y = 0.2;
  desk.add(ch);
  const fabric = std({ color: 0x2b3a4f, roughness: 0.85 });
  rbox(ch, 0.46, 0.07, 0.44, 0.03, fabric, 0, 0.47, 0);
  rbox(ch, 0.44, 0.48, 0.06, 0.03, fabric, 0, 0.8, 0.24, { rx: -0.1 });
  cyl(ch, 0.02, 0.02, 0.3, metal, 0, 0.3, 0);
  cyl(ch, 0.012, 0.012, 0.32, metal, 0, 0.6, 0.21, { rx: -0.1 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = box(ch, 0.03, 0.025, 0.28, metal, Math.sin(a) * 0.14, 0.08, Math.cos(a) * 0.14, { ry: a });
    void leg;
    add(ch, new THREE.SphereGeometry(0.025, 10, 8), mats.black, Math.sin(a) * 0.27, 0.03, Math.cos(a) * 0.27);
  }

  // corbeille à papier avec un brouillon froissé
  const wb = new THREE.Group();
  wb.position.set(-0.95, 0, 0.05);
  desk.add(wb);
  const mesh = std({ color: 0x3b4148, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide, wireframe: false });
  add(wb, new THREE.CylinderGeometry(0.15, 0.12, 0.32, 24, 1, true), mesh, 0, 0.16, 0);
  cyl(wb, 0.12, 0.12, 0.01, mesh, 0, 0.005, 0);
  const ball = add(wb, new THREE.IcosahedronGeometry(0.05, 1), std({ color: 0xf4f2ea, roughness: 0.95, flatShading: true }), 0.02, 0.08, 0.01);
  refs.wastebasket = wb;
  refs.draftBall = ball;

  // collisions (repère monde : bureau x -0.45..1.05, z 3.27..4)
  colliders.push({ minX: -0.47, maxX: 1.07, minZ: 3.25, maxZ: 4 });
  colliders.push({ minX: 0.12, maxX: 0.78, minZ: 2.8, maxZ: 3.3 }); // chaise
  colliders.push({ minX: 1.1, maxX: 1.42, minZ: 3.4, maxZ: 3.72 }); // corbeille
  refs.desk = desk;
}

// Écran du PC portable
export function drawLaptop(refs, state) {
  const { screenCanvas: c, screenTex, screenMat } = refs.laptop;
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  if (state === 'off') {
    screenMat.emissiveIntensity = 0;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    screenTex.needsUpdate = true;
    return;
  }
  screenMat.emissiveIntensity = 1.1;
  if (state === 'login') {
    const grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, '#1d4f7a'); grd.addColorStop(1, '#0f2a44');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2b3a4f'; g.beginPath(); g.arc(W / 2, 110, 42, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.fillText('PH', W / 2, 121);
    g.font = 'bold 20px sans-serif'; g.fillText('P. Hemick', W / 2, 185);
    g.fillStyle = '#ffffff'; g.fillRect(W / 2 - 110, 205, 220, 34);
    g.fillStyle = '#5a6670'; g.font = '16px sans-serif'; g.fillText('Mot de passe…', W / 2, 228);
    g.fillStyle = '#cfe0f0'; g.font = '14px sans-serif'; g.fillText('🔒 Session verrouillée', W / 2, 275);
    g.textAlign = 'left';
  } else if (state.startsWith('boot')) {
    const p = Number(state.split(':')[1] || 0);
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e9eef2'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
    g.fillText('LabOS', W / 2, H / 2 - 10);
    g.fillStyle = '#2a3446'; g.fillRect(W / 2 - 100, H / 2 + 20, 200, 8);
    g.fillStyle = '#3f82e6'; g.fillRect(W / 2 - 100, H / 2 + 20, 200 * p, 8);
    g.textAlign = 'left';
  } else {
    // bureau + fenêtre bloquée
    const grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, '#1d4f7a'); grd.addColorStop(1, '#173a5c');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f4f6f8'; g.fillRect(40, 40, W - 80, H - 90);
    g.fillStyle = '#2b3a4f'; g.fillRect(40, 40, W - 80, 30);
    g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.fillText('LabNote — Compte rendu d’analyse', 52, 61);
    g.fillStyle = '#c62828'; g.fillRect(W - 66, 46, 18, 18);
    g.fillStyle = '#1a2530'; g.font = '15px sans-serif';
    g.fillText('Échantillon : T-07   Opérateur : T. Attot', 56, 100);
    g.fillText('Résultat du gel d’électrophorèse :', 56, 132);
    if (state === 'done') {
      g.fillStyle = '#166534'; g.font = 'bold 22px monospace'; g.fillText(CONFIG.gelCode, 56, 168);
      g.fillStyle = '#166534'; g.font = 'bold 16px sans-serif'; g.fillText('✓ Enregistré et imprimé', 56, 210);
    } else {
      g.strokeStyle = '#c62828'; g.lineWidth = 2; g.strokeRect(56, 146, 200, 32);
      g.fillStyle = '#c62828'; g.font = 'bold 18px monospace'; g.fillText('…', 66, 168);
      g.font = 'bold 14px sans-serif'; g.fillText('⚠ Résultat manquant', 56, 210);
    }
  }
  screenTex.needsUpdate = true;
}

// ---------- Transilluminateur UV (paillasse centrale) ----------
function buildTransilluminator(scene, refs) {
  const t = new THREE.Group();
  t.position.set(0.5, 0.92, -1.12);
  scene.add(t);
  rbox(t, 0.44, 0.09, 0.34, 0.015, std({ color: 0x2f3438, roughness: 0.5 }), 0, 0.045, 0);
  const plateMat = std({ color: 0x14101f, emissive: 0x6a2bff, emissiveIntensity: 0, roughness: 0.15 });
  box(t, 0.36, 0.005, 0.27, plateMat, 0, 0.092, 0, { cast: false });
  // gel d'agarose
  const gelMat = std({ color: 0xdfe9e6, roughness: 0.2, transparent: true, opacity: 0.55 });
  box(t, 0.25, 0.008, 0.2, gelMat, 0, 0.098, 0.005, { cast: false });
  // étiquettes : pistes A C G T, (−) puits en haut, (+) en bas
  const lanes = ['A', 'C', 'G', 'T'];
  const laneX = [-0.075, -0.025, 0.025, 0.075];
  const labelTexGel = canvasTex(512, 64, (g) => {
    g.fillStyle = '#f5f5f0'; g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#111'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center';
    g.fillText('−', 40, 46);
    lanes.forEach((l, i) => g.fillText(l, 256 + (laneX[i] / 0.25) * 512, 46));
    g.font = 'bold 18px sans-serif'; g.fillText('puits', 470, 40);
  });
  // les étiquettes restent lisibles dans le noir quand les UV sont allumés
  const gelLabelMat = std({ map: labelTexGel, emissive: 0xffffff, emissiveMap: labelTexGel, emissiveIntensity: 0, roughness: 0.6 });
  plane(t, 0.25, 0.031, gelLabelMat, 0, 0.103, -0.115, { rx: -Math.PI / 2 });
  const plusTex = canvasTex(512, 64, (g) => {
    g.fillStyle = '#f5f5f0'; g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#111'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center';
    g.fillText('+', 40, 46);
    g.font = 'bold 20px sans-serif'; g.fillText('migration ↓', 300, 42);
  });
  const plusLabelMat = std({ map: plusTex, emissive: 0xffffff, emissiveMap: plusTex, emissiveIntensity: 0, roughness: 0.6 });
  plane(t, 0.25, 0.031, plusLabelMat, 0, 0.103, 0.125, { rx: -Math.PI / 2 });
  // puits
  laneX.forEach((x) => box(t, 0.03, 0.004, 0.006, std({ color: 0x5b6466 }), x, 0.103, -0.088, { cast: false }));
  // bandes : lues du bas (+, près du joueur) vers le haut (−) = TTGACG
  const bandMat = std({ color: 0xd9cbb8, emissive: 0xff8a3d, emissiveIntensity: 0, roughness: 0.4 });
  bandMat.visible = false; // l'ADN coloré n'est visible que sous UV
  const seq = CONFIG.gelCode.split('');
  seq.forEach((base, i) => {
    const x = laneX[lanes.indexOf(base)];
    const z = 0.075 - i * 0.026;
    box(t, 0.038, 0.004, 0.009, bandMat, x, 0.104, z, { cast: false });
  });
  // capot de protection orange, transparent
  const cover = std({ color: 0xff9a1f, transparent: true, opacity: 0.38, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const cv = new THREE.Group();
  cv.position.y = 0.093;
  t.add(cv);
  box(cv, 0.4, 0.004, 0.31, cover, 0, 0.11, 0, { cast: false });
  box(cv, 0.4, 0.11, 0.004, cover, 0, 0.055, 0.155, { cast: false });
  box(cv, 0.4, 0.11, 0.004, cover, 0, 0.055, -0.155, { cast: false });
  box(cv, 0.004, 0.11, 0.31, cover, -0.2, 0.055, 0, { cast: false });
  box(cv, 0.004, 0.11, 0.31, cover, 0.2, 0.055, 0, { cast: false });
  // interrupteur UV en façade
  const sw = box(t, 0.035, 0.03, 0.01, std({ color: 0x8b1d1d, emissive: 0xff2a2a, emissiveIntensity: 0 }), 0.16, 0.045, 0.172);
  plane(t, 0.05, 0.022, std({ map: labelTex('UV', { w: 128, h: 56, bg: '#2f3438', fg: '#fff', size: 34 }) }), 0.1, 0.045, 0.1705);
  plane(t, 0.12, 0.022, std({ map: labelTex('⚠ UV — lunettes !', { w: 512, h: 96, bg: '#f2c200', fg: '#111', size: 50 }) }), -0.11, 0.045, 0.1705);
  const uvLight = new THREE.PointLight(0x8a5cff, 0, 1.2, 1.5);
  uvLight.position.set(0, 0.2, 0);
  t.add(uvLight);
  refs.transillum = { group: t, plateMat, bandMat, sw, uvLight, labelMats: [gelLabelMat, plusLabelMat] };
}

// ---------- Interrupteur (mur sud, près de l'entrée) ----------
function buildLightSwitch(scene, refs) {
  const s = new THREE.Group();
  s.position.set(-1.45, 1.15, 3.985);
  s.rotation.y = Math.PI;
  scene.add(s);
  rbox(s, 0.085, 0.085, 0.012, 0.006, std({ color: 0xf4f4f2, roughness: 0.4 }), 0, 0, 0);
  const rocker = rbox(s, 0.05, 0.05, 0.012, 0.005, std({ color: 0xffffff, roughness: 0.35 }), 0, 0, 0.008);
  refs.lightSwitch = { group: s, rocker };
}

// ---------- Poubelle à gants (mur est) ----------
function buildGloveBin(scene, refs, colliders) {
  const b = new THREE.Group();
  b.position.set(4.72, 0, 0.2);
  scene.add(b);
  const grey = std({ color: 0x8c949b, metalness: 0.5, roughness: 0.4 });
  cyl(b, 0.17, 0.16, 0.46, grey, 0, 0.23, 0, {}, 28);
  cyl(b, 0.175, 0.175, 0.03, std({ color: 0x41474d, roughness: 0.5 }), 0, 0.475, 0, {}, 28);
  box(b, 0.1, 0.02, 0.08, mats.black, -0.18, 0.02, 0);
  const lbl = labelTex('GANTS', { w: 256, h: 80, bg: '#ffffff', fg: '#1e5bb8', size: 44 });
  plane(b, 0.16, 0.05, std({ map: lbl }), -0.168, 0.33, 0, { ry: -Math.PI / 2 });
  refs.gloveBin = b;
  colliders.push({ minX: 4.53, maxX: 5, minZ: 0.02, maxZ: 0.38 });
}

// ---------- Évier avec vraie vasque ----------
function buildSink(scene, refs, colliders) {
  const sk = new THREE.Group();
  sk.position.set(4.67, 0, 1.4);
  scene.add(sk);
  box(sk, 0.62, 0.7, 1.2, mats.laminate, 0, 0.39, 0);
  box(sk, 0.6, 0.08, 1.18, mats.baseboard, 0, 0.04, 0);
  for (const s of [-1, 1]) {
    box(sk, 0.015, 0.6, 0.56, mats.laminateGrey, -0.31, 0.4, s * 0.29);
    box(sk, 0.02, 0.12, 0.012, mats.steel, -0.32, 0.6, s * 0.08);
  }
  // plan inox percé (4 morceaux autour de l'ouverture)
  const top = 0.9, th = 0.04;
  const hx0 = -0.22, hx1 = 0.16, hz = 0.25; // ouverture de la vasque (local)
  box(sk, 0.66, th, 1.24 / 2 - hz, mats.steel, 0, top, hz + (0.62 - hz) / 2, { cast: false });
  box(sk, 0.66, th, 1.24 / 2 - hz, mats.steel, 0, top, -(hz + (0.62 - hz) / 2), { cast: false });
  box(sk, hx0 + 0.33, th, hz * 2, mats.steel, (-0.33 + hx0) / 2, top, 0, { cast: false });
  box(sk, 0.33 - hx1, th, hz * 2, mats.steel, (0.33 + hx1) / 2, top, 0, { cast: false });
  // cuve
  const basin = std({ color: 0xb4bcc3, metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide });
  const depth = 0.18, bw = hx1 - hx0, bcx = (hx0 + hx1) / 2;
  const by = top + th / 2 - depth;
  box(sk, bw, 0.006, hz * 2, basin, bcx, by, 0, { cast: false });
  box(sk, 0.006, depth, hz * 2, basin, hx0, by + depth / 2, 0, { cast: false });
  box(sk, 0.006, depth, hz * 2, basin, hx1, by + depth / 2, 0, { cast: false });
  box(sk, bw, depth, 0.006, basin, bcx, by + depth / 2, hz, { cast: false });
  box(sk, bw, depth, 0.006, basin, bcx, by + depth / 2, -hz, { cast: false });
  cyl(sk, 0.025, 0.025, 0.004, mats.darkSteel, bcx, by + 0.004, 0, {}, 16);
  // dosseret + robinet col de cygne
  box(sk, 0.06, 0.25, 1.24, mats.laminateGrey, 0.3, 1.04, 0);
  add(sk, new THREE.TorusGeometry(0.12, 0.012, 8, 24, Math.PI), mats.steel, 0.12, 1.06, 0);
  cyl(sk, 0.012, 0.012, 0.16, mats.steel, 0.24, 0.98, 0);
  cyl(sk, 0.016, 0.014, 0.04, mats.steel, 0.0, 1.04, 0);
  box(sk, 0.08, 0.012, 0.012, mats.steel, 0.24, 1.0, 0.04, { ry: 0.6 });
  // filet d'eau (visible quand le robinet coule)
  const water = cyl(sk, 0.007, 0.009, 1.02 - by, std({ color: 0xbfe6ff, transparent: true, opacity: 0.6, roughness: 0.05, emissive: 0x335566, emissiveIntensity: 0.2 }), 0.0, (1.02 + by) / 2, 0, { cast: false }, 10);
  water.visible = false;
  // savon
  rbox(sk, 0.08, 0.2, 0.1, 0.01, mats.white, 0.27, 1.3, -0.35);
  refs.sink = { group: sk, water, basinY: by, basinX: bcx };
  colliders.push({ minX: 4.34, maxX: 5, minZ: 0.78, maxZ: 2.02 });
}

// ---------- Frigo +4 °C à clavier ----------
function buildFridge(scene, refs, colliders) {
  const fr = new THREE.Group();
  fr.position.set(4.65, 0, 3.0);
  scene.add(fr);
  const white = std({ color: 0xf4f6f7, roughness: 0.35 });
  const inner = std({ color: 0xe9eef2, roughness: 0.5, side: THREE.DoubleSide });
  const W = 0.7, H = 1.75, D = 0.66;
  // caisson (ouvert à l'avant, côté -x)
  box(fr, 0.03, H, W, white, D / 2 - 0.015, H / 2, 0);
  box(fr, D, H, 0.03, white, 0, H / 2, W / 2 - 0.015);
  box(fr, D, H, 0.03, white, 0, H / 2, -W / 2 + 0.015);
  box(fr, D, 0.04, W, white, 0, H - 0.02, 0);
  box(fr, D, 0.1, W, white, 0, 0.05, 0);
  box(fr, D - 0.04, 0.01, W - 0.06, inner, 0, 0.11, 0, { cast: false });
  const glassShelf = std({ color: 0xdff2f7, transparent: true, opacity: 0.35, roughness: 0.05 });
  for (const y of [0.55, 0.95, 1.35]) box(fr, D - 0.06, 0.008, W - 0.07, glassShelf, 0.0, y, 0, { cast: false });
  const glow = std({ color: 0xffffff, emissive: 0xe9f6ff, emissiveIntensity: 0 });
  box(fr, 0.15, 0.01, 0.3, glow, 0.05, H - 0.045, 0, { cast: false });
  const coldLight = new THREE.PointLight(0xdff1ff, 0, 1.6, 1.4);
  coldLight.position.set(-0.05, 1.5, 0);
  fr.add(coldLight);
  // porte : charnière côté sud (z +), s'ouvre vers la pièce (-x)
  const door = new THREE.Group();
  door.position.set(-D / 2, 0, W / 2);
  fr.add(door);
  box(door, 0.05, H - 0.02, W, white, -0.025, H / 2, -W / 2);
  box(door, 0.012, H - 0.12, W - 0.08, inner, 0.002, H / 2, -W / 2, { cast: false });
  box(door, 0.03, 0.5, 0.04, mats.darkSteel, -0.065, 1.15, -W + 0.07);
  plane(door, 0.24, 0.12, std({ map: T.fridgeLabelTexture() }), -0.051, 1.55, -W / 2, { ry: -Math.PI / 2 });
  // clavier à code sur la porte
  const kp = new THREE.Group();
  kp.position.set(-0.056, 1.3, -W + 0.17);
  kp.rotation.y = -Math.PI / 2;
  door.add(kp);
  rbox(kp, 0.08, 0.11, 0.015, 0.005, mats.darkSteel, 0, 0, 0);
  const kpTex = T.keypadTexture();
  plane(kp, 0.065, 0.095, std({ map: kpTex, emissive: 0xffffff, emissiveMap: kpTex, emissiveIntensity: 0.3 }), 0, 0, 0.008);
  const led = add(kp, new THREE.SphereGeometry(0.005, 10, 8), std({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 2 }), 0.028, 0.048, 0.008);

  // réactifs (à prendre)
  const reagents = {};
  const tube = (id, x, y, z, liquid, cap, h = 0.12, r = 0.022, labelTxt = null) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    fr.add(g);
    cyl(g, r, r, h, mats.labGlass, 0, h / 2, 0, {}, 16);
    cyl(g, r * 0.9, r * 0.9, h * 0.6, std({ color: liquid, transparent: true, opacity: 0.8 }), 0, h * 0.3 + 0.002, 0, { cast: false }, 16);
    cyl(g, r * 1.05, r * 1.05, h * 0.18, cap, 0, h + h * 0.09, 0, {}, 16);
    if (labelTxt) {
      const lt = labelTex(labelTxt, { w: 256, h: 96, bg: '#ffffff', fg: labelTxt.includes('-80') ? '#c62828' : '#1a2530', size: labelTxt.length > 6 ? 30 : 46 });
      add(g, new THREE.CylinderGeometry(r * 1.02, r * 1.02, h * 0.35, 16, 1, true, -Math.PI * 0.95, Math.PI * 0.9), std({ map: lt }), 0, h * 0.55, 0, { cast: false });
    }
    reagents[id] = g;
    return g;
  };
  tube('pbs', -0.08, 0.56, -0.18, 0xbfe3ff, mats.blueCap, 0.2, 0.035, 'PBS +4');
  tube('milieu', 0.0, 0.56, 0.0, 0xf3a6b8, mats.redCap, 0.22, 0.04, 'DMEM');
  tube('anticorps', -0.12, 0.96, 0.12, 0xefe9d8, std({ color: 0x7b3fb8 }), 0.08, 0.016, 'Ac +4');
  tube('arn', -0.14, 0.96, -0.08, 0xf8f8f8, mats.yellow, 0.09, 0.017, '-80 °C');
  // décor : boîtes et flacons non utilisables
  box(fr, 0.2, 0.12, 0.25, std({ color: 0x2f7fd6, roughness: 0.5 }), 0.12, 0.62, 0.15);
  box(fr, 0.18, 0.08, 0.2, std({ color: 0xffffff, roughness: 0.5 }), 0.12, 1.0, -0.15);
  tube('deco1', 0.1, 1.36, 0.1, 0xc8f7a6, mats.blueCap, 0.18, 0.03);
  tube('deco2', 0.02, 1.36, -0.12, 0xfff09a, mats.redCap, 0.16, 0.03);
  const kit = new THREE.Group();
  kit.position.set(-0.13, 1.36, 0.02);
  fr.add(kit);
  rbox(kit, 0.11, 0.09, 0.17, 0.008, std({ color: 0xf6f7f9, roughness: 0.45 }), 0, 0.045, 0);
  box(kit, 0.112, 0.02, 0.172, std({ color: 0x1e5bb8, roughness: 0.5 }), 0, 0.075, 0);
  plane(kit, 0.16, 0.05, std({ map: labelTex('KIT EXTRACTION ADN', { w: 512, h: 160, bg: '#ffffff', fg: '#1e5bb8', size: 44 }) }), -0.0565, 0.04, 0, { ry: -Math.PI / 2 });
  reagents.kit = kit;
  delete reagents.deco1; delete reagents.deco2;

  refs.fridge = { group: fr, door, keypad: kp, led, reagents, glow, coldLight, front: new THREE.Vector3(4.65 - D / 2, 1.2, 3.0) };
  colliders.push({ minX: 4.3, maxX: 5, minZ: 2.62, maxZ: 3.38 });
}

// ---------- Congélateur -80 °C ----------
function buildFreezer(scene, refs, colliders) {
  const fz = new THREE.Group();
  fz.position.set(4.3, 0, -3.6);
  scene.add(fz);
  const white = std({ color: 0xf2f4f5, roughness: 0.4 });
  const frost = std({ color: 0xdcecf5, roughness: 0.9, side: THREE.DoubleSide });
  const W = 0.9, H = 1.95, D = 0.75;
  box(fz, W, H, 0.04, white, 0, H / 2, -D / 2 + 0.02);
  box(fz, 0.04, H, D, white, -W / 2 + 0.02, H / 2, 0);
  box(fz, 0.04, H, D, white, W / 2 - 0.02, H / 2, 0);
  box(fz, W, 0.05, D, white, 0, H - 0.025, 0);
  box(fz, W, 0.12, D, white, 0, 0.06, 0);
  for (const y of [0.5, 0.95, 1.4]) box(fz, W - 0.08, 0.02, D - 0.1, frost, 0, y, 0, { cast: false });
  box(fz, W - 0.08, 1.7, 0.01, frost, 0, 1.0, -D / 2 + 0.05, { cast: false });
  // racks de boîtes
  for (const [x, y] of [[-0.2, 0.52], [0.15, 0.52], [-0.2, 0.97], [0.2, 1.42]]) {
    rbox(fz, 0.25, 0.12, 0.4, 0.01, std({ color: 0x4f7fb0, roughness: 0.6 }), x, y + 0.07, -0.05);
  }
  // porte : charnière à droite (x +), s'ouvre vers la pièce (+z)
  const door = new THREE.Group();
  door.position.set(W / 2, 0, D / 2);
  fz.add(door);
  box(door, W, H - 0.05, 0.06, white, -W / 2, H / 2, 0.03);
  box(door, 0.04, 0.6, 0.04, mats.darkSteel, -W + 0.08, 1.1, 0.08);
  const disp = T.textPlaneTexture('-80 °C', { bg: '#000', fg: '#7fdcff', size: 72 });
  plane(door, 0.22, 0.08, std({ color: 0x0c1a12, emissive: 0x6ad1ff, emissiveIntensity: 0.6, emissiveMap: disp }), -W / 2 - 0.1, 1.7, 0.061);
  plane(door, 0.3, 0.06, std({ map: labelTex('ÉCHANTILLONS -80 °C', { w: 512, h: 96, bg: '#ffffff', fg: '#1e5bb8', size: 42 }) }), -W / 2, 1.5, 0.061);
  // portoir où l'on range l'ARN (étagère du milieu, à l'avant)
  const rack = new THREE.Group();
  rack.position.set(0.18, 0.96, 0.2);
  fz.add(rack);
  rbox(rack, 0.16, 0.06, 0.1, 0.006, std({ color: 0xf6f7f9, roughness: 0.5 }), 0, 0.03, 0);
  plane(rack, 0.12, 0.03, std({ map: labelTex('ARN — T-07', { w: 512, h: 128, bg: '#ffffff', fg: '#c62828', size: 56 }) }), 0, 0.03, 0.051);
  const arnTube = new THREE.Group();
  arnTube.position.set(0, 0.05, 0);
  arnTube.visible = false;
  rack.add(arnTube);
  cyl(arnTube, 0.017, 0.017, 0.09, mats.labGlass, 0, 0.045, 0, {}, 14);
  cyl(arnTube, 0.018, 0.018, 0.016, mats.yellow, 0, 0.098, 0, {}, 14);
  // bloc de glace collé au bord de l'étagère du haut (le centre du groupe = centre du bloc)
  const ice = new THREE.Group();
  ice.position.set(-0.17, 1.41 + 0.055, 0.22);
  ice.rotation.y = 0.15;
  fz.add(ice);
  const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xd6f1ff, roughness: 0.15, transparent: true, opacity: 0.85, envMapIntensity: 1.5 });
  rbox(ice, 0.14, 0.11, 0.12, 0.02, iceMat, 0, 0, 0);
  const inKey = makeKey(0xaab4bd);
  inKey.rotation.set(0, 0.4, Math.PI / 2);
  inKey.scale.setScalar(1.3);
  ice.add(inKey);
  const coldLight = new THREE.PointLight(0xcfe8ff, 0, 1.6, 1.4);
  coldLight.position.set(0, 1.2, 0.25);
  fz.add(coldLight);
  refs.freezer = { group: fz, door, ice, arnTube, coldLight, W, D };
  colliders.push({ minX: 3.85, maxX: 4.75, minZ: -4, maxZ: -3.2 });
}

export function buildProps(scene, refs, colliders) {
  buildDesk(scene, refs, colliders);
  buildTransilluminator(scene, refs);
  buildLightSwitch(scene, refs);
  buildGloveBin(scene, refs, colliders);
  buildSink(scene, refs, colliders);
  buildFridge(scene, refs, colliders);
  buildFreezer(scene, refs, colliders);
  drawLaptop(refs, 'off');
}
