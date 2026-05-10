const fs = require('node:fs');

const version = require('../package.json').version;
const manifest = JSON.parse(fs.readFileSync('./public/manifest.json', 'utf8'));

const now = Math.floor(Date.now() / 10000);
const base = version.split('.').slice(0, 3).join('.');
manifest.version = `${base}.${now}`;

fs.writeFileSync('./public/manifest.json', JSON.stringify(manifest, null, 2));
console.log(`Bumped dev version to ${manifest.version}`);
