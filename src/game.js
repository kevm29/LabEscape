// Logique de partie : état, interactions, inventaire, équipement et énigmes.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { inManipZone } from './room.js';
import { drawLaptop } from './props.js';
import { makeItem } from './items.js';
import { tween, ease, wait } from './tween.js';
import { sfx } from './audio.js';

const LEROY = 'Dr. Leroy';
const LEROY_ROLE = 'Responsable sécurité — par l’interphone';
const SHIRT = 0x3d4a58;
const COAT = 0xf3f5f6;

// Réponses quand on utilise un objet là où il ne sert à rien (en boucle)
const USELESS = [
  'Mais que ferais-je avec ça ?',
  'Hmm… non, ça ne sert à rien ici.',
  'Je ne vois pas bien le rapport.',
  'Ce n’est sûrement pas le bon endroit pour ça.',
];

export class Game {
  constructor({ scene, camera, player, refs, ui, lighting }) {
    Object.assign(this, { scene, camera, player, refs, ui, lighting });
    this.state = {
      coat: null, // index de la blouse portée
      goggles: false,
      gloves: false,
      keyTaken: false,
      dasriWarnings: 0,
      exitOpen: false,
      equippedAnnounced: false,
      // énigmes
      paulOpen: false,
      carnetTaken: false,
      laptop: 'off', // off | booting | blocked | done
      reportPrinted: false,
      reportTaken: false,
      uvOn: false,
      tomOpen: false,
      noteTaken: false,
      freeOpen: false,
      slideOnScope: false,
      scopeSeen: false,
      fridgeUnlocked: false,
      fridgeOpen: false,
      rnaStored: false,
      iceTaken: false,
      iceMelted: false,
      draftTaken: false,
    };
    this.flags = new Set(); // messages déjà affichés une fois
    this.inventory = [];
    this.selected = null; // id de l'objet en main
    this.uselessIdx = 0;
    this.busy = false;
    this.interactables = new Map();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = CONFIG.reach;
    this.current = null;
    this.prevPos = player.pos.clone();
    this.lastLineWarn = -10;
    this.time = 0;
    this.equippedAt = null;
    this.hintShown = false;
    this.startTime = performance.now();

    this.registerAll();
    this.refreshHud();
  }

  get equipped() {
    return this.state.coat !== null && this.state.goggles && this.state.gloves;
  }

  once(flag, fn) {
    if (this.flags.has(flag)) return;
    this.flags.add(flag);
    fn();
  }

  register(object, data) {
    this.interactables.set(object, data);
  }

  // ======================================================================
  // Enregistrement de tous les objets interactifs
  // ======================================================================
  registerAll() {
    const { refs, state } = this;

    // ---- vestiaire ----
    refs.coats.forEach((c) => this.register(c.group, {
      name: `la blouse « ${c.name} »`,
      label: () => (state.coat === null ? `Prendre la blouse « ${c.name} »` : `Échanger pour la blouse « ${c.name} »`),
      action: () => this.takeCoat(c.index),
    }));
    this.register(refs.goggles, {
      name: 'les lunettes',
      label: () => 'Mettre les lunettes de protection',
      action: () => this.putGoggles(),
    });
    this.register(refs.gloveBox, {
      name: 'le distributeur de gants',
      label: () => (state.gloves ? 'Distributeur de gants nitrile' : 'Mettre des gants en nitrile'),
      action: () => this.putGloves(),
    });
    this.register(this.player.body.pocketKey, {
      name: 'la poche',
      label: () => 'Sortir la clé de la poche',
      action: () => this.takePocketKey(),
    });

    // ---- sécurité ----
    this.register(refs.dasri, {
      name: 'la poubelle DASRI',
      label: () => 'Fouiller la poubelle jaune',
      action: () => this.searchDasri(),
    });
    this.register(refs.gloveBin, {
      name: 'la poubelle à gants',
      label: () => (state.gloves ? 'Retirer et jeter ses gants' : 'Poubelle à gants usagés'),
      action: () => this.throwGloves(),
    });

    // ---- portes ----
    this.register(refs.entryDoor, {
      name: 'la porte d’entrée',
      label: () => 'Porte d’entrée',
      action: () => { sfx.error(); this.ui.toast('La porte s’est verrouillée derrière vous. Le lecteur de badge reste rouge… Il va falloir trouver une autre sortie.'); },
    });
    this.register(refs.exitDoor, {
      name: 'la porte de sortie',
      label: () => (state.exitOpen ? 'Sortir du laboratoire' : 'Porte de sortie'),
      action: () => {
        if (state.gloves) {
          sfx.whistle();
          this.ui.toast('Pas de gants sur une poignée de porte ! On les jette d’abord dans la poubelle à gants.', { speaker: LEROY, tone: 'warn' });
          return;
        }
        if (state.exitOpen) return this.win();
        sfx.error();
        this.ui.toast('Verrouillée. Un digicode est installé à droite de la porte.');
      },
    });
    this.register(refs.keypad, {
      name: 'le digicode',
      label: () => 'Utiliser le digicode',
      action: () => this.useExitKeypad(),
    });

    // ---- énigme 1 → tiroir de Paul ----
    const paul = refs.drawers.paul;
    this.register(paul.group, {
      name: 'le tiroir « Paul »',
      label: () => (state.paulOpen ? 'Tiroir « Paul »' : 'Tiroir « Paul » (fermé à clé)'),
      action: () => {
        if (!state.paulOpen) { sfx.error(); this.ui.toast('Fermé à clé. L’étiquette indique « Paul ».'); }
      },
      use: (item) => {
        if (item.id !== 'clePaul' || state.paulOpen) return false;
        this.removeItem('clePaul');
        state.paulOpen = true;
        sfx.key();
        this.openDrawer(paul);
        this.ui.toast('La clé dorée tourne : le tiroir du Dr. Hemick s’ouvre.', { tone: 'success' });
        return true;
      },
    });
    this.register(refs.carnet, {
      name: 'le carnet',
      label: () => 'Prendre le carnet de labo',
      action: () => {
        refs.carnet.visible = false;
        state.carnetTaken = true;
        this.pickUp('carnetPaul', 'Le carnet de labo du Dr. Hemick. Maintenez sa touche pour le lire.');
      },
    });

    // ---- énigme 2 : PC, interrupteur, transilluminateur, imprimante ----
    this.register(refs.laptop.group, {
      name: 'l’ordinateur',
      label: () => ({
        off: 'Appuyer sur le bouton d’allumage',
        booting: 'L’ordinateur démarre…',
        blocked: 'Utiliser l’ordinateur',
        done: 'Ordinateur (compte rendu enregistré)',
      }[state.laptop]),
      action: () => this.useLaptop(),
    });
    this.register(refs.lightSwitch.group, {
      name: 'l’interrupteur',
      label: () => (this.lighting.dark ? 'Rallumer la lumière' : 'Éteindre la lumière'),
      action: () => this.toggleLights(),
    });
    this.register(refs.transillum.group, {
      name: 'le transilluminateur',
      label: () => (state.uvOn ? 'Éteindre les UV' : 'Allumer les UV du transilluminateur'),
      action: () => this.toggleUv(),
    });
    this.register(refs.printer.group, {
      name: 'l’imprimante',
      label: () => 'Imprimante',
      action: () => this.ui.toast(state.reportPrinted ? 'Elle a fini d’imprimer.' : 'L’imprimante attend un document.'),
    });
    this.register(refs.printer.sheet, {
      name: 'le compte rendu',
      label: () => 'Prendre le compte rendu imprimé',
      action: () => {
        refs.printer.sheet.visible = false;
        state.reportTaken = true;
        this.pickUp('compteRendu', 'Le compte rendu, encore tiède. Maintenez sa touche pour le lire.');
      },
    });
    this.register(refs.wastebasket, {
      name: 'la corbeille',
      label: () => (state.draftTaken ? 'Corbeille à papier (vide)' : 'Fouiller la corbeille à papier'),
      action: () => {
        if (state.draftTaken) { this.ui.toast('Il n’y a plus rien dedans.'); return; }
        state.draftTaken = true;
        refs.draftBall.visible = false;
        this.pickUp('brouillon', 'Un brouillon froissé, de la main de Tom.');
      },
    });

    // ---- énigme 3 : tiroir de Tom, lame, microscope ----
    const tom = refs.drawers.tom;
    this.register(tom.group, {
      name: 'le tiroir « Tom »',
      label: () => (state.tomOpen ? 'Tiroir « Tom »' : 'Tourner le cadenas du tiroir « Tom »'),
      action: () => this.useTomPadlock(),
    });
    this.register(refs.tomNote, {
      name: 'la note',
      label: () => 'Prendre la note et décrocher la lame',
      action: () => {
        refs.tomNote.visible = false;
        state.noteTaken = true;
        this.addItem(makeItem('noteTom'));
        this.pickUp('lame', 'Vous décrochez la lame scotchée et prenez la note de Tom.');
      },
    });
    const free = refs.drawers.free;
    this.register(free.group, {
      name: 'le tiroir du bas',
      label: () => (state.freeOpen ? 'Refermer le tiroir' : 'Ouvrir le tiroir du bas'),
      action: () => {
        state.freeOpen = !state.freeOpen;
        if (state.freeOpen) {
          this.openDrawer(free);
          this.ui.toast('Des stylos, des trombones, un vieux ticket de cantine… Rien d’utile.');
        } else {
          this.closeDrawer(free);
        }
      },
    });
    this.register(refs.microscope, {
      name: 'le microscope',
      label: () => (state.slideOnScope ? 'Regarder dans le microscope' : 'Microscope'),
      action: () => {
        if (!state.slideOnScope) { this.ui.toast('Il n’y a pas de lame sur la platine.'); return; }
        this.lookMicroscope();
      },
      use: (item) => {
        if (item.id !== 'lame') return false;
        this.removeItem('lame');
        state.slideOnScope = true;
        sfx.plastic();
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.002, 0.026), new THREE.MeshStandardMaterial({ color: 0xdff2fb, transparent: true, opacity: 0.6 }));
        slide.position.set(0, 0.129, -0.01);
        refs.microscope.add(slide);
        this.ui.toast('Lame posée sur la platine. Plus qu’à regarder dans l’oculaire.');
        return true;
      },
    });

    // ---- énigme 4 : frigo +4 °C, congélateur -80 °C ----
    const fr = refs.fridge;
    this.register(fr.keypad, {
      name: 'le clavier du frigo',
      label: () => (state.fridgeUnlocked ? 'Clavier du frigo (déverrouillé)' : 'Taper le code du frigo'),
      action: () => this.useFridgeKeypad(),
    });
    this.register(fr.group, {
      name: 'le frigo',
      label: () => (!state.fridgeUnlocked ? 'Frigo +4 °C (verrouillé)' : state.fridgeOpen ? 'Fermer le frigo' : 'Ouvrir le frigo'),
      action: () => {
        if (!state.fridgeUnlocked) { sfx.error(); this.ui.toast('Verrouillé. Un clavier à code est fixé sur la porte.'); return; }
        this.setFridge(!state.fridgeOpen);
      },
      use: (item) => {
        if (!state.fridgeOpen || !fr.reagents[item.id]) return false;
        if (item.temp === '-80') {
          this.ui.toast('Pas au frigo : regardez l’étiquette, c’est -80 °C. Il y a un congélateur dans le coin.', { tone: 'warn' });
          return true;
        }
        this.removeItem(item.id);
        fr.reagents[item.id].visible = true;
        this.ui.toast(`Vous reposez « ${item.name} » au frigo.`, { duration: 2.5 });
        return true;
      },
    });
    for (const [id, mesh] of Object.entries(fr.reagents)) {
      const it = makeItem(id);
      this.register(mesh, {
        name: it.name,
        label: () => `Prendre : ${it.name}`,
        action: () => {
          mesh.visible = false;
          this.pickUp(id, `Vous prenez « ${it.name} ». Brrr, c’est froid.`, 2.5);
        },
      });
    }
    this.register(refs.freezer.group, {
      name: 'le congélateur -80 °C',
      label: () => 'Congélateur -80 °C',
      action: () => this.ui.toast('Congélateur -80 °C. On ne l’ouvre pas pour rien : chaque ouverture réchauffe les échantillons.'),
      use: (item) => {
        if (item.temp === '+4') {
          this.ui.toast('Ce réactif se conserve à +4 °C. Congelé, il serait abîmé.', { tone: 'warn' });
          return true;
        }
        if (item.id !== 'arn') return false;
        this.storeRna();
        return true;
      },
    });
    this.register(refs.freezer.ice, {
      name: 'le bloc de glace',
      label: () => 'Ramasser le bloc de glace',
      action: () => {
        refs.freezer.ice.visible = false;
        state.iceTaken = true;
        this.pickUp('glace', 'Un bloc de glace… avec quelque chose de métallique dedans.');
      },
    });

    // ---- énigme 5 : évier ----
    this.register(refs.sink.group, {
      name: 'l’évier',
      label: () => 'Ouvrir le robinet',
      action: () => this.washHands(),
      use: (item) => {
        if (item.id !== 'glace') return false;
        this.meltIce();
        return true;
      },
    });

    // ---- divers ----
    this.register(refs.safetyCabinet, {
      name: 'l’armoire de sécurité',
      label: () => 'Ouvrir l’armoire de sécurité',
      action: () => { sfx.error(); this.ui.toast('Armoire pour produits inflammables. Fermée à clé.'); },
    });
    this.register(refs.poster, {
      name: 'l’affiche',
      label: () => 'Lire les règles du labo',
      action: () => this.ui.dialog({
        speaker: 'Règles du laboratoire',
        role: 'Affiche — mur sud',
        avatar: '!',
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

  // ======================================================================
  // Boucle, viseur, interactions
  // ======================================================================
  update(dt) {
    this.time += dt;
    this.updateFocus();
    this.enforcePpeLine();
    this.updateCold();
    if (this.equippedAt !== null && !this.hintShown && !this.state.keyTaken
      && this.time - this.equippedAt > CONFIG.pocketHintDelay) {
      this.hintShown = true;
      const msg = this.state.coat === CONFIG.keyCoat
        ? 'Psst… baissez la tête : quelque chose dépasse de votre poche.'
        : 'Psst… ces blouses ne sont pas toutes des blouses de prêt. Et leurs propriétaires oublient parfois des choses dans leurs poches.';
      this.ui.toast(msg, { speaker: 'Petite voix', duration: 7, tone: 'hint' });
    }
  }

  updateFocus() {
    if (!this.player.enabled || this.busy || this.ui.modalOpen) {
      this.current = null;
      this.ui.clearPrompt();
      return;
    }
    // en regardant vers le bas, on peut fouiller sa propre poche si la clé est dans le champ
    let found = null;
    const key = this.player.body.pocketKey;
    if (this.player.pitch < -0.95 && isVisible(key)) {
      const v = key.getWorldPosition(new THREE.Vector3()).project(this.camera);
      if (Math.abs(v.x) < 0.75 && Math.abs(v.y) < 0.95 && v.z < 1) found = this.interactables.get(key);
    }
    if (!found) {
      this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
      const hits = this.raycaster.intersectObjects(this.scene.children, true);
      for (const h of hits) {
        if (h.object.userData.noRay || !isVisible(h.object) || h.object.material?.depthWrite === false) continue;
        if (h.object.isPoints || h.object.isLine) continue;
        found = this.findInteractable(h.object);
        break; // le premier objet visible bloque la vue
      }
    }
    this.current = found;
    const held = this.heldItem();
    if (found && held) this.ui.setPrompt(`Utiliser « ${held.name} » sur ${found.name}`);
    else this.ui.setPrompt(found ? found.label() : null);
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
    const held = this.heldItem();
    if (held) {
      const ok = this.current.use ? this.current.use(held) : false;
      if (ok === false) {
        this.ui.toast(USELESS[this.uselessIdx % USELESS.length], { duration: 2.5 });
        this.uselessIdx++;
      }
      return;
    }
    this.current.action();
  }

  enforcePpeLine() {
    const p = this.player;
    const wasIn = inManipZone(this.prevPos.x, this.prevPos.z);
    const nowIn = inManipZone(p.pos.x, p.pos.z);
    // on ne bloque que le franchissement de la ligne (vestiaire → zone de manip)
    if (!this.equipped && nowIn && !wasIn) {
      p.pos.copy(this.prevPos);
      p.vel.set(0, 0, 0);
      if (this.time - this.lastLineWarn > 3) {
        this.lastLineWarn = this.time;
        sfx.whistle();
        const s = this.state;
        const item = (ok, name) => `<span class="${ok ? 'ok' : 'ko'}">${ok ? '✓' : '✗'} ${name}</span>`;
        this.ui.toast(`Stop ! Pas de zone de manip sans EPI. ${item(s.coat !== null, 'Blouse')} ${item(s.goggles, 'Lunettes')} ${item(s.gloves, 'Gants')}`,
          { speaker: LEROY, duration: 4.5, tone: 'warn' });
      }
    }
    this.prevPos.copy(p.pos);
  }

  updateCold() {
    let frost = 0;
    if (this.state.fridgeOpen) {
      const d = this.camera.position.distanceTo(this.refs.fridge.front);
      frost = Math.max(0, Math.min(1, (1.5 - d) / 1.0)) * 0.9;
      if (frost > 0.3) {
        this.once('cold', () => this.ui.toast('Brrr… il fait froid là-dedans.', { duration: 2.5 }));
      }
    }
    if (Math.abs(frost - (this.frost || 0)) > 0.01) {
      this.frost = frost;
      this.ui.setFrost(frost);
    }
  }

  // ======================================================================
  // Inventaire
  // ======================================================================
  heldItem() {
    return this.selected ? this.inventory.find((i) => i.id === this.selected) || null : null;
  }

  addItem(item) {
    this.inventory.push(item);
    this.refreshHud();
  }

  pickUp(id, message, duration = 4) {
    sfx.pickup();
    this.addItem(makeItem(id));
    if (message) this.ui.toast(message, { duration });
    this.once('inventory-help', () => setTimeout(() => this.ui.toast('Astuce : maintenez la touche du chiffre affiché sur l’objet pour le regarder. Il passe alors en main pour l’utiliser.', { tone: 'hint', duration: 7 }), (duration + 0.3) * 1000));
  }

  removeItem(id) {
    this.inventory = this.inventory.filter((i) => i.id !== id);
    if (this.selected === id) this.selected = null;
    this.refreshHud();
  }

  // Maintenir 1-6 : on regarde l'objet, et il devient l'objet en main
  viewItem(index) {
    const it = this.inventory[index];
    if (!it) return false;
    this.selected = it.id;
    this.ui.showItem(it);
    this.refreshHud();
    return true;
  }

  stopViewing() {
    this.ui.hideItem();
  }

  deselect() {
    if (!this.selected) return;
    this.selected = null;
    this.refreshHud();
  }

  refreshHud() {
    this.ui.updateInventory(this.inventory, this.selected);
    this.ui.setHeld(this.heldItem());
    this.ui.updateObjectives(this.state, this.equipped ? 'Fouillez le laboratoire. Maintenez 1–6 pour regarder vos objets.' : '');
  }

  // ======================================================================
  // Helpers d'animation
  // ======================================================================
  begin() {
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

  openDrawer(d) {
    sfx.cloth();
    const z0 = d.group.position.z;
    return tween(0.45, (k) => { d.group.position.z = z0 + (d.home + 0.3 - z0) * k; }, { easing: ease.out });
  }

  closeDrawer(d) {
    const z0 = d.group.position.z;
    return tween(0.35, (k) => { d.group.position.z = z0 + (d.home - z0) * k; });
  }

  checkEquipped() {
    this.refreshHud();
    if (this.equipped && !this.state.equippedAnnounced) {
      this.state.equippedAnnounced = true;
      this.equippedAt = this.time;
      setTimeout(() => {
        sfx.success();
        this.ui.toast('Parfait, tenue réglementaire ! Vous pouvez entrer en zone de manip.', { speaker: LEROY, duration: 5, tone: 'success' });
      }, 400);
    }
  }

  // ======================================================================
  // Énigme 1 : équipement
  // ======================================================================
  async takeCoat(i) {
    if (this.state.coat === i) return;
    this.begin();
    const { refs, player, state } = this;
    const coat = refs.coats[i];

    if (state.coat !== null) {
      const old = refs.coats[state.coat];
      player.body.coat.visible = false;
      player.body.pocketKey.visible = false;
      old.group.visible = true;
      old.group.position.copy(old.home);
      old.group.scale.setScalar(1);
      sfx.cloth();
      this.ui.toast(`Vous raccrochez la blouse « ${old.name} ».`, { duration: 2.5 });
      await wait(0.5);
    }

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
    await this.ui.fade(0.55, 0.25);
    g.visible = false;
    g.position.copy(coat.home);
    g.quaternion.copy(q0);
    sfx.cloth();
    player.hands.setGloves(state.gloves);
    player.hands.setSleeve(COAT);
    player.body.coat.visible = true;
    player.body.pocketKey.visible = i === CONFIG.keyCoat && !state.keyTaken;
    state.coat = i;
    await this.ui.fade(0, 0.35);
    await player.hands.raise(0.4);
    await tween(0.5, (k) => {
      player.hands.arms.forEach((a) => { a.arm.rotation.z = a.side * (0.15 + Math.sin(k * Math.PI * 2) * 0.12); });
    }, { easing: ease.linear });
    await player.hands.lower(0.4);

    this.ui.toast(`Vous enfilez la blouse « ${coat.name} ». Elle vous va plutôt bien.`, { duration: 3.5 });
    this.checkEquipped();
    this.end();
  }

  async putGoggles() {
    if (this.state.goggles) return;
    this.begin();
    const g = this.refs.goggles;
    this.camera.attach(g);
    const p0 = g.position.clone(), q0 = g.quaternion.clone(), s0 = g.scale.x;
    const p1 = new THREE.Vector3(0, -0.03, -0.32);
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, Math.PI, 0));
    sfx.swoosh();
    await tween(0.75, (k) => {
      g.position.lerpVectors(p0, p1, k);
      g.quaternion.slerpQuaternions(q0, q1, k);
      g.scale.setScalar(s0 + (1 - s0) * k);
    });
    await wait(0.25);
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
    this.begin();
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

  takePocketKey() {
    const { state, player } = this;
    if (state.keyTaken) return;
    state.keyTaken = true;
    player.body.pocketKey.visible = false;
    this.pickUp('clePaul', 'Une petite clé dorée dans la poche du Dr. Hemick !', 3.5);
  }

  async throwGloves() {
    const { state, player } = this;
    if (!state.gloves) { this.ui.toast('Poubelle pour les gants usagés (non contaminés).'); return; }
    this.begin();
    player.hands.setSleeve(COAT);
    player.hands.setGloves(true);
    await player.hands.raise(0.4);
    for (const a of player.hands.arms) {
      const g = a.glove.g;
      await tween(0.3, (k) => { g.position.z = -0.16 * k; g.scale.set(1.08 - 0.1 * k, 1.08 - 0.4 * k, 1.08); }, { easing: ease.in });
      g.visible = false;
      a.hand.g.visible = true;
      sfx.snap();
    }
    await wait(0.2);
    await player.hands.lower(0.4);
    player.hands.setGloves(false);
    state.gloves = false;
    sfx.cloth();
    this.ui.toast('Gants retirés en les retournant, puis jetés. On ne touche ni poignée, ni clavier, ni téléphone avec des gants.', { speaker: LEROY, tone: 'success', duration: 6 });
    this.refreshHud();
    this.end();
  }

  async searchDasri() {
    this.begin();
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

  // ======================================================================
  // Énigme 2 : PC bloqué, gel sous UV, impression
  // ======================================================================
  async useLaptop() {
    const { state, refs } = this;
    if (state.laptop === 'booting') return;
    if (state.laptop === 'off') {
      this.begin();
      sfx.click();
      refs.laptop.power.material.emissive.set(0x3f82e6);
      refs.laptop.power.material.emissiveIntensity = 2;
      state.laptop = 'booting';
      await tween(2.2, (k) => drawLaptop(refs, `boot:${k.toFixed(2)}`), { easing: ease.linear });
      state.laptop = 'blocked';
      drawLaptop(refs, 'blocked');
      sfx.error();
      this.ui.toast('L’ordinateur s’allume… et reste bloqué sur un compte rendu : « Résultat manquant ».', { duration: 4.5 });
      this.end();
      return;
    }
    if (state.laptop === 'done') {
      this.ui.toast('Le compte rendu est enregistré. L’écran affiche un joli ✓ vert.');
      return;
    }
    const r = await this.ui.pc({
      check: (v) => v === CONFIG.gelCode,
      onWrong: () => this.ui.dialog({
        speaker: LEROY, role: LEROY_ROLE,
        text: 'Vous êtes sûr de vous ?<br><br>Où avez-vous trouvé ce code ?',
        button: 'Je vérifie',
      }),
    });
    if (r === 'ok') {
      state.laptop = 'done';
      drawLaptop(refs, 'done');
      await this.printReport();
      this.ui.toast('Bien lu ! Sur un gel de séquençage, les fragments les plus courts migrent le plus loin : on lit la séquence du bas vers le haut, de 5′ vers 3′.',
        { speaker: LEROY, tone: 'success', duration: 9 });
    }
  }

  async printReport() {
    const { sheet } = this.refs.printer;
    this.state.reportPrinted = true;
    sheet.visible = true;
    sheet.position.set(0, 0.11, 0.1);
    for (let i = 0; i < 3; i++) setTimeout(() => sfx.cloth(), i * 450);
    await tween(1.6, (k) => {
      sheet.position.z = 0.1 + 0.14 * k;
      sheet.position.y = 0.11 - 0.04 * k;
    }, { easing: ease.linear });
  }

  toggleLights() {
    const dark = !this.lighting.dark;
    this.lighting.setDark(dark);
    sfx.click();
    this.refs.lightSwitch.rocker.rotation.x = dark ? 0.25 : -0.25;
    this.updateGelGlow();
    if (dark) this.once('dark', () => this.ui.toast('Clac. La pièce plonge dans la pénombre… Seuls les écrans et la sortie de secours brillent encore.', { duration: 5 }));
  }

  toggleUv() {
    const s = this.state;
    s.uvOn = !s.uvOn;
    sfx.click();
    this.updateGelGlow();
    if (s.uvOn && !this.lighting.dark) {
      this.once('uv-light', () => this.ui.toast('Les UV s’allument… mais avec toute cette lumière, on distingue à peine les bandes.', { duration: 5 }));
    }
    if (s.uvOn && this.lighting.dark) {
      this.once('uv-dark', () => this.ui.toast('Dans le noir, les bandes du gel s’illuminent en orange. Le colorant fixé à l’ADN fluoresce sous UV. Heureusement, vous portez vos lunettes !',
        { speaker: LEROY, duration: 8 }));
    }
  }

  updateGelGlow() {
    const t = this.refs.transillum;
    const on = this.state.uvOn, dark = this.lighting.dark;
    t.bandMat.emissiveIntensity = on ? (dark ? 3.2 : 0.12) : 0;
    t.plateMat.emissiveIntensity = on ? (dark ? 0.35 : 0.08) : 0;
    t.sw.material.emissiveIntensity = on ? 1.5 : 0;
    t.uvLight.intensity = on ? (dark ? 0.5 : 0.1) : 0;
    t.labelMats.forEach((m) => { m.emissiveIntensity = on && dark ? 0.55 : 0; });
  }

  // ======================================================================
  // Énigme 3 : tiroir de Tom, microscope
  // ======================================================================
  async useTomPadlock() {
    const { state, refs } = this;
    if (state.tomOpen) return;
    const ok = await this.ui.padlock({ title: 'Cadenas du tiroir « Tom »', code: CONFIG.tomPadlock });
    if (!ok) return;
    state.tomOpen = true;
    refs.tomLock.visible = false;
    sfx.key();
    await this.openDrawer(refs.drawers.tom);
    this.ui.toast('Le cadenas s’ouvre : 51.23, le numéro de poste de Tom !', { tone: 'success' });
  }

  async lookMicroscope() {
    await this.ui.microscope((canvas) => drawMalassez(canvas, CONFIG.cellCounts));
    this.state.scopeSeen = true;
    this.once('scope', () => this.ui.toast('Une cellule de comptage quadrillée, avec des cellules rosées et d’autres mauve foncé…', { duration: 5 }));
  }

  // ======================================================================
  // Énigme 4 : frigo, -80 °C
  // ======================================================================
  async useFridgeKeypad() {
    const { state } = this;
    if (state.fridgeUnlocked) { this.setFridge(!state.fridgeOpen); return; }
    const ok = await this.ui.keypad({ title: 'Frigo +4 °C', length: CONFIG.fridgeCode.length, check: (c) => c === CONFIG.fridgeCode });
    if (!ok) return;
    state.fridgeUnlocked = true;
    const led = this.refs.fridge.led.material;
    led.color.set(0x20ff60);
    led.emissive.set(0x20ff60);
    await this.setFridge(true);
    const { live, dead } = CONFIG.cellCounts;
    const L = live.reduce((a, b) => a + b, 0), D = dead.reduce((a, b) => a + b, 0);
    this.ui.toast(`Bien compté ! Le colorant n’entre que dans les cellules mortes, à la membrane abîmée : elles virent au mauve. Ici ${L} vivantes sur ${L + D}, soit ${Math.round((100 * L) / (L + D))} % de viabilité.`,
      { speaker: LEROY, tone: 'success', duration: 10 });
  }

  setFridge(open) {
    const fr = this.refs.fridge;
    this.state.fridgeOpen = open;
    sfx.cloth();
    fr.glow.emissiveIntensity = open ? 1.2 : 0;
    fr.coldLight.intensity = open ? 0.8 : 0;
    const r0 = fr.door.rotation.y, r1 = open ? 1.75 : 0;
    return tween(0.6, (k) => { fr.door.rotation.y = r0 + (r1 - r0) * k; }, { easing: ease.out });
  }

  async storeRna() {
    const { refs } = this;
    this.begin();
    this.removeItem('arn');
    this.state.rnaStored = true;
    const fz = refs.freezer;
    sfx.cloth();
    await tween(0.6, (k) => { fz.door.rotation.y = 1.35 * k; }, { easing: ease.out });
    this.ui.toast('Vous rangez l’ARN au -80 °C. Un nuage de froid s’échappe…', { duration: 3 });
    await wait(0.4);
    // un bloc de glace dégringole de l'étagère
    const ice = fz.ice;
    ice.visible = true;
    ice.position.set(-0.1, 1.42, 0.2);
    ice.rotation.set(0, 0, 0);
    sfx.plastic();
    await tween(0.55, (k) => {
      ice.position.y = 1.42 * (1 - k * k);
      ice.position.z = 0.2 + 0.55 * k;
      ice.rotation.x = k * 2.2;
    }, { easing: ease.linear });
    sfx.snap();
    await tween(0.25, (k) => { ice.position.y = Math.sin(k * Math.PI) * 0.05; ice.rotation.x = 2.2 + k * 0.4; }, { easing: ease.linear });
    ice.rotation.set(0, 0.3, 0);
    ice.position.y = 0;
    await tween(0.5, (k) => { fz.door.rotation.y = 1.35 * (1 - k); }, { easing: ease.in });
    this.ui.toast('Un bloc de glace est tombé du congélateur ! Les ARN, eux, sont bien au froid : les RNases les dégradent vite à température ambiante.',
      { speaker: LEROY, duration: 7 });
    this.end();
  }

  // ======================================================================
  // Énigme 5 : faire fondre la glace
  // ======================================================================
  async washHands() {
    this.begin();
    const s = this.refs.sink;
    s.water.visible = true;
    sfx.water();
    await wait(1.4);
    s.water.visible = false;
    this.ui.toast(this.state.gloves
      ? 'Vous rincez vos gants… En sortant, on retire ses gants AVANT de toucher les poignées, puis on se lave les mains.'
      : 'Vous vous lavez les mains. Bon réflexe, à refaire en sortant du labo.');
    this.end();
  }

  async meltIce() {
    this.begin();
    const s = this.refs.sink;
    this.removeItem('glace');
    const ice = this.refs.freezer.ice.clone();
    ice.visible = true;
    ice.position.set(s.basinX, s.basinY + 0.004, 0.02);
    s.group.add(ice);
    s.water.visible = true;
    const block = ice.children[0];
    block.material = block.material.clone();
    for (let i = 0; i < 3; i++) setTimeout(() => sfx.water(), i * 1400);
    await tween(3.6, (k) => {
      block.scale.setScalar(1 - 0.85 * k);
      block.position.y = 0.055 * (1 - 0.85 * k);
      block.material.opacity = 0.85 * (1 - k * 0.6);
    }, { easing: ease.linear });
    s.water.visible = false;
    block.visible = false;
    await wait(0.4);
    ice.removeFromParent();
    this.state.iceMelted = true;
    this.pickUp('petiteCle', null);
    this.ui.toast('La glace fond sous l’eau du robinet… et libère une petite clé argentée ! Reste à savoir ce qu’elle ouvre.', { tone: 'success', duration: 6 });
    this.end();
    setTimeout(() => this.ui.dialog({
      speaker: 'Fin de la version de test',
      role: 'Lab Escape — énigmes 1 à 5',
      avatar: '✓',
      text: 'Bravo, vous êtes arrivé au bout des énigmes disponibles.<div class="learn">La suite (ce qu’ouvre la petite clé, et la sortie) arrive dans une prochaine version.</div>',
      button: 'Continuer à explorer',
    }), 2500);
  }

  // ======================================================================
  // Sortie
  // ======================================================================
  async useExitKeypad() {
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

// ---------- Vue au microscope : cellule de Malassez ----------
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawMalassez(canvas, { live, dead }) {
  const g = canvas.getContext('2d');
  const S = canvas.width;
  // fond lumineux du champ
  const bg = g.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.5);
  bg.addColorStop(0, '#f6f1e6'); bg.addColorStop(0.8, '#e9e2d2'); bg.addColorStop(1, '#bdb5a3');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  // quadrillage : 2 × 2 grands carrés, chacun en 4 colonnes × 5 lignes
  const Q = 250, x0 = (S - 2 * Q) / 2, y0 = (S - 2 * Q) / 2;
  g.strokeStyle = 'rgba(70,70,80,0.45)';
  g.lineWidth = 1;
  for (let qx = 0; qx < 2; qx++) for (let qy = 0; qy < 2; qy++) {
    const ox = x0 + qx * Q, oy = y0 + qy * Q;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(ox + (i * Q) / 4, oy); g.lineTo(ox + (i * Q) / 4, oy + Q); g.stroke(); }
    for (let j = 1; j < 5; j++) { g.beginPath(); g.moveTo(ox, oy + (j * Q) / 5); g.lineTo(ox + Q, oy + (j * Q) / 5); g.stroke(); }
  }
  // lignes triples des grands carrés
  g.strokeStyle = 'rgba(50,50,60,0.75)';
  for (const off of [-5, 0, 5]) {
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(x0 + i * Q + off, y0 - 30); g.lineTo(x0 + i * Q + off, y0 + 2 * Q + 30); g.stroke();
      g.beginPath(); g.moveTo(x0 - 30, y0 + i * Q + off); g.lineTo(x0 + 2 * Q + 30, y0 + i * Q + off); g.stroke();
    }
  }
  // cellules, placées sans se chevaucher, bien à l'intérieur de chaque carré
  const rand = rng(214);
  const quads = [[0, 0], [1, 0], [0, 1], [1, 1]]; // lecture : gauche→droite, haut→bas
  quads.forEach(([qx, qy], qi) => {
    const placed = [];
    const ox = x0 + qx * Q, oy = y0 + qy * Q;
    const place = (n, kind) => {
      let tries = 0;
      while (n > 0 && tries++ < 2000) {
        const r = 10 + rand() * 4;
        const x = ox + 22 + rand() * (Q - 44), y = oy + 22 + rand() * (Q - 44);
        if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + r + 8)) continue;
        placed.push({ x, y, r, kind });
        n--;
      }
    };
    place(live[qi], 'live');
    place(dead[qi], 'dead');
    for (const c of placed) {
      if (c.kind === 'live') {
        const gr = g.createRadialGradient(c.x - c.r * 0.3, c.y - c.r * 0.3, 1, c.x, c.y, c.r);
        gr.addColorStop(0, '#fff6fa'); gr.addColorStop(0.6, '#f2bfd4'); gr.addColorStop(1, '#d98aae');
        g.fillStyle = gr;
        g.beginPath(); g.arc(c.x, c.y, c.r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(150,60,100,0.6)'; g.lineWidth = 1.5; g.stroke();
      } else {
        const gr = g.createRadialGradient(c.x - c.r * 0.2, c.y - c.r * 0.2, 1, c.x, c.y, c.r);
        gr.addColorStop(0, '#7d4a8f'); gr.addColorStop(1, '#3d1a4d');
        g.fillStyle = gr;
        g.beginPath(); g.arc(c.x + rand() * 2, c.y, c.r * 0.92, 0, Math.PI * 2); g.fill();
      }
    }
  });
  // vignettage de l'oculaire
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S * 0.5);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.85)');
  g.fillStyle = v; g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(40,40,40,0.7)'; g.font = 'bold 18px sans-serif'; g.fillText('× 40', S * 0.72, S * 0.86);
}
