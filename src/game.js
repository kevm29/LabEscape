// Logique de partie : état, interactions, animations d'équipement.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { PPE_LINE_Z } from './room.js';
import { tween, ease, wait } from './tween.js';
import { sfx } from './audio.js';

const LEROY = 'Dr. Leroy';
const LEROY_ROLE = 'Responsable sécurité — par l’interphone';
const SHIRT = 0x3d4a58;
const COAT = 0xf3f5f6;

export class Game {
  constructor({ scene, camera, player, refs, ui }) {
    Object.assign(this, { scene, camera, player, refs, ui });
    this.state = {
      coat: null, // index de la blouse portée
      goggles: false,
      gloves: false,
      magnets: new Set(),
      magnetCoat: Math.floor(Math.random() * 3), // la blouse qui cache l'aimant
      dasriWarnings: 0,
      exitOpen: false,
      equippedAnnounced: false,
    };
    this.inventory = [];
    this.busy = false;
    this.interactables = new Map();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = CONFIG.reach;
    this.current = null;
    this.lastLineWarn = -10;
    this.time = 0;
    this.equippedAt = null;
    this.hintShown = false;
    this.startTime = performance.now();

    this.registerAll();
    this.ui.updateObjectives(this.state, CONFIG.magnetsTotal);
    this.ui.updateInventory(this.inventory);
  }

  get equipped() {
    return this.state.coat !== null && this.state.goggles && this.state.gloves;
  }

  register(object, data) {
    this.interactables.set(object, data);
  }

  registerAll() {
    const { refs, state } = this;

    refs.coats.forEach((c) => this.register(c.group, {
      label: () => (state.coat === null ? `Prendre la blouse « ${c.name} »` : `Échanger pour la blouse « ${c.name} »`),
      action: () => this.takeCoat(c.index),
    }));

    this.register(refs.goggles, {
      label: () => 'Mettre les lunettes de protection',
      action: () => this.putGoggles(),
    });

    this.register(refs.gloveBox, {
      label: () => (state.gloves ? 'Distributeur de gants nitrile' : 'Mettre des gants en nitrile'),
      action: () => this.putGloves(),
    });

    this.register(refs.dasri, {
      label: () => 'Fouiller la poubelle jaune',
      action: () => this.searchDasri(),
    });

    this.register(this.player.body.magnet, {
      label: () => 'Sortir l’aimant de la poche',
      action: () => this.takePocketMagnet(),
    });

    this.register(refs.entryDoor, {
      label: () => 'Porte d’entrée',
      action: () => { sfx.error(); this.ui.toast('La porte s’est verrouillée derrière vous. Le lecteur de badge reste rouge… Il va falloir trouver une autre sortie.'); },
    });

    this.register(refs.exitDoor, {
      label: () => (state.exitOpen ? 'Sortir du laboratoire' : 'Porte de sortie'),
      action: () => {
        if (state.exitOpen) return this.win();
        sfx.error();
        this.ui.toast('Verrouillée. Un digicode est installé à droite de la porte.');
      },
    });

    this.register(refs.keypad, {
      label: () => 'Utiliser le digicode',
      action: () => this.useKeypad(),
    });

    this.register(refs.sink, {
      label: () => 'Se laver les mains',
      action: () => {
        sfx.water();
        this.ui.toast(state.gloves
          ? 'Vous rincez vos gants… En sortant, on retire ses gants AVANT de toucher les poignées, puis on se lave les mains.'
          : 'Vous vous lavez les mains. Bon réflexe — à refaire en sortant du labo.');
      },
    });

    this.register(refs.fridge, {
      label: () => 'Ouvrir le réfrigérateur',
      action: () => { sfx.error(); this.ui.toast('Le réfrigérateur à réactifs est fermé par un petit cadenas à code.'); },
    });

    this.register(refs.safetyCabinet, {
      label: () => 'Ouvrir l’armoire de sécurité',
      action: () => { sfx.error(); this.ui.toast('Armoire pour produits inflammables. Fermée à clé.'); },
    });

    this.register(refs.poster, {
      label: () => 'Lire les règles du labo',
      action: () => this.ui.dialog({
        speaker: 'Règles du laboratoire',
        role: 'Affiche — mur sud',
        text: `<ol class="rules">
          <li>Blouse fermée, lunettes, gants</li>
          <li>Ni boire, ni manger, ni fumer</li>
          <li>Cheveux longs attachés</li>
          <li>Pipetage à la bouche interdit</li>
          <li>Déchets piquants → DASRI</li>
          <li>Jamais de mains dans un DASRI</li>
          <li>Manip sous hotte (PSM) si risque</li>
          <li>Se laver les mains en sortant</li></ol>`,
        button: 'Fermer',
      }),
    });
  }

  // ---------- boucle ----------
  update(dt) {
    this.time += dt;
    this.updateFocus();
    this.enforcePpeLine();
    if (this.equippedAt !== null && !this.hintShown && this.state.magnets.size === 0
      && this.time - this.equippedAt > CONFIG.pocketHintDelay) {
      this.hintShown = true;
      this.ui.toast('Psst… Avant de chercher partout, avez-vous bien regardé ce que vous portez ? Baissez la tête.', { speaker: 'Petite voix', duration: 7, tone: 'hint' });
    }
  }

  updateFocus() {
    if (!this.player.enabled || this.busy || this.ui.modalOpen) {
      this.current = null;
      this.ui.clearPrompt();
      return;
    }
    // en regardant vers le bas, on peut fouiller sa propre poche si l'aimant est dans le champ
    const mag = this.player.body.magnet;
    if (this.player.pitch < -0.95 && isVisible(mag)) {
      const v = mag.getWorldPosition(new THREE.Vector3()).project(this.camera);
      if (Math.abs(v.x) < 0.75 && Math.abs(v.y) < 0.95 && v.z < 1) {
        this.current = this.interactables.get(mag);
        this.ui.setPrompt(this.current.label());
        return;
      }
    }
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    let found = null;
    for (const h of hits) {
      if (h.object.userData.noRay || !isVisible(h.object) || h.object.material?.depthWrite === false) continue;
      found = this.findInteractable(h.object);
      break; // le premier objet visible bloque la vue
    }
    this.current = found;
    this.ui.setPrompt(found ? found.label() : null);
  }

  findInteractable(obj) {
    let o = obj;
    while (o) {
      const d = this.interactables.get(o);
      if (d) return d;
      o = o.parent;
    }
    return null;
  }

  interact() {
    if (this.busy || !this.current) return;
    sfx.click();
    this.current.action();
  }

  enforcePpeLine() {
    const p = this.player;
    if (this.equipped || p.pos.z > PPE_LINE_Z + 0.08) return;
    p.pos.z = PPE_LINE_Z + 0.09;
    p.vel.z = Math.max(p.vel.z, 0.8);
    if (this.time - this.lastLineWarn > 3) {
      this.lastLineWarn = this.time;
      sfx.whistle();
      const s = this.state;
      const item = (ok, name) => `<span class="${ok ? 'ok' : 'ko'}">${ok ? '✓' : '✗'} ${name}</span>`;
      this.ui.toast(`Stop ! Pas de zone de manip sans EPI. ${item(s.coat !== null, 'Blouse')} ${item(s.goggles, 'Lunettes')} ${item(s.gloves, 'Gants')}`,
        { speaker: LEROY, duration: 4.5, tone: 'warn' });
    }
  }

  // ---------- helpers d'animation ----------
  async begin() {
    this.busy = true;
    this.player.frozen = true;
    this.ui.clearPrompt();
  }

  end() {
    this.busy = false;
    this.player.frozen = false;
  }

  pointInFront(dist, down = 0) {
    const f = new THREE.Vector3();
    this.camera.getWorldDirection(f);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    return this.camera.position.clone().addScaledVector(f, dist).addScaledVector(up, -down);
  }

  checkEquipped() {
    this.ui.updateObjectives(this.state, CONFIG.magnetsTotal);
    if (this.equipped && !this.state.equippedAnnounced) {
      this.state.equippedAnnounced = true;
      this.equippedAt = this.time;
      setTimeout(() => {
        sfx.success();
        this.ui.toast('Parfait, tenue réglementaire ! Vous pouvez entrer en zone de manip. Et ouvrez l’œil : il paraît que trois aimants se cachent dans ce labo…',
          { speaker: LEROY, duration: 7, tone: 'success' });
      }, 400);
    }
  }

  // ---------- Blouse ----------
  async takeCoat(i) {
    if (this.state.coat === i) return;
    await this.begin();
    const { refs, player, state } = this;
    const coat = refs.coats[i];

    // on raccroche l'ancienne blouse
    if (state.coat !== null) {
      const old = refs.coats[state.coat];
      player.body.coat.visible = false;
      player.body.magnet.visible = false;
      old.group.visible = true;
      old.group.position.copy(old.home);
      old.group.scale.setScalar(1);
      sfx.cloth();
      this.ui.toast(`Vous raccrochez la blouse « ${old.name} ».`, { duration: 2.5 });
      await wait(0.5);
    }

    // la blouse vient vers le joueur
    const g = coat.group;
    const from = g.position.clone();
    const to = this.pointInFront(0.55, 0.25);
    const q0 = g.quaternion.clone();
    const q1 = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(to, this.camera.position, new THREE.Vector3(0, 1, 0)),
    ).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2));
    sfx.swoosh();
    await tween(0.65, (k) => {
      g.position.lerpVectors(from, to, k);
      g.quaternion.slerpQuaternions(q0, q1, k);
    });
    // on l'enfile
    await this.ui.fade(0.55, 0.25);
    g.visible = false;
    g.position.copy(coat.home);
    g.quaternion.copy(q0);
    sfx.cloth();
    player.hands.setGloves(state.gloves);
    player.hands.setSleeve(COAT);
    player.body.coat.visible = true;
    player.body.magnet.visible = i === state.magnetCoat && !state.magnets.has('poche');
    state.coat = i;
    await this.ui.fade(0, 0.35);
    // on ajuste les manches
    await player.hands.raise(0.4);
    await tween(0.5, (k) => {
      player.hands.arms.forEach((a) => { a.arm.rotation.z = a.side * (0.15 + Math.sin(k * Math.PI * 2) * 0.12); });
    }, { easing: ease.linear });
    await player.hands.lower(0.4);

    this.ui.toast(`Vous enfilez la blouse « ${coat.name} ». Elle vous va plutôt bien.`, { duration: 3.5 });
    this.checkEquipped();
    this.end();
  }

  // ---------- Lunettes ----------
  async putGoggles() {
    if (this.state.goggles) return;
    await this.begin();
    const g = this.refs.goggles;
    this.camera.attach(g); // garde la position monde, devient enfant de la caméra
    const p0 = g.position.clone(), q0 = g.quaternion.clone(), s0 = g.scale.x;
    const p1 = new THREE.Vector3(0, -0.03, -0.32);
    // face intérieure tournée vers nous, légèrement inclinée
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, Math.PI, 0));
    sfx.swoosh();
    await tween(0.75, (k) => {
      g.position.lerpVectors(p0, p1, k);
      g.quaternion.slerpQuaternions(q0, q1, k);
      g.scale.setScalar(s0 + (1 - s0) * k);
    });
    await wait(0.25);
    // on les approche du visage
    const p2 = new THREE.Vector3(0, -0.005, -0.04);
    await tween(0.45, (k) => {
      g.position.lerpVectors(p1, p2, k);
      g.scale.setScalar(1 + 1.4 * k);
    }, { easing: ease.in });
    g.visible = false;
    g.removeFromParent();
    sfx.plastic();
    this.ui.showGoggles(true);
    this.player.shake = 0.4;
    this.state.goggles = true;
    this.ui.toast('Lunettes ajustées. Tout est un peu plus… bleuté.', { duration: 3 });
    this.checkEquipped();
    this.end();
  }

  // ---------- Gants ----------
  async putGloves() {
    const { state, player, refs } = this;
    if (state.gloves) {
      this.ui.toast('Vous portez déjà une paire de gants.', { duration: 2.5 });
      return;
    }
    if (state.coat === null) {
      sfx.error();
      this.ui.toast('Blouse d’abord ! Les gants se mettent en dernier, par-dessus les poignets de la blouse.', { speaker: LEROY, tone: 'warn' });
      return;
    }
    await this.begin();
    // un gant sort de la boîte
    const tuft = refs.gloveTuft;
    sfx.cloth();
    await tween(0.3, (k) => { tuft.position.x = 0.075 + Math.sin(k * Math.PI) * 0.05; tuft.scale.set(0.45 + k * 0.2, 0.6, 1.2); });
    tuft.scale.set(0.45, 0.6, 1.2);
    player.hands.setSleeve(COAT);
    player.hands.setGloves(false);
    await player.hands.raise(0.5);
    await wait(0.15);
    for (const a of player.hands.arms) {
      await player.hands.pullGlove(a, () => sfx.snap());
      await wait(0.1);
    }
    player.hands.setGloves(true);
    await player.hands.wiggle();
    await wait(0.2);
    await player.hands.lower(0.45);
    state.gloves = true;
    this.ui.toast('Gants en nitrile enfilés, bien par-dessus les poignets.', { duration: 3 });
    this.checkEquipped();
    this.end();
  }

  // ---------- DASRI ----------
  async searchDasri() {
    await this.begin();
    const { player, state } = this;
    player.hands.setSleeve(state.coat !== null ? COAT : SHIRT);
    player.hands.setGloves(state.gloves);
    await player.hands.raise(0.35);
    state.dasriWarnings++;
    sfx.buzzer();
    this.ui.flash();
    player.shake = 1.2;
    const n = state.dasriWarnings;
    const texts = [
      '<b>STOP ! On ne met JAMAIS les mains dans une poubelle DASRI !</b><br><br>Déchets d’Activités de Soins à Risques Infectieux : aiguilles, lames, pointes, matériel souillé… Un geste et c’est la piqûre, avec un vrai risque d’infection.<br><br>Ce qui entre dans un DASRI n’en ressort <i>jamais</i>.',
      '<b>Encore ?!</b> Deuxième avertissement.<br><br>Je le note dans le cahier de sécurité. Un DASRI se ferme et part à l’incinération, point.',
      '<b>Bon. Troisième fois.</b><br><br>Vous savez quoi ? Je vais finir par coller un cadenas sur cette poubelle. Et sur vous.',
    ];
    await this.ui.dialog({
      speaker: LEROY, role: LEROY_ROLE,
      text: texts[Math.min(n, texts.length) - 1] + `<div class="warn-count">Avertissements : ${n}</div>`,
      tone: 'danger', button: 'Pardon, c’est noté',
    });
    await player.hands.lower(0.35);
    this.end();
  }

  // ---------- Aimant dans la poche ----------
  takePocketMagnet() {
    const { state, player } = this;
    if (state.magnets.has('poche')) return;
    state.magnets.add('poche');
    player.body.magnet.visible = false;
    sfx.magnet();
    this.addItem({ id: 'magnet-poche', icon: magnetIcon(), name: 'Aimant' });
    this.ui.toast(`Un aimant ! Il dormait au fond de la poche de la blouse. (${state.magnets.size}/${CONFIG.magnetsTotal})`, { duration: 4.5, tone: 'success' });
    this.ui.updateObjectives(state, CONFIG.magnetsTotal);
  }

  addItem(item) {
    this.inventory.push(item);
    this.ui.updateInventory(this.inventory);
  }

  // ---------- Digicode / sortie ----------
  async useKeypad() {
    if (this.state.exitOpen) {
      this.ui.toast('Le voyant est vert : la porte est déverrouillée.');
      return;
    }
    const ok = await this.ui.keypad({ title: 'Porte de sortie', length: CONFIG.exitCode.length, check: (c) => c === CONFIG.exitCode });
    if (ok) {
      this.state.exitOpen = true;
      const led = this.refs.keypadLed.material;
      led.color.set(0x20ff60);
      led.emissive.set(0x20ff60);
      this.ui.toast('Clic ! La porte de sortie est déverrouillée.', { tone: 'success' });
    }
  }

  win() {
    const s = Math.round((performance.now() - this.startTime) / 1000);
    this.ui.openModal();
    this.ui.showWin(`${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`);
  }
}

function isVisible(o) {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

function magnetIcon() {
  return `<svg viewBox="0 0 32 32" width="30" height="30"><path d="M8 4h5v13a3 3 0 0 0 6 0V4h5v13a8 8 0 0 1-16 0z" fill="#d32020"/><rect x="8" y="4" width="5" height="5" fill="#d0d4d8"/><rect x="19" y="4" width="5" height="5" fill="#d0d4d8"/></svg>`;
}
