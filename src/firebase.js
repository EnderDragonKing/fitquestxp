import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgy40eR4tDohk-Qpau54xoiA_NUa9DCyo",
  authDomain: "fitquest-xp.firebaseapp.com",
  projectId: "fitquest-xp",
  storageBucket: "fitquest-xp.firebasestorage.app",
  messagingSenderId: "989993081805",
  appId: "1:989993081805:web:45b96956a5c8a5f7f78284"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);