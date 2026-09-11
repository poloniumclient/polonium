# Polonium Client

Własny MC Client z UI jak Feather, ale inaczej. Wszystko na **WebView (Electron/Chromium)**.

## Funkcje
- Launcher na WebView: `src/renderer/index.html`
- ClickGUI na **prawy Control (RCTRL)**: osobne transparentne okno WebView `clickgui.html`, global shortcut `ControlRight`
- Wiele wersji: 1.8.9, 1.12.2, 1.16.5, 1.20.1, 1.21, 1.21.1 (`src/core/versionManager.js`)
- Mody: folder `~/.polonium/mods` — wrzuć .jar (Fabric/Forge)
- Legit HUD/Render/Movement: ToggleSprint, Zoom, FullBright, FPS/CPS HUD, Keystrokes, Armor HUD itd.
- **Bez ghost-cheatów** (brak KillAura/Reach/AimAssist/Velocity) — celowo, żeby nie niszczyć multiplayer.

## Start
```powershell
npm install
npm start
```
- RCTRL w systemie pokazuje/ukrywa ClickGUI.
- Przycisk "Otwórz ClickGUI" w launcherze robi to samo.
- `Ctrl+Shift+P` to fallback.

## Struktura
- `main.js` — okna + RCTRL shortcut + IPC
- `preload.js` — bridge `window.polonium`
- `src/core/defaultModules.js`, `versionManager.js`, `modManager.js`
- `src/renderer/` — całe UI na WebView
