import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Replace these values with your Firebase project config
// Firebase Console → Project Settings → Your apps → SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_YkpHuv-yhGkJEgen_cGiMYY2oIwy3Uo",
  authDomain: "migraine-a7e75.firebaseapp.com",
  projectId: "migraine-a7e75",
  storageBucket: "migraine-a7e75.firebasestorage.app",
  messagingSenderId: "1080343115807",
  appId: "1:1080343115807:web:a62b15e4e6b54b8383fd2a",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
