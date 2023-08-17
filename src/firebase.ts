import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyBqC1omTTcx6h8Aar92dOCBKyJ-9vEaESo',
  authDomain: 'festival-frenzy-online.firebaseapp.com',
  projectId: 'festival-frenzy-online',
  storageBucket: 'festival-frenzy-online.appspot.com',
  messagingSenderId: '272841653575',
  appId: '1:272841653575:web:655c57a56bb03efca22062',
  measurementId: 'G-PGKVJYX8H8',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
// const analytics = getAnalytics(app);
