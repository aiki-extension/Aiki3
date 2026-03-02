require('dotenv').config();
const { execSync } = require('child_process');

execSync(
  `web-ext sign --source-dir=public --api-key=${process.env.AMO_API_KEY} --api-secret=${process.env.AMO_API_SECRET} --channel=unlisted`,
  { stdio: 'inherit' }
);