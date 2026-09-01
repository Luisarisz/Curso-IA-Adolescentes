(function () {
  'use strict';
  const D = window.LAB_DATA;
  const CFG = window.LAB_CONFIG || {};
  const ic = window.LAB_ICON;

  // ===== Config helpers (marca / white-label) =====
  const BRAND = CFG.brand || {};
  const GUARD = CFG.guardian || { word: 'papá', wordCap: 'Papá' };
  const FEAT = CFG.features || {};
  // Reemplaza la palabra del adulto responsable en cualquier texto del curso.
  function T(str) {
    if (!str) return str;
    return String(str)
      .replace(/Papá/g, GUARD.wordCap || 'Papá')
      .replace(/papá/g, GUARD.word || 'papá');
  }

  // ===== Persistencia real (localStorage) con multi-perfil =====
  const STORAGE_KEY = 'laboratoria.store.v2';
  const EMOJIS = ['⚡', '🔭', '🚀', '🎯', '🦊', '🐼', '🐱', '🎨', '🎸', '⭐', '🔥', '🌱', '🧠', '🦉', '🐙', '🎮'];

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysBetween(a, b) {
    if (!a || !b) return Infinity;
    return Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 86400000);
  }

  function freshProfile(name, emoji, route) {
    return {
      id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name || 'Estudiante',
      emoji: emoji || '⚡',
      route: route || 'rayo',
      createdAt: Date.now(),
      planWeeks: 5,
      lastTrack: route || 'rayo',
      sprints: {}, encuentros: {}, auto: {}, journal: {}, badges: {},
      streak: { count: 0, lastDay: null },
    };
  }
  function freshStore() {
    return { version: 2, activeProfileId: null, theme: 'dark', profiles: {} };
  }

  let store = freshStore();
  let storageOK = true;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.profiles) store = Object.assign(freshStore(), parsed);
      }
    } catch (e) { storageOK = false; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    catch (e) { storageOK = false; }
  }
  const persist = save;

  // active profile shortcut. `state` points into the store so el resto del
  // código sigue usando state.sprints, state.journal, etc. sin cambios.
  let state = null;
  function activeProfile() { return store.profiles[store.activeProfileId] || null; }
  function useProfile(id) {
    store.activeProfileId = id;
    state = store.profiles[id];
    save();
    updateProfileChip();
  }
  function ensureActive() {
    if (!store.activeProfileId || !store.profiles[store.activeProfileId]) {
      const ids = Object.keys(store.profiles);
      if (ids.length) useProfile(ids[0]);
    } else {
      state = store.profiles[store.activeProfileId];
    }
  }

  function createProfile(name, emoji, route, activate) {
    const p = freshProfile(name, emoji, route);
    store.profiles[p.id] = p;
    if (activate) useProfile(p.id); else save();
    return p;
  }
  function deleteProfile(id) {
    delete store.profiles[id];
    if (store.activeProfileId === id) {
      const ids = Object.keys(store.profiles);
      store.activeProfileId = ids[0] || null;
    }
    save();
  }

  // Streak: cada acción de progreso marca actividad hoy.
  function bumpStreak() {
    if (!FEAT.streak || !state) return;
    const s = state.streak || (state.streak = { count: 0, lastDay: null });
    const t = todayStr();
    if (s.lastDay === t) return;
    const gap = daysBetween(s.lastDay, t);
    s.count = gap === 1 ? (s.count + 1) : 1;
    s.lastDay = t;
    save();
  }

  // Import/export (copia de seguridad / mover de dispositivo). Exporta el
  // perfil activo. Compatible con códigos antiguos (estado plano de la v1).
  function exportCode() {
    const payload = { v: 2, profile: state };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }
  function importCode(code) {
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      let prof;
      if (parsed && parsed.v === 2 && parsed.profile) {
        prof = Object.assign(freshProfile(parsed.profile.name, parsed.profile.emoji, parsed.profile.route), parsed.profile);
        prof.id = freshProfile().id; // id nuevo para no chocar
      } else if (parsed && (parsed.sprints || parsed.journal)) {
        // Código antiguo (v1): estado plano sin perfil.
        prof = freshProfile('Progreso importado', '📦', parsed.lastTrack || parsed.profile || 'rayo');
        ['sprints', 'encuentros', 'auto', 'journal', 'badges', 'planWeeks', 'lastTrack'].forEach((k) => {
          if (parsed[k] != null) prof[k] = parsed[k];
        });
      } else return false;
      store.profiles[prof.id] = prof;
      useProfile(prof.id);
      return true;
    } catch (e) { return false; }
  }

  // ===== Derived data helpers =====
  function chispasTotal() {
    let total = 0;
    Object.keys(state.sprints).forEach((k) => { if (state.sprints[k]) total += 5; });
    return total;
  }
  function levelFor(chispas) {
    return D.niveles.find((n) => chispas >= n.min && chispas <= n.max) || D.niveles[0];
  }
  function nextLevel(chispas) {
    const idx = D.niveles.findIndex((n) => chispas >= n.min && chispas <= n.max);
    return D.niveles[idx + 1] || null;
  }
  function weekSprintsAllDone(w) {
    return w.rayo.sprints.every((_, i) => !!state.sprints[w.n + '-' + i]);
  }
  function anyWeekFullyDone() {
    return D.weeks.some((w) => weekSprintsAllDone(w));
  }
  function encuentrosDoneCount() {
    return D.weeks.filter((w) => state.encuentros[w.n]).length;
  }
  function nivelMin(nombre) {
    const lvl = D.niveles.find((n) => n.nombre === nombre);
    return lvl ? lvl.min : Infinity;
  }

  // Terminación del curso según la ruta del perfil (para el certificado).
  function isCourseComplete() {
    const allEnc = encuentrosDoneCount() >= D.weeks.length;
    const route = (state && state.route) || 'rayo';
    if (route === 'faro') {
      return allEnc && D.weeks.every((w) => w.faro.sesiones.every((s, i) => faroEntryComplete(state.journal[w.n + '-' + i])));
    }
    return allEnc && D.weeks.every((w) => weekSprintsAllDone(w));
  }
  function courseProgressPct() {
    let done = 0, total = 0;
    D.weeks.forEach((w) => {
      const p = weekProgress(w);
      done += p.doneUnits; total += p.totalUnits;
    });
    return total ? Math.round((done / total) * 100) : 0;
  }

  // ===== Logros (achievement badges) =====
  const BADGES = [
    { id: 'primera_chispa', nombre: 'Primera Chispa', icon: '✨', desc: 'Completa tu primer sprint de Ruta Rayo.', test: () => chispasTotal() >= 5 },
    { id: 'racha_semana', nombre: 'Semana en Racha', icon: '🔥', desc: 'Termina todos los sprints de una Semana en Ruta Rayo.', test: () => anyWeekFullyDone() },
    { id: 'estratega', nombre: 'Estratega Rayo', icon: '⚡', desc: 'Alcanza el nivel Estratega Rayo.', test: () => chispasTotal() >= nivelMin('Estratega Rayo') },
    { id: 'maestro_ia', nombre: 'Maestro IA', icon: '🏆', desc: 'Alcanza el nivel máximo de Chispas: Maestro IA.', test: () => chispasTotal() >= nivelMin('Maestro IA') },
    { id: 'primera_reflexion', nombre: 'Primera Reflexión', icon: '📓', desc: 'Escribe tu primera entrada completa en el Cuaderno de IA.', test: () => Object.values(state.journal).some((e) => faroEntryComplete(e)) },
    { id: 'cuaderno_completo', nombre: 'Cuaderno Completo', icon: '🔭', desc: 'Completa todas las sesiones de Ruta Faro.', test: () => totalFaroSessions() > 0 && completedFaroSessions() === totalFaroSessions() },
    { id: 'equipo_familiar', nombre: 'Equipo Familiar', icon: '🤝', desc: 'Completen su primer Encuentro en familia.', test: () => encuentrosDoneCount() >= 1 },
    { id: 'feria_lista', nombre: 'Feria Lista', icon: '🎉', desc: 'Completen los Encuentros de las 5 semanas.', test: () => encuentrosDoneCount() >= D.weeks.length },
  ];
  function earnedBadgeIds() { return BADGES.filter((b) => b.test()).map((b) => b.id); }
  function checkNewBadges(triggerEl) {
    const newly = [];
    BADGES.forEach((b) => {
      if (!state.badges[b.id] && b.test()) { state.badges[b.id] = true; newly.push(b); }
    });
    if (newly.length) {
      persist();
      sparkBurst(triggerEl || document.body);
      if (newly.length === 1) toast(`${newly[0].icon} ¡Logro desbloqueado!`, newly[0].nombre, 'award');
      else toast(`🏅 ¡${newly.length} logros desbloqueados!`, newly.map((b) => b.nombre).join(' · '), 'award');
    }
  }

  function faroEntryFilled(entry) {
    if (!entry) return false;
    return ['qhice', 'quepedi', 'dudoso', 'distinto'].some((k) => (entry[k] || '').trim().length > 0);
  }
  function faroEntryComplete(entry) {
    if (!entry) return false;
    return ['qhice', 'quepedi', 'dudoso', 'distinto'].every((k) => (entry[k] || '').trim().length > 0);
  }
  function totalFaroSessions() {
    return D.weeks.reduce((sum, w) => sum + w.faro.sesiones.length, 0);
  }
  function completedFaroSessions() {
    let c = 0;
    D.weeks.forEach((w) => w.faro.sesiones.forEach((s, i) => { if (faroEntryComplete(state.journal[w.n + '-' + i])) c++; }));
    return c;
  }

  // ===== Pacing plan (configurable course duration) =====
  function planWeeksOf() { return state.planWeeks || 5; }
  function moduleScheduleFor(planWeeks) {
    const totalModules = D.weeks.length;
    const perWeek = Math.max(1, Math.ceil(totalModules / planWeeks));
    const map = {};
    D.weeks.forEach((w) => { map[w.n] = Math.min(planWeeks, Math.ceil(w.n / perWeek)); });
    return { perWeek, map, planWeeks, totalModules };
  }
  function scheduleGroups(planWeeks) {
    const sched = moduleScheduleFor(planWeeks);
    const groups = {};
    D.weeks.forEach((w) => {
      const cw = sched.map[w.n];
      if (!groups[cw]) groups[cw] = [];
      groups[cw].push(w.n);
    });
    return groups;
  }
  function joinNice(arr) {
    if (arr.length === 1) return String(arr[0]);
    return arr.slice(0, -1).join(', ') + ' y ' + arr[arr.length - 1];
  }
  function planSummaryHtml(planWeeks) {
    const groups = scheduleGroups(planWeeks);
    return Object.keys(groups).sort((a, b) => a - b).map((cw) =>
      `<span class="plan-row"><strong>Semana calendario ${cw}:</strong> completa las Semanas ${joinNice(groups[cw])} del temario</span>`
    ).join('');
  }

  function weekProgress(w) {
    const rayoTotal = w.rayo.sprints.length;
    const rayoDone = w.rayo.sprints.filter((s, i) => state.sprints[w.n + '-' + i]).length;
    const faroTotal = w.faro.sesiones.length;
    const faroDone = w.faro.sesiones.filter((s, i) => faroEntryComplete(state.journal[w.n + '-' + i])).length;
    const autoTotal = w.auto.length;
    const autoDone = w.auto.filter((a, i) => state.auto[w.n + '-' + i]).length;
    const totalUnits = rayoTotal + faroTotal + autoTotal + 1;
    const doneUnits = rayoDone + faroDone + autoDone + (state.encuentros[w.n] ? 1 : 0);
    let status = 'pending';
    if (doneUnits >= totalUnits) status = 'done';
    else if (doneUnits > 0) status = 'progress';
    return { rayoTotal, rayoDone, faroTotal, faroDone, autoTotal, autoDone, status, doneUnits, totalUnits };
  }

  function icons() { /* iconos ya son inline; no-op para compatibilidad */ }

  // ===== Toast =====
  let toastTimer = null;
  function toast(title, body, icon) {
    const el = document.getElementById('toast');
    el.innerHTML = `${ic(icon || 'sparkles')}<div><strong>${title}</strong><span>${body || ''}</span></div>`;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // ===== Global Focus Timer =====
  const DEFAULT_TITLE = document.title;
  let audioCtx = null;
  function ensureAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* audio no disponible */ }
  }
  function beep(freq, startAt, dur) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.35, startAt + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(startAt); osc.stop(startAt + dur + 0.05);
  }
  function playAlarm() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    for (let i = 0; i < 4; i++) { beep(880, now + i * 0.45, 0.22); beep(660, now + i * 0.45 + 0.22, 0.18); }
  }
  let notifAsked = false;
  function ensureNotifPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default' && !notifAsked) { notifAsked = true; Notification.requestPermission(); }
  }
  function notifyAttention(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(title, { body, tag: 'laboratoria-timer' }); } catch (e) { /* ignore */ }
  }

  let focusTimer = null;
  let tickHandle = null;
  let flashHandle = null;
  let flashCount = 0;

  function fmtTime(s) { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), sec = s % 60; return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0'); }

  function stopFlash() {
    clearInterval(flashHandle); flashHandle = null; flashCount = 0;
    document.title = DEFAULT_TITLE;
  }

  function renderBanner() {
    const el = document.getElementById('timerBanner');
    if (!focusTimer) { el.hidden = true; el.innerHTML = ''; return; }
    const finished = focusTimer.remaining <= 0;
    el.hidden = false;
    el.classList.toggle('finished', finished);
    el.innerHTML = `
      ${ic(finished ? 'alarm-clock' : 'timer', 'timer-banner-icon')}
      <div class="timer-banner-body">
        <span class="timer-banner-label">${finished ? '¡Tiempo terminado!' : (focusTimer.running ? 'Corriendo' : 'En pausa')} · ${escapeAttr(focusTimer.label)}</span>
        <span class="timer-banner-time mono">${fmtTime(focusTimer.remaining)}</span>
      </div>
      <div class="timer-banner-actions">
        ${finished ? `<button class="btn btn-sm btn-primary" data-banner="ack">${ic('check')} Entendido</button>` : `
          <button class="btn btn-sm btn-ghost" data-banner="toggle">${ic(focusTimer.running ? 'pause' : 'play')}</button>
          <button class="btn btn-sm btn-ghost" data-banner="stop">${ic('x')}</button>
        `}
      </div>`;
    const toggleBtn = el.querySelector('[data-banner="toggle"]');
    if (toggleBtn) toggleBtn.addEventListener('click', () => { focusTimer.running ? pauseFocusTimer() : resumeFocusTimer(); });
    const stopBtn = el.querySelector('[data-banner="stop"]');
    if (stopBtn) stopBtn.addEventListener('click', resetFocusTimer);
    const ackBtn = el.querySelector('[data-banner="ack"]');
    if (ackBtn) ackBtn.addEventListener('click', () => { stopFlash(); focusTimer = null; renderBanner(); syncAllTimerUIs(); });
  }

  function syncAllTimerUIs() {
    document.querySelectorAll('[data-timer-key]').forEach((card) => {
      const key = card.getAttribute('data-timer-key');
      const display = card.querySelector('[data-timer-display]');
      const startBtn = card.querySelector('[data-timer-start]');
      if (!display || !startBtn) return;
      const minutes = parseFloat(card.getAttribute('data-timer-min')) || 10;
      if (focusTimer && focusTimer.key === key) {
        display.textContent = fmtTime(focusTimer.remaining);
        display.classList.toggle('running', focusTimer.running);
        startBtn.innerHTML = focusTimer.running ? (ic('pause') + ' Pausar') : (ic('play') + ' Reanudar');
      } else {
        display.textContent = fmtTime(minutes * 60);
        display.classList.remove('running');
        startBtn.innerHTML = ic('play') + ' Iniciar';
      }
    });
  }

  function tick() {
    if (!focusTimer || !focusTimer.running) return;
    focusTimer.remaining = Math.max(0, Math.round((focusTimer.endAt - Date.now()) / 1000));
    document.title = '⏱ ' + fmtTime(focusTimer.remaining) + ' · ' + (BRAND.name || 'LaboratorIA');
    syncAllTimerUIs();
    renderBanner();
    if (focusTimer.remaining <= 0) finishFocusTimer();
  }

  function finishFocusTimer() {
    clearInterval(tickHandle); tickHandle = null;
    focusTimer.running = false; focusTimer.remaining = 0;
    playAlarm();
    notifyAttention('⏰ ¡Tiempo! · ' + (BRAND.name || 'LaboratorIA'), `"${focusTimer.label}" terminó. Vuelve a la pestaña.`);
    toast('¡Tiempo!', `"${focusTimer.label}" terminó. Marca como completado si lograste el objetivo.`, 'alarm-clock');
    syncAllTimerUIs();
    renderBanner();
    flashCount = 0;
    clearInterval(flashHandle);
    flashHandle = setInterval(() => {
      flashCount++;
      const away = document.visibilityState !== 'visible';
      document.title = (flashCount % 2 === 0) ? DEFAULT_TITLE : '⏰ ¡TIEMPO!';
      if (flashCount >= 20 && !away) stopFlash();
      if (flashCount >= 40) stopFlash();
    }, 1000);
  }

  function startFocusTimer(key, minutes, label) {
    ensureAudio();
    ensureNotifPermission();
    stopFlash();
    if (tickHandle) clearInterval(tickHandle);
    focusTimer = { key, minutes, remaining: minutes * 60, endAt: Date.now() + minutes * 60 * 1000, running: true, label };
    tickHandle = setInterval(tick, 1000);
    syncAllTimerUIs();
    renderBanner();
  }
  function pauseFocusTimer() {
    if (!focusTimer) return;
    focusTimer.running = false;
    clearInterval(tickHandle); tickHandle = null;
    document.title = DEFAULT_TITLE;
    syncAllTimerUIs();
    renderBanner();
  }
  function resumeFocusTimer() {
    if (!focusTimer) return;
    focusTimer.running = true;
    focusTimer.endAt = Date.now() + focusTimer.remaining * 1000;
    tickHandle = setInterval(tick, 1000);
    syncAllTimerUIs();
    renderBanner();
  }
  function resetFocusTimer() {
    clearInterval(tickHandle); tickHandle = null;
    stopFlash();
    focusTimer = null;
    document.title = DEFAULT_TITLE;
    syncAllTimerUIs();
    renderBanner();
  }
  function escapeAttr(s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ===== Spark burst (celebration) =====
  function sparkBurst(target) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = target.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      const angle = (Math.PI * 2 * i) / 10;
      const dist = 40 + Math.random() * 30;
      s.style.position = 'fixed';
      s.style.left = (rect.left + rect.width / 2) + 'px';
      s.style.top = (rect.top + rect.height / 2) + 'px';
      s.style.width = '6px'; s.style.height = '6px'; s.style.borderRadius = '50%';
      s.style.background = 'var(--primary)'; s.style.zIndex = 95; s.style.pointerEvents = 'none';
      s.style.transition = 'transform 600ms cubic-bezier(.16,1,.3,1), opacity 600ms ease';
      document.body.appendChild(s);
      requestAnimationFrame(() => {
        s.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0.2)`;
        s.style.opacity = '0';
      });
      setTimeout(() => s.remove(), 650);
    }
  }

  // ===== Theme =====
  function applyTheme() {
    const t = store.theme || 'dark';
    document.body.setAttribute('data-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0A0D10' : '#F6F4EF');
    const path = t === 'dark'
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M18.5 18.5L20 20M5 19l1.5-1.5M18.5 5.5L20 4"/>'
      : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>';
    document.getElementById('themeIcon').innerHTML = path;
  }
  document.getElementById('themeBtn').addEventListener('click', () => {
    store.theme = (store.theme === 'dark') ? 'light' : 'dark';
    save(); applyTheme();
  });

  // ===== Brand / footer from config =====
  function applyBranding() {
    const nm = document.querySelector('[data-brand-name]');
    if (nm && BRAND.name) nm.childNodes[0].nodeValue = BRAND.name;
    const tg = document.querySelector('[data-brand-tagline]');
    if (tg && BRAND.tagline) tg.textContent = BRAND.tagline;
    document.title = (BRAND.name || 'LaboratorIA') + ' — ' + (BRAND.tagline || 'Piensa. Crea. Automatiza.');
    if (BRAND.primaryColor) document.documentElement.style.setProperty('--primary', BRAND.primaryColor);
    const fl = document.querySelector('[data-footer-left]');
    if (fl && CFG.footer) fl.textContent = CFG.footer.left;
    const fc = document.querySelector('[data-footer-credit]');
    if (fc && CFG.footer) {
      if (CFG.footer.creditText && CFG.footer.creditUrl) fc.innerHTML = `<a href="${CFG.footer.creditUrl}" target="_blank" rel="noopener">${escapeAttr(CFG.footer.creditText)}</a>`;
      else fc.textContent = CFG.footer.creditText || '';
    }
  }

  function updateProfileChip() {
    const p = activeProfile();
    const em = document.getElementById('profileChipEmoji');
    const nm = document.getElementById('profileChipName');
    if (em) em.textContent = p ? p.emoji : '⚡';
    if (nm) nm.textContent = p ? p.name : 'Perfil';
  }

  // ===== Mobile nav =====
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  navToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  function closeMobileNav() { mainNav.classList.remove('open'); navToggle.setAttribute('aria-expanded', 'false'); }

  // ===== Profile modals =====
  const profileRoot = document.getElementById('profileModalRoot');
  const modalOpen = () => !!profileRoot.innerHTML.trim();
  function closeModal() { profileRoot.innerHTML = ''; }
  profileRoot.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('profile-modal-backdrop') && e.target.getAttribute('data-dismissable') === '1') closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalOpen()) { const b = profileRoot.querySelector('.profile-modal-backdrop[data-dismissable="1"]'); if (b) closeModal(); } });

  // Onboarding: no hay perfiles todavía.
  function renderWelcome() {
    const suggested = (CFG.suggestedProfiles || []);
    profileRoot.innerHTML = `
      <div class="profile-modal-backdrop">
        <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="wTitle">
          <p class="eyebrow">Bienvenida / Bienvenido a ${escapeAttr(BRAND.name || 'LaboratorIA')}</p>
          <h2 id="wTitle">¿Quién va a aprender?</h2>
          <p>Crea un perfil para cada persona. Cada perfil guarda su propio progreso, Chispas y Cuaderno de IA en este dispositivo.</p>
          ${suggested.length ? `
          <p class="mini-label">Arranque rápido</p>
          <div class="profile-choices">
            ${suggested.map((s, i) => `
              <div class="profile-choice" data-quick="${i}" tabindex="0" role="button">
                <span class="icon">${s.emoji}</span><strong>${escapeAttr(s.name)}</strong><small>${escapeAttr(s.hint || '')}</small>
              </div>`).join('')}
          </div>
          <div class="or-line"><span>o créalo a tu manera</span></div>` : ''}
          <button class="btn btn-primary btn-block" id="createCustom">${ic('user-plus')} Crear un perfil nuevo</button>
        </div>
      </div>`;
    profileRoot.querySelectorAll('[data-quick]').forEach((el) => {
      const pick = () => {
        const s = suggested[parseInt(el.getAttribute('data-quick'), 10)];
        createProfile(s.name, s.emoji, s.route, true);
        closeModal(); render();
        toast('¡Perfil creado!', `${s.emoji} ${s.name} · Ruta ${s.route === 'faro' ? 'Faro' : 'Rayo'}`, 'sparkles');
      };
      el.addEventListener('click', pick);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    document.getElementById('createCustom').addEventListener('click', () => renderProfileForm(null, false));
  }

  // Formulario crear/editar perfil.
  function renderProfileForm(editId, dismissable) {
    const editing = editId ? store.profiles[editId] : null;
    const curEmoji = editing ? editing.emoji : '⚡';
    const curRoute = editing ? editing.route : 'rayo';
    profileRoot.innerHTML = `
      <div class="profile-modal-backdrop" data-dismissable="${dismissable ? 1 : 0}">
        <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="pfTitle">
          <div class="modal-head">
            <p class="eyebrow">${editing ? 'Editar perfil' : 'Nuevo perfil'}</p>
            ${dismissable ? `<button class="icon-btn" id="pfClose" aria-label="Cerrar">${ic('x')}</button>` : ''}
          </div>
          <h2 id="pfTitle">${editing ? 'Ajusta tu perfil' : '¿Cómo te llamas?'}</h2>
          <label class="field-label">Nombre</label>
          <input type="text" id="pfName" class="text-input" maxlength="20" placeholder="Tu nombre o apodo" value="${editing ? escapeAttr(editing.name) : ''}">
          <label class="field-label">Elige un ícono</label>
          <div class="emoji-picker" id="pfEmoji">
            ${EMOJIS.map((e) => `<button type="button" class="emoji-opt ${e === curEmoji ? 'sel' : ''}" data-emoji="${e}">${e}</button>`).join('')}
          </div>
          <label class="field-label">Ruta por defecto</label>
          <div class="profile-choices route-choices">
            <div class="profile-choice ${curRoute === 'rayo' ? 'sel' : ''}" data-route="rayo" tabindex="0" role="button">
              <span class="icon">⚡</span><strong>Ruta Rayo</strong><small>Sprints cortos y rápidos</small>
            </div>
            <div class="profile-choice ${curRoute === 'faro' ? 'sel' : ''}" data-route="faro" tabindex="0" role="button">
              <span class="icon">🔭</span><strong>Ruta Faro</strong><small>Sesiones y reflexión</small>
            </div>
          </div>
          <button class="btn btn-primary btn-block" id="pfSave">${ic('check')} ${editing ? 'Guardar cambios' : 'Crear perfil'}</button>
        </div>
      </div>`;
    let selEmoji = curEmoji, selRoute = curRoute;
    if (dismissable) { const c = document.getElementById('pfClose'); if (c) c.addEventListener('click', () => { closeModal(); renderProfileSwitcher(); }); }
    profileRoot.querySelectorAll('.emoji-opt').forEach((b) => b.addEventListener('click', () => {
      selEmoji = b.getAttribute('data-emoji');
      profileRoot.querySelectorAll('.emoji-opt').forEach((x) => x.classList.toggle('sel', x === b));
    }));
    profileRoot.querySelectorAll('.route-choices .profile-choice').forEach((el) => {
      const pick = () => { selRoute = el.getAttribute('data-route'); profileRoot.querySelectorAll('.route-choices .profile-choice').forEach((x) => x.classList.toggle('sel', x === el)); };
      el.addEventListener('click', pick);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    const nameInput = document.getElementById('pfName');
    nameInput.focus();
    document.getElementById('pfSave').addEventListener('click', () => {
      const name = (nameInput.value || '').trim() || 'Estudiante';
      if (editing) {
        editing.name = name; editing.emoji = selEmoji; editing.route = selRoute;
        save(); updateProfileChip(); closeModal(); render();
        toast('Perfil actualizado', `${selEmoji} ${name}`, 'check-circle-2');
      } else {
        createProfile(name, selEmoji, selRoute, true);
        closeModal(); render();
        toast('¡Perfil creado!', `${selEmoji} ${name}`, 'sparkles');
      }
    });
  }

  // Cambiar entre perfiles.
  function renderProfileSwitcher() {
    const ids = Object.keys(store.profiles);
    const rows = ids.map((id) => {
      const p = store.profiles[id];
      const active = id === store.activeProfileId;
      const savedState = state; // preserve
      // compute a quick progress by temporarily pointing state
      state = p;
      const pct = courseProgressPct();
      const chispas = chispasTotal();
      state = savedState;
      return `
        <div class="profile-row ${active ? 'active' : ''}">
          <button class="profile-row-main" data-switch="${id}">
            <span class="profile-row-emoji">${p.emoji}</span>
            <span class="profile-row-info">
              <strong>${escapeAttr(p.name)} ${active ? '<span class="badge badge-primary tiny">Activo</span>' : ''}</strong>
              <small>Ruta ${p.route === 'faro' ? 'Faro 🔭' : 'Rayo ⚡'} · ${chispas} Chispas · ${pct}% del curso</small>
            </span>
          </button>
          <div class="profile-row-actions">
            <button class="icon-btn sm" data-edit="${id}" aria-label="Editar ${escapeAttr(p.name)}">${ic('pencil')}</button>
            ${ids.length > 1 ? `<button class="icon-btn sm danger" data-del="${id}" aria-label="Borrar ${escapeAttr(p.name)}">${ic('trash-2')}</button>` : ''}
          </div>
        </div>`;
    }).join('');
    profileRoot.innerHTML = `
      <div class="profile-modal-backdrop" data-dismissable="1">
        <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="psTitle">
          <div class="modal-head">
            <p class="eyebrow">Perfiles</p>
            <button class="icon-btn" id="psClose" aria-label="Cerrar">${ic('x')}</button>
          </div>
          <h2 id="psTitle">¿Quién está usando la app?</h2>
          <div class="profile-list">${rows}</div>
          <button class="btn btn-ghost btn-block" id="psAdd">${ic('user-plus')} Agregar otro perfil</button>
        </div>
      </div>`;
    document.getElementById('psClose').addEventListener('click', closeModal);
    document.getElementById('psAdd').addEventListener('click', () => renderProfileForm(null, true));
    profileRoot.querySelectorAll('[data-switch]').forEach((b) => b.addEventListener('click', () => {
      useProfile(b.getAttribute('data-switch'));
      closeModal(); applyTheme(); render();
      const p = activeProfile();
      toast('Hola de nuevo', `${p.emoji} ${p.name}`, 'users');
    }));
    profileRoot.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => renderProfileForm(b.getAttribute('data-edit'), true)));
    profileRoot.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      const id = b.getAttribute('data-del');
      const p = store.profiles[id];
      renderConfirm(`¿Borrar el perfil de ${p.emoji} ${p.name}?`, 'Se perderá su progreso, Chispas y Cuaderno en este dispositivo. Esta acción no se puede deshacer.', () => {
        deleteProfile(id);
        applyTheme();
        if (!store.activeProfileId) { closeModal(); render(); }
        else { renderProfileSwitcher(); render(); }
        toast('Perfil borrado', '', 'trash-2');
      }, renderProfileSwitcher);
    }));
  }

  function renderConfirm(title, body, onYes, onNo) {
    profileRoot.innerHTML = `
      <div class="profile-modal-backdrop">
        <div class="profile-modal confirm" role="dialog" aria-modal="true">
          <div class="confirm-icon danger">${ic('trash-2')}</div>
          <h2>${escapeAttr(title)}</h2>
          <p>${escapeAttr(body)}</p>
          <div class="confirm-actions">
            <button class="btn btn-ghost" id="cfNo">Cancelar</button>
            <button class="btn btn-danger" id="cfYes">${ic('trash-2')} Borrar</button>
          </div>
        </div>
      </div>`;
    document.getElementById('cfYes').addEventListener('click', onYes);
    document.getElementById('cfNo').addEventListener('click', () => { if (onNo) onNo(); else closeModal(); });
  }

  document.getElementById('profileBtn').addEventListener('click', () => {
    if (!Object.keys(store.profiles).length) renderWelcome();
    else renderProfileSwitcher();
  });

  // ===== Backup / transfer code modal =====
  function renderSaveModal() {
    const code = exportCode();
    profileRoot.innerHTML = `
      <div class="profile-modal-backdrop" data-dismissable="1">
        <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="smTitle" style="max-width:560px">
          <div class="modal-head">
            <p class="eyebrow">Copia de seguridad · ${escapeAttr(activeProfile() ? activeProfile().name : '')}</p>
            <button class="icon-btn" id="closeSaveModal" aria-label="Cerrar">${ic('x')}</button>
          </div>
          <h2 id="smTitle">Guarda o transfiere tu progreso</h2>
          <p>Tu progreso ya se guarda solo en este dispositivo. Usa este código para <strong>llevarlo a otro dispositivo</strong> o guardar un respaldo: cópialo y pégalo en el segundo cuadro allá.</p>
          <label class="field-label">Tu código (perfil activo)</label>
          <textarea id="exportArea" class="mono code-area" readonly>${code}</textarea>
          <div class="row-gap">
            <button class="btn btn-ghost btn-sm" id="copyExportBtn">${ic('copy')} Copiar código</button>
            <button class="btn btn-ghost btn-sm" id="downloadBtn">${ic('download')} Descargar respaldo</button>
          </div>
          <label class="field-label" style="margin-top:var(--space-5)">Cargar un código (crea un perfil nuevo)</label>
          <textarea id="importArea" class="mono code-area" placeholder="Pega aquí tu código guardado..."></textarea>
          <button class="btn btn-primary btn-block" id="loadCodeBtn">${ic('upload')} Cargar código</button>
        </div>
      </div>`;
    document.getElementById('closeSaveModal').addEventListener('click', closeModal);
    document.getElementById('copyExportBtn').addEventListener('click', () => {
      const ta = document.getElementById('exportArea'); ta.focus(); ta.select();
      try { navigator.clipboard.writeText(ta.value); toast('Copiado', 'Guárdalo en un lugar seguro.', 'copy'); }
      catch (e) { document.execCommand && document.execCommand('copy'); toast('Selecciónalo y copia', '', 'copy'); }
    });
    document.getElementById('downloadBtn').addEventListener('click', () => {
      const blob = new Blob([code], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'laboratoria-' + (activeProfile() ? activeProfile().name.replace(/\s+/g, '_') : 'progreso') + '.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    document.getElementById('loadCodeBtn').addEventListener('click', () => {
      const val = document.getElementById('importArea').value;
      if (importCode(val)) { closeModal(); applyTheme(); render(); toast('Progreso cargado', 'Se creó un perfil con tu respaldo.', 'check-circle-2'); }
      else toast('Código inválido', 'Revisa que lo hayas copiado completo.', 'shield-alert');
    });
  }
  document.getElementById('saveBtn').addEventListener('click', renderSaveModal);

  // ===== Router =====
  const app = document.getElementById('app');
  function currentRoute() { return location.hash.replace(/^#/, '') || '/'; }
  window.addEventListener('hashchange', render);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (a) closeMobileNav();
  });

  function updateNavActive() {
    const route = currentRoute();
    document.querySelectorAll('nav.main-nav a').forEach((a) => {
      const r = a.getAttribute('data-route');
      const active = route === r || (r === '/semana/1' && route.startsWith('/semana/'));
      a.classList.toggle('active', active);
    });
  }

  function render() {
    // Sin perfil activo → forzar bienvenida.
    if (!store.activeProfileId || !store.profiles[store.activeProfileId]) {
      app.innerHTML = viewEmptyState();
      updateProfileChip();
      if (!modalOpen()) renderWelcome();
      return;
    }
    state = store.profiles[store.activeProfileId];
    const route = currentRoute();
    updateNavActive();
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    let html = '';
    const weekMatch = route.match(/^\/semana\/(\d)/);
    if (route === '/' || route === '') html = viewHome();
    else if (weekMatch) html = viewWeek(parseInt(weekMatch[1], 10));
    else if (route === '/cuaderno') html = viewCuaderno();
    else if (route === '/anexos') html = viewAnexos();
    else if (route === '/certificado') html = viewCertificate();
    else html = viewHome();
    app.innerHTML = html;
    bindDynamic();
    app.focus({ preventScroll: true });
  }

  function viewEmptyState() {
    return `<section class="hero"><div class="wrap"><h1>${escapeAttr(BRAND.heroTitle || 'Piensa. Crea. Automatiza.')}</h1>
      <p class="lead">${escapeAttr(BRAND.heroLead || '')}</p>
      <button class="btn btn-primary" onclick="document.getElementById('profileBtn').click()">${ic('user-plus')} Crear el primer perfil</button></div></section>`;
  }

  // ===== VIEW: Home =====
  function streakHtml() {
    if (!FEAT.streak) return '';
    const c = (state.streak && state.streak.count) || 0;
    const active = state.streak && daysBetween(state.streak.lastDay, todayStr()) <= 1 && c > 0;
    return `<span class="streak-badge ${active ? 'on' : ''}" title="Días seguidos con actividad">${ic('flame')} ${c} día${c === 1 ? '' : 's'} de racha</span>`;
  }

  function viewHome() {
    const chispas = chispasTotal();
    const lvl = levelFor(chispas);
    const nxt = nextLevel(chispas);
    const rayoPct = nxt ? Math.min(100, Math.round(((chispas - lvl.min) / (nxt.min - lvl.min)) * 100)) : 100;
    const faroTotal = totalFaroSessions();
    const faroDone = completedFaroSessions();
    const faroPct = Math.round((faroDone / faroTotal) * 100);
    const p = activeProfile();

    const planWeeks = planWeeksOf();
    const sched = moduleScheduleFor(planWeeks);
    const weekCards = D.weeks.map((w) => {
      const wp = weekProgress(w);
      const statusLabel = wp.status === 'done' ? 'Completada' : wp.status === 'progress' ? 'En progreso' : 'Sin empezar';
      return `<a class="week-card" href="#/semana/${w.n}">
        <span class="week-num mono">SEMANA ${String(w.n).padStart(2, '0')}</span>
        <h4>${w.titulo}</h4>
        <span class="week-status"><span class="dot ${wp.status}"></span>${statusLabel}</span>
        <span class="badge cal-badge">${ic('calendar')} Semana calendario ${sched.map[w.n]}</span>
      </a>`;
    }).join('');

    const complete = isCourseComplete();

    return `
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <p class="eyebrow">Hola, ${escapeAttr(p ? p.name : '')} ${p ? p.emoji : ''} · Plan de ${planWeeks} semana${planWeeks > 1 ? 's' : ''}</p>
          <h1>${escapeAttr(BRAND.heroTitle || 'Piensa. Crea. Automatiza.')}</h1>
          <p class="lead">${escapeAttr(BRAND.heroLead || '')}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/semana/1">${ic('flame')} Empezar Semana 1</a>
            <a class="btn btn-ghost" href="#/anexos">${ic('shield')} Reglas de seguridad</a>
          </div>
          ${FEAT.streak ? `<div class="hero-streak">${streakHtml()}</div>` : ''}
        </div>
        <div class="pulse-orbit" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" fill="none" stroke="var(--border)" stroke-width="1.5"/>
            <circle cx="100" cy="100" r="66" fill="none" stroke="var(--border)" stroke-width="1.5"/>
            <path d="M112 24 L68 108 H92 L80 176 L146 82 H120 Z" fill="var(--primary)"/>
          </svg>
        </div>
      </div>
    </section>

    ${complete && FEAT.certificate ? `
    <section class="section-tight"><div class="wrap">
      <a href="#/certificado" class="cert-banner">
        <span class="cert-banner-icon">${ic('trophy')}</span>
        <span><strong>¡Completaste el curso!</strong><small>Abre y descarga tu certificado de ${escapeAttr(BRAND.name || 'LaboratorIA')}.</small></span>
        <span class="cert-banner-cta">${ic('chevron-right')}</span>
      </a>
    </div></section>` : ''}

    <section class="section-tight">
      <div class="wrap">
        <div class="card plan-card">
          <div class="section-title-row">
            <div><p class="eyebrow">Duración del curso</p><h2>¿En cuántas semanas lo quieres hacer?</h2></div>
          </div>
          <p style="margin-top:-8px;color:var(--text-muted)">El contenido no cambia — solo ajustas cuántas Semanas del temario cubres cada semana calendario. Puedes cambiarlo cuando quieras.</p>
          <div class="plan-tabs" role="radiogroup" aria-label="Duración del curso" style="margin-top:var(--space-4)">
            ${[1, 2, 3, 4, 5].map((n) => `<button class="plan-chip" data-plan="${n}" role="radio" aria-checked="${n === planWeeks}">${n} semana${n > 1 ? 's' : ''}</button>`).join('')}
          </div>
          <div class="plan-summary">${planSummaryHtml(planWeeks)}</div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="section-title-row"><h2>Tu progreso</h2><a href="#/cuaderno" class="badge">${ic('book-open')} Ver Cuaderno de IA</a></div>
        <div class="stats-grid">
          <div class="stat-card rayo">
            <div class="stat-top">
              <div><p class="eyebrow" style="color:var(--rayo)">Ruta Rayo ⚡</p><div class="stat-value mono">${chispas} Chispas</div></div>
              <span class="badge badge-rayo">${lvl.icon} ${lvl.nombre}</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${rayoPct}%"></div></div>
            <p style="margin-top:8px">${nxt ? `${nxt.min - chispas} Chispas para ${nxt.nombre}` : '¡Nivel máximo alcanzado!'}</p>
          </div>
          <div class="stat-card faro">
            <div class="stat-top">
              <div><p class="eyebrow" style="color:var(--faro)">Ruta Faro 🔭</p><div class="stat-value mono">${faroDone}/${faroTotal} sesiones</div></div>
              <span class="badge badge-faro">${ic('notebook-pen')} Cuaderno de IA</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${faroPct}%"></div></div>
            <p style="margin-top:8px">Cada sesión completa suma una entrada a tu cuaderno.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="section-title-row"><h2>Mis logros</h2><span class="badge">${ic('award')} ${earnedBadgeIds().length}/${BADGES.length}</span></div>
        <div class="badges-grid">${BADGES.map((b) => {
          const earned = !!state.badges[b.id];
          return `<div class="badge-card ${earned ? 'earned' : 'locked'}">
            <span class="badge-card-icon">${earned ? b.icon : ic('lock')}</span>
            <h4>${b.nombre}</h4>
            <p>${b.desc}</p>
          </div>`;
        }).join('')}</div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="section-title-row"><h2>El método PIENSA</h2><p style="margin:0;max-width:40ch">Se usa igual con cualquier IA, en cualquier semana.</p></div>
        <div class="piensa-grid">
          ${D.piensa.map((pp) => `<div class="piensa-cell"><div class="piensa-letter">${pp.l}</div><h4>${pp.t}</h4><p>${pp.d}</p></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="card" style="display:flex;gap:var(--space-5);flex-wrap:wrap;align-items:flex-start">
          <div style="flex:1;min-width:240px">
            <p class="eyebrow">Antes de creer cualquier respuesta</p>
            <h3>Detector de alucinaciones</h3>
            <ul class="rule-list" style="margin-top:var(--space-3)">
              ${D.detector.map((d) => `<li>${d}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="section-title-row"><h2>Las 5 semanas</h2></div>
        <div class="week-grid">${weekCards}</div>
      </div>
    </section>
    `;
  }

  // ===== VIEW: Week =====
  function viewWeek(n) {
    const w = D.weeks.find((x) => x.n === n);
    if (!w) return viewHome();
    const track = state.lastTrack || state.route || 'rayo';
    const planWeeks = planWeeksOf();
    const cw = moduleScheduleFor(planWeeks).map[w.n];

    const toolsHtml = w.tools.map((t) => `
      <div class="tool-card">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <h4>${t.name}</h4><span class="badge tag-age">${t.age}</span>
        </div>
        <p>${t.use}</p>
        <a class="tool-link" href="${t.url}" target="_blank" rel="noopener">Ir al sitio ${ic('external-link')}</a>
      </div>`).join('');

    function salidaHtml(salida) {
      if (!salida || !salida.length) {
        return `<span class="exit-tag exit-tag-in">${ic('home')} Se hace aquí mismo, no necesitas salir</span>`;
      }
      const links = salida.map((s) => `<a class="exit-link" href="${s.url}" target="_blank" rel="noopener">${ic('external-link')} Abrir ${s.name}</a>`).join('');
      return `<div class="exit-links"><span class="exit-tag exit-tag-out">${ic('log-out')} Esta actividad sí necesita salir:</span>${links}</div>`;
    }

    const rayoSprints = w.rayo.sprints.map((s, i) => {
      const key = w.n + '-' + i;
      const done = !!state.sprints[key];
      const timerKey = 'r-' + w.n + '-' + i;
      return `
      <div class="sprint-card ${done ? 'done' : ''}" data-sprint="${key}" data-min="${s.min}">
        <div class="sprint-head"><h4>${s.titulo}</h4><span class="badge badge-rayo mono">${s.min} min</span></div>
        <ul class="step-list">${s.pasos.map((pp) => `<li>${T(pp)}</li>`).join('')}</ul>
        ${salidaHtml(s.salida)}
        <div class="timer-row" data-timer-key="${timerKey}" data-timer-min="${s.min}" data-timer-label="${escapeAttr(s.titulo)}">
          <span class="timer-display mono" data-timer-display>${String(s.min).padStart(2, '0')}:00</span>
          <button class="btn btn-rayo btn-sm" data-timer-start>${ic('play')} Iniciar</button>
          <button class="btn btn-ghost btn-sm" data-timer-reset>${ic('rotate-ccw')} Reiniciar</button>
        </div>
        <div class="complete-row">
          <label class="check-pill"><input type="checkbox" data-sprint-check ${done ? 'checked' : ''}> Sprint completado</label>
          <span class="badge badge-primary">${ic('sparkles')} +5 Chispas</span>
        </div>
      </div>`;
    }).join('');

    const faroSessions = w.faro.sesiones.map((s, i) => {
      const key = w.n + '-' + i;
      const entry = state.journal[key] || {};
      const complete = faroEntryComplete(entry);
      const timerKey = 'f-' + w.n + '-' + i;
      return `
      <div class="sprint-card faro ${complete ? 'done' : ''}">
        <div class="sprint-head"><h4>${s.titulo}</h4><span class="badge badge-faro mono">${s.min} min</span></div>
        <ul class="step-list">${s.pasos.map((pp) => `<li>${T(pp)}</li>`).join('')}</ul>
        ${salidaHtml(s.salida)}
        <div class="timer-row" data-timer-key="${timerKey}" data-timer-min="${s.min}" data-timer-label="${escapeAttr(s.titulo)}">
          <span class="timer-display mono" data-timer-display>${String(s.min).padStart(2, '0')}:00</span>
          <button class="btn btn-faro btn-sm" data-timer-start>${ic('play')} Iniciar</button>
          <button class="btn btn-ghost btn-sm" data-timer-reset>${ic('rotate-ccw')} Reiniciar</button>
        </div>
        <details>
          <summary style="cursor:pointer;font-weight:600;font-size:var(--text-sm);color:var(--faro)">${ic('notebook-pen')} Abrir tu Cuaderno de IA ${complete ? '· entrada guardada' : ''}</summary>
          <div class="journal-form" style="margin-top:var(--space-4)" data-journal="${key}">
            <div><label>Qué hice</label><textarea data-field="qhice" placeholder="Describe brevemente lo que hiciste...">${escapeHtml(entry.qhice)}</textarea></div>
            <div><label>Qué le pedí y cómo aplico PIENSA</label><textarea data-field="quepedi" placeholder="El prompt o instrucción, y qué letras de PIENSA usaste...">${escapeHtml(entry.quepedi)}</textarea></div>
            <div><label>Qué encontré raro, dudoso o falso, y cómo lo verifiqué</label><textarea data-field="dudoso" placeholder="¿Detectaste algo sospechoso? ¿Cómo lo comprobaste?">${escapeHtml(entry.dudoso)}</textarea></div>
            <div><label>Qué haría distinto la próxima vez</label><textarea data-field="distinto" placeholder="Una mejora concreta para la próxima sesión...">${escapeHtml(entry.distinto)}</textarea></div>
            <span class="save-indicator" data-saved>${ic('check-circle-2')} Guardado</span>
          </div>
        </details>
      </div>`;
    }).join('');

    return `
    <section class="section-tight">
      <div class="wrap">
        <p class="eyebrow mono">SEMANA ${String(w.n).padStart(2, '0')} DE 05</p>
        <h1 style="font-size:var(--text-3xl)">${w.titulo}</h1>
        <p class="plan-hint">${ic('calendar')}<span>En tu plan de ${planWeeks} semana${planWeeks > 1 ? 's' : ''}, esta semana del temario corresponde a la <strong>semana calendario ${cw}</strong>. <a href="#/">Cambiar plan</a></span></p>
        <div class="card-flat" style="margin-top:var(--space-5)">
          <h3>${ic('target')} Misión de la semana</h3><p style="margin-top:6px">${w.mision}</p>
        </div>
        <div class="card-flat" style="margin-top:var(--space-4)">
          <h3>${ic('lightbulb')} Por qué importa</h3><p style="margin-top:6px">${w.porque}</p>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <h2>Herramientas de la semana</h2>
        <p style="margin-top:4px">Es solo un directorio de referencia. Cada actividad abajo te dice si la haces aquí mismo o si necesita abrir alguna de estas herramientas.</p>
        <div class="tool-grid" style="margin-top:var(--space-4)">${toolsHtml}</div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="section-title-row">
          <h2>Tu ruta esta semana</h2>
          <div class="track-tabs" role="tablist">
            <button role="tab" data-track="rayo" aria-selected="${track === 'rayo'}">⚡ Ruta Rayo</button>
            <button role="tab" data-track="faro" aria-selected="${track === 'faro'}">🔭 Ruta Faro</button>
          </div>
        </div>
        <div data-panel="rayo" style="display:${track === 'rayo' ? 'grid' : 'none'};gap:var(--space-4)">
          <p>${w.rayo.resumen}</p>
          ${rayoSprints}
        </div>
        <div data-panel="faro" style="display:${track === 'faro' ? 'grid' : 'none'};gap:var(--space-4)">
          <p>${w.faro.resumen}</p>
          ${faroSessions}
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <h2>Punto de Encuentro</h2>
        <div class="encuentro-card" style="margin-top:var(--space-4)">
          <div style="display:flex;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;align-items:baseline">
            <h3>${ic('users')} ${w.encuentro.titulo}</h3><span class="badge badge-primary">${w.encuentro.duracion}</span>
          </div>
          <ul class="step-list" style="margin-top:var(--space-4)">${w.encuentro.pasos.map((pp) => `<li>${T(pp)}</li>`).join('')}</ul>
          <label class="check-pill" style="margin-top:var(--space-4)">
            <input type="checkbox" data-encuentro="${w.n}" ${state.encuentros[w.n] ? 'checked' : ''}> Marcar como hecho en familia
          </label>
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <h2>Autoevaluación</h2>
        <p>Sin respuestas correctas que memorizar — solo honestidad contigo mismo/a.</p>
        <div class="card-flat checklist" style="margin-top:var(--space-4)">
          ${w.auto.map((a, i) => `<label><input type="checkbox" data-auto="${w.n}-${i}" ${state.auto[w.n + '-' + i] ? 'checked' : ''}> ${T(a)}</label>`).join('')}
        </div>
      </div>
    </section>

    <section class="section-tight">
      <div class="wrap">
        <div class="alert-box">${ic('shield-alert')}<p><strong>Alerta de seguridad y ética.</strong> ${T(w.alerta)}</p></div>
        <div class="week-nav-links">
          ${n > 1 ? `<a class="btn btn-ghost" href="#/semana/${n - 1}">${ic('chevron-left')} Semana ${n - 1}</a>` : '<span></span>'}
          ${n < 5 ? `<a class="btn btn-primary" href="#/semana/${n + 1}">Semana ${n + 1} ${ic('chevron-right')}</a>` : `<a class="btn btn-primary" href="#/anexos">Ver anexos ${ic('chevron-right')}</a>`}
        </div>
      </div>
    </section>
    `;
  }

  // ===== VIEW: Cuaderno =====
  function viewCuaderno() {
    const cards = [];
    D.weeks.forEach((w) => {
      w.faro.sesiones.forEach((s, i) => {
        const entry = state.journal[w.n + '-' + i];
        if (faroEntryFilled(entry)) {
          cards.push(`
          <div class="entry-card">
            <span class="badge badge-faro mono">SEMANA ${w.n}</span>
            <h4 style="margin-top:8px">${s.titulo}</h4>
            <dl>
              <dt>Qué hice</dt><dd>${escapeHtml(entry.qhice) || '—'}</dd>
              <dt>Qué le pedí y cómo aplico PIENSA</dt><dd>${escapeHtml(entry.quepedi) || '—'}</dd>
              <dt>Qué encontré dudoso y cómo lo verifiqué</dt><dd>${escapeHtml(entry.dudoso) || '—'}</dd>
              <dt>Qué haría distinto</dt><dd>${escapeHtml(entry.distinto) || '—'}</dd>
            </dl>
            <a class="btn btn-ghost btn-sm" href="#/semana/${w.n}">Editar en Semana ${w.n}</a>
          </div>`);
        }
      });
    });
    const body = cards.length
      ? `<div class="glossary-grid">${cards.join('')}</div>`
      : `<div class="empty-note">${ic('notebook-pen')}<p style="margin-top:8px">Aún no hay entradas. Abre cualquier sesión de Ruta Faro en una semana y escribe tu primera reflexión.</p></div>`;
    return `
    <section class="section-tight">
      <div class="wrap">
        <p class="eyebrow">Ruta Faro 🔭</p>
        <h1 style="font-size:var(--text-3xl)">Cuaderno de IA</h1>
        <p class="lead" style="margin-top:8px">Tu portafolio de reflexiones: qué hiciste, cómo aplicaste PIENSA, qué verificaste y qué mejorarías.</p>
      </div>
    </section>
    <section class="section-tight"><div class="wrap">${body}</div></section>`;
  }

  // ===== VIEW: Anexos =====
  function viewAnexos() {
    const chispas = chispasTotal();
    const nivelesRows = D.niveles.map((lvl) => `
      <tr class="${chispas >= lvl.min && chispas <= lvl.max ? 'current-level' : ''}">
        <td>${lvl.icon} ${lvl.nombre}</td><td class="mono">${lvl.min}${lvl.max < 999 ? '–' + lvl.max : '+'}</td>
      </tr>`).join('');
    const edadesRows = D.edades.map((e) => `
      <tr><td><a href="${e.url}" target="_blank" rel="noopener">${e.plataforma}</a></td><td class="mono">${e.edad}</td><td>${e.detalle}</td></tr>`).join('');
    const glosario = D.glosario.map((g) => `<div class="entry-card"><h4>${g.t}</h4><p>${g.d}</p></div>`).join('');
    const fuentes = D.fuentes.map((f) => `<li><a href="${f.url}" target="_blank" rel="noopener">${f.t}</a></li>`).join('');
    return `
    <section class="section-tight">
      <div class="wrap">
        <p class="eyebrow">Anexos</p>
        <h1 style="font-size:var(--text-3xl)">Referencia rápida</h1>
      </div>
    </section>
    <section class="section-tight"><div class="wrap">
      <h2>Anexo 1 · Edad mínima por plataforma</h2>
      <div class="card-flat" style="margin-top:var(--space-4);overflow-x:auto">
        <table class="data-table"><thead><tr><th>Plataforma</th><th>Edad</th><th>Detalle clave</th></tr></thead><tbody>${edadesRows}</tbody></table>
      </div>
    </div></section>
    <section class="section-tight"><div class="wrap">
      <h2>Anexo 2 · Niveles de Chispas ⚡</h2>
      <p>Tu nivel actual: <strong>${chispas} Chispas</strong></p>
      <div class="card-flat" style="margin-top:var(--space-4);max-width:480px">
        <table class="data-table"><thead><tr><th>Nivel</th><th>Chispas</th></tr></thead><tbody>${nivelesRows}</tbody></table>
      </div>
    </div></section>
    <section class="section-tight"><div class="wrap">
      <h2>Anexo 3 · Plantilla del Cuaderno de IA</h2>
      <p>Cada entrada del Cuaderno de IA (Ruta Faro) tiene 4 partes: qué hice · qué le pedí y cómo aplico PIENSA · qué encontré dudoso y cómo lo verifiqué · qué haría distinto. <a href="#/cuaderno">Ver tu cuaderno →</a></p>
    </div></section>
    <section class="section-tight"><div class="wrap">
      <h2>Anexo 4 · Glosario</h2>
      <div class="glossary-grid" style="margin-top:var(--space-4)">${glosario}</div>
    </div></section>
    <section class="section-tight"><div class="wrap">
      <h2>Reglas de seguridad familiar</h2>
      <ul class="rule-list card-flat" style="margin-top:var(--space-4)">${D.reglas.map((r) => `<li>${T(r)}</li>`).join('')}</ul>
    </div></section>
    <section class="section-tight"><div class="wrap">
      <h2>Fuentes</h2>
      <ul class="rule-list" style="margin-top:var(--space-4)">${fuentes}</ul>
    </div></section>`;
  }

  // ===== VIEW: Certificado =====
  function viewCertificate() {
    const p = activeProfile();
    const complete = isCourseComplete();
    const chispas = chispasTotal();
    const lvl = levelFor(chispas);
    const pct = courseProgressPct();
    const dateStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const issuer = (CFG.certificate && CFG.certificate.issuer) || BRAND.name || 'LaboratorIA';
    const signName = (CFG.certificate && CFG.certificate.signatureName) || GUARD.wordCap || 'Papá';
    return `
    <section class="section-tight no-print">
      <div class="wrap">
        <p class="eyebrow">${complete ? 'Curso completado 🎉' : 'Certificado en progreso'}</p>
        <h1 style="font-size:var(--text-3xl)">Tu certificado</h1>
        <p class="lead" style="margin-top:8px">${complete
          ? 'Terminaste todas las semanas y los Encuentros. Imprime o guarda tu certificado como recuerdo.'
          : `Vas en el ${pct}% del curso. Puedes ver tu certificado ahora, pero se marca como <strong>Completado</strong> cuando termines todas las semanas y sus Encuentros.`}</p>
        <div class="row-gap" style="margin-top:var(--space-5)">
          <button class="btn btn-primary" onclick="window.print()">${ic('printer')} Imprimir / Guardar PDF</button>
          <a class="btn btn-ghost" href="#/">${ic('home')} Volver al inicio</a>
        </div>
      </div>
    </section>
    <section class="section-tight">
      <div class="wrap">
        <div class="certificate ${complete ? 'is-complete' : 'in-progress'}" id="certificate">
          <div class="cert-border">
            <div class="cert-top">
              <div class="cert-logo">
                <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M18 2 L7 18 H14 L12 30 L25 12 H17 Z"/></svg>
                <span>${escapeAttr(issuer)}</span>
              </div>
              <span class="cert-seal">${complete ? '✓ Completado' : pct + '% avanzado'}</span>
            </div>
            <p class="cert-kicker">Certificado de logro</p>
            <h2 class="cert-title">${escapeAttr(BRAND.tagline || 'Piensa. Crea. Automatiza.')}</h2>
            <p class="cert-body">Se otorga a</p>
            <p class="cert-name">${p ? p.emoji + ' ' + escapeAttr(p.name) : ''}</p>
            <p class="cert-body">por completar el curso de Inteligencia Artificial de ${escapeAttr(issuer)}, aprendiendo a pensar con lógica y sentido común frente a cualquier IA — a través del método <strong>PIENSA</strong>, la investigación con fuentes, la creación responsable y la automatización.</p>
            <div class="cert-stats">
              <div><strong>${chispas}</strong><small>Chispas ⚡</small></div>
              <div><strong>${lvl.icon}</strong><small>${escapeAttr(lvl.nombre)}</small></div>
              <div><strong>${encuentrosDoneCount()}/5</strong><small>Encuentros</small></div>
              <div><strong>${pct}%</strong><small>del curso</small></div>
            </div>
            <div class="cert-foot">
              <div class="cert-sign"><span class="cert-sign-line"></span><small>${escapeAttr(signName)}</small></div>
              <div class="cert-date"><strong>${escapeAttr(dateStr)}</strong><small>${escapeAttr((CFG.meta && CFG.meta.place) || '')}</small></div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
  }

  // ===== Bind dynamic interactions =====
  function bindDynamic() {
    document.querySelectorAll('.plan-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.getAttribute('data-plan'), 10);
        if (n === planWeeksOf()) return;
        state.planWeeks = n;
        persist();
        render();
        toast('Plan actualizado', `Tu curso ahora dura ${n} semana${n > 1 ? 's' : ''}.`, 'calendar');
      });
    });

    document.querySelectorAll('.track-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-track');
        state.lastTrack = t; persist();
        document.querySelectorAll('.track-tabs button').forEach((b) => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
        document.querySelectorAll('[data-panel]').forEach((pl) => { pl.style.display = pl.getAttribute('data-panel') === t ? 'grid' : 'none'; });
      });
    });

    document.querySelectorAll('[data-timer-key]').forEach((row) => {
      const key = row.getAttribute('data-timer-key');
      const minutes = parseFloat(row.getAttribute('data-timer-min')) || 10;
      const label = row.getAttribute('data-timer-label') || 'Actividad';
      const startBtn = row.querySelector('[data-timer-start]');
      const resetBtn = row.querySelector('[data-timer-reset]');
      if (startBtn) startBtn.addEventListener('click', () => {
        if (focusTimer && focusTimer.key === key) {
          focusTimer.running ? pauseFocusTimer() : resumeFocusTimer();
        } else {
          startFocusTimer(key, minutes, label);
        }
      });
      if (resetBtn) resetBtn.addEventListener('click', () => {
        if (focusTimer && focusTimer.key === key) resetFocusTimer();
      });
    });
    syncAllTimerUIs();
    renderBanner();

    document.querySelectorAll('[data-sprint-check]').forEach((box) => {
      box.addEventListener('change', () => {
        const card = box.closest('.sprint-card');
        const key = card.getAttribute('data-sprint');
        state.sprints[key] = box.checked;
        persist();
        card.classList.toggle('done', box.checked);
        if (box.checked) {
          bumpStreak();
          sparkBurst(box);
          const lvlBefore = levelFor(chispasTotal() - 5);
          const lvlAfter = levelFor(chispasTotal());
          if (lvlAfter.nombre !== lvlBefore.nombre) toast('¡Subiste de nivel!', `Ahora eres ${lvlAfter.icon} ${lvlAfter.nombre}`, 'trophy');
          else toast('+5 Chispas', 'Sprint completado', 'flame');
          setTimeout(() => checkNewBadges(box), 900);
        }
      });
    });

    document.querySelectorAll('[data-journal]').forEach((form) => {
      const key = form.getAttribute('data-journal');
      const indicator = form.querySelector('[data-saved]');
      let debounce = null;
      form.querySelectorAll('textarea').forEach((ta) => {
        ta.addEventListener('input', () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            const entry = state.journal[key] || {};
            form.querySelectorAll('textarea').forEach((t) => { entry[t.getAttribute('data-field')] = t.value; });
            entry.savedAt = Date.now();
            state.journal[key] = entry;
            persist();
            bumpStreak();
            indicator.classList.add('show');
            setTimeout(() => indicator.classList.remove('show'), 1600);
            checkNewBadges(indicator);
          }, 500);
        });
      });
    });

    document.querySelectorAll('[data-encuentro]').forEach((box) => {
      box.addEventListener('change', () => {
        state.encuentros[box.getAttribute('data-encuentro')] = box.checked;
        persist();
        if (box.checked) {
          bumpStreak();
          sparkBurst(box);
          toast('¡Reto en familia completado!', 'Un paso más juntos.', 'users');
          setTimeout(() => checkNewBadges(box), 900);
        }
      });
    });

    document.querySelectorAll('[data-auto]').forEach((box) => {
      box.addEventListener('change', () => {
        state.auto[box.getAttribute('data-auto')] = box.checked;
        persist();
      });
    });
  }

  // ===== PWA: instalar + service worker =====
  let deferredPrompt = null;
  const installBtn = document.getElementById('installBtn');
  if (FEAT.pwa) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.hidden = false;
    });
    if (installBtn) installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) { toast('Instalar', 'Usa el menú del navegador → "Instalar app" / "Agregar a inicio".', 'download'); return; }
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (e) { /* ignore */ }
      deferredPrompt = null;
      installBtn.hidden = true;
    });
    window.addEventListener('appinstalled', () => { if (installBtn) installBtn.hidden = true; toast('¡Instalada!', 'Ya puedes abrirla como app.', 'check-circle-2'); });
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
    }
  }

  // ===== Init =====
  load();
  ensureActive();
  applyBranding();
  applyTheme();
  updateProfileChip();
  if (!storageOK) {
    setTimeout(() => toast('Modo sin memoria', 'Tu navegador bloquea el guardado. Usa "Copia de seguridad" para no perder el progreso.', 'shield-alert'), 1200);
  }
  render();
  if (!Object.keys(store.profiles).length) renderWelcome();
})();
