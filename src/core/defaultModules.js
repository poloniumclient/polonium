// Polonium Cheat Client - moduły Ghost/Combat + legit HUD
// UWAGA: używasz na własne ryzyko (ban na serwerach). Konfig zapisywany w electron-store,
// docelowo odczytywany przez Java agenta / Fabric mixin w grze.
module.exports = [
  // COMBAT / GHOST
  { id: 'killaura', name: 'KillAura', category: 'Combat', enabled: false, keybind: 'R', description: 'Auto-atak, tryb Ghost.', settings: { range: 3.2, cps: 12, mode: 'Ghost', target: 'Players' } },
  { id: 'aimassist', name: 'AimAssist', category: 'Combat', enabled: false, description: 'Delikatna pomoc celowania.', settings: { speed: 45, fov: 90, distance: 4.5 } },
  { id: 'reach', name: 'Reach', category: 'Combat', enabled: false, description: 'Zwiększony zasięg.', settings: { range: 3.4 } },
  { id: 'velocity', name: 'Velocity', category: 'Combat', enabled: false, description: 'Redukcja odrzutu.', settings: { horizontal: 90, vertical: 100, mode: 'Ghost' } },
  { id: 'antibot', name: 'AntiBot', category: 'Combat', enabled: true, description: 'Filtrowanie botów.' },
  { id: 'autoclicker', name: 'AutoClicker', category: 'Combat', enabled: false, keybind: 'F', description: 'Klikacz z randomizacją.', settings: { minCps: 9, maxCps: 14 } },
  { id: 'w-tap', name: 'W-Tap / S-Tap', category: 'Combat', enabled: false, description: 'Auto reset sprintu do combo.' },

  // MOVEMENT
  { id: 'sprint', name: 'Sprint', category: 'Movement', enabled: true, keybind: 'RControl', description: 'Stały sprint.' },
  { id: 'fly', name: 'Fly (Ghost)', category: 'Movement', enabled: false, description: 'Latanie, tylko single/test.', settings: { speed: 1.0 } },
  { id: 'speed', name: 'Speed', category: 'Movement', enabled: false, description: 'BunnyHop / strafe.', settings: { mode: 'Hypixel' } },
  { id: 'nofall', name: 'NoFall', category: 'Movement', enabled: false, description: 'Brak fall damage.' },
  { id: 'scaffold', name: 'Scaffold', category: 'Movement', enabled: false, description: 'Auto-stawianie bloków.', settings: { delay: 120 } },

  // RENDER / HUD
  { id: 'esp', name: 'ESP', category: 'Render', enabled: false, description: 'Boxy przez ściany.', settings: { mode: 'Box', chams: false } },
  { id: 'fullbright', name: 'FullBright', category: 'Render', enabled: false, description: 'Jasność.' },
  { id: 'zoom', name: 'Zoom', category: 'Render', enabled: true, keybind: 'C', description: 'Optyka.' },
  { id: 'fps-hud', name: 'FPS HUD', category: 'HUD', enabled: true, description: 'FPS.' },
  { id: 'cps-hud', name: 'CPS HUD', category: 'HUD', enabled: true, description: 'CPS.' },
  { id: 'keystrokes', name: 'Keystrokes', category: 'HUD', enabled: true, description: 'Klawisze.' },
  { id: 'armor-hud', name: 'Armor HUD', category: 'HUD', enabled: true, description: 'Zbroja.' },
  { id: 'arraylist', name: 'ArrayList', category: 'HUD', enabled: true, description: 'Lista modułów.' }
];
