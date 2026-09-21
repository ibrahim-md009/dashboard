// ====== إعدادات Firebase و Cloudinary ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5XysGYa8_6Z_pZVCbwWKylWTqpSgSy44",
  authDomain: "photography-studio-ae81a.firebaseapp.com",
  projectId: "photography-studio-ae81a",
  storageBucket: "photography-studio-ae81a.firebasestorage.app",
  messagingSenderId: "1011841824778",
  appId: "1:1011841824778:web:6d6e8fbb2971dc47cc07f3",
};

export const CLOUD_NAME = "f3hoxqbd";
export const UPLOAD_PRESET = "studio_upload";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
