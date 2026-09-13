// npm run fastboot [mcVersion] [world] [--vanilla] [--server ip]
// Omija UI launchera: od razu start gry i wejście do świata (quickPlay).
// Przykłady:
//   npm run fastboot
//   npm run fastboot 1.21 Polonium
//   npm run fastboot 1.21 "" --server play.hypixel.net
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const version = args.find(a => !a.startsWith('--')) || '1.21';
const world = args.filter(a => !a.startsWith('--'))[1] || 'Polonium';
const cheats = !args.includes('--vanilla');
const srvArg = args.indexOf('--server');
const server = srvArg >= 0 ? args[srvArg + 1] : null;

// lokalny JSON-store (bez electrona) + WebView host, żeby mod gadał z ClickGUI w przeglądarce
const { resolveDataDir } = require('../src/core/datadir.js');
const STORE_FILE = path.join(resolveDataDir(), 'fastboot-store.json');
function loadStore() {
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); } catch { return {}; }
}
function writeStore(d) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(d, null, 2));
}
const { migrateModules } = require('../src/core/migrateModules.js');
{
  // migracja przy każdym starcie (dokleja nowe moduły jak mlg, klucze settings)
  const d = loadStore();
  const r = migrateModules(d.modules, require('../src/core/defaultModules.js'));
  if (!d.modules || r.added) {
    d.modules = r.modules;
    writeStore(d);
    if (r.added) console.log(`[fastboot] migracja modułów (+${r.added})`);
  }
}
const getStore = async () => ({
  get: (k, def) => { const d = loadStore(); return d[k] !== undefined ? d[k] : def; },
  set: (k, v) => { const d = loadStore(); d[k] = v; writeStore(d); }
});

const { launchMinecraft } = require('../src/core/versionManager.js');

(async () => {
  const { createHost } = require('../src/core/host.js');
  const host = await createHost({
    getStore,
    publicDir: path.join(__dirname, '..', 'src', 'renderer')
  });
  console.log(`[fastboot] clickgui (webview) -> ${host.url}  <- otworz w przegladarce`);
  console.log(`[fastboot] ${version} -> ${server ? server : 'single: ' + world} (cheats: ${cheats ? 'on' : 'off'})`);
  const res = await launchMinecraft(
    {
      username: process.env.POLONIUM_NICK || 'PoloniumUser',
      version,
      cheats,
      ram: parseInt(process.env.POLONIUM_RAM || '4096', 10),
      ...(server
        ? { server }
        : { world })
    },
    (type, data) => {
      if (type === 'progress') {
        const pct = data.total ? Math.round((data.task / data.total) * 100) : 0;
        process.stdout.write(`\r[${data.type || 'dl'}] ${data.task}/${data.total} (${pct}%)   `);
      } else if (type === 'started') {
        console.log(`\n[start] pid ${data.pid}`);
      } else if (type === 'close') {
        console.log(`\n[close] kod ${data.code}`);
        process.exit(data.code || 0);
      } else if (type === 'debug' || type === 'error') {
        console.log(`\n[${type}] ${(data.msg || '').slice(0, 200)}`);
      }
    }
  );
  if (!res.ok) {
    console.error('[fastboot] FAIL: ' + res.error);
    process.exit(1);
  }
  console.log('[fastboot] gra odpalona, wbijanie do świata...');
})().catch((e) => { console.error('[fastboot] FAIL:', e.message); process.exit(1); });
