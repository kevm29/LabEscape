import * as THREE from 'three';
import { RoomEnvironment } from '../lib/three/addons/RoomEnvironment.js';
import { buildRoom, updateClock } from './room.js';
import { Player } from './player.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { updateTweens } from './tween.js';
import { initAudio } from './audio.js';

// ---------- rendu ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1d2024);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.03, 60);

// ---------- lumières ----------
scene.add(new THREE.HemisphereLight(0xf2f6ff, 0x6a7076, 0.3));
const key = new THREE.DirectionalLight(0xfff4e6, 1.7);
key.position.set(1.2, 7, 1.8);
key.target.position.set(0, 0, -0.3);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5, near: 1, far: 14 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.03;
key.shadow.radius = 3;
scene.add(key, key.target);
for (const x of [-3, 0, 3]) {
  for (const z of [-2, 1.6]) {
    const l = new THREE.PointLight(0xfff3e2, 2.4, 7, 1.6);
    l.position.set(x, 2.8, z);
    scene.add(l);
  }
}

// ---------- monde ----------
const { colliders, refs } = buildRoom(scene);
// l'environnement (reflets) est volontairement atténué pour garder du contraste
scene.traverse((o) => {
  if (!o.isMesh) return;
  for (const m of [].concat(o.material)) if (m.envMapIntensity === 1) m.envMapIntensity = 0.45;
});
const ui = new UI();
const player = new Player(camera, scene, colliders);
const game = new Game({ scene, camera, player, refs, ui });

// ---------- capture de la souris ----------
const canvas = renderer.domElement;
const startEl = document.getElementById('start');
const pauseEl = document.getElementById('pause');
let started = false;

function lock() {
  if (player.dragMode) return;
  if (!canvas.requestPointerLock) { enableDragMode(); return; }
  try {
    const p = canvas.requestPointerLock({ unadjustedMovement: true });
    if (p && p.catch) p.catch(() => { try { canvas.requestPointerLock(); } catch { /* ignore */ } });
  } catch {
    try { canvas.requestPointerLock(); } catch { /* ignore */ }
  }
}

document.getElementById('start-btn').addEventListener('click', () => {
  initAudio();
  started = true;
  startEl.classList.add('hidden');
  document.body.classList.add('playing');
  lock();
  setTimeout(() => {
    ui.toast('Bienvenue au labo ! Avant toute manip : blouse, lunettes et gants. Tout est au vestiaire, sur votre gauche.',
      { speaker: 'Dr. Leroy', duration: 7 });
  }, 900);
});

pauseEl.addEventListener('click', () => { pauseEl.classList.remove('show'); lock(); });

// Mode secours si la capture de la souris est refusée (iframe, navigateur) :
// on regarde en maintenant le clic et en glissant, un clic simple interagit.
let downAt = null;
function enableDragMode() {
  if (player.dragMode) return;
  player.dragMode = true;
  player.enabled = true;
  pauseEl.classList.remove('show');
  document.body.classList.add('drag-mode');
  ui.toast('Capture de la souris indisponible ici : maintenez le clic et glissez pour regarder, cliquez pour interagir.', { duration: 6 });
}
let everLocked = false;
document.addEventListener('pointerlockerror', () => {
  if (!started) return;
  // refus dès la première tentative : environnement sans capture -> mode secours.
  // Sinon (ex. re-capture trop rapide après Échap), on propose simplement de recliquer.
  if (!everLocked) enableDragMode();
  else if (!ui.modalOpen) pauseEl.classList.add('show');
});

canvas.addEventListener('mousedown', (e) => {
  if (!started || ui.modalOpen) return;
  if (player.dragMode) { downAt = [e.clientX, e.clientY]; return; }
  if (document.pointerLockElement !== canvas) { lock(); return; }
  if (e.button === 0) game.interact();
});
canvas.addEventListener('mouseup', (e) => {
  if (!player.dragMode || !downAt || ui.modalOpen) return;
  if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6 && e.button === 0) game.interact();
  downAt = null;
});
addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && player.enabled && !ui.modalOpen) game.interact();
});

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  player.enabled = locked;
  if (locked) { player.lockedAt = performance.now(); everLocked = true; }
  if (player.dragMode) { player.enabled = true; return; }
  if (locked) pauseEl.classList.remove('show');
  else if (started && !ui.modalOpen) pauseEl.classList.add('show');
});

// Après une fenêtre (dialogue, digicode) : on propose de reprendre d'un clic
ui.onModalClose = () => {
  if (!started) return;
  lock();
  setTimeout(() => {
    if (!player.dragMode && document.pointerLockElement !== canvas && !ui.modalOpen) pauseEl.classList.add('show');
  }, 250);
};

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- boucle ----------
const clock = new THREE.Clock();
// ?test : pas de temps fixe (pour les captures automatiques sur machine lente)
const FIXED_DT = new URLSearchParams(location.search).has('test') ? 1 / 30 : 0;
let frame = 0;
renderer.setAnimationLoop(() => {
  const dt = FIXED_DT || Math.min(clock.getDelta(), 0.05);
  frame++;
  updateTweens(dt);
  player.update(dt);
  game.update(dt);
  updateClock(refs.clock, new Date());
  renderer.render(scene, camera);
});

// accès console pour déboguer / tester
window.lab = { scene, camera, player, game, ui, refs, renderer, get frame() { return frame; } };
