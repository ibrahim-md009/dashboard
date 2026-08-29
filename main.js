import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ====== إعدادات Firebase ======
const firebaseConfig = {
  apiKey: "AIzaSyC5XysGYa8_6Z_pZVCbwWKylWTqpSgSy44",
  authDomain: "photography-studio-ae81a.firebaseapp.com",
  projectId: "photography-studio-ae81a",
  storageBucket: "photography-studio-ae81a.firebasestorage.app",
  messagingSenderId: "1011841824778",
  appId: "1:1011841824778:web:02d2bafec695a650cc07f3",
};

// ====== إعدادات Cloudinary ======
const CLOUD_NAME = "f3hoxqbd";
const UPLOAD_PRESET = "studio_upload";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- عناصر الصفحة ----------
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const errorMsg = document.getElementById("error-msg");
const logoutBtn = document.getElementById("logout-btn");

// ---------- تسجيل الدخول / الخروج ----------
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
    errorMsg.textContent = "بيانات الدخول غلط، جرب مرة ثانية";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.style.display = "none";
    dashboard.style.display = "block";
    logoutBtn.style.display = "inline-block";
    loadCategories();
    listenWorks();
    listenNews();
  } else {
    loginScreen.style.display = "block";
    dashboard.style.display = "none";
    logoutBtn.style.display = "none";
  }
});

// ---------- تبديل التبويبات ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
  });
});

// ---------- رفع صورة على Cloudinary ----------
async function uploadToCloudinary(file, statusEl) {
  statusEl.textContent = "جاري رفع الصورة...";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("فشل رفع الصورة");
  const data = await res.json();
  statusEl.textContent = "تم رفع الصورة ✔";
  return data.secure_url;
}

// معاينة الصورة قبل الرفع
function setupPreview(fileInputId, previewId) {
  document.getElementById(fileInputId).addEventListener("change", (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById(previewId);
    if (file) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  });
}
setupPreview("works-file", "works-preview");
setupPreview("news-file", "news-preview");

// ---------- التصنيفات ----------
const categorySelect = document.getElementById("works-category");

function loadCategories() {
  const q = query(collection(db, "categories"), orderBy("name"));
  onSnapshot(
    q,
    (snap) => {
      categorySelect.innerHTML = "";
      if (snap.empty) {
        const opt = document.createElement("option");
        opt.textContent = "أضف تصنيف أولاً";
        opt.disabled = true;
        categorySelect.appendChild(opt);
        return;
      }
      snap.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d.data().name;
        opt.textContent = d.data().name;
        categorySelect.appendChild(opt);
      });
    },
    (err) => {
      console.error("فشل تحميل التصنيفات:", err);
    },
  );
}

document.getElementById("add-category-btn").addEventListener("click", async () => {
  const input = document.getElementById("new-category");
  const btn = document.getElementById("add-category-btn");
  const name = input.value.trim();
  if (!name) return;
  btn.disabled = true;
  try {
    await addDoc(collection(db, "categories"), { name });
    input.value = "";
  } catch (err) {
    console.error("فشل إضافة التصنيف:", err);
    alert("ما قدرنا نضيف التصنيف: " + err.message);
  }
  btn.disabled = false;
});

// ---------- آخر الأعمال: إضافة ----------
document.getElementById("form-works").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("works-submit-btn");
  const fileInput = document.getElementById("works-file");
  const statusEl = document.getElementById("works-upload-status");
  const file = fileInput.files[0];
  if (!file) {
    statusEl.textContent = "الصورة إلزامية";
    return;
  }

  btn.disabled = true;
  btn.textContent = "جاري الإضافة...";
  try {
    const imageUrl = await uploadToCloudinary(file, statusEl);
    await addDoc(collection(db, "works"), {
      img: imageUrl,
      category: categorySelect.value,
      title: document.getElementById("works-main").value.trim(),
      sub: document.getElementById("works-sub").value.trim(),
      createdAt: serverTimestamp(),
    });
    e.target.reset();
    document.getElementById("works-preview").style.display = "none";
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "صار خطأ، جرب مرة ثانية";
  }
  btn.disabled = false;
  btn.textContent = "إضافة العمل";
});

// ---------- آخر الأعمال: عرض وحذف ----------
function listenWorks() {
  const q = query(collection(db, "works"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    const list = document.getElementById("works-list");
    if (snap.empty) {
      list.innerHTML = '<p class="empty-msg">لسا ما في أعمال مضافة</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((d) => {
      const item = d.data();
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <img src="${item.img}" alt="">
        <div class="item-info">
          <span class="tag">${item.category || ""}</span>
          <p class="main">${item.title || ""}</p>
          <p class="sub">${item.sub || ""}</p>
        </div>
        <div class="item-actions">
          <button class="del" data-id="${d.id}">حذف</button>
        </div>`;
      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm("متأكد بدك تحذف هالعنصر؟")) await deleteDoc(doc(db, "works", d.id));
      });
      list.appendChild(row);
    });
  });
}

// ---------- آخر الأخبار: إضافة ----------
document.getElementById("form-news").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("news-submit-btn");
  const fileInput = document.getElementById("news-file");
  const statusEl = document.getElementById("news-upload-status");
  const file = fileInput.files[0];
  if (!file) {
    statusEl.textContent = "الصورة إلزامية";
    return;
  }

  btn.disabled = true;
  btn.textContent = "جاري النشر...";
  try {
    const imageUrl = await uploadToCloudinary(file, statusEl);
    await addDoc(collection(db, "news"), {
      imageUrl,
      mainDesc: document.getElementById("news-main").value.trim(),
      subDesc: document.getElementById("news-sub").value.trim(),
      createdAt: serverTimestamp(),
    });
    e.target.reset();
    document.getElementById("news-preview").style.display = "none";
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "صار خطأ، جرب مرة ثانية";
  }
  btn.disabled = false;
  btn.textContent = "نشر الخبر";
});

// ---------- آخر الأخبار: عرض وحذف ----------
function listenNews() {
  const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    const list = document.getElementById("news-list");
    if (snap.empty) {
      list.innerHTML = '<p class="empty-msg">لسا ما في أخبار منشورة</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((d) => {
      const item = d.data();
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <img src="${item.imageUrl}" alt="">
        <div class="item-info">
          <p class="main">${item.mainDesc || "(بدون عنوان)"}</p>
          <p class="sub">${item.subDesc || ""}</p>
        </div>
        <div class="item-actions">
          <button class="del" data-id="${d.id}">حذف</button>
        </div>`;
      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm("متأكد بدك تحذف هالعنصر؟")) await deleteDoc(doc(db, "news", d.id));
      });
      list.appendChild(row);
    });
  });
}
