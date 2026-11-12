// Versioning RAVE Desktop — SemVer dari SATU sumber (package.json), disinkronkan ke tauri.conf.json & Cargo.toml
// (nomor versi installer Windows/macOS) + bagian baru di CHANGELOG.md.
//
//   node scripts/bump-version.mjs patch|minor|major      (atau versi eksplisit: node scripts/bump-version.mjs 1.2.3)
//
// Setelahnya: lengkapi CHANGELOG, commit "release: vX.Y.Z", tag `desktop-vX.Y.Z` (workflow build berjalan untuk tag v*).
import { readFileSync, writeFileSync } from 'node:fs';

const arg = process.argv[2];
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const [ma, mi, pa] = pkg.version.split('.').map(Number);
const next =
  arg === 'major' ? `${ma + 1}.0.0` : arg === 'minor' ? `${ma}.${mi + 1}.0` : arg === 'patch' ? `${ma}.${mi}.${pa + 1}` : /^\d+\.\d+\.\d+$/.test(arg ?? '') ? arg : null;
if (!next) {
  console.error('pakai: node scripts/bump-version.mjs patch|minor|major|X.Y.Z');
  process.exit(64);
}
pkg.version = next;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
const conf = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
conf.version = next;
writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(conf, null, 2) + '\n');
const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8').replace(/^version = "[^"]+"/m, `version = "${next}"`);
writeFileSync('src-tauri/Cargo.toml', cargo);
const log = readFileSync('CHANGELOG.md', 'utf8');
const at = log.indexOf('\n## ');
const entry = `\n## [${next}] - ${new Date().toISOString().slice(0, 10)}\n\n### Ditambahkan\n- \n`;
writeFileSync('CHANGELOG.md', at < 0 ? log + entry : log.slice(0, at) + entry + log.slice(at));
console.log(`RAVE Desktop → ${next}. Lengkapi CHANGELOG.md, lalu commit & tag desktop-v${next}.`);
