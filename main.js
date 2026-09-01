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
  appId: "1:1011841824778:web:6d6e8fbb2971dc47cc07f3",
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

// ---------- تبديل التبويبات ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
  });
});

/* =========================================================
   تسريع الرفع: تصغير الصورة بالمتصفح قبل ما تترفع
   (بيقلل حجم الملف بشكل كبير بدون فرق واضح بالجودة)
   ========================================================= */

// كاش لمكتبة heic2any (تحويل صور آيفون HEIC/HEIF لصيغة يقدر المتصفح يفكّها)
let heic2anyPromise = null;
function loadHeic2any() {
  if (!heic2anyPromise) {
    heic2anyPromise = import("https://esm.sh/heic2any@0.0.4").then((m) => m.default || m);
  }
  return heic2anyPromise;
}

function isHeic(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type.includes("heic") || type.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif");
}

// يفحص هل المتصفح فعلياً بيقدر يصدّر WebP (بعض المتصفحات القديمة بترجع PNG بصمت)
let webpSupportPromise = null;
function supportsWebp() {
  if (!webpSupportPromise) {
    webpSupportPromise = new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      canvas.toBlob((blob) => resolve(!!blob && blob.type === "image/webp"), "image/webp");
    });
  }
  return webpSupportPromise;
}

async function resizeImage(file, maxDim = 1800, quality = 0.85) {
  let sourceFile = file;

  // 1) لو الصورة HEIC/HEIF (آيفون) حوّلها لـ JPEG أول، المتصفح ما بيقدر يفكّها مباشرة
  if (isHeic(file)) {
    try {
      const heic2any = await loadHeic2any();
      const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      sourceFile = new File([convertedBlob], (file.name || "image") + ".jpg", { type: "image/jpeg" });
    } catch (err) {
      console.warn("فشل تحويل HEIC، رح تترفع الصورة الأصلية:", err);
      return { file, wasOptimized: false };
    }
  }

  const useWebp = await supportsWebp();
  const outputType = useWebp ? "image/webp" : "image/jpeg";
  const outputExt = useWebp ? ".webp" : ".jpg";

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.warn("فشل الضغط، رح تترفع الصورة الأصلية بدون تصغير");
              return resolve({ file: sourceFile, wasOptimized: false });
            }
            resolve({
              file: new File([blob], (sourceFile.name || "image") + outputExt, { type: outputType }),
              wasOptimized: true,
            });
          },
          outputType,
          quality,
        );
      };
      img.onerror = () => {
        console.warn("فشل تحميل الصورة بالـ canvas، رح تترفع الصورة الأصلية");
        resolve({ file: sourceFile, wasOptimized: false });
      };
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ file: sourceFile, wasOptimized: false });
    reader.readAsDataURL(sourceFile);
  });
}

async function uploadOneToCloudinary(file, statusEl = null) {
  const { file: optimized, wasOptimized } = await resizeImage(file);
  if (!wasOptimized && statusEl) {
    statusEl.textContent = `تنبيه: تعذّر ضغط "${file.name}" — رح ترفع بحجمها الأصلي`;
  }
  const formData = new FormData();
  formData.append("file", optimized);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("فشل رفع الصورة");
  const data = await res.json();
  return data.secure_url;
}

// رفع عدة صور بالتوازي (أسرع بكتير من رفعهم وحدة وحدة)
async function uploadManyToCloudinary(files, statusEl) {
  if (files.length === 0) return [];
  statusEl.textContent = `جاري رفع ${files.length} صورة...`;
  const urls = await Promise.all(files.map((f) => uploadOneToCloudinary(f, statusEl)));
  statusEl.textContent = `تم رفع ${files.length} صورة ✔`;
  return urls;
}

/* =========================================================
   التصنيفات (تبويب مستقل: إضافة / تعديل / حذف)
   ========================================================= */
const categorySelect = document.getElementById("works-category");
const categoryForm = document.getElementById("form-category");
const categoryInput = document.getElementById("category-name-input");
const categorySaveBtn = document.getElementById("category-save-btn");
const categoryCancelBtn = document.getElementById("category-cancel-btn");
const categoryFormTitle = document.getElementById("category-form-title");
let editingCategoryId = null;

function listenCategories() {
  const q = query(collection(db, "categories"), orderBy("name"));
  onSnapshot(q, (snap) => {
    // تحديث قائمة الاختيار بفورم الأعمال
    categorySelect.innerHTML = "";
    if (snap.empty) {
      const opt = document.createElement("option");
      opt.textContent = "أضف تصنيف أولاً من تبويب التصنيفات";
      opt.disabled = true;
      categorySelect.appendChild(opt);
    } else {
      snap.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d.data().name;
        opt.textContent = d.data().name;
        categorySelect.appendChild(opt);
      });
    }

    // تحديث قائمة إدارة التصنيفات
    const list = document.getElementById("categories-list");
    if (snap.empty) {
      list.innerHTML = '<p class="empty-msg">لسا ما في تصنيفات مضافة</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((d) => {
      const data = d.data();
      const row = document.createElement("div");
      row.className = "category-row";
      row.innerHTML = `
        <span class="cat-name">${data.name}</span>
        <div class="item-actions">
          <button class="edit" data-id="${d.id}" data-name="${data.name}">تعديل</button>
          <button class="del" data-id="${d.id}">حذف</button>
        </div>`;
      row.querySelector(".edit").addEventListener("click", () => startEditCategory(d.id, data.name));
      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm(`متأكد بدك تحذف تصنيف "${data.name}"؟ (الأعمال القديمة المرتبطة فيه رح تحتفظ باسمه القديم)`)) {
          await deleteDoc(doc(db, "categories", d.id));
        }
      });
      list.appendChild(row);
    });
  });
}

function startEditCategory(id, name) {
  editingCategoryId = id;
  categoryInput.value = name;
  categorySaveBtn.textContent = "حفظ التعديل";
  categoryFormTitle.textContent = "تعديل تصنيف";
  categoryCancelBtn.style.display = "inline-block";
  categoryInput.focus();
}

function resetCategoryForm() {
  editingCategoryId = null;
  categoryForm.reset();
  categorySaveBtn.textContent = "إضافة تصنيف";
  categoryFormTitle.textContent = "إضافة تصنيف جديد";
  categoryCancelBtn.style.display = "none";
}

categoryCancelBtn.addEventListener("click", resetCategoryForm);

categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = categoryInput.value.trim();
  if (!name) return;
  categorySaveBtn.disabled = true;
  try {
    if (editingCategoryId) {
      await updateDoc(doc(db, "categories", editingCategoryId), { name });
    } else {
      await addDoc(collection(db, "categories"), { name });
    }
    resetCategoryForm();
  } catch (err) {
    alert("صار خطأ: " + err.message);
  }
  categorySaveBtn.disabled = false;
});

/* =========================================================
   آخر الأعمال (إضافة / تعديل / حذف)
   ========================================================= */
const worksForm = document.getElementById("form-works");
const worksFileInput = document.getElementById("works-file");
const worksPreview = document.getElementById("works-preview");
const worksSubmitBtn = document.getElementById("works-submit-btn");
const worksCancelBtn = document.getElementById("works-cancel-btn");
const worksFormTitle = document.getElementById("works-form-title");
const worksCard = worksForm.closest(".card");

let editingWorkId = null;
let editingWorkImage = null; // رابط الصورة الحالية وقت التعديل

worksFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    worksPreview.src = URL.createObjectURL(file);
    worksPreview.style.display = "block";
  } else if (editingWorkImage) {
    worksPreview.src = editingWorkImage;
    worksPreview.style.display = "block";
  } else {
    worksPreview.style.display = "none";
  }
});

function startEditWork(id, item) {
  editingWorkId = id;
  editingWorkImage = item.img || null;
  worksFileInput.required = false;
  worksFileInput.value = "";
  if (editingWorkImage) {
    worksPreview.src = editingWorkImage;
    worksPreview.style.display = "block";
  }
  categorySelect.value = item.category || "";
  document.getElementById("works-main").value = item.title || "";
  document.getElementById("works-sub").value = item.sub || "";
  worksSubmitBtn.textContent = "حفظ التعديل";
  worksFormTitle.textContent = "تعديل عمل";
  worksCancelBtn.style.display = "inline-block";
  worksCard.classList.add("editing");
  worksCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetWorksForm() {
  editingWorkId = null;
  editingWorkImage = null;
  worksForm.reset();
  worksPreview.style.display = "none";
  worksFileInput.required = true;
  worksSubmitBtn.textContent = "إضافة العمل";
  worksFormTitle.textContent = "إضافة عمل جديد";
  worksCancelBtn.style.display = "none";
  worksCard.classList.remove("editing");
}

worksCancelBtn.addEventListener("click", resetWorksForm);

worksForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById("works-upload-status");
  const file = worksFileInput.files[0];

  if (!file && !editingWorkImage) {
    statusEl.textContent = "الصورة إلزامية";
    return;
  }

  worksSubmitBtn.disabled = true;
  worksSubmitBtn.textContent = editingWorkId ? "جاري الحفظ..." : "جاري الإضافة...";
  try {
    let imgUrl = editingWorkImage;
    if (file) {
      statusEl.textContent = "جاري رفع الصورة...";
      imgUrl = await uploadOneToCloudinary(file, statusEl);
      statusEl.textContent = "تم رفع الصورة ✔";
    }

    const payload = {
      img: imgUrl,
      category: categorySelect.value,
      title: document.getElementById("works-main").value.trim(),
      sub: document.getElementById("works-sub").value.trim(),
    };

    if (editingWorkId) {
      await updateDoc(doc(db, "works", editingWorkId), payload);
    } else {
      await addDoc(collection(db, "works"), { ...payload, createdAt: serverTimestamp() });
    }

    resetWorksForm();
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "صار خطأ، جرب مرة ثانية";
  }
  worksSubmitBtn.disabled = false;
  worksSubmitBtn.textContent = editingWorkId ? "حفظ التعديل" : "إضافة العمل";
});

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
          <button class="edit">تعديل</button>
          <button class="del">حذف</button>
        </div>`;
      row.querySelector(".edit").addEventListener("click", () => startEditWork(d.id, item));
      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm("متأكد بدك تحذف هالعنصر؟")) await deleteDoc(doc(db, "works", d.id));
      });
      list.appendChild(row);
    });
  });
}

/* =========================================================
   آخر الأخبار (صورة رئيسية اختيارية + صور فرعية اختيارية،
   إضافة / تعديل / حذف)
   ========================================================= */
const newsForm = document.getElementById("form-news");
const newsMainFileInput = document.getElementById("news-main-file");
const newsMainPreviewWrap = document.getElementById("news-main-preview-wrap");
const newsSubFilesInput = document.getElementById("news-sub-files");
const newsSubPreview = document.getElementById("news-sub-preview");
const newsSubmitBtn = document.getElementById("news-submit-btn");
const newsCancelBtn = document.getElementById("news-cancel-btn");
const newsFormTitle = document.getElementById("news-form-title");
const newsCard = newsForm.closest(".card");

let editingNewsId = null;
let newsMainExistingUrl = null; // صورة رئيسية محفوظة سلفاً (وضع التعديل)
let newsMainNewFile = null; // صورة رئيسية جديدة مختارة الآن
let newsSubExistingUrls = []; // صور فرعية محفوظة سلفاً (وضع التعديل)
let newsSubNewFiles = []; // صور فرعية جديدة مضافة الآن

function renderNewsMainPreview() {
  newsMainPreviewWrap.innerHTML = "";
  const url = newsMainNewFile ? URL.createObjectURL(newsMainNewFile) : newsMainExistingUrl;
  if (!url) return;
  const box = document.createElement("div");
  box.className = "main-preview-box";
  box.innerHTML = `<img src="${url}" alt=""><button type="button" class="remove-x" title="إزالة">✕</button>`;
  box.querySelector(".remove-x").addEventListener("click", () => {
    newsMainNewFile = null;
    newsMainExistingUrl = null;
    newsMainFileInput.value = "";
    renderNewsMainPreview();
  });
  newsMainPreviewWrap.appendChild(box);
}

newsMainFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    newsMainNewFile = file;
    renderNewsMainPreview();
  }
});

function renderNewsSubPreview() {
  newsSubPreview.innerHTML = "";
  const total = newsSubExistingUrls.length + newsSubNewFiles.length;
  if (total === 0) return;

  const badge = document.createElement("div");
  badge.className = "count-badge";
  badge.textContent = `${total} صورة فرعية`;
  newsSubPreview.appendChild(badge);

  newsSubExistingUrls.forEach((url, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "thumb-wrap";
    wrap.innerHTML = `<img src="${url}" alt=""><button type="button" class="remove-x">✕</button>`;
    wrap.querySelector(".remove-x").addEventListener("click", () => {
      newsSubExistingUrls.splice(idx, 1);
      renderNewsSubPreview();
    });
    newsSubPreview.appendChild(wrap);
  });

  newsSubNewFiles.forEach((file, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "thumb-wrap";
    wrap.innerHTML = `<img src="${URL.createObjectURL(file)}" alt=""><button type="button" class="remove-x">✕</button>`;
    wrap.querySelector(".remove-x").addEventListener("click", () => {
      newsSubNewFiles.splice(idx, 1);
      renderNewsSubPreview();
    });
    newsSubPreview.appendChild(wrap);
  });
}

// كل مرة تختار صور، تنضاف على القائمة (مش تستبدلها) — هيك تقدر تضيف على دفعات
newsSubFilesInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  newsSubNewFiles.push(...files);
  newsSubFilesInput.value = "";
  renderNewsSubPreview();
});

function startEditNews(id, item) {
  editingNewsId = id;
  newsMainExistingUrl = item.mainImage || item.imageUrl || null;
  newsMainNewFile = null;
  newsSubExistingUrls = [...(item.subImages || item.images || [])];
  newsSubNewFiles = [];
  renderNewsMainPreview();
  renderNewsSubPreview();
  document.getElementById("news-main").value = item.mainDesc || "";
  document.getElementById("news-sub").value = item.subDesc || "";
  newsSubmitBtn.textContent = "حفظ التعديل";
  newsFormTitle.textContent = "تعديل خبر";
  newsCancelBtn.style.display = "inline-block";
  newsCard.classList.add("editing");
  newsCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetNewsForm() {
  editingNewsId = null;
  newsMainExistingUrl = null;
  newsMainNewFile = null;
  newsSubExistingUrls = [];
  newsSubNewFiles = [];
  newsForm.reset();
  newsMainPreviewWrap.innerHTML = "";
  newsSubPreview.innerHTML = "";
  newsSubmitBtn.textContent = "نشر الخبر";
  newsFormTitle.textContent = "إضافة خبر جديد";
  newsCancelBtn.style.display = "none";
  newsCard.classList.remove("editing");
}

newsCancelBtn.addEventListener("click", resetNewsForm);

newsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById("news-upload-status");

  newsSubmitBtn.disabled = true;
  newsSubmitBtn.textContent = editingNewsId ? "جاري الحفظ..." : "جاري النشر...";
  try {
    let mainImage = newsMainExistingUrl;
    if (newsMainNewFile) {
      statusEl.textContent = "جاري رفع الصورة الرئيسية...";
      mainImage = await uploadOneToCloudinary(newsMainNewFile, statusEl);
    }

    const newSubUrls = await uploadManyToCloudinary(newsSubNewFiles, statusEl);
    const subImages = [...newsSubExistingUrls, ...newSubUrls];

    const payload = {
      mainImage: mainImage || null,
      subImages,
      mainDesc: document.getElementById("news-main").value.trim(),
      subDesc: document.getElementById("news-sub").value.trim(),
    };

    if (editingNewsId) {
      await updateDoc(doc(db, "news", editingNewsId), payload);
    } else {
      await addDoc(collection(db, "news"), { ...payload, createdAt: serverTimestamp() });
    }

    resetNewsForm();
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "صار خطأ، جرب مرة ثانية";
  }
  newsSubmitBtn.disabled = false;
  newsSubmitBtn.textContent = editingNewsId ? "حفظ التعديل" : "نشر الخبر";
});

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
          <button class="edit">تعديل</button>
          <button class="del">حذف</button>
        </div>`;
      row.querySelector(".edit").addEventListener("click", () => startEditNews(d.id, item));
      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm("متأكد بدك تحذف هالعنصر؟")) await deleteDoc(doc(db, "news", d.id));
      });
      list.appendChild(row);
    });
  });
}
