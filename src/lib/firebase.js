import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDEosYaowRL6_TRGs5lz3kkjM4sNYrhogg",
  authDomain: "fast-orcamento.firebaseapp.com",
  projectId: "fast-orcamento",
  storageBucket: "fast-orcamento.firebasestorage.app",
  messagingSenderId: "502921268112",
  appId: "1:502921268112:web:a7a831094c42f770680115"
};

// Garante que o Firebase não seja inicializado em duplicado no Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
