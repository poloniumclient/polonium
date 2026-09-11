// Dodaje build moda do Archive/{mc}/{buildID}/ + przycina do 70 ostatnich.
// Użycie: node scripts/archive-build.js 1.21
// Wymaga: mods/polonium-*.jar (zbudowany), dist/ exe (zbudowany).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const RETENTION = 70;

function sha256(f) {
  return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
}

const mc = process.argv[2];
const lv = process.argv[3] || '0.2.0';
if (!mc) { console.error('użycie: node scripts/archive-build.js <mcVersion> [launcherVersion]'); process.exit(1); }

const modsDir = path.join(ROOT, 'mods');
const safe = mc.replace(/\./g, '_');
const jar = fs.existsSync(modsDir)
  ? fs.readdirSync(modsDir).find(f => new RegExp(`^polonium-${safe}-.*\\.jar$`).test(f) && !f.includes('sources'))
  : null;
if (!jar) { console.error('brak jara moda dla ' + mc + ' w mods/'); process.exit(1); }

const now = new Date();
const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
const dir = path.join(ROOT, 'Archive', mc);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const existing = fs.existsSync(dir) ? fs.readdirSync(dir).filter(d => d.startsWith(stamp)) : [];
const buildId = `${stamp}-${String(existing.length + 1).padStart(2, '0')}`;
const out = path.join(dir, buildId);
fs.mkdirSync(out, { recursive: true });

const jarPath = path.join(modsDir, jar);
const build = {
  mc,
  launcher: lv,
  build: buildId,
  date: now.toISOString().slice(0, 10),
  jar: {
    name: jar,
    size: fs.statSync(jarPath).size,
    sha256: sha256(jarPath),
    url: `https://github.com/poloniumclient/polonium/releases/download/v${lv}/${jar}`
  }
};
fs.writeFileSync(path.join(out, 'build.json'), JSON.stringify(build, null, 2) + '\n');

// index + retencja 70
const builds = fs.readdirSync(dir).filter(d => fs.statSync(path.join(dir, d)).isDirectory()).sort();
while (builds.length > RETENTION) {
  const old = builds.shift();
  fs.rmSync(path.join(dir, old), { recursive: true, force: true });
  console.log('przycięty stary build:', old);
}
const idxPath = path.join(ROOT, 'Archive', 'index.json');
let idx = { mc: {}, retention: RETENTION };
if (fs.existsSync(idxPath)) { try { idx = JSON.parse(fs.readFileSync(idxPath, 'utf8')); } catch {} }
idx.retention = RETENTION;
idx.mc = idx.mc || {};
idx.mc[mc] = { latest: builds[builds.length - 1], builds };
fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2) + '\n');
console.log('archive:', mc + '/' + buildId);
