import { createNews, updateNews, deleteNews, subscribeToNews } from "./services/newsService.js";
import { uploadOneToCloudinary, uploadManyToCloudinary } from "./image-upload.js";

// === DOM Elements ===
const newsForm = document.getElementById("form-news");
const newsMainFileInput = document.getElementById("news-main-file");
const newsMainPreviewWrap = document.getElementById("news-main-preview-wrap");
const newsSubFilesInput = document.getElementById("news-sub-files");
const newsSubPreview = document.getElementById("news-sub-preview");
const newsSubmitBtn = document.getElementById("news-submit-btn");
const newsCancelBtn = document.getElementById("news-cancel-btn");
const newsFormTitle = document.getElementById("news-form-title");
const newsCard = newsForm.closest(".card");

// === State Variables ===
let editingNewsId = null;
let newsMainExistingUrl = null;
let newsMainNewFile = null;
let newsSubExistingUrls = [];
let newsSubNewFiles = [];

// === Preview Functions ===
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

// === Event Listeners ===
newsMainFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    newsMainNewFile = file;
    renderNewsMainPreview();
  }
});

newsSubFilesInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  newsSubNewFiles.push(...files);
  newsSubFilesInput.value = "";
  renderNewsSubPreview();
});

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
      await updateNews(editingNewsId, payload);
    } else {
      await createNews(payload);
    }

    resetNewsForm();
    statusEl.textContent = "";
  } catch (err) {
    console.error("News Form Submit Error:", err);
    statusEl.textContent = "صار خطأ، جرب مرة ثانية";
  } finally {
    newsSubmitBtn.disabled = false;
    newsSubmitBtn.textContent = editingNewsId ? "حفظ التعديل" : "نشر الخبر";
  }
});

// === Main Module Functions ===
export function listenNews() {
  subscribeToNews((newsList) => {
    const list = document.getElementById("news-list");
    if (!newsList.length) {
      list.innerHTML = '<p class="empty-msg">لسا ما في أخبار منشورة</p>';
      return;
    }

    list.innerHTML = "";
    newsList.forEach((item) => {
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

      row.querySelector(".edit").addEventListener("click", () => startEditNews(item.id, item));
      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm("متأكد بدك تحذف هالعنصر؟")) {
          await deleteNews(item.id);
        }
      });

      list.appendChild(row);
    });
  });
}

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
