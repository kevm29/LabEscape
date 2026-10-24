import * as THREE from 'three';
import { RoomEnvironment } from '../lib/three/addons/RoomEnvironment.js';
import { buildRoom, updateClock } from './room.js';
import { buildProps } from './props.js';
import { buildMachines } from './machines.js';
import { createLighting } from './lighting.js';
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

// ---------- monde ----------
const lighting = createLighting(scene);
const { colliders, refs } = buildRoom(scene);
buildProps(scene, refs, colliders);
buildMachines(scene, refs, colliders);
// l'environnement (reflets) est volontairement atténué pour garder du contraste
scene.traverse((o) => {
  if (!o.isMesh) return;
  for (const m of [].concat(o.material)) if (m.envMapIntensity === 1) m.envMapIntensity = 0.45;
});
const ui = new UI();
const player = new Player(camera, scene, colliders);
const game = new Game({ scene, camera, player, refs, ui, lighting });
player.blocked = () => ui.modalOpen;

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
    ui.toast('Bienvenue, et merci de remplacer Tom au pied levé ! Avant toute manip : blouse, lunettes et gants. Tout est au vestiaire, sur votre gauche.',
      { speaker: 'Dr. Leroy', duration: 8 });
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
  if (viewing && e.button === 0) { game.viewClick(); return; }
  if (player.dragMode) {
    if (e.button === 2) { game.deselect(); return; }
    downAt = [e.clientX, e.clientY];
    return;
  }
  if (document.pointerLockElement !== canvas) { lock(); return; }
  if (e.button === 0) game.interact();
  else if (e.button === 2) game.deselect();
});
canvas.addEventListener('mouseup', (e) => {
  if (!player.dragMode || !downAt || ui.modalOpen) return;
  if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6 && e.button === 0) game.interact();
  downAt = null;
});
addEventListener('keydown', (e) => {
  if (!started) return;
  const typing = /^(INPUT|TEXTAREA)$/.test(e.target?.tagName);
  if (!typing) {
    // empêche les raccourcis du navigateur pendant le jeu (recherche rapide de Firefox avec ' ou /,
    // enregistrer / favoris avec Ctrl+S / Ctrl+D…)
    if (/^(Digit|Numpad)\d$|^(Quote|Slash|Backquote|Tab)$/.test(e.code)) e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && /^Key[SDFPGHJKLUOEB]$/.test(e.code)) e.preventDefault();
  }
  if (ui.modalOpen) return;
  if (e.code === 'KeyE' && player.enabled) game.interact();
  // inventaire : maintenir 1…9, 0 pour regarder un objet (il passe en main)
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
  if (m && !e.repeat) {
    const idx = m[1] === '0' ? 9 : Number(m[1]) - 1;
    if (game.viewItem(idx)) viewing = e.code;
  }
});
let viewing = null;
addEventListener('keyup', (e) => {
  if (viewing && e.code === viewing) { game.stopViewing(); viewing = null; }
});
addEventListener('blur', () => { if (viewing) { game.stopViewing(); viewing = null; } });
// clic droit : ranger l'objet en main
addEventListener('contextmenu', (e) => { if (started) e.preventDefault(); });

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
const testParam = new URLSearchParams(location.search).get('test');
const FIXED_DT = testParam === null ? 0 : Number(testParam) || 1 / 30;
let frame = 0;
renderer.setAnimationLoop(() => {
  const dt = FIXED_DT || Math.min(clock.getDelta(), 0.05);
  frame++;
  updateTweens(dt);
  player.update(dt);
  game.update(dt);
  updateClock(refs.clock, new Date(Date.now() + game.clockOffset));
  renderer.render(scene, camera);
});

// accès console pour déboguer / tester
window.lab = { scene, camera, player, game, ui, refs, renderer, lighting, get frame() { return frame; } };
