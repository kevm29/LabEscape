// Modèles 3D des objets d'inventaire quand on les pose quelque part.
// Chaque modèle a son origine au niveau de sa base (posé sur une surface en y = 0).
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../lib/three/addons/RoundedBoxGeometry.js';
import { makeKey } from './props.js';
import { makeFlowcell, makeFlask } from './machines.js';

const std = (o) => new THREE.MeshStandardMaterial(o);

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makeItemMesh(item) {
  const g = new THREE.Group();
  const model = item.model || 'box';
  switch (model) {
    case 'keyGold':
    case 'keySilver': {
      const k = makeKey(model === 'keyGold' ? 0xc9a227 : 0xaab4bd);
      k.scale.setScalar(1.7);
      k.rotation.x = -Math.PI / 2;
      k.position.y = 0.006;
      g.add(k);
      break;
    }
    case 'paper': {
      const tone = item.id === 'brouillon' ? 0xeeeadc : 0xfbfaf4;
      const p = mesh(new THREE.BoxGeometry(0.21, 0.002, 0.297), std({ color: tone, roughness: 0.9 }), 0, 0.001, 0);
      g.add(p);
      for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(0.12 + (i % 3) * 0.02, 0.0005, 0.008), std({ color: 0x8a8f96 }), -0.02, 0.0025, -0.09 + i * 0.03));
      if (item.id === 'noteTom' && item.slide) g.add(mesh(new THREE.BoxGeometry(0.075, 0.002, 0.026), std({ color: 0xdff2fb, transparent: true, opacity: 0.7 }), 0, 0.004, 0.06));
      break;
    }
    case 'notebook':
      g.add(mesh(new RoundedBoxGeometry(0.15, 0.014, 0.21, 2, 0.004), std({ color: 0x8a2d2d, roughness: 0.7 }), 0, 0.007, 0));
      break;
    case 'binder':
      g.add(mesh(new RoundedBoxGeometry(0.25, 0.05, 0.31, 2, 0.006), std({ color: 0x1e5bb8, roughness: 0.5 }), 0, 0.025, 0));
      break;
    case 'slide':
      g.add(mesh(new THREE.BoxGeometry(0.075, 0.002, 0.026), std({ color: 0xdff2fb, transparent: true, opacity: 0.7 }), 0, 0.001, 0));
      break;
    case 'tube': {
      const glass = std({ color: 0xeef8ff, transparent: true, opacity: 0.45, roughness: 0.05 });
      const t = new THREE.Group();
      t.rotation.z = Math.PI / 2; // couché
      t.position.y = 0.022;
      g.add(t);
      t.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 16), glass));
      t.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 16), std({ color: item.color ?? 0xffffff, transparent: true, opacity: 0.8 }), 0, -0.015, 0));
      t.add(mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.022, 16), std({ color: item.id === 'arn' ? 0xf2c200 : 0x1e5bb8 }), 0, 0.07, 0));
      break;
    }
    case 'microtube':
      g.add(mesh(new THREE.CylinderGeometry(0.007, 0.004, 0.04, 10), std({ color: 0xf4f6f8, transparent: true, opacity: 0.85 }), 0, 0.02, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.008, 10), std({ color: 0x1e5bb8 }), 0, 0.044, 0));
      break;
    case 'kit':
      g.add(mesh(new RoundedBoxGeometry(0.11, 0.09, 0.17, 2, 0.008), std({ color: 0xf6f7f9, roughness: 0.45 }), 0, 0.045, 0));
      g.add(mesh(new THREE.BoxGeometry(0.112, 0.02, 0.172), std({ color: 0x1e5bb8 }), 0, 0.075, 0));
      break;
    case 'ice': {
      g.add(mesh(new RoundedBoxGeometry(0.14, 0.11, 0.12, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: 0xd6f1ff, roughness: 0.15, transparent: true, opacity: 0.85 }), 0, 0.055, 0));
      const k = makeKey(0xaab4bd);
      k.rotation.set(0, 0.4, Math.PI / 2);
      k.scale.setScalar(1.3);
      k.position.y = 0.055;
      g.add(k);
      break;
    }
    case 'flask':
      g.add(makeFlask('T-07'));
      break;
    case 'bottle': {
      const glass = std({ color: 0xeef8ff, transparent: true, opacity: 0.5, roughness: 0.05 });
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 20), glass, 0, 0.11, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.16, 20), std({ color: 0xf4f8ff, transparent: true, opacity: 0.6 }), 0, 0.08, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 16), std({ color: 0xc62828 }), 0, 0.24, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.051, 0.051, 0.07, 20), std({ color: 0xffffff }), 0, 0.1, 0));
      break;
    }
    case 'flowcell':
      g.add(makeFlowcell());
      break;
    default:
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.05, 0.08), std({ color: 0xcccccc }), 0, 0.025, 0));
  }
  return g;
}
