/**
 * Inline style constants for content-script overlays.
 *
 * These are inlined per-element (rather than injected as a stylesheet) so
 * host-page CSS can never override them — content scripts share the host's
 * document, so any class-based approach risks collisions.
 */
export const STYLES = {
  fontBase: `font-family: 'Inter','Segoe UI',sans-serif; font-size: 14px;`,

  overlayBlocking: `all: initial; position: fixed; inset: 0; background: rgba(3, 7, 18, 0.98); display: flex; align-items: center; justify-content: center; z-index: 2147483646;`,
  overlayTransparent: `all: initial; position: fixed; inset: 0; pointer-events: none; background: transparent; display: flex;`,

  cardLight: `background: #ffffff; color: #0f172a; border-radius: 18px; box-shadow: 0 28px 55px rgba(15, 23, 42, 0.35); display: flex; flex-direction: column;`,
  cardDark: `background: rgba(15, 23, 42, 0.98); color: #f8fafc; border-radius: 22px; box-shadow: 0 32px 70px rgba(15, 23, 42, 0.55); display: flex; flex-direction: column;`,

  btnPrimary: `padding: 10px 14px; border-radius: 999px; border: none; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; font-weight: 600; cursor: pointer; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.28); transition: transform 0.15s ease, box-shadow 0.15s ease;`,
  btnPrimaryHover: `padding: 10px 14px; border-radius: 999px; border: none; background: linear-gradient(135deg, #1d4ed8, #5b21b6); color: #ffffff; font-weight: 600; cursor: pointer; box-shadow: 0 12px 24px rgba(29, 78, 216, 0.32); transform: translateY(-1px);`,
  btnSecondary: `padding: 10px 14px; border-radius: 999px; border: 1px solid #cbd5f5; background: #ffffff; color: #1f2937; font-weight: 600; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;`,
  btnSecondaryHover: `padding: 10px 14px; border-radius: 999px; border: 1px solid #3b82f6; background: #eff6ff; color: #1d4ed8; font-weight: 600; cursor: pointer;`,

  progressShell: `width: 100%; border-radius: 999px; overflow: hidden;`,
  progressFill: `height: 100%; border-radius: inherit; transition: width 0.4s ease;`,
  progressGreen: `background: linear-gradient(135deg, #22c55e, #14b8a6);`,
};

/**
 * Wire mouse/focus state styling on a button. Hover and focus apply
 * `hoverStyle`; mouseleave/blur restore `baseStyle`.
 * @param {HTMLButtonElement} button
 * @param {string} baseStyle
 * @param {string} hoverStyle
 */
export function applyButtonHoverStyles(button, baseStyle, hoverStyle) {
  button.setAttribute('style', baseStyle);
  button.onmouseenter = () => button.setAttribute('style', hoverStyle);
  button.onmouseleave = () => button.setAttribute('style', baseStyle);
  button.onfocus = () => button.setAttribute('style', hoverStyle);
  button.onblur = () => button.setAttribute('style', baseStyle);
}
