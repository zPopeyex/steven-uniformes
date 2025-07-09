// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDV0qCWVny7yZhc-jHoT1zJUIGi4ian3UI",
  authDomain: "steven-uniformes.firebaseapp.com",
  projectId: "steven-uniformes",
  storageBucket: "steven-uniformes.firebasestorage.app",
  messagingSenderId: "729409493250",
  appId: "1:729409493250:web:69013722c6aada2b66ca1b"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
