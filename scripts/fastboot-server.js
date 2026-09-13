// npm run fastboot-server
// Testy bypassów na Grimie jednym klikiem:
//   1. stawia lokalny Paper+Grim (polonium-mod/grim-test) jak nie chodzi,
//   2. odpala MC 1.21 + Polonium i wchodzi z automatu na 127.0.0.1:25566.
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

const GRIM_DIR = path.join(__dirname, '..', 'polonium-mod', 'grim-test');
const HOST = '127.0.0.1';
const PORT = 25566;
const SERVER_ADDR = `${HOST}:${PORT}`;

function portOpen() {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: HOST, port: PORT, timeout: 2000 }, () => {
      s.destroy();
      resolve(true);
    });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.on('error', () => resolve(false));
  });
}

async function ensureServer() {
  if (await portOpen()) {
    console.log(`[fastboot-server] serwer już chodzi na ${SERVER_ADDR}`);
    return;
  }
  for (const f of ['paper.jar', path.join('plugins', 'grim.jar'), 'eula.txt']) {
    if (!fs.existsSync(path.join(GRIM_DIR, f))) {
      throw new Error(`brak ${f} w polonium-mod/grim-test — najpierw postaw serwer wg instrukcji`);
    }
  }
  console.log('[fastboot-server] start Paper+Grim w tle...');
  const proc = spawn('java', ['-Xmx2G', '-jar', 'paper.jar', 'nogui'], {
    cwd: GRIM_DIR,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  proc.unref();
  const t0 = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 2000));
    if (await portOpen()) break;
    if (proc.exitCode !== null) throw new Error(`serwer padł przy starcie (exit ${proc.exitCode})`);
    if (Date.now() - t0 > 240000) throw new Error('serwer nie wstał w 4 min — zobacz polonium-mod/grim-test/logs/latest.log');
    process.stdout.write('.');
  }
  console.log(`\n[fastboot-server] serwer gotowy na ${SERVER_ADDR}`);
  await new Promise((r) => setTimeout(r, 5000)); // Grim kończy ładować checki
}

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
    if (r.added) console.log(`[fastboot-server] migracja modułów (+${r.added})`);
  }
}
const getStore = async () => ({
  get: (k, def) => { const d = loadStore(); return d[k] !== undefined ? d[k] : def; },
  set: (k, v) => { const d = loadStore(); d[k] = v; writeStore(d); }
});

const { launchMinecraft } = require('../src/core/versionManager.js');

(async () => {
  await ensureServer();
  const { createHost } = require('../src/core/host.js');
  const host = await createHost({
    getStore,
    publicDir: path.join(__dirname, '..', 'src', 'renderer')
  });
  console.log(`[fastboot-server] clickgui (webview) -> ${host.url}  <- otworz w przegladarce`);
  console.log(`[fastboot-server] 1.21 -> ${SERVER_ADDR} (cheats: on)`);
  const res = await launchMinecraft(
    {
      username: process.env.POLONIUM_NICK || 'GabeczkaG',
      version: '1.21',
      cheats: true,
      ram: parseInt(process.env.POLONIUM_RAM || '4096', 10),
      server: SERVER_ADDR
    },
    (type, data) => {
      if (type === 'progress') {
        const pct = data.total ? Math.round((data.task / data.total) * 100) : 0;
        process.stdout.write(`\r[${data.type || 'dl'}] ${data.task}/${data.total} (${pct}%)   `);
      } else if (type === 'started') {
        console.log(`\n[start] pid ${data.pid}`);
      } else if (type === 'close') {
        console.log(`\n[close] kod ${data.code} (serwer Grim dalej chodzi w tle)`);
        process.exit(data.code || 0);
      } else if (type === 'debug' || type === 'error') {
        console.log(`\n[${type}] ${(data.msg || '').slice(0, 200)}`);
      }
    }
  );
  if (!res.ok) {
    console.error('[fastboot-server] FAIL: ' + res.error);
    process.exit(1);
  }
  console.log('[fastboot-server] gra odpalona, wbijanie na serwer...');
})().catch((e) => { console.error('[fastboot-server] FAIL:', e.message); process.exit(1); });
