const fs = require('fs');
const path = require('path');
const os = require('os');

function modsDir() {
  const d = path.join(os.homedir(), '.polonium', 'mods');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function listMods() {
  const dir = modsDir();
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  return { dir, files: files.filter(f => f.endsWith('.jar')) };
}

module.exports = { modsDir, listMods };
