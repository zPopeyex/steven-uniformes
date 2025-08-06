// 📄 src/firebase/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Simple validation to help developers identify missing configuration values.
// An invalid or missing API key results in a 400 response from Firebase.
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.warn(
      `Firebase configuration for ${key} is missing. Check your environment variables.`,
    );
  }
});

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

export { db, getAuth, GoogleAuthProvider, signInWithPopup };
