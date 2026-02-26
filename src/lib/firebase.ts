import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, onValue, set, push, remove, update, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAqYHHGNkEICsrrSfSh-5ruMv9EYBDsU0k",
  authDomain: "societario-audipreve.firebaseapp.com",
  databaseURL: "https://societario-audipreve-default-rtdb.firebaseio.com",
  projectId: "societario-audipreve",
  storageBucket: "societario-audipreve.firebasestorage.app",
  messagingSenderId: "767075495554",
  appId: "1:767075495554:web:2d1ce67b85a1e0c8781f5c",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Helper exports
export { ref, onValue, set, push, remove, update, get };
