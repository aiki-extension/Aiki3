import storage from '../../util/storage';
import { makeDate } from '../../util/utilities';

/**
 * Whether the current wall-clock time is inside the user's configured
 * operating-hours window (storage.operatingHours.{from,to}). Used by the
 * redirect pipeline to gate any blocking action so the extension stays
 * out of the way outside of focus hours.
 * @returns {Promise<boolean>}
 */
export async function checkActiveTime() {
  const fromTime = await storage.operatingHours.from.get();
  const toTime = await storage.operatingHours.to.get();
  const date = makeDate();
  if (date.hours < fromTime.hrs) return false;
  if (date.hours === fromTime.hrs && date.minutes < fromTime.min) return false;
  if (date.hours > toTime.hrs) return false;
  if (date.hours === toTime.hrs && date.minutes > toTime.min) return false;
  return true;
}
