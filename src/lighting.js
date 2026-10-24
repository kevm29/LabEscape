// Éclairage de la pièce et interrupteur (pénombre).
import * as THREE from 'three';
import { mats } from './room.js';

export function createLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xf2f6ff, 0x6a7076, 0.3);
  scene.add(hemi);
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
  const ceiling = [];
  for (const x of [-3, 0, 3]) {
    for (const z of [-2, 1.6]) {
      const l = new THREE.PointLight(0xfff3e2, 2.4, 7, 1.6);
      l.position.set(x, 2.8, z);
      scene.add(l);
      ceiling.push(l);
    }
  }

  let materials = null; // liste des matériaux pour atténuer les reflets d'environnement
  let hoodLights = null;
  let dark = false;

  function collect() {
    materials = new Set();
    hoodLights = [];
    scene.traverse((o) => {
      if (o.isMesh) for (const m of [].concat(o.material)) materials.add(m);
      if (o.isPointLight && o.userData.switchable) hoodLights.push(o);
    });
    for (const m of materials) m.userData.envBase = m.envMapIntensity ?? 1;
  }

  return {
    get dark() { return dark; },
    setDark(on) {
      if (!materials) collect();
      dark = on;
      hemi.intensity = on ? 0.035 : 0.3;
      key.intensity = on ? 0 : 1.7;
      ceiling.forEach((l) => { l.intensity = on ? 0 : 2.4; });
      hoodLights.forEach((l) => { l.intensity = on ? 0 : 1.2; });
      mats.ceilingPanel.emissiveIntensity = on ? 0.02 : 2.2;
      mats.lightPanel.emissiveIntensity = on ? 0.02 : 2.2;
      for (const m of materials) {
        if (m.envMapIntensity !== undefined) m.envMapIntensity = m.userData.envBase * (on ? 0.06 : 1);
      }
    },
  };
}
