/**
 * Build script for Firefox
 * Copies the Firefox-specific manifest to public/manifest.json
 */
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const firefoxManifest = path.join(publicDir, 'manifest.firefox.json');
const targetManifest = path.join(publicDir, 'manifest.json');
const chromeManifest = path.join(publicDir, 'manifest.chrome.json');
const version = require('../package.json').version;

if (!fs.existsSync(chromeManifest)) {
  if (fs.existsSync(targetManifest)) {
    fs.copyFileSync(targetManifest, chromeManifest);
    console.log('✓ Backed up Chrome manifest to manifest.chrome.json');
  }
}

if (fs.existsSync(firefoxManifest)) {
  fs.copyFileSync(firefoxManifest, targetManifest);
  console.log('✓ Copied Firefox manifest to manifest.json');
} else {
  console.error('✗ Firefox manifest not found:', firefoxManifest);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(targetManifest, 'utf8'));
manifest.version = version;

fs.writeFileSync(targetManifest, JSON.stringify(manifest, null, 2));

console.log(`✓ Injected version ${version}`);
console.log('✓ Ready for Firefox build');
