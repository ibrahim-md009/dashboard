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
  apiKey: "AIzaSyC5XysGYa_8Z_pZVCbwWKylWTqpSgSy44",
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

// ---------- رفع صورة واحدة على Cloudinary ----------
async function uploadOneToCloudinary(file) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("فشل رفع الصورة");

  const data = await res.json();

  return data.secure_url;
}

// ---------- رفع عدة صور بالتتابع مع تحديث حالة التقدم ----------
async function uploadManyToCloudinary(files, statusEl) {
  const urls = [];

  for (let i = 0; i < files.length; i++) {
    statusEl.textContent = `جاري رفع الصورة ${i + 1} من ${files.length}...`;

    const url = await uploadOneToCloudinary(files[i]);

    urls.push(url);
  }

  statusEl.textContent = `تم رفع ${files.length} صورة ✔`;

  return urls;
}

// معاينة صورة واحدة (آخر الأعمال)
document.getElementById("works-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById("works-preview");

  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
});

// معاينة الصورة الرئيسية (آخر الأخبار)
document.getElementById("news-main-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById("news-main-preview");

  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
});

// معاينة الصور الفرعية (آخر الأخبار)
document.getElementById("news-sub-files").addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  const container = document.getElementById("news-sub-preview");

  container.innerHTML = "";

  if (files.length === 0) return;

  const badge = document.createElement("div");

  badge.className = "count-badge";
  badge.textContent = `تم اختيار ${files.length} صورة فرعية`;

  container.appendChild(badge);

  files.forEach((file) => {
    const img = document.createElement("img");

    img.src = URL.createObjectURL(file);

    container.appendChild(img);
  });
});

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
    await addDoc(collection(db, "categories"), {
      name,
    });

    input.value = "";
  } catch (err) {
    console.error("فشل إضافة التصنيف:", err);

    alert("ما قدرنا نضيف التصنيف: " + err.message);
  }

  btn.disabled = false;
});

// ---------- آخر الأعمال: إضافة (صورة واحدة زي ما هي) ----------
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
    statusEl.textContent = "جاري رفع الصورة...";

    const imageUrl = await uploadOneToCloudinary(file);

    statusEl.textContent = "تم رفع الصورة ✔";

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
        if (confirm("متأكد بدك تحذف هالعنصر؟")) {
          await deleteDoc(doc(db, "works", d.id));
        }
      });

      list.appendChild(row);
    });
  });
}

// ---------- آخر الأخبار: إضافة (صورة رئيسية اختيارية + صور فرعية اختيارية بأي عدد) ----------
document.getElementById("form-news").addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = document.getElementById("news-submit-btn");
  const mainFileInput = document.getElementById("news-main-file");
  const subFilesInput = document.getElementById("news-sub-files");
  const statusEl = document.getElementById("news-upload-status");

  const mainFile = mainFileInput.files[0] || null;

  const subFiles = Array.from(subFilesInput.files);

  btn.disabled = true;
  btn.textContent = "جاري النشر...";

  try {
    let mainImage = null;

    if (mainFile) {
      statusEl.textContent = "جاري رفع الصورة الرئيسية...";

      mainImage = await uploadOneToCloudinary(mainFile);
    }

    let subImages = [];

    if (subFiles.length > 0) {
      subImages = await uploadManyToCloudinary(subFiles, statusEl);
    }

    statusEl.textContent = "تم الرفع ✔";

    await addDoc(collection(db, "news"), {
      mainImage,
      subImages,
      mainDesc: document.getElementById("news-main").value.trim(),
      subDesc: document.getElementById("news-sub").value.trim(),
      createdAt: serverTimestamp(),
    });

    e.target.reset();

    document.getElementById("news-main-preview").style.display = "none";

    document.getElementById("news-sub-preview").innerHTML = "";

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

      // توافق مع البيانات القديمة (imageUrl / images) قبل تعديل الصورة الرئيسية والفرعية
      const mainImage = item.mainImage || item.imageUrl || null;

      const subImages = item.subImages || item.images || [];

      const mainImgHtml = mainImage ? `<img src="${mainImage}" alt="">` : `<div class="no-img">بدون صورة رئيسية</div>`;

      const subImagesHtml = subImages.map((url) => `<img src="${url}" alt="">`).join("");

      const row = document.createElement("div");

      row.className = "item";

      row.innerHTML = `
        <div class="item-images">
          ${mainImgHtml}
          ${subImagesHtml}
        </div>
        <div class="item-info">
          <p class="main">${item.mainDesc || "(بدون عنوان)"}</p>
          <p class="sub">${item.subDesc || ""}</p>
        </div>
        <div class="item-actions">
          <button class="del" data-id="${d.id}">حذف</button>
        </div>`;

      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm("متأكد بدك تحذف هالعنصر؟")) {
          await deleteDoc(doc(db, "news", d.id));
        }
      });

      list.appendChild(row);
    });
  });
}
