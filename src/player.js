// Joueur à la première personne : contrôles, collisions, corps et mains.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../lib/three/addons/RoundedBoxGeometry.js';
import { ROOM } from './room.js';
import { makeKey } from './props.js';
import { tween, ease, wait } from './tween.js';

const EYE = 1.65;
const RADIUS = 0.28;
const SPEED = 2.1;
const MIN_FOV = 22, MAX_FOV = 72;

export class Player {
  constructor(camera, scene, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.pos = new THREE.Vector3(-2.2, 0, 3.15);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = -0.06;
    this.keys = new Set();
    this.enabled = false; // vrai quand la souris est capturée
    this.frozen = false; // pendant une animation
    this.targetFov = MAX_FOV;
    this.bobT = 0;
    this.shake = 0;

    camera.rotation.order = 'YXZ';
    camera.fov = MAX_FOV;
    scene.add(camera);

    this.body = buildBody();
    scene.add(this.body.group);
    this.hands = buildHands();
    camera.add(this.hands.rig);

    addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow') && this.enabled) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    this.lockedAt = 0;
    this.dragMode = false;
    addEventListener('mousemove', (e) => {
      if (!this.enabled || this.frozen || (this.blocked && this.blocked())) return;
      if (this.dragMode && !(e.buttons & 1)) return; // mode secours : on regarde en glissant
      // Chrome envoie parfois un saut énorme juste après la capture du pointeur : on l'ignore
      if (performance.now() - this.lockedAt < 120) return;
      if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return;
      const sens = 0.0022 * (camera.fov / MAX_FOV);
      this.yaw -= e.movementX * sens;
      this.pitch -= e.movementY * sens;
      this.pitch = Math.max(-1.35, Math.min(1.3, this.pitch));
    });
    addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.targetFov = Math.max(MIN_FOV, Math.min(MAX_FOV, this.targetFov + Math.sign(e.deltaY) * 7));
    }, { passive: true });
  }

  forwardVector(out = new THREE.Vector3()) {
    return this.camera.getWorldDirection(out);
  }

  update(dt) {
    const k = this.keys;
    let fx = 0, fz = 0;
    if (this.enabled && !this.frozen && !(this.blocked && this.blocked())) {
      // event.code = position physique : KeyW = Z en AZERTY, KeyA = Q en AZERTY
      if (k.has('KeyW') || k.has('ArrowUp')) fz += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) fz -= 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) fx -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) fx += 1;
    }
    const len = Math.hypot(fx, fz) || 1;
    fx /= len; fz /= len;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wish = new THREE.Vector3(
      (-sin * fz + cos * fx) * SPEED,
      0,
      (-cos * fz - sin * fx) * SPEED,
    );
    const accel = fx || fz ? 12 : 10;
    this.vel.x += (wish.x - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (wish.z - this.vel.z) * Math.min(1, accel * dt);

    this.pos.x += this.vel.x * dt;
    this.resolve();
    this.pos.z += this.vel.z * dt;
    this.resolve();

    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.bobT += dt * speed * 4.2;
    const bob = Math.sin(this.bobT * 2) * 0.018 * Math.min(1, speed / SPEED);

    let sx = 0, sy = 0;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2);
      sx = (Math.random() - 0.5) * this.shake * 0.03;
      sy = (Math.random() - 0.5) * this.shake * 0.03;
    }

    // en baissant la tête, le cou se penche : les yeux avancent et descendent un peu
    const lean = Math.max(0, Math.min(1, (-this.pitch - 0.5) / 0.85));
    const fwd = 0.11 * lean, drop = 0.07 * lean;
    this.camera.position.set(this.pos.x - Math.sin(this.yaw) * fwd, EYE + bob - drop, this.pos.z - Math.cos(this.yaw) * fwd);
    this.camera.rotation.set(this.pitch + sy, this.yaw + sx, 0);
    const f = this.camera.fov + (this.targetFov - this.camera.fov) * Math.min(1, dt * 10);
    if (Math.abs(f - this.camera.fov) > 0.01) {
      this.camera.fov = f;
      this.camera.updateProjectionMatrix();
    }

    this.body.group.position.set(this.pos.x, 0, this.pos.z);
    this.body.group.rotation.y = this.yaw;
    this.body.animateWalk(this.bobT, Math.min(1, speed / SPEED));
  }

  resolve() {
    const p = this.pos, r = RADIUS;
    p.x = Math.max(ROOM.minX + r, Math.min(ROOM.maxX - r, p.x));
    p.z = Math.max(ROOM.minZ + r, Math.min(ROOM.maxZ - r, p.z));
    for (const c of this.colliders) {
      const cx = Math.max(c.minX, Math.min(c.maxX, p.x));
      const cz = Math.max(c.minZ, Math.min(c.maxZ, p.z));
      let dx = p.x - cx, dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < r) {
        if (d > 1e-5) {
          p.x += (dx / d) * (r - d);
          p.z += (dz / d) * (r - d);
        } else {
          // centre dans la boîte : sortie par le côté le plus proche
          const pens = [p.x - c.minX, c.maxX - p.x, p.z - c.minZ, c.maxZ - p.z];
          const i = pens.indexOf(Math.min(...pens));
          if (i === 0) p.x = c.minX - r;
          else if (i === 1) p.x = c.maxX + r;
          else if (i === 2) p.z = c.minZ - r;
          else p.z = c.maxZ + r;
        }
      }
    }
  }
}

// ---------- Corps (visible en baissant la tête) ----------
function buildBody() {
  const group = new THREE.Group();
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const jeans = std({ color: 0x34465e, roughness: 0.85 });
  const shirt = std({ color: 0x3d4a58, roughness: 0.9 });
  const shoe = std({ color: 0x2a2a2c, roughness: 0.6 });
  const sole = std({ color: 0xe9e9e9, roughness: 0.7 });
  const coatMat = std({ color: 0xf5f7f8, roughness: 0.88, side: THREE.DoubleSide });
  const coatShade = std({ color: 0xe1e5e8, roughness: 0.9 });

  const mk = (geo, mat, x, y, z, parent = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // le torse est légèrement en arrière des yeux pour qu'on voie son buste en regardant en bas
  const TZ = 0.2;
  const torso = mk(new THREE.CylinderGeometry(0.15, 0.16, 0.56, 24), shirt, 0, 1.12, TZ);
  torso.scale.set(1, 1, 0.75);
  mk(new THREE.CylinderGeometry(0.165, 0.16, 0.14, 24), jeans, 0, 0.82, TZ).scale.set(1, 1, 0.75);

  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.085, 0.8, TZ);
    group.add(leg);
    mk(new THREE.CapsuleGeometry(0.065, 0.62, 4, 12), jeans, 0, -0.38, 0, leg);
    const foot = new THREE.Group();
    foot.position.set(0, -0.76, 0);
    leg.add(foot);
    mk(new RoundedBoxGeometry(0.1, 0.07, 0.25, 3, 0.03), shoe, 0, 0.0, -0.13, foot);
    mk(new RoundedBoxGeometry(0.105, 0.02, 0.255, 2, 0.008), sole, 0, -0.035, -0.13, foot);
    legs.push(leg);
  }

  // Blouse portée (ouverte devant, avec poches)
  const coat = new THREE.Group();
  coat.visible = false;
  group.add(coat);
  const gap = 0.45;
  const coatBody = mk(new THREE.CylinderGeometry(0.175, 0.27, 0.95, 32, 4, true, Math.PI + gap / 2, Math.PI * 2 - gap), coatMat, 0, 0.93, TZ, coat);
  coatBody.scale.set(1, 1, 0.82);
  // épaules
  const shoulders = mk(new THREE.CylinderGeometry(0.15, 0.175, 0.06, 32, 1, true, Math.PI + 0.2, Math.PI * 2 - 0.4), coatMat, 0, 1.43, TZ, coat);
  shoulders.scale.set(1, 1, 0.82);
  // poches basses : position sur la surface du cylindre, côté avant (-z)
  const pockets = [];
  for (const s of [-1, 1]) {
    const theta = Math.PI + s * 0.68;
    const y = 0.72;
    const r = 0.175 + (0.27 - 0.175) * ((1.405 - y) / 0.95) + 0.008;
    const p = new THREE.Group();
    p.position.set(Math.sin(theta) * r, y, TZ + Math.cos(theta) * r * 0.82);
    p.rotation.y = theta;
    coat.add(p);
    // vraie poche : un rabat devant, des côtés et un fond, ouverte en haut
    mk(new THREE.BoxGeometry(0.15, 0.15, 0.005), coatShade, 0, 0, 0.026, p);
    mk(new THREE.BoxGeometry(0.155, 0.01, 0.008), coatMat, 0, 0.072, 0.027, p);
    for (const sx of [-1, 1]) mk(new THREE.BoxGeometry(0.006, 0.15, 0.026), coatShade, sx * 0.073, 0, 0.013, p);
    mk(new THREE.BoxGeometry(0.15, 0.006, 0.026), coatShade, 0, -0.073, 0.013, p);
    pockets.push(p);
  }
  // la clé, glissée dans la poche droite (pockets[0] : côté x>0 = droite du joueur) :
  // seul l'anneau dépasse de l'ouverture
  const pocketKey = makeKey(0xc9a227);
  pocketKey.scale.setScalar(1.9);
  pocketKey.position.set(0.01, 0.03, 0.013);
  pocketKey.rotation.set(0, 0.3, 0.18);
  pocketKey.visible = false;
  pockets[0].add(pocketKey);
  // le corps ne bloque pas le viseur (seule la clé est cliquable)
  group.traverse((o) => { if (o.isMesh) o.userData.noRay = true; });
  pocketKey.traverse((o) => { o.userData.noRay = false; });

  function animateWalk(t, amount) {
    const a = Math.sin(t * 2) * 0.35 * amount;
    legs[0].rotation.x = a;
    legs[1].rotation.x = -a;
  }

  return { group, coat, pocketKey, animateWalk };
}

// ---------- Mains (attachées à la caméra, pour les animations) ----------
function buildHand(mat, scale = 1, side = -1) {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.03, 0.095, 3, 0.013), mat);
  g.add(palm);
  const fingerLens = [0.06, 0.07, 0.066, 0.052];
  const fingers = [];
  fingerLens.forEach((len, i) => {
    const f = new THREE.Group();
    f.position.set(-side * (0.03 - i * 0.02), 0, -0.047); // index côté pouce
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, len, 4, 8), mat);
    m.rotation.x = Math.PI / 2;
    m.position.z = -len / 2;
    f.add(m);
    f.rotation.x = 0.15;
    g.add(f);
    fingers.push(f);
  });
  const thumb = new THREE.Group();
  // pouce côté intérieur (main gauche : +x, main droite : -x), paume vers le bas
  thumb.position.set(-side * 0.045, -0.004, -0.005);
  const tm = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.045, 4, 8), mat);
  tm.rotation.x = Math.PI / 2;
  tm.position.z = -0.025;
  thumb.add(tm);
  thumb.rotation.y = side * 0.7;
  g.add(thumb);
  fingers.push(thumb);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.09, 14), mat);
  wrist.rotation.x = Math.PI / 2;
  wrist.position.z = 0.07;
  wrist.scale.set(1.15, 1, 0.75);
  g.add(wrist);
  g.scale.setScalar(scale);
  return { g, fingers };
}

function buildHands() {
  const rig = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b796, roughness: 0.6 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0x3f82e6, roughness: 0.42, metalness: 0.0 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x3d4a58, roughness: 0.9 });
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.userData.side = s;
    rig.add(arm);
    const hand = buildHand(skin, 1, s);
    hand.g.rotation.z = s * -0.25;
    arm.add(hand.g);
    // gant (légèrement plus gros que la main)
    const glove = buildHand(gloveMat, 1.08, s);
    glove.g.rotation.z = s * -0.25;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.08, 16, 1, true), gloveMat);
    cuff.material = gloveMat.clone();
    cuff.material.side = THREE.DoubleSide;
    cuff.rotation.x = Math.PI / 2;
    cuff.position.z = 0.12;
    glove.g.add(cuff);
    glove.g.visible = false;
    arm.add(glove.g);
    // manche : part du poignet vers l'arrière et le bas (avant-bras)
    const tilt = Math.PI / 2 + 0.45;
    const axis = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.047, 0.42, 16), sleeveMat);
    sleeve.rotation.x = tilt;
    sleeve.position.set(0, 0, 0.1).addScaledVector(axis, 0.23);
    arm.add(sleeve);
    const cuffSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 16), sleeveMat);
    cuffSleeve.rotation.x = tilt;
    cuffSleeve.position.set(0, 0, 0.1).addScaledVector(axis, 0.03);
    arm.add(cuffSleeve);
    arms.push({ arm, hand, glove, side: s });
  }
  rig.visible = false;

  const restPose = (a, k) => {
    // k = 0 : bras baissés hors champ, k = 1 : mains levées devant soi
    const s = a.side;
    a.arm.position.set(s * (0.22 - 0.09 * k), -0.62 + 0.48 * k, -0.38);
    a.arm.rotation.set(0.3 - 0.2 * k, s * (-0.15 - 0.3 * k), s * 0.25);
  };
  arms.forEach((a) => restPose(a, 0));

  let raised = 0;
  const api = {
    rig,
    arms,
    gloveMat,
    setSleeve(color) { sleeveMat.color.set(color); },
    setGloves(on) {
      arms.forEach((a) => { a.glove.g.visible = on; a.hand.g.visible = !on; a.glove.g.position.set(0, 0, 0); a.glove.g.scale.setScalar(1.08); });
    },
    async raise(d = 0.45) {
      rig.visible = true;
      const from = raised;
      await tween(d, (k) => { raised = from + (1 - from) * k; arms.forEach((a) => restPose(a, raised)); }, { easing: ease.out });
    },
    async lower(d = 0.45) {
      const from = raised;
      await tween(d, (k) => { raised = from * (1 - k); arms.forEach((a) => restPose(a, raised)); }, { easing: ease.in });
      rig.visible = false;
    },
    async wiggle() {
      await tween(0.6, (k) => {
        arms.forEach((a) => {
          const parts = (a.glove.g.visible ? a.glove : a.hand).fingers;
          parts.forEach((f, i) => { if (i < 4) f.rotation.x = 0.15 + Math.sin(k * Math.PI * 4 + i * 0.6) * 0.45 * (1 - k); });
        });
      }, { easing: ease.linear });
    },
    // enfile un gant sur une main : il glisse depuis le bout des doigts jusqu'au poignet
    async pullGlove(a, onSnap) {
      const g = a.glove.g;
      g.visible = true;
      g.position.set(0, 0.02, -0.16);
      g.scale.set(1.0, 0.7, 0.9);
      await tween(0.32, (k) => {
        g.position.set(0, 0.02 * (1 - k), -0.16 * (1 - k));
      }, { easing: ease.out });
      a.hand.g.visible = false;
      await tween(0.18, (k) => { g.scale.set(1.0 + 0.08 * k, 0.7 + 0.38 * k, 0.9 + 0.18 * k); }, { easing: ease.outBack });
      onSnap && onSnap();
      // claquement : le poignet recule un peu
      const z0 = a.arm.position.z;
      await tween(0.12, (k) => { a.arm.position.z = z0 + Math.sin(k * Math.PI) * 0.025; });
    },
  };
  void wait;
  return api;
}
