// Use compat API for broad compatibility with existing code
let enabled = false;
let firebase = null;
let db = null;
import { hash } from "./security";

// If you want to enable logging, create a config and set the values below
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
};

function hasConfig(cfg) {
  return (
    typeof cfg === "object" &&
    cfg &&
    typeof cfg.apiKey === "string" && cfg.apiKey !== "" &&
    typeof cfg.projectId === "string" && cfg.projectId !== ""
  );
}

try {
  if (hasConfig(firebaseConfig) && (typeof navigator === "undefined" || navigator.onLine !== false)) {
    // Lazy require to avoid bundling when disabled
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    firebase = require("firebase/compat/app");
    require("firebase/compat/firestore");
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    try {
      // Improve compatibility in service workers by avoiding WebChannel
      db.settings({ experimentalForceLongPolling: true, useFetchStreams: false });
    } catch (_) {}
    enabled = true;
  }
} catch (e) {
  enabled = false;
}

/**
 * @async
 * @function
 * @param {DocumentReference} ref A reference to a firestore document
 * @description Checks if referenced document has a field. If not, it creates a field (active = true).
 * This serves the purpose of later being able to get a list of all documents in a collection.
 * If a document does not contain a field, it is not seen as a document by firestore, even if it contains a subcollection.
 */
async function resolveDoc(ref) {
  const res = await ref.get();
  const active = res.data();
  if (!active) {
    const res = await ref.set({ active: true }, { merge: true });
  }
}

/**
 * @async
 * @function
 * @param {object} entry The data to be stored in firestore.
 * @param {DocumentReference} reference A reference to the nested document which should contain the entry.
 * @param {string} type Type of entry choosing from "config" | "session" | "redirection"
 * @description Takes a document reference and adds the entry as a document within a collection specified by type.
 */
async function addEntry(entry, reference, type) {
  const entryRes = await reference
    .collection(type + "_logs")
    .doc("" + entry.date.timestamp)
    .set(entry, { merge: true });
}

/**
 * @async
 * @function
 * @param {object} entry
 * @param {string} type
 * @description Top level function to add log entries to firestore.
 * Takes entry object and type of entry and resolves each level of firestore document/collection used.
 * Finally adds entry at appropriate log type within the appropriate date collection.
 */
async function addLog(entry, type) {
  if (!enabled || !db) return; // Firebase disabled or offline; skip logging
  try {
    entry.user = `${hash(entry.user)}`;
    const userRef = db.collection("user_logs").doc(entry.user);
    await resolveDoc(userRef);
    const dateRef = userRef.collection("dates").doc(entry.date.dateString);
    await resolveDoc(dateRef);
    await addEntry(entry, dateRef, type);
  } catch (_) {
    // Swallow errors; run offline without affecting UX
  }
}

export default {
  addLog,
};
