// Interface HTML superposée à la scène 3D.
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.modalOpen = false;
    this.onModalClose = () => {};
    this.toastTimer = 0;
  }

  setPrompt(text) {
    const el = $('prompt');
    $('crosshair').classList.toggle('active', !!text);
    if (!text) { el.classList.remove('show'); return; }
    el.innerHTML = `<kbd>Clic</kbd> ${text}`;
    el.classList.add('show');
    $('crosshair').classList.toggle('active', !!text);
  }

  clearPrompt() {
    $('prompt').classList.remove('show');
    $('crosshair').classList.remove('active');
  }

  toast(text, { speaker = null, duration = 5, tone = 'info' } = {}) {
    const el = $('toast');
    el.className = `toast show ${tone}`;
    el.innerHTML = (speaker ? `<span class="speaker">${speaker}</span>` : '') + `<span class="msg">${text}</span>`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), duration * 1000);
  }

  openModal() {
    this.modalOpen = true;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closeModal() {
    this.modalOpen = false;
    this.onModalClose();
  }

  dialog({ speaker = '', role = '', text = '', tone = 'info', button = 'Compris' }) {
    return new Promise((resolve) => {
      this.openModal();
      const el = $('dialog');
      el.className = `modal show ${tone}`;
      $('dialog-speaker').textContent = speaker;
      $('dialog-role').textContent = role;
      $('dialog-text').innerHTML = text;
      const btn = $('dialog-btn');
      btn.textContent = button;
      const close = () => {
        el.classList.remove('show');
        btn.removeEventListener('click', close);
        removeEventListener('keydown', onKey);
        this.closeModal();
        resolve();
      };
      const onKey = (e) => { if (e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space') { e.preventDefault(); close(); } };
      btn.addEventListener('click', close);
      setTimeout(() => addEventListener('keydown', onKey), 250);
      btn.focus();
    });
  }

  // Digicode : resolve(true) si le bon code est saisi, false si fermé
  keypad({ title = 'Digicode', length = 4, check }) {
    return new Promise((resolve) => {
      this.openModal();
      const el = $('keypad');
      const screen = $('keypad-screen');
      $('keypad-title').textContent = title;
      el.classList.add('show');
      let code = '';
      const render = (state = '') => {
        screen.className = `screen ${state}`;
        screen.textContent = state === 'ok' ? 'ACCÈS OK' : state === 'err' ? 'ERREUR' : code.padEnd(length, '•').split('').join(' ');
      };
      render();
      let locked = false;
      const press = (k) => {
        if (locked) return;
        if (k === 'C') { code = ''; sfx.key(); render(); return; }
        if (k === 'OK') { submit(); return; }
        if (code.length < length) { code += k; sfx.key(); render(); }
        if (code.length === length) setTimeout(submit, 180);
      };
      const submit = () => {
        if (locked || code.length < length) return;
        locked = true;
        if (check(code)) {
          sfx.success(); render('ok');
          setTimeout(() => finish(true), 900);
        } else {
          sfx.error(); render('err');
          setTimeout(() => { code = ''; locked = false; render(); }, 900);
        }
      };
      const onClick = (e) => { const k = e.target.closest('button')?.dataset.k; if (k) press(k); };
      const onKey = (e) => {
        if (/^Digit\d$|^Numpad\d$/.test(e.code)) press(e.code.slice(-1));
        else if (e.code === 'Backspace') { code = code.slice(0, -1); render(); }
        else if (e.code === 'Enter' || e.code === 'NumpadEnter') submit();
        else if (e.code === 'Escape') finish(false);
      };
      const finish = (ok) => {
        el.classList.remove('show');
        $('keypad-keys').removeEventListener('click', onClick);
        $('keypad-close').removeEventListener('click', onClose);
        removeEventListener('keydown', onKey);
        this.closeModal();
        resolve(ok);
      };
      const onClose = () => finish(false);
      $('keypad-keys').addEventListener('click', onClick);
      $('keypad-close').addEventListener('click', onClose);
      addEventListener('keydown', onKey);
    });
  }

  updateObjectives(state, total) {
    const equipped = state.coat !== null && state.goggles && state.gloves;
    $('obj-title').textContent = equipped ? 'Trouver les aimants' : 'S’équiper avant la manip';
    const set = (k, on) => $(`obj-${k}`).classList.toggle('done', on);
    set('coat', state.coat !== null);
    set('goggles', state.goggles);
    set('gloves', state.gloves);
    $('obj-magnets').innerHTML = `<span class="magnet-icon"></span> Aimants <b>${state.magnets.size} / ${total}</b>`;
    $('obj-magnets').classList.toggle('done', state.magnets.size >= total);
  }

  updateInventory(items) {
    const el = $('inventory');
    el.innerHTML = '';
    // seules les cases remplies sont affichées (la vue vers le bas reste dégagée)
    for (const it of items) {
      const slot = document.createElement('div');
      slot.className = 'slot filled';
      slot.innerHTML = `<span class="ico">${it.icon}</span><span class="name">${it.name}</span>`;
      el.appendChild(slot);
    }
  }

  fade(to, duration = 0.3) {
    const el = $('fade');
    el.style.transition = `opacity ${duration}s ease`;
    el.style.opacity = to;
    return new Promise((r) => setTimeout(r, duration * 1000));
  }

  flash(color = 'rgba(220,30,30,0.45)') {
    const el = $('flash');
    el.style.transition = 'none';
    el.style.background = color;
    el.style.opacity = 1;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.9s ease';
      el.style.opacity = 0;
    }));
  }

  showGoggles(on) {
    $('goggles').classList.toggle('on', on);
  }

  showWin(timeStr) {
    $('win-time').textContent = timeStr;
    $('win').classList.add('show');
  }
}
