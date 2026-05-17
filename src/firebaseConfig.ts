import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB19q_p1iOfzkOjDxb7jOI0mEgbzvo6tGw",
  authDomain: "trackergastos-c4934.firebaseapp.com",
  projectId: "trackergastos-c4934",
  storageBucket: "trackergastos-c4934.firebasestorage.app",
  messagingSenderId: "265153204153",
  appId: "1:265153204153:web:4eabbcd5daed97df6af068",
  measurementId: "G-5V4PY9Z6X3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
