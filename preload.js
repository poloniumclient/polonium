const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('polonium', {
  getConfig: () => ipcRenderer.invoke('polonium:get-config'),
  saveModule: (mod) => ipcRenderer.invoke('polonium:save-module', mod),
  saveSettings: (s) => ipcRenderer.invoke('polonium:save-settings', s),
  toggleClickGUI: () => ipcRenderer.invoke('polonium:toggle-clickgui'),
  launchMC: (opts) => ipcRenderer.invoke('polonium:launch-mc', opts),
  getVersions: () => ipcRenderer.invoke('polonium:get-versions'),
  onLaunchProgress: (cb) => ipcRenderer.on('polonium:launch-progress', (_e, v) => cb(v)),
  listMods: () => ipcRenderer.invoke('polonium:list-mods'),
  win: (action) => ipcRenderer.invoke('polonium:window', action),
  onModulesUpdated: (cb) => ipcRenderer.on('polonium:modules-updated', (_e, v) => cb(v)),
  onClickGuiToggled: (cb) => ipcRenderer.on('polonium:clickgui-toggled', (_e, v) => cb(v))
});
