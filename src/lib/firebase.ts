import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDQpQA5eiW8aHgl6P-s1JNnhQRaX_tpnD0",
  authDomain: "flashmydeal.firebaseapp.com",
  projectId: "flashmydeal",
  storageBucket: "flashmydeal.firebasestorage.app",
  messagingSenderId: "239151602196",
  appId: "1:239151602196:web:83804b1242027c5a566501",
  measurementId: "G-JDP6ZGWGNL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut, 
  onAuthStateChanged,
  updateProfile
};
export type { User };
