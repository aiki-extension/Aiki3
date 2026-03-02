const fs = require('fs');
const manifest = require('../public/manifest.json');
const now = Date.now();
const base = manifest.version.split('.').slice(0, 3).join('.');
manifest.version = `${base}.${now}`;
fs.writeFileSync('./public/manifest.json', JSON.stringify(manifest, null, 2));