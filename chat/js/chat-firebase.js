import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBMQkGSc2RwKjAe7h5EcvWWdoJbS5_JjWs',
  authDomain: 'rabbit-archi2025-c40a6.firebaseapp.com',
  projectId: 'rabbit-archi2025-c40a6',
  storageBucket: 'rabbit-archi2025-c40a6.firebasestorage.app',
  messagingSenderId: '577448559589',
  appId: '1:577448559589:web:5b984b45bff89303dd650c'
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const chatDb = getFirestore(app);
