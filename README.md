<h1><img src="public/images/AikiLogo.svg" alt="Aiki Logo" height="36" valign="lower" /> Aiki³</h1>
 
> A browser extension that helps you stay focused by blocking distracting websites and redirecting you back to what actually matters.
 
Aiki³ is the third generation of our focus tool. It sits quietly in your browser, intercepts visits to time-wasting sites, and gives you a structured way to earn your breaks, so you stay in deep work mode without feeling like you're constantly fighting yourself.
 
---
 
## Quick Install (No Build Required)
 
If you just want to try it out, grab the latest release from the [Releases page](https://github.com/aiki-extension/Aiki3/releases).
 
### Firefox - `.xpi` file
 
1. Download `aiki3-firefox.xpi` from the latest release
2. Open Firefox and go to `about:addons`
3. Click the gear icon ⚙️ → **Install Add-on From File...**
4. Select the downloaded `.xpi` file - done
### Chrome - `.zip` file
 
1. Download `aiki3-chrome.zip` from the latest release and unzip it
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the unzipped folder - done
> **Note:** Chrome requires Developer mode to be on for manually loaded extensions. This is normal for extensions not distributed through the Chrome Web Store.
 
---
 
## Building Locally
 
If you'd rather build from source (or you're contributing), here's how to get set up.
 
### Prerequisites
 
- [Node.js](https://nodejs.org) v18 or higher
- npm (comes bundled with Node.js)
- The [Aiki³ Backend](https://github.com/aiki-extension/Aiki3-Backend) running locally - follow the setup guide in that repo
### Setup
 
```bash
# Clone the repository
git clone https://github.com/aiki-extension/Aiki3.git
cd Aiki3
 
# Install dependencies
npm install
```
 
### Build for Chrome
 
```bash
npm run build:chrome
```
 
Then load the extension:
 
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `public` folder
### Build for Firefox
 
```bash
npm run build:firefox
```
 
Then load the extension:
 
1. Go to `about:debugging`
2. Click **This Firefox**
3. Click **Load Temporary Add-on**
4. Select any file inside the `public` folder (e.g. `manifest.json`)
---
 
## Development
 
Want to work on the extension with live reloading?
 
```bash
# Chrome (watches for file changes)
npm run dev:chrome
 
# Firefox
npm run dev:firefox
```
 
Other useful commands:
 
```bash
npm run lint      # Run ESLint
npm run format    # Auto-format with Prettier
```
 
---
 
## Tech Stack
 
- **[Svelte](https://svelte.dev/)** - UI components
- **[Rollup](https://rollupjs.org/)** - bundler
- **[webextension-polyfill](https://github.com/mozilla/webextension-polyfill)** - cross-browser compatibility
- **Manifest V3** - for both Chrome and Firefox
---
 
## Project Structure
 
```
Aiki3/
├── public/              # Static assets and manifests (the built extension lives here)
│   ├── manifest.json
│   ├── manifest.chrome.json
│   └── manifest.firefox.json
├── src/                 # Source code
│   ├── background.js    # Service worker / background script
│   ├── Pages/           # Svelte page components (popup, settings, etc.)
│   ├── handlers/        # Message and port handlers
│   ├── services/        # Business logic (setup, redirection, etc.)
│   └── util/            # Shared utilities (storage, themes, etc.)
├── scripts/             # Build and signing scripts
└── docs/                # Developer documentation
```
 
---
 
## Contributing
 
This is an open student project - contributions and feedback are welcome. If you spot a bug or have a suggestion, feel free to open an issue or a pull request.
 
Before submitting a PR, make sure lint and formatting checks pass:
 
```bash
npm run lint
npm run format
```
 
Pull requests targeting `main` will automatically run the linter via GitHub Actions.
 
---
