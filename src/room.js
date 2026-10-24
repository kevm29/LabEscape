// Construction de la salle du laboratoire.
// Repère : x de -5 (mur ouest) à 5 (mur est), z de -4 (mur nord) à 4 (mur sud), y = hauteur.
// Le joueur entre par le sud et regarde vers le nord (paillasses vitrées).
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../lib/three/addons/RoundedBoxGeometry.js';
import * as T from './textures.js';

export const ROOM = { minX: -5, maxX: 5, minZ: -4, maxZ: 4, height: 3 };
// Ligne jaune/noire en L : zone de manip = au nord de PPE_LINE_Z, ou à l'est de PPE_LINE_X
export const PPE_LINE_Z = 0.6;
export const PPE_LINE_X = 1.6;
export const inManipZone = (x, z) => z < PPE_LINE_Z || x > PPE_LINE_X;

const mats = {};
function initMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  Object.assign(mats, {
    wall: std({ map: T.wallTexture(), roughness: 0.92 }),
    wainscot: std({ color: 0x9fb3be, roughness: 0.55 }),
    baseboard: std({ color: 0x4a5258, roughness: 0.6 }),
    floor: std({ map: T.floorTexture(), roughness: 0.42, metalness: 0.0 }),
    ceiling: std({ map: T.ceilingTexture(), roughness: 0.95 }),
    lightPanel: std({ color: 0xffffff, emissive: 0xfff8ee, emissiveIntensity: 2.2 }),
    ceilingPanel: std({ color: 0xffffff, emissive: 0xfff8ee, emissiveIntensity: 2.2 }),
    laminate: std({ color: 0xe6eaec, roughness: 0.5 }),
    laminateGrey: std({ color: 0xc3cbd0, roughness: 0.55 }),
    epoxy: std({ color: 0x1f2328, roughness: 0.28 }),
    steel: std({ color: 0xc4cad0, metalness: 0.85, roughness: 0.32 }),
    darkSteel: std({ color: 0x5c656d, metalness: 0.7, roughness: 0.45 }),
    hoodInner: std({ color: 0xf3f5f6, roughness: 0.45 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xdff2f7, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16,
      envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide,
    }),
    labGlass: new THREE.MeshPhysicalMaterial({
      color: 0xeef8ff, roughness: 0.05, transparent: true, opacity: 0.32,
      envMapIntensity: 1.4, depthWrite: false,
    }),
    amberGlass: std({ color: 0x6b3510, roughness: 0.15, transparent: true, opacity: 0.88 }),
    yellow: std({ color: 0xf2c200, roughness: 0.55 }),
    yellowDark: std({ color: 0xd9a800, roughness: 0.5 }),
    door: std({ color: 0x5f7f90, roughness: 0.5 }),
    doorFrame: std({ color: 0xd8dde0, metalness: 0.3, roughness: 0.4 }),
    wood: std({ color: 0x9c7349, roughness: 0.7 }),
    coat: std({ color: 0xeef1f3, roughness: 0.88 }),
    coatShade: std({ color: 0xd9dee2, roughness: 0.9 }),
    button: std({ color: 0xdcdcdc, roughness: 0.3 }),
    plasticClear: new THREE.MeshStandardMaterial({
      color: 0xd8f0ff, roughness: 0.15, transparent: true, opacity: 0.55, envMapIntensity: 1.5,
    }),
    strap: std({ color: 0x1f3550, roughness: 0.8 }),
    black: std({ color: 0x18191b, roughness: 0.5 }),
    blueCap: std({ color: 0x1e5bb8, roughness: 0.4 }),
    redCap: std({ color: 0xc62828, roughness: 0.4 }),
    white: std({ color: 0xffffff, roughness: 0.5 }),
    rubber: std({ color: 0x2a2d30, roughness: 0.9 }),
  });
}
export { mats, add, box, rbox, cyl, plane, labelMat, bottle, erlenmeyer, beaker, tubeRack };

// ---------- helpers ----------
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
const cyl = (p, rt, rb, h, mat, x, y, z, o, seg = 24) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, o);

function plane(p, w, h, mat, x, y, z, o) {
  return add(p, new THREE.PlaneGeometry(w, h), mat, x, y, z, { cast: false, receive: false, ...o });
}
function labelMat(tex, opts = {}) {
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, transparent: !!opts.transparent, ...opts });
}

// ---------- petits objets de labo ----------
function bottle(p, x, y, z, { r = 0.035, h = 0.17, amber = false, liquid = 0x9fd3ff, fill = 0.6, cap = mats.blueCap } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  const bodyMat = amber ? mats.amberGlass : mats.labGlass;
  cyl(g, r, r, h, bodyMat, 0, h / 2, 0, { cast: true }, 20);
  cyl(g, r * 0.45, r, h * 0.12, bodyMat, 0, h + h * 0.06, 0, {}, 16);
  cyl(g, r * 0.5, r * 0.5, h * 0.12, cap, 0, h + h * 0.17, 0, {}, 16);
  if (!amber && fill > 0) {
    const lm = new THREE.MeshStandardMaterial({ color: liquid, roughness: 0.1, transparent: true, opacity: 0.75 });
    cyl(g, r * 0.9, r * 0.9, h * fill, lm, 0, (h * fill) / 2 + 0.003, 0, { cast: false }, 20);
  }
  cyl(g, r * 1.01, r * 1.01, h * 0.35, mats.white, 0, h * 0.45, 0, { cast: false }, 20);
  return g;
}

function erlenmeyer(p, x, y, z, liquid = 0xff8fb0, s = 1) {
  const pts = [
    new THREE.Vector2(0, 0), new THREE.Vector2(0.06, 0), new THREE.Vector2(0.065, 0.01),
    new THREE.Vector2(0.022, 0.12), new THREE.Vector2(0.02, 0.17), new THREE.Vector2(0.024, 0.175),
  ];
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  p.add(g);
  add(g, new THREE.LatheGeometry(pts, 24), mats.labGlass, 0, 0, 0, { cast: true });
  const lp = [new THREE.Vector2(0, 0.002), new THREE.Vector2(0.058, 0.002), new THREE.Vector2(0.06, 0.01), new THREE.Vector2(0.04, 0.055), new THREE.Vector2(0, 0.055)];
  add(g, new THREE.LatheGeometry(lp, 24), new THREE.MeshStandardMaterial({ color: liquid, roughness: 0.1, transparent: true, opacity: 0.8 }), 0, 0, 0, { cast: false });
  return g;
}

function beaker(p, x, y, z, liquid = 0x7ee0b0, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  p.add(g);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 24, 1, true), mats.labGlass);
  m.position.y = 0.06;
  g.add(m);
  add(g, new THREE.CircleGeometry(0.045, 24), mats.labGlass, 0, 0.001, 0, { rx: -Math.PI / 2, cast: false });
  cyl(g, 0.042, 0.042, 0.06, new THREE.MeshStandardMaterial({ color: liquid, transparent: true, opacity: 0.7, roughness: 0.1 }), 0, 0.031, 0, { cast: false });
  return g;
}

function tubeRack(p, x, y, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  p.add(g);
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x2f7fd6, roughness: 0.5 });
  box(g, 0.26, 0.012, 0.1, rackMat, 0, 0.005, 0);
  box(g, 0.26, 0.012, 0.1, rackMat, 0, 0.07, 0);
  box(g, 0.012, 0.075, 0.1, rackMat, -0.125, 0.037, 0);
  box(g, 0.012, 0.075, 0.1, rackMat, 0.125, 0.037, 0);
  const caps = [mats.redCap, mats.blueCap, mats.yellow, mats.white];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 2; j++) {
      if (Math.random() < 0.25) continue;
      const tx = -0.1 + i * 0.04, tz = -0.022 + j * 0.044;
      cyl(g, 0.007, 0.006, 0.1, mats.labGlass, tx, 0.06, tz, { cast: false }, 10);
      cyl(g, 0.009, 0.009, 0.015, caps[(i + j) % caps.length], tx, 0.115, tz, {}, 10);
    }
  }
  return g;
}

function microscope(p, x, y, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  p.add(g);
  const body = new THREE.MeshStandardMaterial({ color: 0xf0f0ee, roughness: 0.4 });
  rbox(g, 0.18, 0.04, 0.22, 0.012, body, 0, 0.02, 0);
  rbox(g, 0.05, 0.26, 0.06, 0.012, body, 0, 0.16, 0.07);
  rbox(g, 0.13, 0.015, 0.12, 0.004, mats.black, 0, 0.12, -0.01);
  rbox(g, 0.07, 0.07, 0.14, 0.015, body, 0, 0.28, 0.02);
  cyl(g, 0.012, 0.012, 0.08, mats.black, -0.02, 0.33, 0.07, { rx: -0.6 });
  cyl(g, 0.012, 0.012, 0.08, mats.black, 0.02, 0.33, 0.07, { rx: -0.6 });
  cyl(g, 0.012, 0.009, 0.05, mats.steel, 0, 0.225, -0.03);
  cyl(g, 0.02, 0.02, 0.025, mats.darkSteel, 0.035, 0.12, 0.07, { rz: Math.PI / 2 });
  return g;
}

function stool(p, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  p.add(g);
  cyl(g, 0.18, 0.18, 0.06, new THREE.MeshStandardMaterial({ color: 0x23395b, roughness: 0.7 }), 0, 0.66, 0);
  cyl(g, 0.025, 0.025, 0.6, mats.steel, 0, 0.35, 0);
  cyl(g, 0.24, 0.24, 0.02, mats.darkSteel, 0, 0.03, 0);
  add(g, new THREE.TorusGeometry(0.16, 0.008, 8, 32), mats.steel, 0, 0.28, 0, { rx: Math.PI / 2 });
  return g;
}

// Lunettes de protection (modèle réutilisé pour l'animation)
export function makeGoggles() {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x6fb2ee, roughness: 0.2, transparent: true, opacity: 0.85, envMapIntensity: 1.2,
  });
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0xeaf6ff, roughness: 0.03, transparent: true, opacity: 0.25, envMapIntensity: 2, depthWrite: false,
  });
  // monture : coque arrondie
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.065, 0.055, 4, 0.024), frameMat);
  g.add(shell);
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), lensMat);
  lens.position.z = 0.029;
  g.add(lens);
  // pont de nez
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.05), frameMat);
  nose.position.set(0, -0.03, 0.005);
  g.add(nose);
  // élastique
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.006, 6, 24, Math.PI), mats.strap);
  strap.rotation.x = Math.PI / 2;
  strap.position.z = -0.02;
  strap.scale.set(1, 0.9, 1);
  g.add(strap);
  // aérations
  for (const sx of [-0.07, 0.07]) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 10), mats.strap);
    v.rotation.x = Math.PI / 2;
    v.position.set(sx, 0.033, 0.012);
    v.rotation.z = 0;
    g.add(v);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Blouse accrochée au porte-manteau (face vers +x)
function makeHangingCoat(name, role) {
  const g = new THREE.Group();
  const bodyGeo = new THREE.CylinderGeometry(0.15, 0.24, 0.98, 28, 6);
  const body = add(g, bodyGeo, mats.coat, 0, -0.57, 0);
  body.scale.set(0.42, 1, 1);
  // épaules arrondies
  const sh = add(g, new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.coat, 0, -0.08, 0);
  sh.scale.set(0.42, 0.45, 1);
  // manches
  for (const s of [-1, 1]) {
    const sl = add(g, new THREE.CylinderGeometry(0.042, 0.052, 0.6, 16), mats.coatShade, -0.025, -0.42, s * 0.165, { rx: s * 0.06 });
    sl.scale.set(0.8, 1, 1);
    // revers de manche
    add(g, new THREE.CylinderGeometry(0.053, 0.053, 0.05, 16), mats.coat, -0.025, -0.71, s * 0.183, { rx: s * 0.06 });
  }
  // fermeture + boutons
  box(g, 0.004, 0.9, 0.006, mats.coatShade, 0.085, -0.6, 0, { cast: false });
  for (let i = 0; i < 4; i++) {
    cyl(g, 0.009, 0.009, 0.006, mats.button, 0.088, -0.25 - i * 0.17, -0.012, { rz: Math.PI / 2 }, 10);
  }
  // col
  const col = add(g, new THREE.TorusGeometry(0.07, 0.016, 8, 20, Math.PI), mats.coat, 0.012, -0.1, 0, { ry: Math.PI / 2, rx: -0.2 });
  col.scale.set(1, 0.7, 1);
  // poches
  box(g, 0.012, 0.13, 0.13, mats.coatShade, 0.097, -0.82, -0.11);
  box(g, 0.012, 0.13, 0.13, mats.coatShade, 0.097, -0.82, 0.11);
  box(g, 0.01, 0.07, 0.07, mats.coatShade, 0.078, -0.4, 0.09);
  // stylo dans la poche poitrine
  cyl(g, 0.005, 0.005, 0.06, mats.blueCap, 0.082, -0.36, 0.11, {}, 8);
  // badge nominatif
  const tag = plane(g, 0.1, 0.0375, labelMat(T.nameTagTexture(name, role)), 0.083, -0.3, -0.07, { ry: Math.PI / 2 });
  tag.rotation.z = 0;
  // cintre
  add(g, new THREE.TorusGeometry(0.02, 0.004, 6, 16), mats.steel, 0, 0.0, 0, { ry: Math.PI / 2 });
  return g;
}

// ---------- hottes / paillasses vitrées ----------
function makeHood(scene, cx, { withBin = false, props = () => {} } = {}) {
  const g = new THREE.Group();
  g.position.set(cx, 0, -3.575);
  scene.add(g);
  const W = 1.6, D = 0.85;
  const front = D / 2;
  let bin = null;

  // soubassement
  if (withBin) {
    box(g, 0.03, 0.88, D - 0.04, mats.laminate, -W / 2 + 0.015, 0.44, 0);
    box(g, 0.03, 0.88, D - 0.04, mats.laminate, W / 2 - 0.015, 0.44, 0);
    box(g, W - 0.06, 0.88, 0.02, mats.laminateGrey, 0, 0.44, -D / 2 + 0.03);
    box(g, W - 0.06, 0.06, D - 0.1, mats.laminate, 0, 0.85, -0.02);
    // poubelle DASRI jaune
    bin = new THREE.Group();
    bin.position.set(0.2, 0, 0.02);
    g.add(bin);
    rbox(bin, 0.46, 0.6, 0.4, 0.02, mats.yellow, 0, 0.3, 0);
    rbox(bin, 0.48, 0.05, 0.42, 0.015, mats.yellowDark, 0, 0.62, 0);
    rbox(bin, 0.2, 0.02, 0.08, 0.008, mats.yellowDark, 0, 0.655, 0.1);
    // pédale
    box(bin, 0.18, 0.03, 0.06, mats.black, 0, 0.02, 0.22);
    // étiquette
    plane(bin, 0.3, 0.3, labelMat(T.dasriLabelTexture(), { transparent: true }), 0, 0.33, 0.201);
    // sac jaune qui dépasse sous le couvercle
    const bag = add(bin, new THREE.TorusGeometry(0.21, 0.012, 6, 24), new THREE.MeshStandardMaterial({ color: 0xe8c000, roughness: 0.9 }), 0, 0.6, 0, { rx: Math.PI / 2 });
    bag.scale.set(1, 0.95, 1);
  } else {
    box(g, W - 0.02, 0.8, D - 0.06, mats.laminate, 0, 0.48, -0.02);
    box(g, W - 0.1, 0.08, D - 0.12, mats.baseboard, 0, 0.04, -0.02);
    // portes
    for (const s of [-1, 1]) {
      box(g, W / 2 - 0.03, 0.76, 0.015, mats.laminateGrey, s * (W / 4), 0.48, front - 0.04);
      box(g, 0.012, 0.14, 0.02, mats.steel, s * 0.08, 0.6, front - 0.02);
    }
  }
  // plan de travail (résine époxy noire)
  box(g, W + 0.02, 0.04, D, mats.epoxy, 0, 0.9, 0);

  // caisson de la hotte
  const topY = 2.32;
  box(g, 0.06, topY - 0.92, D, mats.laminate, -W / 2 + 0.03, (topY + 0.92) / 2, 0);
  box(g, 0.06, topY - 0.92, D, mats.laminate, W / 2 - 0.03, (topY + 0.92) / 2, 0);
  box(g, W - 0.12, topY - 0.92, 0.03, mats.hoodInner, 0, (topY + 0.92) / 2, -D / 2 + 0.015, { cast: false });
  box(g, W, 0.34, D, mats.laminate, 0, topY - 0.17, 0);
  // bandeau lumineux intérieur
  box(g, W - 0.2, 0.015, 0.12, mats.lightPanel, 0, topY - 0.345, -0.05, { cast: false });
  // afficheur de débit
  plane(g, 0.24, 0.07, new THREE.MeshStandardMaterial({
    map: T.textPlaneTexture('DÉBIT OK  0,5 m/s', { w: 512, h: 150, bg: '#0c1a12', fg: '#45f58b', size: 46 }),
    emissive: 0xffffff, emissiveMap: T.textPlaneTexture('DÉBIT OK  0,5 m/s', { w: 512, h: 150, bg: '#0c1a12', fg: '#45f58b', size: 46 }), emissiveIntensity: 0.6,
  }), W / 2 - 0.22, topY - 0.12, front + 0.002);
  // seuil aérodynamique (barre inox à l'avant)
  cyl(g, 0.018, 0.018, W - 0.12, mats.steel, 0, 0.95, front - 0.03, { rz: Math.PI / 2 }, 12);
  // rails de guillotine
  box(g, 0.025, topY - 1.0, 0.04, mats.darkSteel, -W / 2 + 0.07, (topY + 1.0) / 2 - 0.15, front - 0.05);
  box(g, 0.025, topY - 1.0, 0.04, mats.darkSteel, W / 2 - 0.07, (topY + 1.0) / 2 - 0.15, front - 0.05);
  // vitre guillotine
  const sashBottom = 1.24, sashTop = 2.0;
  const glass = add(g, new THREE.BoxGeometry(W - 0.16, sashTop - sashBottom, 0.01), mats.glass, 0, (sashBottom + sashTop) / 2, front - 0.05, { cast: false, receive: false });
  glass.renderOrder = 2;
  box(g, W - 0.14, 0.035, 0.03, mats.darkSteel, 0, sashBottom, front - 0.05);
  box(g, W - 0.14, 0.02, 0.025, mats.darkSteel, 0, sashTop, front - 0.05);
  cyl(g, 0.012, 0.012, 0.5, mats.steel, 0, sashBottom - 0.03, front - 0.01, { rz: Math.PI / 2 }, 10);
  // lumière intérieure
  const l = new THREE.PointLight(0xfff4e0, 1.2, 2.2, 1.5);
  l.userData.switchable = true;
  l.position.set(0, 1.85, -0.1);
  g.add(l);

  props(g);
  return { group: g, bin, collider: { minX: cx - W / 2, maxX: cx + W / 2, minZ: -4, maxZ: -3.575 + front + 0.02 } };
}

// ---------- construction ----------
export function buildRoom(scene) {
  initMaterials();
  const colliders = [];
  const refs = {};
  const { minX, maxX, minZ, maxZ, height: H } = ROOM;
  const W = maxX - minX, D = maxZ - minZ;
  const addCol = (minx, maxx, minz, maxz) => colliders.push({ minX: minx, maxX: maxx, minZ: minz, maxZ: maxz });

  // sol / plafond
  plane(scene, W, D, mats.floor, 0, 0, 0, { rx: -Math.PI / 2, receive: true });
  plane(scene, W, D, mats.ceiling, 0, H, 0, { rx: Math.PI / 2 });

  // murs + soubassement
  const walls = [
    { len: W, x: 0, z: minZ, ry: 0 },
    { len: W, x: 0, z: maxZ, ry: Math.PI },
    { len: D, x: minX, z: 0, ry: Math.PI / 2 },
    { len: D, x: maxX, z: 0, ry: -Math.PI / 2 },
  ];
  for (const w of walls) {
    plane(scene, w.len, H, mats.wall, w.x, H / 2, w.z, { ry: w.ry });
    const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), w.ry);
    plane(scene, w.len, 1.0, mats.wainscot, w.x + n.x * 0.004, 0.5, w.z + n.z * 0.004, { ry: w.ry });
    box(scene, w.len, 0.03, 0.02, mats.laminate, w.x + n.x * 0.01, 1.0, w.z + n.z * 0.01, { ry: w.ry, cast: false, receive: false });
    box(scene, w.len, 0.1, 0.015, mats.baseboard, w.x + n.x * 0.008, 0.05, w.z + n.z * 0.008, { ry: w.ry, cast: false });
  }

  // dalles lumineuses au plafond
  const panelPos = [];
  for (const x of [-3, 0, 3]) for (const z of [-2, 1.6]) panelPos.push([x, z]);
  for (const [x, z] of panelPos) {
    box(scene, 1.2, 0.03, 0.6, mats.ceilingPanel, x, H - 0.015, z, { cast: false, receive: false });
    box(scene, 1.24, 0.02, 0.64, mats.laminateGrey, x, H - 0.008, z, { cast: false, receive: false });
  }

  // ===== VESTIAIRE (mur ouest, côté entrée) =====
  // porte-manteau
  const rackZ = [2.25, 2.7, 3.15];
  box(scene, 0.03, 0.12, 1.4, mats.wood, minX + 0.015, 1.9, 2.7);
  const coatDefs = [
    { name: 'Dr. P. Hemick', role: 'Chercheur' },
    { name: 'T. Attot', role: 'Doctorant' },
    { name: 'Visiteur', role: 'Blouse de prêt' },
  ];
  refs.coats = rackZ.map((z, i) => {
    // patère
    cyl(scene, 0.012, 0.012, 0.1, mats.steel, minX + 0.08, 1.92, z, { rz: Math.PI / 2 - 0.4 }, 10);
    add(scene, new THREE.SphereGeometry(0.018, 12, 8), mats.steel, minX + 0.125, 1.95, z);
    const coat = makeHangingCoat(coatDefs[i].name, coatDefs[i].role);
    coat.position.set(minX + 0.13, 1.93, z);
    coat.rotation.y = (Math.random() - 0.5) * 0.08;
    scene.add(coat);
    return { group: coat, index: i, ...coatDefs[i], home: coat.position.clone() };
  });
  addCol(minX, minX + 0.3, 1.95, 3.45);

  // étagère : lunettes + distributeur de gants
  box(scene, 0.32, 0.025, 0.95, mats.laminate, minX + 0.16, 1.0, 1.2);
  for (const z of [0.76, 1.64]) box(scene, 0.25, 0.12, 0.02, mats.darkSteel, minX + 0.12, 0.94, z);
  addCol(minX, minX + 0.34, 0.7, 1.7);

  // boîte de lunettes (bac ouvert)
  const gb = new THREE.Group();
  gb.position.set(minX + 0.17, 1.0125, 1.4);
  scene.add(gb);
  const card = new THREE.MeshStandardMaterial({ color: 0xb98d5a, roughness: 0.85 });
  box(gb, 0.22, 0.008, 0.3, card, 0, 0.004, 0);
  box(gb, 0.22, 0.08, 0.008, card, 0, 0.04, -0.146);
  box(gb, 0.22, 0.08, 0.008, card, 0, 0.04, 0.146);
  box(gb, 0.008, 0.08, 0.3, card, -0.106, 0.04, 0);
  const gbFront = box(gb, 0.008, 0.08, 0.3, card, 0.106, 0.04, 0);
  plane(gb, 0.29, 0.075, labelMat(T.gogglesBoxTexture()), 0.111, 0.04, 0, { ry: Math.PI / 2 });
  // lunettes dans la boîte (deux décoratives + une à prendre)
  for (const [z, ry] of [[-0.07, 0.3], [0.06, -0.2]]) {
    const gg = makeGoggles();
    gg.position.set(-0.02, 0.04, z);
    gg.rotation.set(-1.2, Math.PI / 2 + ry, 0);
    gg.scale.setScalar(0.9);
    gb.add(gg);
  }
  const goggles = makeGoggles();
  goggles.position.set(0.02, 0.1, 0);
  goggles.rotation.set(-0.35, Math.PI / 2, 0);
  gb.add(goggles);
  refs.goggles = goggles;
  refs.gogglesBox = gb;
  void gbFront;

  // distributeur de gants (boîte carton fixée au mur)
  const gd = new THREE.Group();
  gd.position.set(minX + 0.08, 1.42, 0.98);
  scene.add(gd);
  box(gd, 0.13, 0.13, 0.25, card, 0, 0, 0);
  plane(gd, 0.25, 0.125, labelMat(T.gloveBoxTexture()), 0.0655, 0, 0, { ry: Math.PI / 2 });
  // support métallique
  box(gd, 0.14, 0.01, 0.27, mats.steel, 0.0, -0.07, 0);
  box(gd, 0.01, 0.06, 0.27, mats.steel, 0.07, -0.045, 0);
  // gant qui dépasse
  const tuft = add(gd, new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3d7fe0, roughness: 0.55 }), 0.075, 0.0, -0.01);
  tuft.scale.set(0.45, 0.6, 1.2);
  refs.gloveBox = gd;
  refs.gloveTuft = tuft;

  // panneau EPI
  plane(scene, 0.8, 0.4, labelMat(T.ppeSignTexture()), minX + 0.006, 2.1, 1.25, { ry: Math.PI / 2 });

  // ligne de sécurité au sol
  const lineMat = new THREE.MeshStandardMaterial({ map: T.floorLineTexture(), roughness: 0.5 });
  const segA = PPE_LINE_X + 0.05 - minX; // du mur ouest jusqu'au coude
  plane(scene, segA, 0.1, lineMat, minX + segA / 2, 0.003, PPE_LINE_Z, { rx: -Math.PI / 2 });
  const segB = maxZ - PPE_LINE_Z - 0.05; // du coude jusqu'au mur sud
  plane(scene, segB, 0.1, lineMat, PPE_LINE_X, 0.0032, PPE_LINE_Z + 0.05 + segB / 2, { rx: -Math.PI / 2, rz: Math.PI / 2 });
  plane(scene, 2.2, 0.34, new THREE.MeshStandardMaterial({ map: T.floorTextTexture(), transparent: true, roughness: 0.6, depthWrite: false }), -2.0, 0.004, PPE_LINE_Z + 0.32, { rx: -Math.PI / 2 });

  // ===== PORTE D'ENTRÉE (mur sud) =====
  const entry = new THREE.Group();
  entry.position.set(-2.2, 0, maxZ);
  scene.add(entry);
  box(entry, 1.12, 2.18, 0.06, mats.doorFrame, 0, 1.09, -0.02);
  const entryDoor = box(entry, 1.0, 2.1, 0.05, mats.door, 0, 1.05, -0.04);
  box(entry, 0.35, 0.45, 0.052, mats.glass, 0, 1.55, -0.04, { cast: false });
  cyl(entry, 0.012, 0.012, 0.14, mats.steel, 0.38, 1.05, -0.1, { rz: Math.PI / 2 }, 10);
  plane(entry, 0.2, 0.235, labelMat(T.biohazardDoorSignTexture(), { transparent: true }), 0, 1.15, -0.068, { ry: Math.PI });
  refs.entryDoor = entryDoor;

  // ===== ZONE DE MANIP : hottes vitrées au nord =====
  // hottes 1 et 2 → séquenceur et robot (voir machines.js) ; la 3e reste une hotte (PSM)
  const hoodC = makeHood(scene, 0.0, {
    withBin: true,
    props: (g) => {
      tubeRack(g, -0.45, 0.92, -0.18, 0.1);
      bottle(g, 0.45, 0.92, -0.22, { liquid: 0xc8a0ff, cap: mats.redCap });
      // mini-centrifugeuse et vortex
      cyl(g, 0.07, 0.075, 0.08, new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.35 }), 0.15, 0.96, -0.25, {}, 24);
      cyl(g, 0.055, 0.055, 0.012, mats.blueCap, 0.15, 1.006, -0.25, {}, 24);
      rbox(g, 0.1, 0.07, 0.12, 0.012, mats.white, -0.12, 0.955, -0.25);
      cyl(g, 0.03, 0.03, 0.02, mats.black, -0.12, 1.0, -0.25, {}, 16);
      // poubelle à piquants
      rbox(g, 0.12, 0.16, 0.1, 0.01, mats.yellow, 0.62, 1.0, -0.25);
      cyl(g, 0.03, 0.03, 0.01, mats.redCap, 0.62, 1.085, -0.25);
    },
  });
  colliders.push(hoodC.collider);
  refs.dasri = hoodC.bin;
  refs.hood = hoodC.group;

  // paillasse nord-est : incubateur + centrifugeuse
  const ne = new THREE.Group();
  ne.position.set(2.25, 0, -3.6);
  scene.add(ne);
  box(ne, 2.5, 0.86, 0.75, mats.laminate, 0, 0.47, 0);
  box(ne, 2.42, 0.08, 0.7, mats.baseboard, 0, 0.04, -0.01);
  box(ne, 2.52, 0.04, 0.8, mats.epoxy, 0, 0.9, 0);
  for (let i = 0; i < 4; i++) {
    box(ne, 0.6, 0.76, 0.015, mats.laminateGrey, -0.93 + i * 0.62, 0.48, 0.38);
    box(ne, 0.12, 0.012, 0.02, mats.steel, -0.93 + i * 0.62, 0.8, 0.395);
  }
  refs.neBench = ne;
  // centrifugeuse
  rbox(ne, 0.45, 0.3, 0.5, 0.06, new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.35 }), 0.3, 1.07, 0);
  cyl(ne, 0.17, 0.17, 0.02, mats.darkSteel, 0.3, 1.225, -0.02);
  plane(ne, 0.12, 0.05, new THREE.MeshStandardMaterial({ color: 0x0c1a12, emissive: 0x45f58b, emissiveIntensity: 0.4 }), 0.3, 1.05, 0.252);
  bottle(ne, 0.85, 0.92, -0.15, { amber: true, h: 0.22 });
  bottle(ne, 0.98, 0.92, 0.0, { liquid: 0xffd27a, cap: mats.redCap });
  addCol(1.0, 3.5, -4, -3.2);


  // ===== PAILLASSE CENTRALE =====
  const cb = new THREE.Group();
  cb.position.set(-0.7, 0, -1.4);
  scene.add(cb);
  // caisson creux : placards ouvrables des deux côtés
  box(cb, 3.6, 0.08, 0.84, mats.baseboard, 0, 0.04, 0);
  box(cb, 3.8, 0.04, 1.0, mats.epoxy, 0, 0.9, 0);
  const shell = mats.laminate, inside = new THREE.MeshStandardMaterial({ color: 0xd9dee2, roughness: 0.7 });
  box(cb, 3.7, 0.02, 0.9, inside, 0, 0.09, 0);
  box(cb, 3.7, 0.02, 0.9, shell, 0, 0.87, 0, { cast: false });
  box(cb, 3.7, 0.76, 0.02, inside, 0, 0.48, 0);
  const edges = [-1.835, -1.215, -0.605, 0.005, 0.615, 1.225, 1.835];
  for (const x of edges) box(cb, 0.02, 0.76, 0.9, Math.abs(x) > 1.8 ? shell : inside, x, 0.48, 0);
  box(cb, 3.7, 0.02, 0.9, inside, 0, 0.47, 0); // étagère intermédiaire
  refs.cupboards = [];
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) {
      const cx = -1.52 + i * 0.61;
      const pivot = new THREE.Group();
      pivot.position.set(cx - 0.29, 0.48, s * 0.452);
      cb.add(pivot);
      box(pivot, 0.58, 0.76, 0.015, mats.laminateGrey, 0.29, 0, 0);
      box(pivot, 0.02, 0.14, 0.02, mats.steel, 0.52, 0.18, s * 0.016);
      refs.cupboards.push({ pivot, side: s, open: false, cx, index: i });
    }
  }
  // contenus des placards (décor)
  const tipBox = (x, y, z, c) => {
    rbox(cb, 0.12, 0.07, 0.09, 0.006, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }), x, y + 0.035, z);
    box(cb, 0.115, 0.004, 0.085, mats.white, x, y + 0.072, z, { cast: false });
  };
  tipBox(-1.6, 0.1, 0.25, 0x2f7fd6); tipBox(-1.45, 0.1, 0.25, 0xf2c200); tipBox(-1.6, 0.48, 0.25, 0x2f7fd6);
  tipBox(0.25, 0.1, -0.25, 0xc62828); tipBox(0.4, 0.1, -0.25, 0x2f7fd6);
  tipBox(1.5, 0.48, 0.22, 0x7ee0b0); tipBox(-0.9, 0.48, -0.25, 0xf2c200);
  rbox(cb, 0.22, 0.12, 0.13, 0.008, new THREE.MeshStandardMaterial({ color: 0xb98d5a, roughness: 0.85 }), 0.95, 0.16, 0.22);
  rbox(cb, 0.22, 0.12, 0.13, 0.008, new THREE.MeshStandardMaterial({ color: 0xb98d5a, roughness: 0.85 }), -0.95, 0.16, -0.22);
  bottle(cb, 1.45, 0.1, -0.25, { liquid: 0xffffff, fill: 0.7, h: 0.22, r: 0.05 });
  bottle(cb, 1.6, 0.1, -0.22, { liquid: 0x9fd3ff, fill: 0.5, h: 0.22, r: 0.05 });
  // le classeur du protocole : placard côté sud, 3e porte en partant de l'ouest
  const binder = new THREE.Group();
  binder.position.set(-0.3, 0.48, 0.25);
  cb.add(binder);
  rbox(binder, 0.05, 0.31, 0.25, 0.006, new THREE.MeshStandardMaterial({ color: 0x1e5bb8, roughness: 0.5 }), 0, 0.165, 0, { rz: -0.08 });
  const spine = T.textPlaneTexture('PROTOCOLE', { w: 512, h: 96, bg: '#ffffff', fg: '#1e5bb8', size: 56 });
  plane(binder, 0.22, 0.04, new THREE.MeshStandardMaterial({ map: spine }), 0.0, 0.18, 0.126, { rz: Math.PI / 2 - 0.08 });
  refs.protocolBinder = binder;
  // étagère à réactifs au centre
  for (const x of [-1.8, 0, 1.8]) box(cb, 0.03, 0.75, 0.25, mats.steel, x, 1.295, 0);
  box(cb, 3.63, 0.02, 0.26, mats.laminate, 0, 1.3, 0);
  box(cb, 3.63, 0.02, 0.26, mats.laminate, 0, 1.66, 0);
  const shelfColors = [0x9fd3ff, 0xffb3c6, 0xc8f7a6, 0xfff09a, 0xc8a0ff];
  for (let i = 0; i < 18; i++) {
    const x = -1.7 + i * 0.2 + (Math.random() - 0.5) * 0.04;
    if (Math.abs(x) < 0.05 || Math.abs(Math.abs(x) - 1.8) < 0.05) continue;
    const amber = Math.random() < 0.35;
    bottle(cb, x, i % 2 ? 1.31 : 1.67, (Math.random() - 0.5) * 0.08, {
      amber, h: 0.14 + Math.random() * 0.08, r: 0.03 + Math.random() * 0.01,
      liquid: shelfColors[i % shelfColors.length], cap: Math.random() < 0.5 ? mats.blueCap : mats.redCap,
    });
  }
  // matériel sur le plan
  refs.microscope = microscope(cb, -1.3, 0.92, 0.25, Math.PI);
  tubeRack(cb, -0.5, 0.92, 0.3);
  erlenmeyer(cb, 0.2, 0.92, 0.32, 0xffb070);
  beaker(cb, 0.45, 0.92, 0.28, 0x7ee0b0);
  // côté nord
  tubeRack(cb, 0.9, 0.92, -0.32, Math.PI);
  bottle(cb, -0.2, 0.92, -0.3, { liquid: 0xffffff, fill: 0.8, h: 0.25, r: 0.05 });
  addCol(-2.6, 1.2, -1.92, -0.88);
  // tabourets
  stool(scene, -1.8, -0.55);
  stool(scene, -0.3, -0.5);
  stool(scene, 0.8, -2.25);
  addCol(-2.0, -1.6, -0.75, -0.35);
  addCol(-0.5, -0.1, -0.7, -0.3);
  addCol(0.6, 1.0, -2.45, -2.05);

  // ===== ARMOIRE DE SÉCURITÉ (mur ouest, zone de manip) =====
  addCol(minX, minX + 0.62, -1.56, -0.44);

  // ===== MUR EST : sortie, digicode, évier, frigo =====
  const exit = new THREE.Group();
  exit.position.set(maxX, 0, -2.4);
  exit.rotation.y = -Math.PI / 2;
  scene.add(exit);
  box(exit, 1.12, 2.18, 0.06, mats.doorFrame, 0, 1.09, 0.02);
  const exitDoor = box(exit, 1.0, 2.1, 0.05, mats.door, 0, 1.05, 0.04);
  box(exit, 0.35, 0.45, 0.052, mats.glass, 0, 1.55, 0.04, { cast: false });
  box(exit, 0.6, 0.06, 0.06, mats.steel, 0, 1.0, 0.1);
  cyl(exit, 0.012, 0.012, 0.6, mats.steel, 0, 1.0, 0.13, { rz: Math.PI / 2 }, 10);
  const sortieTex = T.textPlaneTexture('SORTIE', { w: 512, h: 160, bg: '#0b7a3b', size: 90 });
  box(exit, 0.5, 0.17, 0.04, new THREE.MeshStandardMaterial({ map: sortieTex, emissive: 0xffffff, emissiveMap: sortieTex, emissiveIntensity: 0.9 }), 0, 2.38, 0.03, { cast: false });
  refs.exitDoor = exitDoor;
  // digicode
  const kp = new THREE.Group();
  kp.position.set(maxX - 0.02, 1.35, -1.65);
  kp.rotation.y = -Math.PI / 2;
  scene.add(kp);
  rbox(kp, 0.11, 0.16, 0.03, 0.008, mats.darkSteel, 0, 0, 0);
  const kpTex = T.keypadTexture(T.KEYS_ROOM);
  plane(kp, 0.09, 0.135, new THREE.MeshStandardMaterial({ map: kpTex, emissive: 0xffffff, emissiveMap: kpTex, emissiveIntensity: 0.25, roughness: 0.4 }), 0, 0, 0.016);
  const led = add(kp, new THREE.SphereGeometry(0.006, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 2 }), 0.04, 0.072, 0.016);
  refs.keypad = kp;
  refs.keypadLed = led;


  // ===== MUR SUD : affiche + horloge =====
  const poster = plane(scene, 0.6, 0.84, labelMat(T.posterTexture()), 0.3, 1.75, maxZ - 0.006, { ry: Math.PI });
  refs.poster = poster;
  const clock = new THREE.Group();
  clock.position.set(2.6, 2.35, maxZ - 0.03);
  clock.rotation.y = Math.PI;
  scene.add(clock);
  cyl(clock, 0.17, 0.17, 0.04, mats.darkSteel, 0, 0, 0, { rx: Math.PI / 2 }, 32);
  plane(clock, 0.31, 0.31, labelMat(T.clockTexture(), { transparent: true }), 0, 0, 0.021);
  const hourHand = box(clock, 0.012, 0.08, 0.004, mats.black, 0, 0.03, 0.025, { cast: false });
  const minHand = box(clock, 0.008, 0.12, 0.004, mats.black, 0, 0.05, 0.028, { cast: false });
  const secHand = box(clock, 0.003, 0.13, 0.003, mats.redCap, 0, 0.05, 0.031, { cast: false });
  refs.clock = { hourHand, minHand, secHand };

  return { colliders, refs };
}

// Fait tourner les aiguilles (pivot à l'origine du cadran)
export function updateClock(clock, date) {
  const s = date.getSeconds() + date.getMilliseconds() / 1000;
  const m = date.getMinutes() + s / 60;
  const h = (date.getHours() % 12) + m / 60;
  const set = (hand, angle, len) => {
    hand.rotation.z = -angle;
    hand.position.x = Math.sin(angle) * len;
    hand.position.y = Math.cos(angle) * len;
  };
  set(clock.hourHand, (h / 12) * Math.PI * 2, 0.04);
  set(clock.minHand, (m / 60) * Math.PI * 2, 0.06);
  set(clock.secHand, (s / 60) * Math.PI * 2, 0.065);
}
