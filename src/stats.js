// Chronométrage d'une partie et envoi des résultats vers une feuille Google Sheets.
// L'adresse du script Google (CONFIG.statsUrl) se règle dans config.js — voir tools/README-statistiques.md.
import { CONFIG } from './config.js';

const STEPS = ['epi', 'carnet', 'gel', 'seq', 'exit'];

export const session = {
  name: '',
  startedAt: null, // performance.now() à l'entrée dans le labo
  splits: {}, // étape -> secondes depuis le début
  counters: { wrongCodes: 0, useless: 0 },
  sent: false,
};

export function startSession(name) {
  session.name = name;
  session.startedAt = performance.now();
  session.splits = {};
  session.counters = { wrongCodes: 0, useless: 0 };
  session.sent = false;
}

export function elapsed() {
  return session.startedAt === null ? 0 : (performance.now() - session.startedAt) / 1000;
}

export function mark(step) {
  if (session.startedAt === null || session.splits[step] !== undefined) return;
  session.splits[step] = Math.round(elapsed());
}

export function count(key) {
  session.counters[key] = (session.counters[key] || 0) + 1;
}

export function formatTime(sec) {
  if (sec === undefined || sec === null) return '—';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min ${String(r).padStart(2, '0')} s` : `${m} min ${String(r).padStart(2, '0')} s`;
}

export const STEP_LABELS = {
  epi: 'EPI mis',
  carnet: 'Carnet lu',
  gel: 'Gel rendu (T-08)',
  seq: 'Séquençage fini (T-07)',
  exit: 'Sortie',
};

// Envoie une ligne (partie terminée ou abandonnée). Une seule fois par partie.
export function sendStats(status, extra = {}) {
  if (session.sent || session.startedAt === null) return false;
  session.sent = true;
  const reached = STEPS.filter((s) => session.splits[s] !== undefined);
  const data = {
    name: session.name,
    status,
    lastStep: reached.length ? STEP_LABELS[reached[reached.length - 1]] : 'Aucune',
    total: Math.round(elapsed()),
    ...Object.fromEntries(STEPS.map((s) => [s, session.splits[s] ?? null])),
    ...session.counters,
    ...extra,
    version: CONFIG.version,
  };
  if (!CONFIG.statsUrl) return false;
  const body = JSON.stringify(data);
  try {
    // sendBeacon survit à la fermeture de l'onglet ; text/plain évite la requête préalable CORS
    if (navigator.sendBeacon && navigator.sendBeacon(CONFIG.statsUrl, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return true;
  } catch { /* on tente fetch */ }
  try {
    fetch(CONFIG.statsUrl, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
    return true;
  } catch {
    return false;
  }
}
