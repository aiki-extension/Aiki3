#!/usr/bin/env node
/**
 * Publish aiki to Firefox Add-ons (AMO) listed channel via API v5.
 * Modelled on the Zeeguu publish-firefox.js pattern.
 *
 * Required env:
 *   AMO_API_KEY      — JWT issuer (e.g. user:17388245:343)
 *   AMO_API_SECRET   — JWT secret
 *   FIREFOX_ADDON_ID — addon GUID or slug (e.g. aiki@zeeguu.dev or "aiki")
 *
 * Expects:
 *   web-ext-artifacts/aiki3-firefox.xpi   (built via npm run package:firefox)
 *   web-ext-artifacts/aiki3-sources.zip   (built via npm run package:sources)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const JWT_ISSUER = process.env.AMO_API_KEY;
const JWT_SECRET = process.env.AMO_API_SECRET;
const ADDON_ID = process.env.FIREFOX_ADDON_ID;

if (!JWT_ISSUER || !JWT_SECRET || !ADDON_ID) {
  console.error(
    'Missing env: AMO_API_KEY, AMO_API_SECRET, FIREFOX_ADDON_ID',
  );
  process.exit(1);
}

const xpiPath = path.join(
  __dirname,
  '..',
  'web-ext-artifacts',
  'aiki3-firefox.xpi',
);
const sourcePath = path.join(
  __dirname,
  '..',
  'web-ext-artifacts',
  'aiki3-sources.zip',
);

function createJWT() {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: JWT_ISSUER,
    jti: Math.random().toString(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 5,
  };
  const b64 = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const head = b64(header);
  const body = b64(payload);
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${head}.${body}`)
    .digest('base64url');
  return `${head}.${body}.${sig}`;
}

function buildMultipart(fields) {
  const boundary = '----formdata-' + Math.random().toString(36);
  const parts = [];
  for (const f of fields) {
    parts.push(`--${boundary}\r\n`);
    if (f.filename) {
      parts.push(
        `Content-Disposition: form-data; name="${f.name}"; filename="${f.filename}"\r\n`,
      );
      parts.push(`Content-Type: ${f.contentType}\r\n\r\n`);
      parts.push(f.value);
      parts.push('\r\n');
    } else {
      parts.push(
        `Content-Disposition: form-data; name="${f.name}"\r\n\r\n`,
      );
      parts.push(`${f.value}\r\n`);
    }
  }
  parts.push(`--${boundary}--\r\n`);
  const buffers = parts.map((p) =>
    Buffer.isBuffer(p) ? p : Buffer.from(p, 'utf8'),
  );
  return { boundary, body: Buffer.concat(buffers) };
}

async function uploadFile(jwt) {
  console.log(`Uploading ${xpiPath} (channel=listed)`);
  const xpi = fs.readFileSync(xpiPath);
  const { boundary, body } = buildMultipart([
    {
      name: 'upload',
      filename: 'aiki3-firefox.xpi',
      contentType: 'application/zip',
      value: xpi,
    },
    { name: 'channel', value: 'listed' },
  ]);

  const res = await fetch('https://addons.mozilla.org/api/v5/addons/upload/', {
    method: 'POST',
    headers: {
      Authorization: `JWT ${jwt}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${text}`);
  const { uuid } = JSON.parse(text);
  console.log(`Upload UUID: ${uuid}`);
  return uuid;
}

async function pollValidation(jwt, uuid, maxWaitMs = 120_000) {
  const url = `https://addons.mozilla.org/api/v5/addons/upload/${uuid}/`;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(url, {
      headers: { Authorization: `JWT ${jwt}` },
    });
    if (!res.ok) throw new Error(`Validation poll failed: ${res.status}`);
    const data = await res.json();
    if (data.processed) {
      const errs = data.validation?.errors ?? [];
      const warns = data.validation?.warnings ?? [];
      console.log(
        `Validation done — valid=${data.valid}, errors=${errs.length}, warnings=${warns.length}`,
      );
      if (errs.length) {
        for (const e of errs) console.log('  ERROR:', e.message || e.description);
      }
      if (!data.valid) throw new Error('Validation failed');
      return;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Validation timed out');
}

async function createVersion(jwt, uuid) {
  const url = `https://addons.mozilla.org/api/v5/addons/addon/${ADDON_ID}/versions/`;
  const fields = [{ name: 'upload', value: uuid }];

  if (fs.existsSync(sourcePath)) {
    console.log(`Attaching source code: ${sourcePath}`);
    fields.push({
      name: 'source',
      filename: 'aiki3-sources.zip',
      contentType: 'application/zip',
      value: fs.readFileSync(sourcePath),
    });
  } else {
    console.warn(`No source zip at ${sourcePath} — skipping source attach`);
  }

  const { boundary, body } = buildMultipart(fields);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `JWT ${jwt}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Version create failed (${res.status}): ${text}`);
  const data = JSON.parse(text);
  console.log(`Submitted version ${data.version} (id=${data.id})`);
  console.log(
    `Review URL: https://addons.mozilla.org/developers/addon/${ADDON_ID}/versions/${data.id}/`,
  );
}

(async () => {
  if (!fs.existsSync(xpiPath)) {
    console.error(`Missing ${xpiPath}. Run: npm run package:firefox`);
    process.exit(1);
  }
  const jwt = createJWT();
  const uuid = await uploadFile(jwt);
  await pollValidation(jwt, uuid);
  await createVersion(jwt, uuid);
  console.log('Done — submitted to AMO listed channel for review.');
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
