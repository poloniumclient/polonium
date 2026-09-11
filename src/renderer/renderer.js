// Minimal dynamiczny launcher + settings modal + prawdziwy progress pobierania.
let selVersion = null;
let cheats = false;
let settings = {};
let theme = 'polonium';

function setBar(p) {
  document.querySelector('#bar div').style.width = Math.max(0, Math.min(100, p)) + '%';
}
function log(msg) {
  const el = document.getElementById('log');
  el.textContent = msg;
}

async function loadVersions() {
  const box = document.getElementById('versions');
  try {
    const r = await window.polonium.getVersions();
    box.innerHTML = '';
    selVersion = settings.version || r.selected || r.versions[0];
    r.versions.forEach(v => {
      const b = document.createElement('button');
      b.textContent = v;
      if (v === selVersion) b.classList.add('active');
      b.onclick = async () => {
        selVersion = v;
        box.querySelectorAll('button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        settings.version = v;
        await window.polonium.saveSettings(settings);
      };
      box.appendChild(b);
    });
  } catch (e) {
    box.innerHTML = '<span class="loading">błąd wersji: ' + e.message + '</span>';
  }
}

function applyTheme(t) {
  theme = t;
  document.body.dataset.theme = t;
  document.querySelectorAll('#themes button').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
}

function pixelAvatar(nick) {
  // deterministyczny 8x8 awatar jak nie ma neta / nick non-premium
  let h = 0;
  for (const c of nick) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const c = document.createElement('canvas'); c.width = 8; c.height = 8;
  const x = c.getContext('2d');
  const rnd = (() => { let s = h || 1; return () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296; })();
  const base = `hsl(${h % 360} 60% 55%)`;
  x.fillStyle = '#0c0c0e'; x.fillRect(0, 0, 8, 8);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
    if (rnd() > 0.5) { x.fillStyle = base; x.fillRect(j, i, 1, 1); x.fillRect(7 - j, i, 1, 1); }
  }
  // oczy
  x.fillStyle = '#fff'; x.fillRect(1, 3, 2, 2); x.fillRect(5, 3, 2, 2);
  x.fillStyle = '#000'; x.fillRect(2, 4, 1, 1); x.fillRect(5, 4, 1, 1);
  return c.toDataURL();
}

function updateHead(nick) {
  const img = document.getElementById('play-head');
  const clean = (nick || 'PoloniumUser').replace(/[^A-Za-z0-9_]/g, '') || 'PoloniumUser';
  img.onerror = () => { img.onerror = null; img.src = pixelAvatar(clean); };
  // mc-heads ma lepszy hit-rate niż minotar dla non-premium, cache-buster wymusza zmianę
  img.src = `https://mc-heads.net/avatar/${clean}/32?t=${Date.now()}`;
  // jak po 2.5s dalej stoi (offline), podmień na lokalny
  clearTimeout(updateHead._t);
  updateHead._t = setTimeout(() => { if (!img.complete || img.naturalWidth <= 8) { img.src = pixelAvatar(clean); } }, 2500);
}

async function init() {
  const cfg = await window.polonium.getConfig();
  settings = cfg.settings || {};
  const nick = settings.username || 'PoloniumUser';
  document.getElementById('nick').value = nick;
  updateHead(nick);
  cheats = settings.cheats === true;
  applyTheme(settings.theme || 'polonium');
  document.getElementById('set-ram').value = settings.ram || 4096;
  document.getElementById('set-java').value = settings.javaPath || '';
  syncSeg();
  await loadVersions();
  syncSeg();
  document.getElementById('st-root').textContent = '.polonium/minecraft';
}

function syncSeg() {
  document.querySelectorAll('#cheats-seg button').forEach(b => {
    b.classList.toggle('active', (b.dataset.v === 'yes') === cheats);
  });
  const sub = document.getElementById('play-sub');
  if (sub) sub.textContent = (cheats ? 'cheats on' : 'vanilla') + ' • ' + (selVersion || '');
}

document.querySelectorAll('#cheats-seg button').forEach(b => b.onclick = async () => {
  cheats = b.dataset.v === 'yes';
  syncSeg();
  settings.cheats = cheats;
  await window.polonium.saveSettings({ ...settings, version: selVersion });
  log(cheats ? 'cheats: on' : 'cheats: off');
});

let nickT = null;
document.getElementById('nick').oninput = (e) => {
  document.getElementById('nick-dot').className = '';
  updateHead(e.target.value); // od razu, bez czekania na zapis
  clearTimeout(nickT);
  nickT = setTimeout(async () => {
    const v = e.target.value || 'PoloniumUser';
    settings.username = v;
    await window.polonium.saveSettings({ ...settings, version: selVersion });
    document.getElementById('nick-dot').className = 'ok';
  }, 500);
};

// DVD screensaver logo - odbija się i zmienia kolor na odbiciu (bez fioletu)
(function dvd() {
  const el = document.getElementById('dvd');
  if (!el) return;
  const colors = ['#caff3d', '#7dd3fc', '#ffffff', '#ffb400', '#ff5d5d', '#4ade80'];
  let x = 60, y = 80, vx = 0.6, vy = 0.45, ci = 0;
  const W = 120, H = 34;
  function frame() {
    const bw = window.innerWidth, bh = window.innerHeight;
    x += vx; y += vy;
    let hit = false;
    if (x <= 0) { x = 0; vx = Math.abs(vx); hit = true; }
    if (x + W >= bw) { x = bw - W; vx = -Math.abs(vx); hit = true; }
    if (y <= 48) { y = 48; vy = Math.abs(vy); hit = true; }
    if (y + H >= bh - 28) { y = bh - 28 - H; vy = -Math.abs(vy); hit = true; }
    if (hit) { ci = (ci + 1) % colors.length; el.style.color = colors[ci]; }
    el.style.transform = `translate(${x}px,${y}px)`;
    requestAnimationFrame(frame);
  }
  el.style.color = colors[0];
  requestAnimationFrame(frame);
})();

// Settings modal dół-prawo
document.getElementById('settings-btn').onclick = () => document.getElementById('settings-modal').classList.remove('hidden');
document.getElementById('settings-close').onclick = () => document.getElementById('settings-modal').classList.add('hidden');
document.getElementById('settings-modal').onclick = (e) => {
  if (e.target.id === 'settings-modal') e.target.classList.add('hidden');
};
document.querySelectorAll('#themes button').forEach(b => b.onclick = async () => {
  applyTheme(b.dataset.theme);
  settings.theme = theme;
  await window.polonium.saveSettings({ ...settings, version: selVersion });
});
document.getElementById('set-save').onclick = async () => {
  settings.ram = parseInt(document.getElementById('set-ram').value, 10) || 4096;
  settings.javaPath = document.getElementById('set-java').value || '';
  settings.theme = theme;
  settings.version = selVersion;
  await window.polonium.saveSettings(settings);
  document.getElementById('settings-modal').classList.add('hidden');
  log('Zapisano settings.');
};

// Prawdziwy progress z main.js
try {
  window.polonium.onLaunchProgress(({ type, data }) => {
    if (type === 'progress') {
      const pct = data.total ? Math.round((data.task / data.total) * 100) : 0;
      setBar(pct);
      log(`dl [${data.type || 'files'}] ${data.task}/${data.total} (${pct}%)`);
    } else if (type === 'download') {
      log('ok: ' + (data.file || 'file'));
    } else if (type === 'debug') {
      const m = data.msg || '';
      if (m.includes('Failed') || m.includes('Couldn')) log(m.toLowerCase());
    } else if (type === 'started') {
      setBar(100);
      log('running, pid ' + data.pid);
      document.getElementById('st-java').textContent = 'java: ok';
    } else if (type === 'close') {
      setBar(0);
      log('closed (' + data.code + ')');
      document.getElementById('play').disabled = false;
    } else if (type === 'error') {
      log('err: ' + data.msg);
    } else if (type === 'start') {
      setBar(2);
      log(`launch ${data.version}... ${data.java || ''}`);
    }
  });
} catch {}

document.getElementById('play').onclick = async () => {
  const btn = document.getElementById('play');
  btn.disabled = true;
  setBar(2);
  log('checking java + files...');
  try {
    const res = await window.polonium.launchMC({
      username: document.getElementById('nick').value || 'PoloniumUser',
      version: selVersion,
      cheats,
      ram: parseInt(document.getElementById('set-ram').value, 10) || settings.ram || 4096,
      javaPath: document.getElementById('set-java').value || settings.javaPath || ''
    });
    if (!res.ok) {
      log('err: ' + res.error);
      document.getElementById('st-java').textContent = 'java: err';
      setBar(0);
      btn.disabled = false;
    } else {
      log(`launched ${res.version} (${res.mode}) pid ${res.pid || '?'}\nfirst run downloads files, wait...`);
    }
  } catch (e) {
    log('err: ' + e.message);
    setBar(0);
    btn.disabled = false;
  }
};

document.getElementById('w-min').onclick = () => window.polonium.win('min');
document.getElementById('w-max').onclick = () => window.polonium.win('max');
document.getElementById('w-close').onclick = () => window.polonium.win('close');

document.addEventListener('keyup', e => {
  if (e.code === 'ControlRight') window.polonium.toggleClickGUI();
});

init();
