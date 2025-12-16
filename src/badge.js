// Badge renderer: keeps the Aiki logo visible and overlays a green progress strip.

const actionApi = typeof chrome !== "undefined" && (chrome.action || chrome.browserAction);
const ICON_SIZES = [32, 48, 64, 96, 128];
const MAX_ICON_DIMENSION = 128;
const BASE_ICON_PATH = (typeof chrome !== "undefined" && chrome.runtime?.getURL)
  ? chrome.runtime.getURL("images/AikiLogo.png")
  : "images/AikiLogo.png";

const STRIP_BACKGROUND = "rgba(15,23,42,0.65)";
const STRIP_FILL_BACKGROUND = "rgba(255,255,255,0.08)";
const PROGRESS_COLOR = "rgb(34, 197, 94)";
const BADGE_RGBA = [34, 197, 94, 255]; // fallback badge color when text is shown

let lastLabel = "--";
let lastPercent = 0;
let baseIconBitmapPromise = null;

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function createSurface(size) {
  const pixelRatio = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
  const scale = Math.min(pixelRatio || 1, MAX_ICON_DIMENSION / size);
  const width = Math.round(size * scale);
  const CanvasCtor = typeof OffscreenCanvas !== "undefined" ? OffscreenCanvas : null;
  let canvas = CanvasCtor ? new CanvasCtor(width, width) : null;

  if (!canvas && typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = width;
  }

  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (scale) ctx.scale(scale, scale);
  return { ctx, pixelSize: width };
}

async function loadBaseIcon() {
  if (baseIconBitmapPromise) return baseIconBitmapPromise;
  baseIconBitmapPromise = (async () => {
    try {
      const response = await fetch(BASE_ICON_PATH);
      const blob = await response.blob();
      if (typeof createImageBitmap === "function") {
        return await createImageBitmap(blob);
      }
      if (typeof Image !== "undefined") {
        return await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        });
      }
    } catch (_) {}
    return null;
  })();
  return baseIconBitmapPromise;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawOverlay(ctx, size, label, percent) {
  const clamped = clamp01(percent);
  const stripHeight = Math.max(8, size * 0.32);
  const stripInset = size * 0.06;
  const stripWidth = size - stripInset * 2;
  const stripY = size - stripHeight - stripInset * 0.1;

  ctx.fillStyle = STRIP_BACKGROUND;
  roundRect(ctx, stripInset, stripY, stripWidth, stripHeight, stripHeight / 2);
  ctx.fill();

  const barWidth = Math.max(stripHeight * 0.4, stripWidth * clamped);
  if (barWidth > 0) {
    const barRadius = stripHeight / 2;
    ctx.fillStyle = STRIP_FILL_BACKGROUND;
    roundRect(ctx, stripInset, stripY, barWidth, stripHeight, barRadius);
    ctx.fill();

    ctx.fillStyle = PROGRESS_COLOR;
    roundRect(ctx, stripInset, stripY, barWidth, stripHeight, barRadius);
    ctx.fill();
  }

  const fontSize = Math.max(14, size * 0.5);
  ctx.font = `600 ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const textY = size / 2 - stripHeight * 0.3;

  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 3;
  ctx.fillText(label, size / 2, textY);
  ctx.shadowBlur = 0;
}

function setBadgeText(text) {
  actionApi?.setBadgeBackgroundColor?.({ color: BADGE_RGBA });
  actionApi?.setBadgeText?.({ text });
}

async function renderIcon(label, percent) {
  if (!actionApi || !actionApi.setIcon) {
    setBadgeText(label);
    return;
  }

  const baseBitmap = await loadBaseIcon();
  if (!baseBitmap) {
    setBadgeText(label);
    return;
  }

  const imageDataMap = {};
  for (const size of ICON_SIZES) {
    const surface = createSurface(size);
    if (!surface) {
      setBadgeText(label);
      return;
    }
    const { ctx, pixelSize } = surface;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(baseBitmap, 0, 0, size, size);
    ctx.restore();

    drawOverlay(ctx, size, label, percent);
    try {
      imageDataMap[pixelSize] = ctx.getImageData(0, 0, pixelSize, pixelSize);
    } catch (_) {
      setBadgeText(label);
      return;
    }
  }

  try {
    actionApi.setIcon({ imageData: imageDataMap });
  } catch (_) {
    setBadgeText(label);
  }
}

function setProgress(label, percent = 0) {
  lastLabel = String(label ?? "");
  const normalized = Number.isFinite(percent) ? clamp01(percent) : 0;
  lastPercent = normalized;
  renderIcon(lastLabel, normalized).catch(() => {
    setBadgeText(lastLabel);
  });
}

function setBusy(totalMillis = 0, remainingMillis = 0) {
  const percent = totalMillis > 0
    ? 1 - remainingMillis / totalMillis
    : lastPercent;
  setProgress(lastLabel || "--", percent);
}

function remove() {
  lastLabel = "--";
  lastPercent = 0;
  if (actionApi && actionApi.setIcon) {
    try {
      actionApi.setIcon({ imageData: {} });
    } catch (_) {}
  }
  setBadgeText("");
}

export default {
  setProgress,
  setBusy,
  remove,
};
