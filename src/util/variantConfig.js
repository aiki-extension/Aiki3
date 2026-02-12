/**
 * Variant configuration module.
 * Reads the variant from variant.js configuration file.
 */

import { AIKI_VARIANT } from "./variant.js";

let cachedVariant = null;

/**
 * Get the current variant.
 * @returns {string} "controlled" or "experimental"
 */
export function getVariant() {
  if (cachedVariant !== null) {
    return cachedVariant;
  }
  
  cachedVariant = AIKI_VARIANT || "experimental";
  return cachedVariant;
}

/**
 * Check if the current variant is "controlled".
 * @returns {boolean}
 */
export function isControlled() {
  return getVariant() === "controlled";
}

/**
 * Check if the current variant is "experimental".
 * @returns {boolean}
 */
export function isExperimental() {
  return getVariant() === "experimental";
}

/**
 * Reset the cached variant (useful for testing).
 */
export function resetVariantCache() {
  cachedVariant = null;
}

export default {
  getVariant,
  isControlled,
  isExperimental,
  resetVariantCache,
};

