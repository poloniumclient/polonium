let mods = [];
let cat = 'all';
let lastToggle = 0;

function canToggle() {
  const now = Date.now();
  if (now - lastToggle < 500) return false;
  lastToggle = now;
  return true;
}

async function load() {
  try {
    const cfg = await window.polonium.getConfig();
    mods = cfg.modules || [];
    render();
  } catch (e) {
    console.error('clickgui load fail', e);
  }
}
function render() {
  const q = (document.getElementById('q').value || '').toLowerCase();
  const el = document.getElementById('panels'); el.innerHTML = '';
  mods.filter(m => (cat === 'all' || m.category === cat) && m.name.toLowerCase().includes(q)).forEach(m => {
    const d = document.createElement('div'); d.className = 'mod';
    const setStr = m.settings ? `<small>⚙ ${Object.entries(m.settings).map(([k, v]) => k + ': ' + v).join(' • ')}</small>` : '';
    d.innerHTML = `<div class="top"><h4>${m.name}</h4><button class="toggle ${m.enabled ? 'on' : ''}"></button></div><small>${m.category} • ${m.keybind || 'brak bind'}</small><p>${m.description || ''}</p>${setStr}`;
    d.querySelector('button').onclick = async () => { m.enabled = !m.enabled; await window.polonium.saveModule(m); load(); };
    el.appendChild(d);
  });
}
document.querySelectorAll('.cats button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.cats button').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); cat = b.dataset.cat; render();
});
document.getElementById('q').oninput = render;
document.getElementById('close').onclick = () => window.polonium.toggleClickGUI();

// RCTRL w WebView - tylko keyup + debounce, bo main też nasłuchuje before-input-event.
// Bez tego byłyby 2 toggles = brak reakcji.
document.addEventListener('keyup', e => {
  if (e.code === 'ControlRight' && canToggle()) window.polonium.toggleClickGUI();
});
window.polonium.onModulesUpdated(m => { mods = m; render(); });
window.polonium.onClickGuiToggled(() => {});
load();
