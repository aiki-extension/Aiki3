// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { hash } from "./security";

// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBi5aVAsIyr97vDlddg-PJ5YP5xlcf0q7w",
  authDomain: "aiki-ecf9c.firebaseapp.com",
  databaseURL: "https://aiki-ecf9c.firebaseio.com",
  projectId: "aiki-ecf9c",
  storageBucket: "aiki-ecf9c.firebasestorage.app",
  messagingSenderId: "435184665385",
  appId: "1:435184665385:web:71746ce5c75d20d42c6d38"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.dir(db);

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
  console.log(db);

  try {
    entry.user = `${hash(entry.user)}`;
    console.log(entry.user);
    const userRef = addDoc(collection(db, "user_logs"),entry)
        .then(docRef => console.log("Success:", docRef.id))
        .catch(error => console.error("ERROR:", error));  // ✅ See the error!

    // await resolveDoc(userRef);
    // const dateRef = collection("dates").addDoc(entry.date.dateString);
    // await resolveDoc(dateRef);
    // await addEntry(entry, dateRef, type);
  } catch (e) {

    console.dir(e);
    console.error(e);
  }
}

export default {
  addLog,
};
