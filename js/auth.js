// ====== تسجيل الدخول / الخروج ======
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./config.js";
import { listenCategories } from "./categoriesUI.js";
import { listenWorks } from "./worksUI.js";
import { listenNews } from "./newsUI.js";

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const errorMsg = document.getElementById("error-msg");
const logoutBtn = document.getElementById("logout-btn");

document.getElementById("login-btn").addEventListener("click", async () => {
  errorMsg.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value;
  if (!email || !pass) {
    errorMsg.textContent = "لازم تعبي الإيميل وكلمة المرور";
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    console.error("خطأ تسجيل الدخول:", e.code, e.message);
    const messages = {
      "auth/invalid-email": "صيغة الإيميل غلط (تأكد ما في مسافات أو أخطاء إملائية)",
      "auth/user-not-found": "ما في مستخدم مسجل بهالإيميل — تأكد من Authentication → Users",
      "auth/wrong-password": "كلمة المرور غلط لهالإيميل",
      "auth/invalid-credential": "الإيميل أو كلمة المرور غلط",
      "auth/too-many-requests": "محاولات كتير غلط متتالية — انتظر شوي وجرب تاني",
      "auth/user-disabled": "هالحساب موقوف من Firebase Console",
      "auth/network-request-failed": "مشكلة بالاتصال بالإنترنت",
    };
    errorMsg.textContent = messages[e.code] || `صار خطأ: ${e.code || e.message}`;
  }
});

document.getElementById("login-pass").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.style.display = "none";
    dashboard.style.display = "block";
    logoutBtn.style.display = "inline-block";
    listenCategories();
    listenWorks();
    listenNews();
  } else {
    loginScreen.style.display = "block";
    dashboard.style.display = "none";
    logoutBtn.style.display = "none";
  }
});
