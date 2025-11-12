// Use compat API for broad compatibility with existing code
let enabled = false;
let firebase = null;
let db = null;
import { hash } from "./security";

// If you want to enable logging, create a config and set the values below
const firebaseConfig = {
  apiKey: "AIzaSyBi5aVAsIyr97vDlddg-PJ5YP5xlcf0q7w",
  authDomain: "aiki-ecf9c.firebaseapp.com",
  databaseURL: "https://aiki-ecf9c.firebaseio.com",
  projectId: "aiki-ecf9c",
  storageBucket: "aiki-ecf9c.firebasestorage.app",
  messagingSenderId: "435184665385",
  appId: "1:435184665385:web:71746ce5c75d20d42c6d38"
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
  console.log("trying to connect to the db")
  if (hasConfig(firebaseConfig) && (typeof navigator === "undefined" || navigator.onLine !== false)) {
    console.log("inside has config");
    // Lazy require to avoid bundling when disabled
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    firebase = require("firebase/compat/app");
    require("firebase/compat/firestore");
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    try {
      // Improve compatibility in service workers by avoiding WebChannel
      db.settings({ experimentalForceLongPolling: true, useFetchStreams: false });
    } catch (e) {
      console.dir(e);
    }
    enabled = true;
  }
} catch (e) {

  console.dir(e);

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
  console.log("sending info... from add Entry")
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
  console.log("add entry....");
  console.log(enabled);
  console.log(db);

  if (!enabled || !db) return; // Firebase disabled or offline; skip logging
  console.log("firebase not disabled or offline.");
  try {
    entry.user = `${hash(entry.user)}`;
    console.log(entry.user);
    const userRef = db.collection("user_logs").doc(entry.user);
    console.log(userRef);
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
