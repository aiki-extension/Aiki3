/**
 * Build script for Chrome
 * Restores the Chrome-specific manifest to public/manifest.json
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const chromeManifest = path.join(publicDir, 'manifest.chrome.json');
const targetManifest = path.join(publicDir, 'manifest.json');

// Restore Chrome manifest if backup exists
if (fs.existsSync(chromeManifest)) {
    fs.copyFileSync(chromeManifest, targetManifest);
    console.log('✓ Restored Chrome manifest to manifest.json');
} else {
    // No backup exists, assume current manifest.json is already Chrome
    console.log('✓ Chrome manifest already in place');
}

console.log('✓ Ready for Chrome build');
