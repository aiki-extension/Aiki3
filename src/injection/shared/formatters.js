/**
 * Format milliseconds as "Xm Ys" (e.g. "2m 15s").
 * @param {number} value - Milliseconds.
 * @returns {string}
 */
export const formatDuration = (value) => {
  if (typeof value !== 'number' || value <= 0) return '0m 0s';
  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

/**
 * Format milliseconds as a rounded-up minute count (e.g. "3m").
 * @param {number} value - Milliseconds.
 * @returns {string}
 */
export const formatDurationShort = (value) => {
  if (typeof value !== 'number' || value <= 0) return '0m';
  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.ceil(totalSeconds / 60);
  return `${minutes}m`;
};
