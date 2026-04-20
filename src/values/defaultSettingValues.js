// These consts are used as fallback values
// if user does not have any values in local storage
// e.g first time usage or backend is down.

// Combines to e.g. 21:30
export const ACTIVE_TIME_TO_HOURS = 21;
export const ACTIVE_TIME_TO_MINUTES = 30;
// Combines to e.g. 08:00
export const ACTIVE_TIME_FROM_HOURS = 8;
export const ACTIVE_TIME_FROM_MINUTES = 0;

export const MIN_LEARNING_MINUTES = 30;
export const REWARD_TIME_MINUTES = 2;
export const SESSION_TIME_MINUTES = 5;

export const PROMPT_SUPPRESS_DURATION = 10 * 60 * 1000; // 10 minutes - global cooldown across all tabs
