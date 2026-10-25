// Interface HTML superposée à la scène 3D.
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.modalCount = 0;
    this.onModalClose = () => {};
    this.toastTimer = 0;
  }

  get modalOpen() {
    return this.modalCount > 0;
  }

  setPrompt(text) {
    const el = $('prompt');
    $('crosshair').classList.toggle('active', !!text);
    if (!text) { el.classList.remove('show'); return; }
    el.innerHTML = `<kbd>Clic</kbd> ${text}`;
    el.classList.add('show');
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

  // Les fenêtres peuvent s'empiler (ex. dialogue par-dessus le PC)
  openModal() {
    this.modalCount++;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closeModal() {
    this.modalCount = Math.max(0, this.modalCount - 1);
    if (this.modalCount === 0) this.onModalClose();
  }

  dialog({ speaker = '', role = '', text = '', tone = 'info', button = 'Compris', avatar = 'SS' }) {
    return new Promise((resolve) => {
      this.openModal();
      const el = $('dialog');
      el.className = `modal show ${tone}`;
      $('dialog-avatar').textContent = avatar;
      $('dialog-speaker').textContent = speaker;
      $('dialog-role').textContent = role;
      $('dialog-text').innerHTML = text;
      const btn = $('dialog-btn');
      btn.textContent = button;
      const close = () => {
        el.classList.remove('show');
        btn.removeEventListener('click', close);
        removeEventListener('keydown', onKey, true);
        this.closeModal();
        resolve();
      };
      const onKey = (e) => {
        if (e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space' || e.code === 'NumpadEnter') {
          e.preventDefault(); e.stopImmediatePropagation(); close();
        }
      };
      btn.addEventListener('click', close);
      setTimeout(() => addEventListener('keydown', onKey, true), 250);
      btn.focus();
    });
  }

  // Digicode à touches (souris ou clavier) : resolve(true) si le bon code est saisi
  keypad({ title = 'Digicode', length = 4, check, keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'] }) {
    return new Promise((resolve) => {
      this.openModal();
      const el = $('keypad');
      const screen = $('keypad-screen');
      $('keypad-title').textContent = title;
      $('keypad-keys').innerHTML = keys.map((k) => `<button data-k="${k}">${k}</button>`).join('');
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
        if (k === 'C' && keys.includes('OK')) { code = ''; sfx.key(); render(); return; }
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
        else if (e.key && e.key.length === 1 && /[a-z]/i.test(e.key) && keys.includes(e.key.toUpperCase())) press(e.key.toUpperCase());
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

  // Cadenas à molettes, tournées à la souris (clic sur ▲/▼ ou molette)
  padlock({ title, code }) {
    return new Promise((resolve) => {
      this.openModal();
      const el = $('padlock');
      $('padlock-title').textContent = title;
      const wheels = $('padlock-wheels');
      const digits = [0, 0, 0, 0];
      wheels.innerHTML = digits.map((_, i) => `
        <div class="wheel" data-i="${i}">
          <button class="up" data-i="${i}" data-d="1" aria-label="Molette ${i + 1} vers le haut">▲</button>
          <div class="digit" id="pd-${i}">0</div>
          <button class="down" data-i="${i}" data-d="-1" aria-label="Molette ${i + 1} vers le bas">▼</button>
        </div>`).join('');
      el.classList.add('show');
      let done = false;
      const turn = (i, d) => {
        if (done) return;
        digits[i] = (digits[i] + d + 10) % 10;
        const dg = $(`pd-${i}`);
        dg.textContent = digits[i];
        dg.classList.remove('spin'); void dg.offsetWidth; dg.classList.add('spin');
        sfx.click();
        if (digits.join('') === code) {
          done = true;
          sfx.success();
          el.classList.add('open');
          setTimeout(() => finish(true), 900);
        }
      };
      const onClick = (e) => {
        const b = e.target.closest('button[data-i]');
        if (b) turn(Number(b.dataset.i), Number(b.dataset.d));
      };
      const onWheel = (e) => {
        const w = e.target.closest('.wheel');
        if (!w) return;
        e.preventDefault();
        turn(Number(w.dataset.i), e.deltaY < 0 ? 1 : -1);
      };
      const onKey = (e) => { if (e.code === 'Escape') finish(false); };
      const finish = (ok) => {
        el.classList.remove('show', 'open');
        wheels.removeEventListener('click', onClick);
        wheels.removeEventListener('wheel', onWheel);
        $('padlock-close').removeEventListener('click', onClose);
        removeEventListener('keydown', onKey);
        this.closeModal();
        resolve(ok);
      };
      const onClose = () => finish(false);
      wheels.addEventListener('click', onClick);
      wheels.addEventListener('wheel', onWheel, { passive: false });
      $('padlock-close').addEventListener('click', onClose);
      addEventListener('keydown', onKey);
    });
  }

  // Ordinateur portable : fenêtre bloquée sur le résultat manquant.
  // check(value) -> 'ok' | 'wrong' ; onWrong() affiche la remarque de M. Sé.
  pc({ check, onWrong, locked = false, checkPassword = () => true }) {
    return new Promise((resolve) => {
      this.openModal();
      const el = $('pc');
      const login = $('pc-login');
      const win = $('pc-window');
      const pass = $('pc-pass');
      const passErr = $('pc-pass-err');
      let isLocked = locked;
      const showStage = () => {
        login.hidden = !isLocked;
        win.hidden = isLocked;
        setTimeout(() => (isLocked ? pass : input).focus(), 50);
      };
      pass.value = '';
      passErr.textContent = '';
      const tryLogin = () => {
        if (checkPassword(pass.value)) {
          sfx.success();
          isLocked = false;
          showStage();
        } else {
          sfx.error();
          passErr.textContent = 'Mot de passe incorrect.';
          pass.select();
        }
      };
      const input = $('pc-input');
      const popup = $('pc-popup');
      const status = $('pc-status');
      el.classList.add('show');
      popup.hidden = true;
      status.textContent = '';
      status.className = '';
      input.value = '';
      input.disabled = false;
      showStage();
      let busy = false;
      const submit = async () => {
        if (busy) return;
        const v = input.value.toUpperCase().replace(/[^A-Z]/g, '');
        if (!v) { showPopup(); return; }
        if (check(v)) {
          busy = true;
          input.disabled = true;
          sfx.success();
          status.className = 'ok';
          status.textContent = 'Compte rendu enregistré. Impression en cours…';
          setTimeout(() => finish('ok'), 1400);
        } else {
          sfx.error();
          busy = true;
          await onWrong();
          busy = false;
          input.focus();
          input.select();
        }
      };
      const showPopup = () => { sfx.error(); popup.hidden = false; $('pc-popup-ok').focus(); };
      const hidePopup = () => { popup.hidden = true; input.focus(); };
      const onKey = (e) => {
        if ($('dialog').classList.contains('show')) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          e.preventDefault();
          if (isLocked) tryLogin();
          else if (!popup.hidden) hidePopup(); else submit();
        } else if (e.code === 'Escape') {
          if (!popup.hidden) hidePopup(); else finish('left');
        }
      };
      const onSave = () => submit();
      const onX = () => showPopup();
      const onLeave = () => finish('left');
      const finish = (r) => {
        el.classList.remove('show');
        $('pc-login-btn').removeEventListener('click', tryLogin);
        $('pc-save').removeEventListener('click', onSave);
        $('pc-x').removeEventListener('click', onX);
        $('pc-popup-ok').removeEventListener('click', hidePopup);
        $('pc-leave').removeEventListener('click', onLeave);
        removeEventListener('keydown', onKey);
        input.blur();
        pass.blur();
        this.closeModal();
        resolve(r === 'left' && !isLocked && locked ? 'unlocked' : r);
      };
      $('pc-login-btn').addEventListener('click', tryLogin);
      $('pc-save').addEventListener('click', onSave);
      $('pc-x').addEventListener('click', onX);
      $('pc-popup-ok').addEventListener('click', hidePopup);
      $('pc-leave').addEventListener('click', onLeave);
      addEventListener('keydown', onKey);
    });
  }

  // Écran du séquenceur : résultats + impression
  // Écran du séquenceur.
  // mode 'setup' : saisie du n° d'échantillon (resolve('start') si checkSample l'accepte)
  // mode 'results' : statistiques + impression
  sequencer({ mode, sample = '', checkSample = () => true, onPrint = () => {}, printed = false }) {
    return new Promise((resolve) => {
      this.openModal();
      const el = $('seq');
      const setup = $('seq-setup'), results = $('seq-results');
      setup.hidden = mode !== 'setup';
      results.hidden = mode !== 'results';
      $('seq-title').textContent = sample ? `NX-7 · RUN ${sample}` : 'NX-7';
      el.classList.add('show');
      const input = $('seq-sample'), err = $('seq-err');
      input.value = '';
      err.textContent = '';
      if (mode === 'setup') setTimeout(() => input.focus(), 50);
      const btn = $('seq-print');
      const status = $('seq-status');
      status.textContent = printed ? 'Le compte-rendu a déjà été imprimé au bureau.' : '';
      btn.disabled = printed;
      const print = () => {
        btn.disabled = true;
        sfx.click();
        status.textContent = 'Impression envoyée à l’imprimante du bureau.';
        onPrint();
      };
      const start = () => {
        const v = input.value.trim().toUpperCase();
        if (!v) { sfx.error(); err.textContent = 'Saisissez un numéro d’échantillon.'; return; }
        const r = checkSample(v);
        if (r !== true) { sfx.error(); err.textContent = r; input.select(); return; }
        sfx.success();
        finish('start');
      };
      const onKey = (e) => {
        if (e.code === 'Escape') finish();
        else if ((e.code === 'Enter' || e.code === 'NumpadEnter') && mode === 'setup') { e.preventDefault(); start(); }
      };
      const finish = (r) => {
        el.classList.remove('show');
        btn.removeEventListener('click', print);
        $('seq-start').removeEventListener('click', start);
        $('seq-close').removeEventListener('click', onClose);
        removeEventListener('keydown', onKey);
        input.blur();
        this.closeModal();
        resolve(r);
      };
      const onClose = () => finish();
      btn.addEventListener('click', print);
      $('seq-start').addEventListener('click', start);
      $('seq-close').addEventListener('click', onClose);
      addEventListener('keydown', onKey);
    });
  }

  // Ellipse temporelle : écran noir + texte
  async ellipse(text, hold = 2.2) {
    const el = $('ellipse');
    $('ellipse-text').textContent = text;
    el.classList.add('show');
    await new Promise((r) => setTimeout(r, 900 + hold * 1000));
    el.classList.remove('show');
    await new Promise((r) => setTimeout(r, 900));
  }

  // Vue dans l'oculaire du microscope
  microscope(draw) {
    return new Promise((resolve) => {
      this.openModal();
      const el = $('scope');
      el.classList.add('show');
      draw($('scope-canvas'));
      const onKey = (e) => { if (e.code === 'Escape' || e.code === 'Enter') finish(); };
      const finish = () => {
        el.classList.remove('show');
        $('scope-close').removeEventListener('click', finish);
        removeEventListener('keydown', onKey);
        this.closeModal();
        resolve();
      };
      $('scope-close').addEventListener('click', finish);
      addEventListener('keydown', onKey);
    });
  }

  // Vue rapprochée d'un objet (tant que la touche est maintenue)
  showItem(item) {
    const el = $('viewer');
    $('viewer-title').textContent = item.name;
    $('viewer-body').innerHTML = item.view(item);
    el.classList.add('show');
  }

  hideItem() {
    $('viewer').classList.remove('show');
  }

  setHeld(item) {
    const el = $('held');
    if (!item) { el.classList.remove('show'); return; }
    el.innerHTML = `<span class="ico">${item.icon}</span><span>En main : <b>${item.name}</b></span><span class="hint"><kbd>Clic</kbd> utiliser / poser · <kbd>Clic droit</kbd> ranger</span>`;
    el.classList.add('show');
  }

  setFrost(amount) {
    $('frost').style.opacity = amount.toFixed(2);
  }

  // quests : [{ id, text, done, sub }] ; status : texte d'aide sous la liste
  updateObjectives(quests, status) {
    const list = $('obj-list');
    const key = JSON.stringify(quests);
    if (key !== this.lastQuests) {
      const prev = new Set((this.lastQuestIds || []));
      list.innerHTML = quests.map((q) => `<li class="${q.done ? 'done' : ''}${q.sub ? ' sub' : ''}${prev.size && !prev.has(q.id) ? ' new' : ''}">${q.text}</li>`).join('');
      this.lastQuests = key;
      this.lastQuestIds = quests.map((q) => q.id);
    }
    const st = $('obj-status');
    st.textContent = status || '';
    st.hidden = !status;
  }

  updateInventory(items, selectedId = null) {
    const el = $('inventory');
    el.innerHTML = '';
    // seules les cases remplies sont affichées (la vue vers le bas reste dégagée)
    items.forEach((it, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot filled' + (it.id === selectedId ? ' selected' : '');
      slot.innerHTML = `<span class="num">${(i + 1) % 10}</span><span class="ico">${it.icon}</span><span class="name">${it.name}</span>`;
      el.appendChild(slot);
    });
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

  showWin(timeStr, name = '', rows = []) {
    $('win-time').textContent = timeStr;
    $('win-name').textContent = name;
    const t = $('win-splits');
    t.innerHTML = '';
    for (const [label, value] of rows) {
      const tr = document.createElement('tr');
      const a = document.createElement('td'); a.textContent = label;
      const b = document.createElement('td'); b.textContent = value;
      tr.append(a, b);
      t.appendChild(tr);
    }
    $('win').classList.add('show');
  }

  // M. Sé demande l'identité du joueur avant d'ouvrir le labo
  askName() {
    return new Promise((resolve) => {
      const el = $('identity');
      const input = $('id-name'), err = $('id-err');
      el.classList.add('show');
      setTimeout(() => input.focus(), 50);
      const ok = () => {
        const v = input.value.trim().replace(/\s+/g, ' ');
        if (v.length < 2) { sfx.error(); err.textContent = 'Il me faut au moins un prénom ou un pseudo.'; input.focus(); return; }
        el.classList.remove('show');
        $('id-ok').removeEventListener('click', ok);
        input.removeEventListener('keydown', onKey);
        resolve(v);
      };
      const onKey = (e) => { if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); ok(); } };
      $('id-ok').addEventListener('click', ok);
      input.addEventListener('keydown', onKey);
    });
  }
}
