import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBs2RPc-Vr7tETmkta5xXt6YDs70JnutxI",
  authDomain: "kemalogretmen-2c986.firebaseapp.com",
  projectId: "kemalogretmen-2c986",
  storageBucket: "kemalogretmen-2c986.appspot.com",
  messagingSenderId: "173884912762",
  appId: "1:173884912762:web:c4532171c73aed0e1f77c3",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

