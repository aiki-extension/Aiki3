# The Aiki browser extension

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) installed

### Build Commands

**For Chrome:**

```bash
npm i
npm run build:chrome
```

**For Firefox:**

```bash
npm i
npm run build:firefox
```

### Loading the Extension

**Chrome:**

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `public` folder

**Firefox:**

1. Go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select any file in the `public` folder (e.g., `manifest.json`)

## Development

**Chrome dev mode:**

```bash
npm run dev:chrome
```

**Firefox dev mode:**

```bash
npm run dev:firefox
```
 