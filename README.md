# Aiki browser extension

## Reproducible build instructions (reviewer notes)

This section describes how to build an exact local copy of the extension source into the unpacked add-on output in `public/`.

### 0) Start from an exact source revision

```bash
git clone <repo-url>
cd Aiki3
git checkout <commit-sha>
git status --short
```

Expected result: no output from `git status --short` (clean working tree).

### 1) Operating system and build environment requirements

- macOS, Linux, or Windows (PowerShell / CMD).
- Git CLI.
- Node.js (required: `>=20`, validated: `22.19.0`).
- npm (required: `>=10`, validated: `10.9.3`).
- Internet access for dependency installation (`npm ci`).

### 2) Install required programs

#### Option A: macOS/Linux (recommended with `nvm`)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# Restart terminal, then:
nvm install 22.19.0
nvm use 22.19.0
node -v
npm -v
```

#### Option B: Windows (`nvm-windows`)

```powershell
winget install CoreyButler.NVMforWindows
nvm install 22.19.0
nvm use 22.19.0
node -v
npm -v
```

If npm is not `10.x`, update it:

```bash
npm install -g npm@10.9.3
```

### 3) Build script (automates all technical steps)

The project includes one script that performs a full reproducible build:

```bash
npm run build:addon -- chrome
```

or

```bash
npm run build:addon -- firefox
```

The script executes:

1. `npm ci` (clean dependency install from `package-lock.json`)
2. `node scripts/generateBack4AppConfig.js`
3. `node scripts/buildChrome.js` for Chrome or `node scripts/buildFirefox.js` for Firefox
4. `rollup -c` compilation (`npm exec -- rollup -c`)

If dependencies are already installed and network access is unavailable, you can skip the install step:

```bash
npm run build:addon -- chrome --skip-install
```

Output files are generated in:

- `public/build/`
- `public/manifest.json` (target-specific)

### 4) Step-by-step manual build (equivalent to the script)

For Chrome:

```bash
npm ci
node scripts/generateBack4AppConfig.js
node scripts/buildChrome.js
npm exec -- rollup -c
```

For Firefox:

```bash
npm ci
node scripts/generateBack4AppConfig.js
node scripts/buildFirefox.js
npm exec -- rollup -c
```

### 5) Load unpacked extension after build

Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select the `public/` folder

Firefox:

1. Open `about:debugging`
2. Click This Firefox
3. Click Load Temporary Add-on
4. Select any file inside `public/` (for example, `manifest.json`)
