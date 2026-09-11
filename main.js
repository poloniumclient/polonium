const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let launcherWin = null;
let clickGuiWin = null;
let store = null;
let storeInitPromise = null;

async function getStore() {
  if (store) return store;
  if (!storeInitPromise) {
    storeInitPromise = (async () => {
      try {
        const { default: Store } = await import('electron-store');
        store = new Store({ name: 'polonium-config' });
      } catch (e) {
        console.warn('electron-store niedostepny, fallback JSON', e.message);
        const fallbackPath = path.join(app.getPath('userData'), 'polonium-config-fallback.json');
        store = {
          _f: fallbackPath,
          _read() { try { return JSON.parse(fs.readFileSync(this._f, 'utf8')); } catch { return {}; } },
          _write(d) { try { fs.mkdirSync(path.dirname(this._f), { recursive: true }); fs.writeFileSync(this._f, JSON.stringify(d, null, 2)); } catch {} },
          get(k, def) { const d = this._read(); return d[k] !== undefined ? d[k] : def; },
          set(k, v) { const d = this._read(); d[k] = v; this._write(d); }
        };
      }
      if (!store.get('modules')) {
        store.set('modules', require('./src/core/defaultModules.js'));
      } else {
        // Migracja: stary config miał tylko legit mody, nowy to cheat client
        try {
          const cur = store.get('modules', []);
          const hasCombat = cur.some(m => m.category === 'Combat');
          if (!hasCombat) {
            store.set('modules', require('./src/core/defaultModules.js'));
            console.log('Polonium: zmigrowano moduły do cheat client');
          }
        } catch {}
      }
      return store;
    })();
  }
  return storeInitPromise;
}

// IPC rejestrujemy OD RAZU na top-level, żeby nigdy nie było "No handler registered"
ipcMain.handle('polonium:get-config', async () => {
  const st = await getStore();
  return {
    modules: st.get('modules', []),
    settings: st.get('settings', { version: '1.21', ram: 4096, username: 'PoloniumUser' }),
    mods: st.get('mods', [])
  };
});

ipcMain.handle('polonium:get-versions', async () => {
  const { SUPPORTED } = require('./src/core/versionManager.js');
  const st = await getStore();
  return {
    versions: SUPPORTED,
    selected: st.get('settings', {}).version || '1.21'
  };
});

ipcMain.handle('polonium:save-module', async (_e, mod) => {
  const st = await getStore();
  const mods = st.get('modules', []);
  const i = mods.findIndex(m => m.id === mod.id);
  if (i >= 0) mods[i] = mod; else mods.push(mod);
  st.set('modules', mods);
  try { if (clickGuiWin && !clickGuiWin.isDestroyed()) clickGuiWin.webContents.send('polonium:modules-updated', mods); } catch {}
  try { if (launcherWin && !launcherWin.isDestroyed()) launcherWin.webContents.send('polonium:modules-updated', mods); } catch {}
  return true;
});

ipcMain.handle('polonium:save-settings', async (_e, settings) => {
  const st = await getStore();
  st.set('settings', settings);
  return true;
});

ipcMain.handle('polonium:toggle-clickgui', async () => {
  toggleClickGUI();
  return clickGuiWin ? clickGuiWin.isVisible() : false;
});

ipcMain.handle('polonium:launch-mc', async (e, opts) => {
  const { launchMinecraft } = require('./src/core/versionManager.js');
  const st = await getStore();
  const settings = st.get('settings', {});
  const sender = e.sender;
  const emit = (type, data) => {
    try { sender.send('polonium:launch-progress', { type, data }); } catch {}
  };
  return await launchMinecraft({ ...settings, ...opts }, emit);
});

ipcMain.handle('polonium:window', async (_e, action) => {
  if (!launcherWin || launcherWin.isDestroyed()) return false;
  try {
    if (action === 'min') launcherWin.minimize();
    else if (action === 'max') { launcherWin.isMaximized() ? launcherWin.unmaximize() : launcherWin.maximize(); }
    else if (action === 'close') launcherWin.close();
    return true;
  } catch { return false; }
});

ipcMain.handle('polonium:list-mods', async () => {
  const { listMods } = require('./src/core/modManager.js');
  return listMods();
});

function createLauncher() {
  launcherWin = new BrowserWindow({
    width: 940,
    height: 640,
    minWidth: 820,
    minHeight: 560,
    title: 'Polonium',
    backgroundColor: '#0c0c0e',
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  try { launcherWin.setMenu(null); } catch {}
  launcherWin.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  // Prawy Control wykrywany gdy launcher ma focus (poprawny sposób w Electron)
  launcherWin.webContents.on('before-input-event', (event, input) => {
    if (input.code === 'ControlRight' && input.type === 'keyDown') {
      toggleClickGUI();
    }
  });
}

function createClickGUI() {
  clickGuiWin = new BrowserWindow({
    width: 920,
    height: 620,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  clickGuiWin.loadFile(path.join(__dirname, 'src', 'renderer', 'clickgui.html'));
  clickGuiWin.setAlwaysOnTop(true, 'screen-saver');
  try { clickGuiWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch {}

  clickGuiWin.webContents.on('before-input-event', (event, input) => {
    if (input.code === 'ControlRight' && input.type === 'keyDown') {
      toggleClickGUI();
    }
    if (input.key === 'Escape' && input.type === 'keyDown') {
      clickGuiWin.hide();
    }
  });
}

function toggleClickGUI() {
  if (!clickGuiWin || clickGuiWin.isDestroyed()) return false;
  try {
    if (clickGuiWin.isVisible()) {
      clickGuiWin.hide();
    } else {
      clickGuiWin.center();
      clickGuiWin.show();
      clickGuiWin.focus();
    }
    if (launcherWin && !launcherWin.isDestroyed()) {
      launcherWin.webContents.send('polonium:clickgui-toggled', clickGuiWin.isVisible());
    }
    return clickGuiWin.isVisible();
  } catch (e) {
    console.error('toggleClickGUI fail', e.message);
    return false;
  }
}

app.whenReady().then(async () => {
  await getStore();
  createLauncher();
  createClickGUI();

  // UWAGA: Electron NIE wspiera 'ControlRight' jako acceleratora - stad byl crash.
  // RCTRL dziala przez before-input-event + keydown w WebView (e.code === 'ControlRight').
  // Globalnie (gdy focus poza launcherem) uzywamy bezpiecznych skrotow:
  try {
    globalShortcut.register('CommandOrControl+Shift+P', toggleClickGUI);
    globalShortcut.register('F8', toggleClickGUI);
    globalShortcut.register('Insert', toggleClickGUI);
  } catch (e) {
    console.error('globalShortcut fail', e.message);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createLauncher();
      createClickGUI();
    }
  });
});

app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch {} });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
