/**
 * Build script for Chrome
 * Restores the Chrome-specific manifest to public/manifest.json
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const chromeManifest = path.join(publicDir, 'manifest.chrome.json');
const targetManifest = path.join(publicDir, 'manifest.json');
const version = require('../package.json').version;

if (fs.existsSync(chromeManifest)) {
  fs.copyFileSync(chromeManifest, targetManifest);
  console.log('✓ Restored Chrome manifest to manifest.json');
} else {
  console.log('✓ Chrome manifest already in place');
}

const manifest = JSON.parse(fs.readFileSync(targetManifest, 'utf8'));
manifest.version = version;

fs.writeFileSync(targetManifest, JSON.stringify(manifest, null, 2));

console.log(`✓ Injected version ${version}`);
console.log('✓ Ready for Chrome build');
