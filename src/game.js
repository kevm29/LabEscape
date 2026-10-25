// Logique de partie : état, interactions, inventaire, équipement et énigmes.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { inManipZone } from './room.js';
import { drawLaptop } from './props.js';
import { drawSequencer, drawRobot } from './machines.js';
import { makeItem } from './items.js';
import { makeItemMesh } from './items3d.js';
import { KEYS_ROOM } from './textures.js';
import { tween, ease, wait } from './tween.js';
import { sfx } from './audio.js';
import { session, mark, count, sendStats, formatTime, STEP_LABELS } from './stats.js';

const LEROY = 'M. Sé';
const LEROY_ROLE = 'Seb Sé, ingénieur sécurité — par l’interphone';
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
      // énigmes 1 à 5
      paulOpen: false,
      laptop: 'off', // off | booting | login | blocked | done
      pcUnlocked: false,
      reportPrinted: false,
      uvOn: false,
      tomOpen: false,
      slideOnScope: false,
      fridgeUnlocked: false,
      fridgeOpen: false,
      rnaStored: false,
      iceTaken: false,
      iceMelted: false,
      draftTaken: false,
      // fin de partie
      incubatorUnlocked: false,
      incubatorOpen: false,
      hoodFlask: false,
      hoodKit: false,
      extracted: false,
      cabinetUnlocked: false,
      cabinetOpen: false,
      robotDna: false,
      robotEthanol: false,
      robot: 'idle', // idle | running | done
      seq: 'idle', // idle | running | done
      seqPrinted: false,
      questsKnown: false,
      mugGone: false,
    };
    this.flags = new Set(); // messages déjà affichés une fois
    this.inventory = [];
    this.selected = null; // id de l'objet en main
    this.viewingId = null;
    this.uselessIdx = 0;
    this.busy = false;
    this.interactables = new Map();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = CONFIG.reach;
    this.current = null;
    this.hit = null;
    this.prevPos = player.pos.clone();
    this.lastLineWarn = -10;
    this.time = 0;
    this.clockOffset = 0; // ms ajoutées à l'horloge (ellipses temporelles)
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

  // Objet à ramasser : disparaît de la scène et entre dans l'inventaire
  registerPickup(object, id, { label, message, onTake, when = () => true } = {}) {
    const it = makeItem(id);
    this.register(object, {
      name: it.name,
      label: () => (when() ? label || `Prendre : ${it.name}` : it.name),
      action: () => {
        if (!when()) return;
        if (!this.pickUp(id, message)) return;
        object.visible = false;
        this.interactables.delete(object);
        onTake && onTake();
      },
    });
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

    // ---- tasse de café ----
    this.register(refs.mug, {
      name: 'la tasse',
      label: () => 'Boire le café',
      action: () => this.confiscateMug(),
    });

    // ---- poches des blouses accrochées ----
    refs.coats.forEach((c) => c.pockets.forEach((p) => this.register(p, {
      name: 'la poche',
      label: () => 'Fouiller la poche',
      action: () => this.searchCoatPocket(c),
    })));

    // ---- portes ----
    this.register(refs.entryDoor, {
      name: 'la porte d’entrée',
      label: () => 'Porte d’entrée',
      action: () => { sfx.error(); this.ui.toast('La porte d’entrée s’est verrouillée derrière vous. Il faudra sortir par l’autre porte, une fois les analyses de Tom terminées.'); },
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

    // ---- bureau : tiroirs ----
    const paul = refs.drawers.paul;
    this.register(paul.group, {
      name: 'le tiroir « Paul »',
      container: () => (paul.open ? paul.group : null),
      label: () => (!state.paulOpen ? 'Tiroir « Paul » (fermé à clé)' : paul.open ? 'Refermer le tiroir « Paul »' : 'Ouvrir le tiroir « Paul »'),
      action: () => {
        if (!state.paulOpen) { sfx.error(); this.ui.toast('Fermé à clé. L’étiquette indique « Paul ».'); return; }
        this.toggleDrawer(paul);
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
    this.registerPickup(refs.carnet, 'carnetPaul', { label: 'Prendre le carnet de labo', message: 'Le carnet de labo du Dr. Hemick. Un post-it dépasse de la couverture…' });

    const tom = refs.drawers.tom;
    this.register(tom.group, {
      name: 'le tiroir « Tom »',
      container: () => (tom.open ? tom.group : null),
      label: () => (!state.tomOpen ? 'Tourner le cadenas du tiroir « Tom »' : tom.open ? 'Refermer le tiroir « Tom »' : 'Ouvrir le tiroir « Tom »'),
      action: () => (state.tomOpen ? this.toggleDrawer(tom) : this.useTomPadlock()),
    });
    this.registerPickup(refs.tomNote, 'noteTom', { label: 'Prendre la note de Tom', message: 'Une note de Tom… avec une lame de microscope scotchée dessus. Regardez-la de plus près.' });

    const free = refs.drawers.free;
    this.register(free.group, {
      name: 'le tiroir du bas',
      container: () => (free.open ? free.group : null),
      label: () => (free.open ? 'Refermer le tiroir' : 'Ouvrir le tiroir du bas'),
      action: () => {
        this.toggleDrawer(free);
        if (free.open) this.once('free-drawer', () => this.ui.toast('Des stylos, des trombones, un vieux ticket de cantine… Rien d’utile.'));
      },
    });
    this.register(refs.wastebasket, {
      name: 'la corbeille',
      label: () => (state.draftTaken ? 'Corbeille à papier (vide)' : 'Fouiller la corbeille à papier'),
      action: () => {
        if (state.draftTaken) { this.ui.toast('Il n’y a plus rien dedans.'); return; }
        if (!this.pickUp('brouillon', 'Un brouillon froissé, de la main de Tom.')) return;
        state.draftTaken = true;
        refs.draftBall.visible = false;
      },
    });

    // ---- énigme 2 : PC, interrupteur, transilluminateur, imprimante ----
    this.register(refs.laptop.group, {
      name: 'l’ordinateur',
      label: () => ({
        off: 'Appuyer sur le bouton d’allumage',
        booting: 'L’ordinateur démarre…',
        login: 'Ouvrir la session',
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
      action: () => this.ui.toast(state.reportPrinted || state.seqPrinted ? 'Elle a fini d’imprimer.' : 'L’imprimante attend un document.'),
    });
    this.registerPickup(refs.printer.sheet, 'compteRendu', { label: 'Prendre le compte rendu imprimé', message: 'Le compte rendu, encore tiède. Maintenez sa touche pour le lire.' });
    this.registerPickup(refs.printer.seqSheet, 'crSequencage', { label: 'Prendre le rapport de run', message: 'Le rapport de run, tout juste imprimé.' });

    // ---- énigme 3 : microscope ----
    this.register(refs.microscope, {
      name: 'le microscope',
      machine: true,
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
        if (!state.fridgeOpen || !['arn', 'kit'].includes(item.id)) return false;
        if (item.temp === '-80') {
          this.ui.toast('Pas au frigo : regardez l’étiquette, c’est -80 °C. Il y a un congélateur dans le coin.', { tone: 'warn' });
          return true;
        }
        this.removeItem(item.id);
        fr.reagents[item.id].visible = true;
        this.register(fr.reagents[item.id], this.reagentEntry(item.id));
        this.ui.toast(`Vous reposez « ${item.name} » au frigo.`, { duration: 2.5 });
        return true;
      },
    });
    for (const id of Object.keys(fr.reagents)) {
      if (id === 'arn' || id === 'kit') this.register(fr.reagents[id], this.reagentEntry(id));
      else {
        const it = makeItem(id);
        this.register(fr.reagents[id], { name: it.name, label: () => it.name, action: () => this.ui.toast('Pas besoin de ça.', { duration: 2 }) });
      }
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
        if (item.id !== 'arn' || state.rnaStored) return false;
        this.storeRna();
        return true;
      },
    });
    this.registerPickup(refs.freezer.ice, 'glace', {
      label: 'Ramasser le bloc de glace',
      message: 'Un bloc de glace… avec quelque chose de métallique dedans.',
      when: () => state.rnaStored,
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

    // ---- placards de la paillasse centrale + protocole ----
    for (const c of refs.cupboards) {
      this.register(c.pivot, {
        name: 'le placard',
        label: () => (c.open ? 'Fermer le placard' : 'Ouvrir le placard'),
        action: () => {
          c.open = !c.open;
          sfx.cloth();
          const r0 = c.pivot.rotation.y, r1 = c.open ? -c.side * 1.9 : 0;
          tween(0.45, (k) => { c.pivot.rotation.y = r0 + (r1 - r0) * k; }, { easing: ease.out });
        },
      });
    }
    this.registerPickup(refs.protocolBinder, 'protocole', {
      label: 'Prendre le classeur « Protocole »',
      message: 'Le protocole de séquençage de Tom ! Maintenez sa touche pour le lire.',
      onTake: () => { state.protocolTaken = true; },
    });

    // ---- incubateur CO2 ----
    const inc = refs.incubator;
    this.register(inc.group, {
      name: 'l’incubateur',
      machine: true,
      label: () => (!state.incubatorUnlocked ? 'Incubateur CO₂ (fermé à clé)' : state.incubatorOpen ? 'Fermer l’incubateur' : 'Ouvrir l’incubateur'),
      action: () => {
        if (!state.incubatorUnlocked) { sfx.error(); this.ui.toast('Fermé à clé. Une petite serrure est fixée sur la porte.'); return; }
        this.setIncubator(!state.incubatorOpen);
      },
      use: (item) => {
        if (item.id !== 'petiteCle' || state.incubatorUnlocked) return false;
        this.removeItem('petiteCle');
        state.incubatorUnlocked = true;
        sfx.key();
        this.setIncubator(true);
        this.ui.toast('La petite clé ouvre l’incubateur ! 37 °C et 5 % de CO₂ : le CO₂ maintient le pH du milieu de culture, tamponné au bicarbonate, comme dans notre sang.',
          { speaker: LEROY, duration: 8, tone: 'success' });
        return true;
      },
    });
    this.registerPickup(inc.t07, 'flasque', {
      label: 'Prendre la flasque T-07',
      message: 'La flasque T-07 de Tom. Le milieu est bien rose : les cellules sont en forme.',
      when: () => state.incubatorOpen,
    });
    inc.group.children.filter((o) => o !== inc.t07 && o.isGroup && o !== inc.door).forEach((f) => {
      this.register(f, {
        name: 'cette flasque',
        label: () => 'Flasque de culture',
        action: () => this.ui.toast('Ce n’est pas la flasque du patient T-07.'),
      });
    });

    // ---- hotte (PSM) : extraction de l'ADN ----
    this.register(refs.hood, {
      name: 'la hotte',
      machine: true,
      label: () => (state.extracted ? 'Hotte (PSM)' : 'Hotte (PSM)'),
      action: () => {
        if (state.extracted) { this.ui.toast('L’extraction est terminée.'); return; }
        const missing = [!state.hoodFlask && 'la flasque de cellules', !state.hoodKit && 'le kit d’extraction'].filter(Boolean);
        this.ui.toast(`Poste de sécurité microbiologique : on y ouvre les cellules pour se protéger et protéger l’échantillon. Il manque : ${missing.join(' et ')}.`, { duration: 6 });
      },
      use: (item) => {
        if (state.extracted) return false;
        if (item.id === 'flasque' && !state.hoodFlask) {
          this.removeItem('flasque');
          state.hoodFlask = true;
          this.placeInHood('flask');
        } else if (item.id === 'kit' && !state.hoodKit) {
          this.removeItem('kit');
          state.hoodKit = true;
          this.placeInHood('kit');
        } else {
          return false;
        }
        sfx.plastic();
        if (state.hoodFlask && state.hoodKit) this.runExtraction();
        else this.ui.toast('Posé sous la hotte.', { duration: 2 });
        return true;
      },
    });
    this.register(refs.emergencyKey, {
      name: 'la clé scotchée',
      label: () => 'Décoller la clé scotchée',
      action: () => {
        if (!this.pickUp('cleSecours', 'Une clé de secours, étiquetée « armoire sécurité » !')) return;
        refs.emergencyKey.visible = false;
        this.interactables.delete(refs.emergencyKey);
      },
    });

    // ---- armoire de sécurité ----
    const cab = refs.cabinet;
    this.register(cab.group, {
      name: 'l’armoire de sécurité',
      label: () => (!state.cabinetUnlocked ? 'Armoire de sécurité (fermée à clé)' : state.cabinetOpen ? 'Fermer l’armoire' : 'Ouvrir l’armoire'),
      action: () => {
        if (!state.cabinetUnlocked) {
          sfx.error();
          this.ui.toast('Armoire pour produits inflammables. Fermée à clé.');
          return;
        }
        this.setCabinet(!state.cabinetOpen);
      },
      use: (item) => {
        if (item.id !== 'cleSecours' || state.cabinetUnlocked) return false;
        this.removeItem('cleSecours');
        state.cabinetUnlocked = true;
        sfx.key();
        this.setCabinet(true);
        this.ui.toast('L’armoire de sécurité s’ouvre. Les produits inflammables y sont rangés à l’écart de la chaleur, au-dessus d’un bac de rétention.',
          { speaker: LEROY, duration: 6 });
        return true;
      },
    });
    this.registerPickup(cab.ethanol, 'ethanol', { label: 'Prendre : Éthanol 80 %', message: 'Vous prenez le flacon d’éthanol 80 %.', when: () => state.cabinetOpen });
    ['acetone', 'isopropanol', 'methanol', 'xylene'].forEach((id, i) => {
      const it = makeItem(id);
      this.registerPickup(cab.decor[i], id, { label: `Prendre : ${it.name}`, message: `Vous prenez : ${it.name}.`, when: () => state.cabinetOpen });
    });

    // ---- robot de pipetage ----
    this.register(refs.robot.group, {
      name: 'le PipetBot',
      machine: true,
      label: () => {
        if (state.robot === 'running') return 'Préparation en cours…';
        if (state.robot === 'done') return 'PipetBot (terminé)';
        return 'PipetBot';
      },
      action: () => this.useRobot(),
      use: (item) => {
        if (state.robot !== 'idle') return false;
        if (item.solvent && item.id !== 'ethanol') { this.ui.toast('Ce réactif n’est pas adapté.', { duration: 2.5 }); return true; }
        if (item.id === 'adn' && !state.robotDna) {
          this.removeItem('adn');
          state.robotDna = true;
          refs.robot.sampleTube.visible = true;
        } else if (item.id === 'ethanol' && !state.robotEthanol) {
          this.removeItem('ethanol');
          state.robotEthanol = true;
          refs.robot.etohBottle.visible = true;
        } else {
          return false;
        }
        sfx.plastic();
        drawRobot(refs, { dna: state.robotDna, ethanol: state.robotEthanol });
        if (state.robotDna && state.robotEthanol) {
          this.ui.toast('Tout est chargé : le PipetBot démarre.', { duration: 3 });
          setTimeout(() => { if (state.robot === 'idle') this.runRobot(); }, 1200);
        } else {
          this.ui.toast(item.id === 'adn' ? 'Échantillon chargé dans le PipetBot.' : 'Réactif chargé dans le PipetBot.', { duration: 3 });
        }
        return true;
      },
    });
    this.registerPickup(refs.robot.flowcell, 'flowcell', {
      label: 'Prendre la flowcell',
      message: 'La flowcell est prête : direction le séquenceur.',
      when: () => state.robot === 'done',
    });

    // ---- séquenceur ----
    this.register(refs.sequencer.group, {
      name: 'le séquenceur',
      machine: true,
      label: () => ({ idle: 'Séquenceur NX-7', loaded: 'Saisir le n° d’échantillon', running: 'Séquençage en cours…', done: 'Voir les résultats du run' }[state.seq]),
      action: () => this.useSequencer(),
      use: (item) => {
        if (item.id !== 'flowcell' || state.seq !== 'idle') return false;
        this.removeItem('flowcell');
        this.loadFlowcell();
        return true;
      },
    });

    // ---- divers ----
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
          <li>N’oubliez pas : le code des digicodes de salle est tout simplement le <b>numéro de la pièce</b> dans laquelle vous êtes.</li></ol>`,
        button: 'Fermer',
      }),
    });
  }

  reagentEntry(id) {
    const it = makeItem(id);
    const mesh = this.refs.fridge.reagents[id];
    return {
      name: it.name,
      label: () => `Prendre : ${it.name}`,
      action: () => {
        if (!this.pickUp(id, id === 'arn' ? null : `Vous prenez « ${it.name} ». Brrr, c’est froid.`, 2.5)) return;
        mesh.visible = false;
        this.interactables.delete(mesh);
        if (id === 'arn') {
          sfx.buzzer();
          this.ui.toast('Mais qu’est-ce que ce tube fait ici ? Il faut le ranger au bon endroit !', { speaker: LEROY, tone: 'danger', duration: 6 });
        }
      },
    };
  }

  // ======================================================================
  // Boucle, viseur, interactions
  // ======================================================================
  update(dt) {
    this.time += dt;
    this.updateFocus();
    this.enforcePpeLine();
    this.updateCold();
    this.updateReminders();
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
      this.hit = null;
      this.ui.clearPrompt();
      return;
    }
    // en regardant vers le bas, on peut fouiller sa propre poche si la clé est dans le champ
    let found = null;
    let hit = null;
    const key = this.player.body.pocketKey;
    if (this.player.pitch < -0.95 && isVisible(key)) {
      const v = key.getWorldPosition(new THREE.Vector3()).project(this.camera);
      if (Math.abs(v.x) < 0.75 && Math.abs(v.y) < 0.95 && v.z < 1) found = this.interactables.get(key);
    }
    if (!found) {
      this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
      const hits = this.raycaster.intersectObjects(this.scene.children, true);
      const usable = (h) => !h.object.userData.noRay && isVisible(h.object) && !h.object.isPoints && !h.object.isLine && h.face;
      const isGlass = (h) => h.object.material?.depthWrite === false;
      const toHit = (h) => ({ point: h.point.clone(), normal: h.face.normal.clone().transformDirection(h.object.matrixWorld) });
      for (let i = 0; i < hits.length; i++) {
        const h = hits[i];
        if (!usable(h)) continue;
        if (isGlass(h)) {
          // une vitre laisse passer le regard, sauf si elle fait partie d'une machine (robot, hotte…) :
          // on vise alors la machine, ou un objet précis derrière la vitre (flowcell, tube…)
          const owner = this.findInteractable(h.object);
          if (!owner) continue;
          const next = hits.slice(i + 1).find((h2) => usable(h2) && !isGlass(h2));
          const inner = next && this.findInteractable(next.object);
          if (inner && inner !== owner) { found = inner; hit = toHit(next); } else { found = owner; hit = toHit(h); }
          break;
        }
        found = this.findInteractable(h.object);
        hit = toHit(h);
        break; // le premier objet visible bloque la vue
      }
    }
    this.current = found;
    this.hit = hit;
    const held = this.heldItem();
    if (held) {
      if (found) this.ui.setPrompt(`Utiliser « ${held.name} » sur ${found.name}`);
      else this.ui.setPrompt(hit ? `Poser « ${held.name} » ici` : null);
    } else {
      this.ui.setPrompt(found ? found.label() : null);
    }
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
    if (this.busy) return;
    const held = this.heldItem();
    if (held) {
      if (this.current) {
        const ok = this.current.use ? this.current.use(held) : false;
        if (ok !== false) { sfx.click(); return; }
        const box = this.current.container && this.current.container();
        if (box && this.hit) { this.dropItem(held, this.hit, box); return; }
        sfx.click();
        if (held.solvent && this.current.machine) { this.ui.toast('Ce réactif n’est pas adapté.', { duration: 2.5 }); return; }
        this.ui.toast(USELESS[this.uselessIdx % USELESS.length], { duration: 2.5 });
        this.uselessIdx++;
        count('useless');
        return;
      }
      if (this.hit) this.dropItem(held, this.hit);
      return;
    }
    if (!this.current) return;
    sfx.click();
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

  // Rappels de Seb Sé : frigo laissé ouvert, UV laissés allumés, protocole introuvable
  updateReminders() {
    const s = this.state;
    const cam = this.camera.position;
    const far = (p) => Math.hypot(cam.x - p.x, cam.z - p.z) > 2.6;
    const NAG_EVERY = 20;
    if (s.fridgeOpen && far(this.refs.fridge.front)) {
      if (this.time - (this.lastFridgeNag ?? -99) > NAG_EVERY) {
        this.lastFridgeNag = this.time;
        sfx.buzzer();
        this.ui.toast('Le frigo ! On ne le laisse pas ouvert, il se réchauffe. Refermez-le.', { speaker: LEROY, tone: 'danger', duration: 6 });
      }
    } else if (!s.fridgeOpen) this.lastFridgeNag = null;
    if (s.cabinetOpen && far(this.refs.cabinet.group.position)) {
      if (this.time - (this.lastCabinetNag ?? -99) > NAG_EVERY) {
        this.lastCabinetNag = this.time;
        sfx.buzzer();
        this.ui.toast('L’armoire de sécurité ! On ne la laisse pas ouverte : ce sont des produits inflammables. Refermez-la.', { speaker: LEROY, tone: 'danger', duration: 6 });
      }
    } else if (!s.cabinetOpen) this.lastCabinetNag = null;
    if (s.uvOn) {
      const uvPos = this.refs.transillum.group.getWorldPosition(new THREE.Vector3());
      if (far(uvPos) && this.time - (this.lastUvNag ?? -99) > NAG_EVERY) {
        this.lastUvNag = this.time;
        sfx.buzzer();
        this.ui.toast('Ne laissez pas les UV allumés ! Ça abîme l’ADN du gel, et c’est dangereux pour les yeux. Éteignez-les.', { speaker: LEROY, tone: 'danger', duration: 6 });
      }
    } else this.lastUvNag = null;
    // aide : protocole toujours pas trouvé 5 minutes après avoir rendu le gel
    if (s.gelDoneAt != null && !s.protocolTaken && this.time - s.gelDoneAt > CONFIG.protocolHintDelay) {
      this.once('protocol-hint', () => this.ui.toast('Le protocole de Tom ? Il range toujours ses protocoles dans les placards de la paillasse centrale.', { speaker: LEROY, tone: 'hint', duration: 7 }));
    }
  }

  updateCold() {
    let frost = 0;
    if (this.state.fridgeOpen) {
      const d = this.camera.position.distanceTo(this.refs.fridge.front);
      frost = Math.max(0, Math.min(1, (1.5 - d) / 1.0)) * 0.9;
      if (frost > 0.3) this.once('cold', () => this.ui.toast('Brrr… il fait froid là-dedans.', { duration: 2.5 }));
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

  canCarry() {
    return this.inventory.length < CONFIG.inventorySize;
  }

  handsFull() {
    sfx.error();
    this.ui.toast('Vos poches sont pleines : prenez un objet en main (1–0) et posez-le quelque part d’un clic avant d’en ramasser un autre.', { duration: 5, tone: 'warn' });
  }

  addItem(item) {
    this.inventory.push(item);
    this.refreshHud();
  }

  // Ajoute un objet à l'inventaire ; renvoie false si l'inventaire est plein
  pickUp(id, message, duration = 4) {
    if (!this.canCarry()) { this.handsFull(); return false; }
    sfx.pickup();
    this.addItem(makeItem(id));
    if (message) this.ui.toast(message, { duration });
    this.once('inventory-help', () => setTimeout(() => this.ui.toast('Astuce : maintenez la touche du chiffre affiché sur un objet pour le regarder. Il passe alors en main : un clic l’utilise sur ce que vous visez, ou le pose.', { tone: 'hint', duration: 8 }), (duration + 0.3) * 1000));
    return true;
  }

  removeItem(id) {
    this.inventory = this.inventory.filter((i) => i.id !== id);
    if (this.selected === id) this.selected = null;
    this.refreshHud();
  }

  // Poser l'objet en main là où l'on vise (sol, paillasse, bureau, tiroir ouvert…)
  dropItem(item, hit, container = null) {
    const m = makeItemMesh(item);
    const p = hit.point.clone();
    if (hit.normal.y < 0.6) { // mur ou face verticale : l'objet tombe au pied
      p.addScaledVector(hit.normal, 0.12);
      p.y = 0;
    }
    m.position.copy(p);
    m.rotation.y = this.player.yaw + (Math.random() - 0.5) * 0.6;
    this.scene.add(m);
    if (container) container.attach(m);
    this.inventory = this.inventory.filter((i) => i !== item);
    if (this.selected === item.id) this.selected = null;
    this.refreshHud();
    sfx.plastic();
    this.register(m, {
      name: item.name,
      label: () => `Ramasser : ${item.name}`,
      action: () => {
        if (!this.canCarry()) { this.handsFull(); return; }
        m.removeFromParent();
        this.interactables.delete(m);
        sfx.pickup();
        this.addItem(item);
      },
    });
    this.once('drop-help', () => this.ui.toast(`Vous posez « ${item.name} ». Vous pourrez le reprendre d’un clic.`, { duration: 3 }));
  }

  // Maintenir 1-0 : on regarde l'objet, et il devient l'objet en main
  viewItem(index) {
    const it = this.inventory[index];
    if (!it) return false;
    this.selected = it.id;
    this.viewingId = it.id;
    this.ui.showItem(it);
    this.refreshHud();
    if (it.id === 'carnetPaul') setTimeout(() => this.learnQuests(), 1200);
    return true;
  }

  stopViewing() {
    this.viewingId = null;
    this.ui.hideItem();
  }

  // Clic pendant qu'on regarde un objet (ex. décrocher la lame scotchée)
  viewClick() {
    const it = this.inventory.find((i) => i.id === this.viewingId);
    if (!it) return;
    if (it.id === 'noteTom' && it.slide) {
      if (!this.canCarry()) { this.handsFull(); return; }
      it.slide = false;
      sfx.cloth();
      this.addItem(makeItem('lame'));
      this.ui.showItem(it);
      this.ui.toast('Vous décrochez délicatement la lame scotchée.', { duration: 3 });
    }
  }

  deselect() {
    if (!this.selected) return;
    this.selected = null;
    this.refreshHud();
  }

  refreshHud() {
    this.ui.updateInventory(this.inventory, this.selected);
    this.ui.setHeld(this.heldItem());
    this.ui.updateObjectives(this.quests(), this.questHint());
  }

  quests() {
    const s = this.state;
    const q = [{ id: 'epi', text: '1. Mettre ses EPI', done: this.equipped }];
    if (!this.equipped) {
      q.push({ id: 'coat', text: 'Blouse', done: s.coat !== null, sub: true });
      q.push({ id: 'goggles', text: 'Lunettes', done: s.goggles, sub: true });
      q.push({ id: 'gloves', text: 'Gants', done: s.gloves, sub: true });
    }
    if (s.questsKnown) {
      q.push({ id: 'gel', text: '2. Rendre le compte rendu du gel du patient T-08', done: s.laptop === 'done' });
      q.push({ id: 'seq', text: '3. Finaliser le séquençage du patient T-07', done: s.seqPrinted });
      if (s.seqPrinted && s.laptop === 'done') q.push({ id: 'exit', text: '4. Sortir du labo', done: false });
    }
    return q;
  }

  questHint() {
    const s = this.state;
    if (!this.equipped) return '';
    if (!s.questsKnown) return 'Le Dr. Hemick a sûrement laissé des consignes quelque part…';
    if (s.seqPrinted && s.laptop === 'done') return s.gloves ? 'Pensez à retirer vos gants avant de toucher la porte.' : '';
    return '';
  }

  learnQuests() {
    if (this.state.questsKnown) return;
    this.state.questsKnown = true;
    mark('carnet');
    this.refreshHud();
    sfx.success();
    this.ui.toast('Nouvelles quêtes : rendre le compte rendu du gel du patient T-08, puis finaliser le séquençage du patient T-07.', { tone: 'success', duration: 6 });
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
    d.open = true;
    const z0 = d.group.position.z;
    return tween(0.45, (k) => { d.group.position.z = z0 + (d.home + 0.3 - z0) * k; }, { easing: ease.out });
  }

  closeDrawer(d) {
    sfx.cloth();
    d.open = false;
    const z0 = d.group.position.z;
    return tween(0.35, (k) => { d.group.position.z = z0 + (d.home - z0) * k; });
  }

  toggleDrawer(d) {
    return d.open ? this.closeDrawer(d) : this.openDrawer(d);
  }

  checkEquipped() {
    this.refreshHud();
    if (this.equipped && !this.state.equippedAnnounced) {
      this.state.equippedAnnounced = true;
      mark('epi');
      this.equippedAt = this.time;
      setTimeout(() => {
        sfx.success();
        this.ui.toast('Tenue réglementaire, parfait ! Vous pouvez entrer en zone de manip. Le Dr. Hemick, le chef de Tom, a sûrement laissé des consignes quelque part…',
          { speaker: LEROY, duration: 8, tone: 'success' });
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
  // Énigme 2 : PC (mot de passe), gel sous UV, impression
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
      state.laptop = 'login';
      drawLaptop(refs, 'login');
      this.ui.toast('L’ordinateur démarre… sur la session verrouillée du Dr. P. Hemick. Il faut son mot de passe.', { duration: 4.5 });
      this.end();
      return;
    }
    if (state.laptop === 'done') {
      this.ui.toast('Le compte rendu est enregistré. L’écran affiche un joli ✓ vert.');
      return;
    }
    const r = await this.ui.pc({
      locked: !state.pcUnlocked,
      checkPassword: (v) => this.checked(v.trim().toUpperCase() === CONFIG.pcPassword),
      check: (v) => this.checked(v === CONFIG.gelCode),
      onWrong: () => this.ui.dialog({
        speaker: LEROY, role: LEROY_ROLE,
        text: 'Vous êtes sûr de vous ?<br><br>Où avez-vous trouvé ce code ?',
        button: 'Je vérifie',
      }),
    });
    if (r === 'unlocked' || r === 'ok') {
      if (!state.pcUnlocked) {
        state.pcUnlocked = true;
        state.laptop = 'blocked';
        drawLaptop(refs, 'blocked');
      }
    }
    if (r === 'unlocked') {
      this.once('pc-blocked', () => this.ui.toast('La session s’ouvre… sur le compte rendu du patient T-08, bloqué : il manque le résultat du gel d’électrophorèse.', { duration: 5 }));
    }
    if (r === 'ok') {
      state.laptop = 'done';
      state.gelDoneAt = this.time;
      mark('gel');
      drawLaptop(refs, 'done');
      await this.printSheet(refs.printer.sheet);
      state.reportPrinted = true;
      this.refreshHud();
      if (!state.questsKnown) this.learnQuests();
      this.ui.toast('Bien lu ! Sur un gel de séquençage, les fragments les plus courts migrent le plus loin : on lit la séquence du bas vers le haut, de 5′ vers 3′.',
        { speaker: LEROY, tone: 'success', duration: 9 });
    }
  }

  async printSheet(sheet, lift = 0) {
    sheet.visible = true;
    sheet.position.set(0, 0.11 + lift, 0.1);
    for (let i = 0; i < 3; i++) setTimeout(() => sfx.cloth(), i * 450);
    await tween(1.6, (k) => {
      sheet.position.z = 0.1 + 0.14 * k;
      sheet.position.y = 0.11 + lift - 0.04 * k;
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
      this.ui.toast('Les UV s’allument… mais avec toute cette lumière, on ne distingue rien sur le gel.', { duration: 4 });
    }
    if (s.uvOn && this.lighting.dark) {
      this.once('uv-dark', () => this.ui.toast('Dans le noir, les bandes du gel s’illuminent en orange : le colorant fixé à l’ADN fluoresce sous UV. Heureusement, vous portez vos lunettes !',
        { speaker: LEROY, duration: 8 }));
    }
  }

  updateGelGlow() {
    const t = this.refs.transillum;
    const on = this.state.uvOn, dark = this.lighting.dark;
    t.bandMat.visible = on && dark; // il faut les UV ET le noir pour voir les bandes
    t.bandMat.emissiveIntensity = on && dark ? 3.2 : 0;
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
    this.once('scope', () => this.ui.toast('Une cellule de comptage quadrillée, avec des cellules rosées et d’autres mauve foncé…', { duration: 5 }));
  }

  // ======================================================================
  // Énigme 4 : frigo, -80 °C
  // ======================================================================
  async useFridgeKeypad() {
    const { state } = this;
    if (state.fridgeUnlocked) { this.setFridge(!state.fridgeOpen); return; }
    const ok = await this.ui.keypad({ title: 'Frigo +4 °C', length: CONFIG.fridgeCode.length, check: (c) => this.checked(c === CONFIG.fridgeCode) });
    if (!ok) return;
    state.fridgeUnlocked = true;
    const led = this.refs.fridge.led.material;
    led.color.set(0x20ff60);
    led.emissive.set(0x20ff60);
    await this.setFridge(true);
    const { live, dead } = CONFIG.cellCounts;
    const L = live.reduce((a, b) => a + b, 0), D = dead.reduce((a, b) => a + b, 0);
    this.ui.toast(`Bien compté ! ${L} cellules vivantes sur ${L + D} : ${Math.round((100 * L) / (L + D))} % de viabilité.`,
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
    const fz = refs.freezer;
    this.begin();
    this.removeItem('arn');
    this.state.rnaStored = true;
    // la porte s'ouvre, la lumière froide s'allume
    sfx.cloth();
    fz.coldLight.intensity = 0.9;
    await tween(0.7, (k) => { fz.door.rotation.y = 1.6 * k; }, { easing: ease.out });
    // le tube vole de la main jusqu'au portoir
    const tube = fz.arnTube;
    const target = tube.getWorldPosition(new THREE.Vector3());
    const flying = tube.clone();
    flying.visible = true;
    this.scene.add(flying);
    const from = this.pointInFront(0.45, 0.2);
    await tween(0.8, (k) => {
      flying.position.lerpVectors(from, target, k);
      flying.position.y += Math.sin(k * Math.PI) * 0.12;
    }, { easing: ease.inOut });
    flying.removeFromParent();
    tube.visible = true;
    sfx.plastic();
    this.ui.toast('L’ARN est rangé dans son portoir, au -80 °C.', { duration: 3 });
    // nuage de froid
    this.frostPuff(fz);
    await wait(0.6);
    // le bloc de glace glisse du bord de l'étagère du haut… et tombe
    const ice = fz.ice;
    await tween(0.35, (k) => { ice.position.z = 0.22 + 0.12 * k; ice.rotation.x = 0.35 * k * k; }, { easing: ease.in });
    await this.dropIce(ice, fz);
    await tween(0.6, (k) => { fz.door.rotation.y = 1.6 * (1 - k); }, { easing: ease.inOut });
    fz.coldLight.intensity = 0;
    this.ui.toast('C’est très gentil de le ranger, mais à mon avis cet ARN n’est plus vraiment utilisable : resté au frigo, il a eu tout le temps d’être dégradé par les RNases. Un ARN se garde à -80 °C, sans jamais traîner ailleurs… Et c’est quoi, ce bloc de glace ?',
      { speaker: LEROY, duration: 9 });
    this.end();
  }

  // Petite simulation de chute avec rebonds (repère local du congélateur)
  dropIce(ice, fz) {
    const half = 0.055;
    const pos = ice.position;
    const vel = new THREE.Vector3(0, -0.2, 0.55);
    let spin = 7, rx = ice.rotation.x;
    let bounces = 0;
    let last = 0;
    return tween(2.0, (k) => {
      const t = k * 2.0;
      let dt = t - last;
      last = t;
      while (dt > 0) {
        const h = Math.min(dt, 1 / 120);
        dt -= h;
        vel.y -= 9.81 * h;
        pos.addScaledVector(vel, h);
        rx += spin * h;
        if (pos.y < half && vel.y < 0) {
          pos.y = half;
          if (Math.abs(vel.y) > 0.6 && bounces < 3) {
            vel.y = -vel.y * 0.32;
            vel.z *= 0.55;
            spin *= 0.45;
            bounces++;
            (bounces === 1 ? sfx.snap : sfx.plastic)();
          } else {
            vel.set(0, 0, vel.z * 0.85);
            spin *= 0.8;
          }
        }
      }
      ice.rotation.x = rx;
      if (k >= 1) {
        // se pose à plat sur la face la plus proche
        ice.rotation.x = Math.round(rx / (Math.PI / 2)) * (Math.PI / 2);
        pos.y = half;
      }
    }, { easing: ease.linear });
  }

  frostPuff(fz) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.5, depthWrite: false });
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), mat.clone());
      s.position.set((Math.random() - 0.5) * 0.5, 0.4 + Math.random() * 1.2, fz.D / 2 + 0.05);
      s.userData.noRay = true;
      fz.group.add(s);
      const v = new THREE.Vector3((Math.random() - 0.5) * 0.3, -0.25 - Math.random() * 0.2, 0.4 + Math.random() * 0.3);
      const p0 = s.position.clone();
      tween(1.8 + Math.random() * 0.6, (k) => {
        s.position.copy(p0).addScaledVector(v, k);
        s.scale.setScalar(1 + k * 2.2);
        s.material.opacity = 0.45 * (1 - k);
      }, { easing: ease.out, delay: i * 0.06 }).then(() => s.removeFromParent());
    }
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
    const item = this.inventory.find((i) => i.id === 'glace');
    this.removeItem('glace');
    const ice = makeItemMesh(item);
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
    const key = makeItemMesh(makeItem('petiteCle'));
    key.position.set(s.basinX + 0.02, s.basinY + 0.004, 0.04);
    key.rotation.y = 0.7;
    s.group.add(key);
    this.registerPickup(key, 'petiteCle', { label: 'Ramasser la petite clé', message: 'Une petite clé argentée, encore froide. Reste à savoir ce qu’elle ouvre.' });
    this.ui.toast('La glace a fondu sous l’eau du robinet… Quelque chose brille au fond de l’évier.', { duration: 5 });
    this.end();
  }

  // ======================================================================
  // Incubateur, hotte (extraction), armoire
  // ======================================================================
  setIncubator(open) {
    const inc = this.refs.incubator;
    this.state.incubatorOpen = open;
    sfx.cloth();
    inc.warm.intensity = open ? 0.6 : 0;
    const r0 = inc.door.rotation.y, r1 = open ? -1.9 : 0;
    return tween(0.6, (k) => { inc.door.rotation.y = r0 + (r1 - r0) * k; }, { easing: ease.out });
  }

  placeInHood(what) {
    const hood = this.refs.hood;
    const item = makeItem(what === 'flask' ? 'flasque' : 'kit');
    const m = makeItemMesh(item);
    m.position.set(what === 'flask' ? -0.15 : 0.3, 0.92, 0.05);
    m.rotation.y = what === 'flask' ? 0.2 : -0.3;
    hood.add(m);
    if (what === 'flask') this.hoodFlaskMesh = m;
  }

  async runExtraction() {
    this.begin();
    await wait(0.4);
    await this.ui.ellipse('Lyse, fixation sur colonne, lavages, élution… 30 minutes plus tard', 1.6);
    this.clockOffset += 30 * 60 * 1000;
    this.state.extracted = true;
    if (this.hoodFlaskMesh) this.hoodFlaskMesh.visible = false;
    // le tube d'ADN apparaît sous la hotte
    const tube = makeItemMesh(makeItem('adn'));
    tube.position.set(0.05, 0.92, 0.1);
    tube.scale.setScalar(1.6);
    this.refs.hood.add(tube);
    this.registerPickup(tube, 'adn', { label: 'Prendre le tube d’ADN', message: 'ADN purifié de l’échantillon T-07 : direction le robot.' });
    this.end();
    sfx.success();
    this.ui.toast('ADN extrait ! Le tampon de lyse casse les membranes, l’ADN se fixe sur la silice de la colonne, les lavages retirent protéines et sels, puis l’eau libère l’ADN pur.',
      { speaker: LEROY, tone: 'success', duration: 10 });
  }

  setCabinet(open) {
    const cab = this.refs.cabinet;
    this.state.cabinetOpen = open;
    sfx.cloth();
    const l0 = cab.left.rotation.y, r0 = cab.right.rotation.y;
    const l1 = open ? 1.7 : 0, r1 = open ? -1.7 : 0;
    return tween(0.7, (k) => {
      cab.left.rotation.y = l0 + (l1 - l0) * k;
      cab.right.rotation.y = r0 + (r1 - r0) * k;
    }, { easing: ease.out });
  }

  // ======================================================================
  // Robot de préparation des librairies
  // ======================================================================
  useRobot() {
    const s = this.state;
    if (s.robot === 'running') return;
    if (s.robot === 'done') { this.ui.toast('La flowcell est prête dans le bac de sortie du robot.'); return; }
    if (s.robotDna && s.robotEthanol) { this.runRobot(); return; }
    sfx.error();
    const missing = [!s.robotDna && 'l’échantillon d’ADN', !s.robotEthanol && 'de l’éthanol 80 %'].filter(Boolean);
    this.ui.toast(`L’écran du robot indique qu’il manque ${missing.join(' et ')}.`, { duration: 4.5 });
  }

  async runRobot() {
    const { refs, state } = this;
    const r = refs.robot;
    state.robot = 'running';
    r.beaconMat.color.set(0x22c55e);
    r.beaconMat.emissive.set(0x22c55e);
    sfx.click();
    // positions (x du chariot, z de la tête) au-dessus des éléments du plateau
    const spots = {
      tips: [-0.5, 0.0], sample: [0.05, 0.35], mag: [-0.22, 0.05], etoh: [0.32, 0.35], fc: [0.32, 0.05],
    };
    const steps = [
      ['tips', 'Prise des cônes'], ['sample', 'Fragmentation de l’ADN'], ['mag', 'Ligation des adaptateurs'],
      ['tips', 'Prise des cônes'], ['etoh', 'Lavage des billes à l’éthanol 80 %'], ['mag', 'Billes retenues par l’aimant'],
      ['etoh', 'Second lavage'], ['mag', 'Élution des librairies'], ['fc', 'Chargement de la flowcell'],
    ];
    let i = 0;
    for (const [spot, label] of steps) {
      i++;
      drawRobot(refs, { running: true, p: i / steps.length, step: label });
      const [tx, tz] = spots[spot];
      const x0 = r.carriage.position.x, z0 = r.head.position.z;
      await tween(0.55, (k) => { r.carriage.position.x = x0 + (tx - x0) * k; r.head.position.z = z0 + (tz - z0) * k; });
      await tween(0.22, (k) => { r.head.position.y = -0.2 * k; }, { easing: ease.out });
      sfx.key();
      await tween(0.22, (k) => { r.head.position.y = -0.2 * (1 - k); }, { easing: ease.in });
    }
    await tween(0.5, (k) => { r.carriage.position.x *= (1 - k); r.head.position.z *= (1 - k); });
    state.robot = 'done';
    r.flowcell.visible = true;
    r.beaconMat.color.set(0xffffff);
    r.beaconMat.emissive.set(0xffffff);
    drawRobot(refs, { done: true });
    sfx.success();
    this.ui.toast('Librairies prêtes ! Le robot a fragmenté l’ADN, collé des adaptateurs, puis purifié sur billes magnétiques : un aimant retient les billes (et l’ADN) pendant que l’éthanol 80 % lave le reste.',
      { speaker: LEROY, tone: 'success', duration: 10 });
  }

  // ======================================================================
  // Séquenceur + ellipse temporelle
  // ======================================================================
  async loadFlowcell() {
    const { refs, state } = this;
    const sq = refs.sequencer;
    this.begin();
    sfx.cloth();
    await tween(0.4, (k) => { sq.flap.rotation.x = 1.3 * k; }, { easing: ease.out });
    sq.fcInside.visible = true;
    sq.fcInside.position.z = 0.08;
    await tween(0.5, (k) => { sq.fcInside.position.z = 0.08 - 0.14 * k; });
    sq.fcInside.visible = false;
    await tween(0.4, (k) => { sq.flap.rotation.x = 1.3 * (1 - k); }, { easing: ease.in });
    sfx.snap();
    state.seq = 'loaded';
    drawSequencer(refs, 'loaded');
    this.end();
    this.ui.toast('Flowcell insérée. L’écran du séquenceur demande le numéro d’échantillon.', { duration: 4 });
  }

  async startRun(sample) {
    const { refs, state } = this;
    const sq = refs.sequencer;
    this.begin();
    state.seq = 'running';
    sq.statusMat.color.set(0x22c55e);
    sq.statusMat.emissive.set(0x22c55e);
    await tween(1.6, (k) => drawSequencer(refs, 'running', k * 0.04, sample), { easing: ease.linear });
    this.ui.toast('Le run démarre. Il en a pour environ trois heures…', { duration: 3 });
    await wait(1.2);
    await this.ui.ellipse(`${['Une', 'Deux', 'Trois', 'Quatre'][CONFIG.runHours - 1] || CONFIG.runHours} heures plus tard…`, 2.2);
    this.clockOffset += CONFIG.runHours * 3600 * 1000;
    state.seq = 'done';
    sq.statusMat.color.set(0xffffff);
    sq.statusMat.emissive.set(0xffffff);
    drawSequencer(refs, 'done', 1, sample);
    this.refreshHud();
    this.end();
    sfx.success();
    this.ui.toast('Séquençage terminé ! L’écran du séquenceur affiche les résultats.', { tone: 'success', duration: 5 });
  }

  async useSequencer() {
    const s = this.state;
    if (s.seq === 'idle') { this.ui.toast('Séquenceur prêt. Il attend une flowcell chargée.'); return; }
    if (s.seq === 'running') return;
    if (s.seq === 'loaded') {
      const r = await this.ui.sequencer({
        mode: 'setup',
        checkSample: (v) => {
          const n = v.replace(/\s/g, '').replace(/^T(\d)/, 'T-$1');
          if (n === 'T-07') return true;
          count('wrongCodes');
          return /^T-\d+$/.test(n) ? `Aucune librairie « ${n} » sur cette flowcell.` : 'Format attendu : T-00.';
        },
      });
      if (r === 'start') this.startRun('T-07');
      return;
    }
    await this.ui.sequencer({
      mode: 'results',
      sample: 'T-07',
      printed: s.seqPrinted,
      onPrint: () => {
        if (s.seqPrinted) return;
        s.seqPrinted = true;
        mark('seq');
        this.printSheet(this.refs.printer.seqSheet, 0.006).then(() => this.refreshHud());
      },
    });
    if (s.seqPrinted) {
      this.once('q30', () => this.ui.toast('Q30, c’est une base sur mille lue de travers. Plus de 90 % des bases au-dessus : un très bon run ! Votre compte-rendu attend à l’imprimante du bureau.',
        { speaker: LEROY, duration: 8 }));
    }
  }

  // ======================================================================
  // Tasse de café : on ne boit pas au labo !
  // ======================================================================
  async confiscateMug() {
    const { refs, state } = this;
    if (state.mugGone) return;
    state.mugGone = true;
    this.interactables.delete(refs.mug);
    sfx.buzzer();
    this.ui.flash('rgba(242,194,0,0.35)');
    await this.ui.dialog({
      speaker: LEROY, role: LEROY_ROLE,
      text: '<b>Vous alliez boire ce café ?! On ne boit pas et on ne mange pas dans un laboratoire !</b><br><br>Une tasse dans un labo, c’est le meilleur moyen d’avaler un produit chimique ou un échantillon par erreur. Je confisque.',
      tone: 'danger', button: 'Bien compris',
    });
    await tween(0.4, (k) => { refs.mug.scale.setScalar(1 - k); }, { easing: ease.in });
    refs.mug.visible = false;
  }

  // ======================================================================
  // Sortie
  // ======================================================================
  async useExitKeypad() {
    if (this.state.exitOpen) {
      this.ui.toast('Le voyant est vert : la porte est déverrouillée.');
      return;
    }
    const ok = await this.ui.keypad({ title: 'Porte de sortie', length: CONFIG.exitCode.length, keys: KEYS_ROOM, check: (c) => this.checked(c === CONFIG.exitCode) });
    if (ok) {
      this.state.exitOpen = true;
      const led = this.refs.keypadLed.material;
      led.color.set(0x20ff60);
      led.emissive.set(0x20ff60);
      this.refreshHud();
      this.ui.toast(this.state.gloves
        ? 'Clic ! La porte est déverrouillée. Mais pas de gants sur la poignée : jetez-les d’abord.'
        : 'Clic ! La porte de sortie est déverrouillée.', { tone: 'success', duration: 5 });
    }
  }

  win() {
    if (this.finished) return;
    this.finished = true;
    mark('exit');
    sendStats('terminée', { dasri: this.state.dasriWarnings, mug: this.state.mugGone });
    this.ui.openModal();
    const rows = ['epi', 'carnet', 'gel', 'seq', 'exit'].map((k) => [STEP_LABELS[k], formatTime(session.splits[k])]);
    this.ui.showWin(formatTime(session.splits.exit), session.name, rows);
  }

  // Fouiller la poche d'une blouse accrochée (la clé de Paul est dans celle du Dr. Hemick)
  searchCoatPocket(c) {
    sfx.cloth();
    if (c.index === CONFIG.keyCoat) {
      if (this.state.keyTaken) { this.ui.toast('La poche est vide.', { duration: 2.5 }); return; }
      if (!this.pickUp('clePaul', 'Une petite clé dorée dans la poche de la blouse du Dr. Hemick !', 3.5)) return;
      this.state.keyTaken = true;
      return;
    }
    const msgs = ['Un stylo et un mouchoir usagé. Rien d’utile.', 'La poche est vide.'];
    this.ui.toast(c.index === 1 ? msgs[0] : msgs[1], { duration: 3 });
  }

  // Compte les codes faux (statistiques) ; renvoie le résultat de la vérification
  checked(ok) {
    if (!ok) count('wrongCodes');
    return ok;
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
