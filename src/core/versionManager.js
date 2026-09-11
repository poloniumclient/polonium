const { Client, Authenticator } = require('minecraft-launcher-core');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const SUPPORTED = ['1.8.9', '1.12.2', '1.16.5', '1.20.1', '1.21', '1.21.1'];

let running = null;
let launching = false;

function checkJava(javaPath) {
  return new Promise((resolve) => {
    execFile(javaPath || 'java', ['-version'], { timeout: 8000 }, (err, _stdout, stderr) => {
      if (err) return resolve({ ok: false, error: String((stderr || err.message)).slice(0, 300) });
      resolve({ ok: true, info: String(stderr || '').split('\n')[0] });
    });
  });
}

async function launchMinecraft(opts = {}, onEvent = () => {}) {
  const { username = 'PoloniumUser', version = '1.21', loader = 'Vanilla', cheats = false, ram = 4096, javaPath, server } = opts;
  const root = path.join(os.homedir(), '.polonium', 'minecraft');

  if (!SUPPORTED.includes(version)) {
    return { ok: false, error: `Nieobsługiwana wersja. Wybierz: ${SUPPORTED.join(', ')}` };
  }
  if (launching) return { ok: false, error: 'Minecraft już się uruchamia, poczekaj.' };
  if (running) return { ok: false, error: 'Minecraft już działa. Zamknij grę przed kolejnym startem.' };

  const cleanName = String(username || 'PoloniumUser').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16) || 'PoloniumUser';

  // 1. Java check z czytelnym błędem
  const javaBin = javaPath && javaPath.trim() ? javaPath.trim() : 'java';
  const jc = await checkJava(javaBin);
  if (!jc.ok) {
    return {
      ok: false,
      error: `Brak Javy (${javaBin}). Zainstaluj ${version === '1.8.9' ? 'Java 8 64-bit' : 'Java 17+ 64-bit'} i ustaw ścieżkę w Settings. Szczegóły: ${jc.error}`
    };
  }

  launching = true;
  onEvent('start', { version, loader, cheats, java: jc.info });

  try {
    const launcher = new Client();
    const auth = Authenticator.getAuth(cleanName);

    const launchOpts = {
      authorization: auth,
      root,
      version: { number: version, type: 'release' },
      memory: { max: `${ram}M`, min: '512M' },
      javaPath: javaBin
    };
    if (cheats) {
      launchOpts.customLaunchArgs = ['--poloniumCheats'];
      launchOpts.customArgs = ['-Dpolonium.cheats=true'];
    }
    if (server) {
      launchOpts.quickPlay = { type: version.startsWith('1.20') || version.startsWith('1.21') ? 'multiplayer' : 'legacy', identifier: server };
    }

    launcher.on('debug', (d) => onEvent('debug', { msg: String(d).slice(0, 500) }));
    launcher.on('data', (d) => onEvent('data', { msg: String(d).slice(0, 500) }));
    launcher.on('progress', (p) => onEvent('progress', p));
    launcher.on('download', (d) => onEvent('download', { file: String(d) }));
    launcher.on('download-status', (s) => onEvent('download-status', s));
    launcher.on('package-extract', () => onEvent('progress', { type: 'package', task: 1, total: 1 }));
    launcher.on('close', (code) => {
      running = null;
      onEvent('close', { code });
    });
    launcher.on('error', (e) => onEvent('error', { msg: String(e && e.message || e).slice(0, 500) }));

    onEvent('progress', { type: 'launch', task: 0, total: 1 });
    const proc = await launcher.launch(launchOpts);
    running = proc;
    launching = false;

    if (!proc) {
      return { ok: false, error: 'Launcher nie zwrócił procesu. Sprawdź logi debug w konsoli.' };
    }
    onEvent('started', { pid: proc.pid });
    return { ok: true, mode: cheats ? 'cheat-mode' : 'vanilla-mode', root, version, loader, cheats, username: cleanName, pid: proc.pid };
  } catch (e) {
    launching = false;
    return { ok: false, error: 'Start nieudany: ' + String(e && e.message || e).slice(0, 500) };
  }
}

module.exports = { launchMinecraft, SUPPORTED };
