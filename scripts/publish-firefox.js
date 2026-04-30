require('dotenv').config();
const { execFileSync } = require('child_process');

const apiKey = (process.env.AMO_API_KEY || '').trim();
const apiSecret = (process.env.AMO_API_SECRET || '').trim();

if (!apiKey || !apiSecret) {
  console.error('Missing AMO_API_KEY or AMO_API_SECRET');
  process.exit(1);
}

execFileSync(
  'web-ext',
  [
    'sign',
    '--source-dir=public',
    `--api-key=${apiKey}`,
    `--api-secret=${apiSecret}`,
    '--channel=listed',
    '--upload-source-code=web-ext-artifacts/aiki3-sources.zip',
    '--approval-timeout=0',
  ],
  { stdio: 'inherit' },
);
