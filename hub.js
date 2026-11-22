// PF Juegos — índice para la tele + mandos con el celular.
// Modos:
//   /            → pantalla (tele/compu). En un celular muestra el inicio para celular.
//   /?tv         → fuerza modo pantalla (para usar un celu/tablet como pantalla).
//   /?j=1234     → mando: el celular se une a la pantalla con ese código.
(function () {
  'use strict';

  // ===== Configuración =====
  const MAX_PLAYERS = 4;           // subilo cuando quieras más mandos (los colores se repiten solos)
  const PREFIX = 'pfjuegos-hub-';
  const SITE = 'pf-juegos.vercel.app';
  const COLORS = ['#ff4d6d', '#3fa7ff', '#2fd27a', '#ffc531', '#b86bff', '#ff8a3d', '#29d3c9', '#ff6bd5'];
  const AVATARS = ['🦄', '🐱', '🐶', '🦊', '🐼', '🐸', '🦁', '🐵', '🐧', '🐰', '🐯', '🐻', '🐨', '🐙', '🦖', '🐝'];
  let GAMES = [];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $('#app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const color = (slot) => COLORS[(slot - 1) % COLORS.length];
  const genCode = () => String(Math.floor(1000 + Math.random() * 9000));
  const playersLabel = (g) => (!g.pad ? '🎮 Control de la tele' : g.players.min === g.players.max
    ? `👤 ${g.players.max} jugador${g.players.max > 1 ? 'es' : ''}`
    : `👤 ${g.players.min} a ${g.players.max} jugadores`);

  let toastT;
  function toast(html, ms = 2600) {
    const t = $('#toast');
    t.innerHTML = html; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ===== Sonidos cortitos (Web Audio, sin archivos) =====
  let actx;
  function beep(notes, dur = 0.12, type = 'triangle', vol = 0.12) {
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      let t = actx.currentTime;
      for (const f of notes) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
        t += dur * 0.8;
      }
    } catch {}
  }
  const sfx = {
    move: () => beep([660], 0.06, 'sine', 0.06),
    join: () => beep([523, 659, 784, 1047], 0.11),
    leave: () => beep([523, 392], 0.12, 'sine'),
    go: () => beep([392, 523, 659, 784, 1047], 0.1, 'square', 0.07),
  };

  // ===== Catálogo =====
  // Los juegos se descubren solos (/api/games lee `pf-juego.json` de cada repo).
  // Si eso falla se usa la última lista buena guardada y, si no hay, la de games.js.
  function fromManifest(m) {
    const base = String(m.url || '').replace(/\/+$/, '');
    const fill = (p, c, id) => (/^https?:/.test(p) ? p : base + (p.startsWith('/') ? p : '/' + p)).replace(/\{code\}/g, c).replace(/\{id\}/g, id || '');
    const one = (e, order, raw = e.id) => ({
      id: String(e.id), name: e.name || e.id, emoji: e.emoji || '🎮', color: e.color || '#3fa7ff',
      group: e.group || '', desc: e.desc || '', tags: e.tags || [], order, online: !!e.needsInternet,
      players: { min: e.players?.min ?? 1, max: e.players?.max ?? 1 },
      tv: (c) => fill(e.tv || '/?hub={code}', c, raw),
      pad: e.pad ? (c) => fill(e.pad, c, raw) : null,
      solo: fill(e.solo || '/', '', raw),
      // Sin internet no hay mandos: se abre para jugar en este mismo dispositivo.
      offline: (c) => fill(e.offline || (e.pad ? e.solo || '/' : e.tv || '/?hub={code}'), c, raw),
    });
    const order = Number.isFinite(m.order) ? m.order : 100;
    if (Array.isArray(m.entries) && m.entries.length) {
      return m.entries.filter((e) => !e.hidden).map((e, i) => one({ ...m, ...e, id: `${m.id}-${e.id}`, tags: e.tags || m.tags }, order + i / 100, e.id));
    }
    return [one(m, order)];
  }
  function setGames(list) {
    GAMES = list.flatMap((m) => { try { return fromManifest(m); } catch { return []; } })
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'es'));
  }
  async function loadGames() {
    let cached = null;
    try { cached = JSON.parse(store.get('pfj-games', 'null')); } catch {}
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch('/api/games', { signal: ctl.signal }); clearTimeout(to);
      const j = r.ok ? await r.json() : null;
      if (j && Array.isArray(j.games) && j.games.length) { store.set('pfj-games', JSON.stringify(j.games)); return setGames(j.games); }
    } catch {}
    setGames(cached && cached.length ? cached : (window.PF_FALLBACK || []));
  }

  // ===== Arranque =====
  const qs = new URLSearchParams(location.search);
  const joinCode = (qs.get('j') || '').replace(/\D/g, '');
  const isPhone = matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 700;

  app.innerHTML = '<div class="booting">🎮</div>';
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  loadGames().then(() => {
    if (joinCode.length === 4) startPad(joinCode);
    else if (qs.has('tv') || !isPhone) startScreen();
    else startPhoneHome();
  });

  // =========================================================
  //  PANTALLA (tele)
  // =========================================================
  function startScreen() {
    document.body.className = 'mode-tv';
    app.innerHTML = `
      <header class="top">
        <div class="logo"><span class="logo-em">🎮</span><b>PF</b>&nbsp;Juegos</div>
        <div class="sp"></div>
        <div class="clock" id="clock"></div>
        <button class="fsbtn" id="fs" data-nav>⛶ Pantalla completa</button>
      </header>
      <main class="tv-main">
        <section class="games" id="games">
          ${GAMES.map((g, i) => `
            <button class="card${g.online ? ' needs-net' : ''}" data-nav data-g="${g.id}" style="--c:${g.color}" aria-label="${esc(g.name)}">
              <span class="num">${i + 1}</span>
              <span class="em">${g.emoji}</span>
              <span class="txt">
                <small class="grp">${esc(g.group || '')}</small>
                <b>${esc(g.name)}</b>
                <span class="desc">${esc(g.desc)}</span>
                <span class="meta"><span class="pl">${playersLabel(g)}</span>${(g.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</span>
              </span>
              <span class="pickers"></span>
            </button>`).join('')}
        </section>
        <aside class="join">
          <h2>¡Sumate con el celu!</h2>
          <div class="qr" id="qr"><div class="qr-wait">…</div></div>
          <p class="how">Escaneá el código o entrá a<br><b>${SITE}</b> y poné</p>
          <div class="code" id="code">····</div>
          <div class="slots" id="slots"></div>
          <div class="net" id="net">Conectando…</div>
        </aside>
      </main>
      <footer class="foot">🕹️ Flechas del control para elegir · <b>OK</b> para jugar · o elegí desde el celular</footer>
      <div class="launch" id="launch"></div>`;

    // reloj
    const clock = () => { const d = new Date(); $('#clock').textContent = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); };
    clock(); setInterval(clock, 15000);

    // pantalla completa
    $('#fs').onclick = () => {
      const el = document.documentElement;
      if (document.fullscreenElement) document.exitFullscreen?.();
      else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    };

    // tarjetas
    $$('.card').forEach((c) => {
      c.onclick = () => launch(c.dataset.g);
      c.onfocus = () => c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    setTimeout(() => $('.card')?.focus({ preventScroll: true }), 50);

    // navegación con el control remoto / teclado
    window.addEventListener('keydown', (e) => {
      const k = e.key || '';
      const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[k]
        || { 38: 'up', 40: 'down', 37: 'left', 39: 'right' }[e.keyCode];
      if (dir) { e.preventDefault(); moveFocus(dir); return; }
      if (/^[1-9]$/.test(k) && GAMES[+k - 1]) launch(GAMES[+k - 1].id);
    });

    // ----- red -----
    let code = store.get('pfj-code', '') || genCode();
    let peer = null, launching = false, netDown = false;
    const players = [];                       // {pid, name, av, slot, conn}
    const slotOf = new Map();                 // pid → slot (para que al volver te toque el mismo lugar)

    function openPeer(tries = 0) {
      try { peer?.destroy(); } catch {}
      if (!window.Peer || !navigator.onLine) { setOffline(); return; }
      peer = new window.Peer(PREFIX + code, { debug: 0 });
      peer.on('open', () => { store.set('pfj-code', code); renderCode(); setNet(''); });
      peer.on('error', (e) => {
        if (e.type === 'unavailable-id') {
          // Pasa un ratito al volver de un juego: el código anterior todavía se está liberando.
          if (tries < 5) { setNet('Recuperando la sala…'); setTimeout(() => openPeer(tries + 1), 1500); }
          else { code = genCode(); openPeer(0); }
        } else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) {
          if (!navigator.onLine) return setOffline();
          setNet('Sin conexión, reintentando…', true); setTimeout(() => openPeer(tries), 4000);
        }
      });
      peer.on('disconnected', () => setTimeout(() => { if (peer && !peer.destroyed && peer.disconnected) peer.reconnect(); }, 1500));
      peer.on('connection', (conn) => {
        conn.on('data', (d) => onMsg(conn, d));
        conn.on('close', () => drop(conn));
        conn.on('error', () => drop(conn));
      });
    }
    function setOffline() {
      netDown = true;
      document.body.classList.add('offline');
      $('.join h2').textContent = '📴 Sin internet';
      $('#qr').innerHTML = '<div class="qr-wait">📴</div>';
      $('#code').textContent = '';
      $('.how').innerHTML = 'Elegí un juego y se juega en <b>este dispositivo</b>, sin celulares.<br>Cuando vuelva internet, el QR aparece solo.';
      $('.foot').innerHTML = '🕹️ Flechas del control para elegir · <b>OK</b> para jugar';
      setNet('');
    }
    window.addEventListener('online', () => { if (!peer || !peer.open) location.reload(); });
    function setNet(t, bad) { const n = $('#net'); n.textContent = t; n.classList.toggle('bad', !!bad); }
    function renderCode() {
      $('#code').textContent = code.split('').join(' ');
      const url = `https://${SITE}/?j=${code}`;
      try {
        const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
        $('#qr').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
      } catch { $('#qr').textContent = ''; }
      renderSlots();
    }
    function renderSlots() {
      const n = Math.max(MAX_PLAYERS, players.length);
      let html = '';
      for (let s = 1; s <= n; s++) {
        const p = players.find((x) => x.slot === s);
        html += p
          ? `<div class="slot on" style="--pc:${color(s)}"><span class="av">${esc(p.av)}</span><span class="nm">${esc(p.name)}</span><span class="sn">${s}</span></div>`
          : `<div class="slot" style="--pc:${color(s)}"><span class="av">＋</span><span class="nm">Libre</span><span class="sn">${s}</span></div>`;
      }
      $('#slots').innerHTML = html;
      $('#slots').dataset.count = players.length;
    }
    const send = (p, m) => { try { p.conn.open && p.conn.send(m); } catch {} };
    const roster = () => players.map((p) => ({ slot: p.slot, name: p.name, av: p.av }));
    const broadcast = (m) => players.forEach((p) => send(p, m));

    function onMsg(conn, d) {
      if (!d || !d.t) return;
      let p = players.find((x) => x.conn === conn);
      if (d.t === 'hello') {
        const pid = String(d.pid || '').slice(0, 40);
        const prev = players.find((x) => x.pid === pid);
        if (prev) { try { prev.conn !== conn && prev.conn.close(); } catch {} prev.conn = conn; p = prev; }
        else {
          if (players.length >= MAX_PLAYERS) { conn.send({ t: 'full', max: MAX_PLAYERS }); setTimeout(() => conn.close(), 500); return; }
          const used = new Set(players.map((x) => x.slot));
          let slot = slotOf.get(pid);
          if (!slot || used.has(slot)) { slot = 1; while (used.has(slot)) slot++; }
          p = { pid, slot, conn };
          players.push(p); slotOf.set(pid, slot);
          sfx.join();
        }
        p.name = String(d.name || 'Jugador').slice(0, 14);
        p.av = String(d.av || '🙂').slice(0, 4);
        send(p, { t: 'welcome', slot: p.slot, color: color(p.slot), code, max: MAX_PLAYERS });
        if (!prev) toast(`<span style="color:${color(p.slot)}">${esc(p.av)} ${esc(p.name)}</span> se sumó como jugador ${p.slot}`);
        renderSlots(); broadcast({ t: 'roster', list: roster() });
        return;
      }
      if (!p) return;
      switch (d.t) {
        case 'prof':
          p.name = String(d.name || p.name).slice(0, 14); p.av = String(d.av || p.av).slice(0, 4);
          renderSlots(); broadcast({ t: 'roster', list: roster() }); break;
        case 'focus': markPick(p, d.g); break;
        case 'pick': launch(d.g, p.pid); break;
        case 'nav': moveFocus(d.d); break;
        case 'ok': document.activeElement?.click?.(); break;
      }
    }
    function drop(conn) {
      const i = players.findIndex((x) => x.conn === conn);
      if (i < 0) return;
      const [p] = players.splice(i, 1);
      if (!launching) { sfx.leave(); toast(`${esc(p.av)} ${esc(p.name)} se desconectó`); }
      $$(`.pick[data-pid="${CSS.escape(p.pid)}"]`).forEach((x) => x.remove());
      renderSlots(); broadcast({ t: 'roster', list: roster() });
    }
    function markPick(p, gid) {
      $$(`.pick[data-pid="${CSS.escape(p.pid)}"]`).forEach((x) => x.remove());
      const card = $(`.card[data-g="${CSS.escape(gid)}"]`);
      if (!card) return;
      const s = document.createElement('span');
      s.className = 'pick'; s.dataset.pid = p.pid; s.style.setProperty('--pc', color(p.slot)); s.textContent = p.av;
      card.querySelector('.pickers').appendChild(s);
      card.focus({ preventScroll: false }); sfx.move();
    }

    function launch(gid, byPid) {
      const g = GAMES.find((x) => x.id === gid);
      if (!g || launching) return;
      if (!peer || !peer.open) {
        if (netDown || !window.Peer || !navigator.onLine) {
          if (g.online) { toast(`${esc(g.emoji)} ${esc(g.name)} necesita internet`); return; }
          location.href = g.offline(code); return;
        }
        toast('Esperá un segundo, todavía me estoy conectando…'); return;
      }
      launching = true;
      const sorted = [...players].sort((a, b) => a.slot - b.slot);
      const first = sorted.find((p) => p.pid === byPid);
      const order = first ? [first, ...sorted.filter((p) => p !== first)] : sorted;
      const playing = g.pad ? order.slice(0, g.players.max) : [], watching = order.slice(playing.length);
      // El juego recibe nombre y avatar del jugador (pn/pa) para no tener que pedirlos de nuevo.
      const withMe = (u, p) => u + (u.includes('?') ? '&' : '?') + 'pn=' + encodeURIComponent(p.name) + '&pa=' + encodeURIComponent(p.av);
      playing.forEach((p, i) => send(p, { t: 'go', g: g.id, url: withMe(g.pad(code), p), delay: 1300 + i * 400 }));
      watching.forEach((p) => send(p, { t: 'watch', g: g.id, who: playing.map((x) => x.av + ' ' + x.name) }));
      sfx.go();
      const L = $('#launch');
      L.style.setProperty('--c', g.color);
      L.innerHTML = `<div class="l-in"><div class="l-em">${g.emoji}</div><h1>${esc(g.name)}</h1>
        <p>${!g.pad ? '🎮 Se juega con el control remoto de la tele' : playing.length ? 'Juegan: ' + playing.map((p) => `<span style="color:${color(p.slot)}">${esc(p.av)} ${esc(p.name)}</span>`).join(' · ') : 'Conectá un celular escaneando el QR del juego'}</p>
        ${watching.length ? `<p class="l-w">👀 Miran: ${watching.map((p) => esc(p.av + ' ' + p.name)).join(' · ')}</p>` : ''}
        <div class="l-bar"><i></i></div></div>`;
      L.classList.add('show');
      setTimeout(() => { location.href = g.tv(code); }, 1600);
    }
    window.addEventListener('pageshow', (e) => { if (e.persisted) { launching = false; $('#launch').classList.remove('show'); } });

    renderSlots();
    openPeer();
  }

  // Navegación espacial: busca el elemento más cercano en esa dirección.
  function moveFocus(dir) {
    const els = $$('[data-nav]').filter((e) => e.offsetParent);
    if (!els.length) return;
    const cur = document.activeElement && els.includes(document.activeElement) ? document.activeElement : null;
    if (!cur) { els[0].focus(); return; }
    const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of els) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
      const dx = x - cx, dy = y - cy;
      const main = { up: -dy, down: dy, left: -dx, right: dx }[dir];
      if (main <= 4) continue;
      const side = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
      const score = main + side * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { best.focus(); sfx.move(); }
  }

  // =========================================================
  //  INICIO EN CELULAR (sin código)
  // =========================================================
  function startPhoneHome() {
    document.body.className = 'mode-phone';
    app.innerHTML = `
      <div class="ph">
        <div class="logo"><span class="logo-em">🎮</span><b>PF</b>&nbsp;Juegos</div>
        <section class="ph-join">
          <h2>📺 ¿La tele está prendida?</h2>
          <p>Escaneá el QR de la tele o poné el código que aparece ahí:</p>
          <form id="jf" class="jf">
            <input id="jc" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="1234" autocomplete="off">
            <button>Conectar</button>
          </form>
        </section>
        <section>
          <h2>📱 Jugar en este celular</h2>
          <div class="plist">
            ${GAMES.map((g) => `<a class="pgame" href="${g.solo}" style="--c:${g.color}"><span class="em">${g.emoji}</span><span class="t"><b>${esc(g.name)}</b><small>${esc(g.desc)}</small></span><span class="go">▶</span></a>`).join('')}
          </div>
        </section>
        <a class="as-tv" href="?tv">Usar este dispositivo como pantalla</a>
      </div>`;
    $('#jf').onsubmit = (e) => {
      e.preventDefault();
      const v = $('#jc').value.replace(/\D/g, '');
      if (v.length === 4) location.href = '?j=' + v; else $('#jc').focus();
    };
  }

  // =========================================================
  //  MANDO (celular conectado a la tele)
  // =========================================================
  function startPad(code) {
    document.body.className = 'mode-pad';
    let pid = store.get('pfj-pid', '');
    if (!pid) { pid = 'p' + Math.random().toString(36).slice(2, 10); store.set('pfj-pid', pid); }
    const prof = { name: store.get('pfj-name', ''), av: store.get('pfj-av', '') };
    let me = null, conn = null, peer = null, retryT = null, sel = null, state = 'connecting', away = false;

    app.innerHTML = `
      <div class="pad">
        <header class="pad-top">
          <button class="me" id="me"><span class="av" id="meAv">🙂</span><span class="mt"><b id="meName">…</b><small id="meSlot">Conectando…</small></span><span class="ed">✏️</span></button>
          <span class="dot" id="dot"></span>
        </header>
        <div class="pstate" id="pstate">Conectando con la tele…</div>
        <div class="others" id="others"></div>
        <div class="plist" id="plist">
          ${GAMES.map((g) => `<button class="pgame" data-g="${g.id}" style="--c:${g.color}"><span class="em">${g.emoji}</span><span class="t"><b>${esc(g.name)}</b><small>${playersLabel(g)}</small></span><span class="go">Elegir</span></button>`).join('')}
        </div>
        <p class="pad-hint">Tocá un juego para marcarlo en la tele y otra vez para jugar.</p>
      </div>
      <div class="sheet" id="sheet"></div>
      <div class="cover" id="cover"></div>`;

    const setState = (s, text) => {
      state = s;
      $('#dot').className = 'dot ' + s;
      $('#pstate').textContent = text;
      $('#pstate').className = 'pstate ' + s;
      $('#plist').classList.toggle('off', s !== 'ok');
    };
    const renderMe = () => {
      $('#meAv').textContent = prof.av || '🙂';
      $('#meName').textContent = prof.name || 'Jugador';
      $('#meSlot').textContent = me ? `Jugador ${me.slot}` : 'Sin conectar';
      $('#me').style.setProperty('--pc', me ? me.color : '#8892b0');
    };

    // ----- perfil (una vez) -----
    function openProfile(first) {
      const sh = $('#sheet');
      let av = prof.av || AVATARS[Math.floor(Math.random() * AVATARS.length)];
      sh.innerHTML = `<div class="sh-in">
        <h2>${first ? '¡Hola! ¿Quién juega?' : 'Tu jugador'}</h2>
        <div class="avs">${AVATARS.map((a) => `<button class="avb${a === av ? ' on' : ''}" data-a="${a}">${a}</button>`).join('')}</div>
        <input id="nm" maxlength="14" placeholder="Tu nombre" value="${esc(prof.name)}" autocomplete="off">
        <button class="ok" id="okp">¡Listo!</button></div>`;
      sh.classList.add('show');
      $$('.avb', sh).forEach((b) => (b.onclick = () => { $$('.avb', sh).forEach((x) => x.classList.remove('on')); b.classList.add('on'); av = b.dataset.a; vib(15); }));
      $('#okp').onclick = () => {
        prof.av = av; prof.name = ($('#nm').value.trim() || 'Jugador').slice(0, 14);
        store.set('pfj-av', prof.av); store.set('pfj-name', prof.name);
        sh.classList.remove('show'); renderMe(); wake();
        if (conn?.open) conn.send({ t: 'prof', name: prof.name, av: prof.av });
        if (first) connectPeer();
      };
    }
    $('#me').onclick = () => openProfile(false);

    // ----- juegos -----
    $$('.pgame', $('#plist')).forEach((b) => (b.onclick = () => {
      if (state !== 'ok') return;
      const g = b.dataset.g;
      vib(20);
      if (sel === g) { conn.send({ t: 'pick', g }); b.querySelector('.go').textContent = '…'; return; }
      sel = g;
      $$('.pgame', $('#plist')).forEach((x) => { x.classList.toggle('sel', x === b); x.querySelector('.go').textContent = x === b ? '▶ ¡Jugar!' : 'Elegir'; });
      conn.send({ t: 'focus', g });
    }));

    // ----- red -----
    function connectPeer() {
      if (!window.Peer) { setState('bad', 'No se pudo cargar la conexión. ¿Hay internet?'); return; }
      peer = new window.Peer({ debug: 0 });
      peer.on('open', connect);
      peer.on('error', (e) => {
        if (e.type === 'peer-unavailable') { setState('wait', me ? '📺 La tele está en un juego o apagada. Te reconecto solo cuando vuelva al menú…' : `📺 No encuentro la tele ${code}. ¿Está abierta ${SITE}? Sigo intentando…`); retry(3000); }
        else if (['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected'].includes(e.type)) { setState('wait', 'Sin conexión, reintentando…'); retry(4000); }
      });
      peer.on('disconnected', () => setTimeout(() => { if (!peer.destroyed && peer.disconnected) peer.reconnect(); }, 1500));
    }
    function retry(ms) {
      clearTimeout(retryT);
      retryT = setTimeout(() => { if (away) return; if (peer?.open) connect(); else if (peer && !peer.destroyed && peer.disconnected) peer.reconnect(); }, ms);
    }
    function connect() {
      if (away) return;
      try { conn?.close(); } catch {}
      setState(state === 'wait' ? 'wait' : 'connecting', state === 'wait' ? $('#pstate').textContent : 'Conectando con la tele…');
      const c = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      conn = c;
      c.on('open', () => c.send({ t: 'hello', pid, name: prof.name || 'Jugador', av: prof.av || '🙂' }));
      c.on('data', onMsg);
      c.on('close', () => {
        if (c !== conn || away) return;
        conn = null; sel = null;
        if (state === 'ok') setState('wait', '📺 Se desconectó la tele. Reintentando…');
        retry(2000);
      });
    }
    function onMsg(d) {
      if (!d || !d.t) return;
      switch (d.t) {
        case 'welcome':
          me = { slot: d.slot, color: d.color };
          document.documentElement.style.setProperty('--me', d.color);
          renderMe(); setState('ok', '✔ Conectado. ¡Elegí un juego!'); vib([30, 50, 30]);
          $('#cover').classList.remove('show');
          break;
        case 'roster':
          $('#others').innerHTML = (d.list || []).map((p) => `<span class="oc${me && p.slot === me.slot ? ' mine' : ''}" style="--pc:${COLORS[(p.slot - 1) % COLORS.length]}">${esc(p.av)} ${esc(p.name)}</span>`).join('');
          break;
        case 'full':
          away = true; setState('bad', `La tele ya tiene ${d.max} jugadores. Esperá que alguien salga y recargá.`);
          break;
        case 'go': {
          away = true;
          const g = GAMES.find((x) => x.id === d.g) || { emoji: '🎮', name: 'el juego' };
          cover(`<div class="c-em">${g.emoji}</div><h2>¡A jugar ${esc(g.name)}!</h2><p>Abriendo tu mando…</p><div class="l-bar"><i></i></div>`, g.color);
          vib([40, 60, 40, 60, 80]);
          setTimeout(() => { location.href = d.url; }, d.delay || 1200);
          break;
        }
        case 'watch': {
          const g = GAMES.find((x) => x.id === d.g) || { emoji: '🎮', name: 'un juego', color: '#3fa7ff' };
          cover(`<div class="c-em">👀</div><h2>${esc(g.emoji)} ${esc(g.name)}</h2><p>${(d.who || []).length ? `Esta vez ${(d.who || []).length > 1 ? 'juegan' : 'juega'} ${esc((d.who || []).join(', '))}.` : 'Este se juega con el control remoto de la tele 🎮'}<br>¡Mirá la tele!</p><p class="small">Cuando vuelvan al menú te reconecto solo.</p>`, g.color);
          break;
        }
      }
    }
    function cover(html, c) {
      const el = $('#cover'); el.style.setProperty('--c', c || '#3fa7ff'); el.innerHTML = `<div class="c-in">${html}</div>`; el.classList.add('show');
    }

    // ----- extras de celular -----
    function vib(p) { try { navigator.vibrate?.(p); } catch {} }
    let lock = null;
    async function wake() { try { if ('wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => (lock = null)); } } catch {} }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wake(); if (!conn?.open && !away) retry(300); } });
    window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
    document.addEventListener('pointerdown', wake, { once: true });

    renderMe();
    if (!prof.av) openProfile(true);
    else connectPeer();
  }
})();
