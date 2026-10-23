// Mini moteur d'animations (tweens) basé sur des promesses.
const active = [];

export const ease = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/**
 * Anime une valeur k de 0 à 1 pendant `duration` secondes.
 * onUpdate(k) est appelé à chaque frame avec la valeur lissée.
 */
export function tween(duration, onUpdate = () => {}, { easing = ease.inOut, delay = 0 } = {}) {
  return new Promise((resolve) => {
    active.push({ t: -delay, duration: Math.max(duration, 1e-4), onUpdate, easing, resolve });
  });
}

export const wait = (s) => tween(s);

export function updateTweens(dt) {
  for (let i = active.length - 1; i >= 0; i--) {
    const tw = active[i];
    tw.t += dt;
    if (tw.t < 0) continue;
    const raw = Math.min(tw.t / tw.duration, 1);
    tw.onUpdate(tw.easing(raw));
    if (raw >= 1) {
      active.splice(i, 1);
      tw.resolve();
    }
  }
}
