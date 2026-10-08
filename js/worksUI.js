import { createWork, updateWork, deleteWork, subscribeToWorks } from "./services/worksService.js";
import { uploadOneToCloudinary, uploadManyToCloudinary } from "./image-upload.js";
import { thumbUrl, mediumUrl } from "./imageUrl.js";
import { categorySelect } from "./categoriesUI.js";
import {
  showUploadOverlay,
  setUploadOverlayText,
  hideUploadOverlaySuccess,
  hideUploadOverlayNow,
} from "./uploadOverlay.js";

// === DOM Elements ===
const worksForm = document.getElementById("form-works");
const worksFileInput = document.getElementById("works-file");
const worksPreview = document.getElementById("works-preview");
const worksSubFilesInput = document.getElementById("works-sub-files"); // جديد: <input type="file" multiple>
const worksSubPreview = document.getElementById("works-sub-preview"); // جديد: div للمعاينة
const worksVideoInput = document.getElementById("works-video-url"); // جديد: خانة لصق رابط يوتيوب
const worksVideoAddBtn = document.getElementById("works-video-add"); // جديد: زر إضافة الفيديو
const worksVideoList = document.getElementById("works-video-list"); // جديد: قائمة الفيديوهات المضافة
const worksSubmitBtn = document.getElementById("works-submit-btn");
const worksCancelBtn = document.getElementById("works-cancel-btn");
const worksFormTitle = document.getElementById("works-form-title");
const worksCard = worksForm.closest(".card");

// === State ===
let editingWorkId = null;
let editingWorkImage = null;
let worksPreviewObjectUrl = null;
let worksSubExistingUrls = [];
let worksSubNewFiles = [];
let worksVideos = []; // [{ type: "youtube", id }]

// === Object URLs للصور الفرعية: رابط واحد لكل ملف + تحريره عند عدم الحاجة ===
const objectUrls = new Map();
function previewUrl(file) {
  let u = objectUrls.get(file);
  if (!u) {
    u = URL.createObjectURL(file);
    objectUrls.set(file, u);
  }
  return u;
}
function releaseUrl(file) {
  const u = objectUrls.get(file);
  if (u) {
    URL.revokeObjectURL(u);
    objectUrls.delete(file);
  }
}
function releaseAllUrls() {
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  objectUrls.clear();
}

// === Sub images preview ===
function renderWorksSubPreview() {
  worksSubPreview.innerHTML = "";
  const total = worksSubExistingUrls.length + worksSubNewFiles.length;
  if (total === 0) return;

  const badge = document.createElement("div");
  badge.className = "count-badge";
  badge.textContent = `${total} صورة فرعية`;
  worksSubPreview.appendChild(badge);

  worksSubExistingUrls.forEach((url, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "thumb-wrap";
    wrap.innerHTML = `<img src="${thumbUrl(url)}" alt="" loading="lazy" decoding="async"><button type="button" class="remove-x">✕</button>`;
    wrap.querySelector(".remove-x").addEventListener("click", () => {
      worksSubExistingUrls.splice(idx, 1);
      renderWorksSubPreview();
    });
    worksSubPreview.appendChild(wrap);
  });

  worksSubNewFiles.forEach((file, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "thumb-wrap";
    wrap.innerHTML = `<img src="${previewUrl(file)}" alt="" decoding="async"><button type="button" class="remove-x">✕</button>`;
    wrap.querySelector(".remove-x").addEventListener("click", () => {
      releaseUrl(file);
      worksSubNewFiles.splice(idx, 1);
      renderWorksSubPreview();
    });
    worksSubPreview.appendChild(wrap);
  });
}

// === YouTube videos ===
// يقبل: watch?v= / youtu.be / shorts / embed / live / أو الـ ID نفسه (11 حرف)
function parseYouTubeId(input) {
  const s = input.trim();
  const isId = (x) => /^[\w-]{11}$/.test(x || "");
  if (isId(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^(www|m)\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return isId(id) ? id : null;
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return isId(id) ? id : null;
      }
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {
    /* مش رابط */
  }
  return null;
}

function renderWorksVideos() {
  worksVideoList.innerHTML = "";
  if (worksVideos.length === 0) return;

  const badge = document.createElement("div");
  badge.className = "count-badge";
  badge.textContent = `${worksVideos.length} فيديو`;
  worksVideoList.appendChild(badge);

  worksVideos.forEach((v, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "thumb-wrap";
    wrap.innerHTML = `<img src="https://img.youtube.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy" decoding="async"><button type="button" class="remove-x">✕</button>`;
    wrap.querySelector(".remove-x").addEventListener("click", () => {
      worksVideos.splice(idx, 1);
      renderWorksVideos();
    });
    worksVideoList.appendChild(wrap);
  });
}

// بترجّع true لو الخانة فاضية أو الرابط اتضاف، و false لو الرابط غلط
function addVideoFromInput() {
  const statusEl = document.getElementById("works-upload-status");
  const raw = worksVideoInput.value.trim();
  if (!raw) return true;
  const id = parseYouTubeId(raw);
  if (!id) {
    statusEl.textContent = "رابط يوتيوب غير صحيح";
    return false;
  }
  if (!worksVideos.some((v) => v.id === id)) worksVideos.push({ type: "youtube", id });
  worksVideoInput.value = "";
  statusEl.textContent = "";
  renderWorksVideos();
  return true;
}

// === Event Listeners ===
worksFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    if (worksPreviewObjectUrl) URL.revokeObjectURL(worksPreviewObjectUrl);
    worksPreviewObjectUrl = URL.createObjectURL(file);
    worksPreview.src = worksPreviewObjectUrl;
    worksPreview.style.display = "block";
  } else if (editingWorkImage) {
    worksPreview.src = mediumUrl(editingWorkImage);
    worksPreview.style.display = "block";
  } else {
    worksPreview.style.display = "none";
  }
});

// اختيار عدة صور فرعية مرة واحدة (ويمكن الإضافة على اختيار سابق)
worksSubFilesInput.addEventListener("change", (e) => {
  worksSubNewFiles.push(...Array.from(e.target.files));
  worksSubFilesInput.value = "";
  renderWorksSubPreview();
});

worksVideoAddBtn.addEventListener("click", addVideoFromInput);
// Enter داخل خانة الرابط يضيف الفيديو بدل ما يرسل الفورم
worksVideoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addVideoFromInput();
  }
});

worksCancelBtn.addEventListener("click", resetWorksForm);

worksForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById("works-upload-status");
  const file = worksFileInput.files[0];

  if (!file && !editingWorkImage) {
    statusEl.textContent = "الصورة إلزامية";
    return;
  }

  // لو لزق رابط ونسي يضغط "إضافة" نضيفه تلقائياً (ولو الرابط غلط نوقف)
  if (!addVideoFromInput()) return;

  worksSubmitBtn.disabled = true;
  worksSubmitBtn.textContent = editingWorkId ? "جاري الحفظ..." : "جاري الإضافة...";
  showUploadOverlay(file ? "جاري رفع الصورة..." : "جاري الحفظ...");

  try {
    let imgUrl = editingWorkImage;
    if (file) {
      statusEl.textContent = "جاري رفع الصورة...";
      imgUrl = await uploadOneToCloudinary(file, statusEl);
      statusEl.textContent = "تم رفع الصورة ✔";
    }

    if (worksSubNewFiles.length > 0) {
      setUploadOverlayText(`جاري رفع ${worksSubNewFiles.length} صورة فرعية...`);
    }
    const newSubUrls = await uploadManyToCloudinary(worksSubNewFiles, statusEl);
    const subImages = [...worksSubExistingUrls, ...newSubUrls];

    setUploadOverlayText("جاري الحفظ...");

    const payload = {
      img: imgUrl,
      subImages,
      videos: worksVideos,
      category: categorySelect.value,
      title: document.getElementById("works-main").value.trim(),
      sub: document.getElementById("works-sub").value.trim(),
    };

    if (editingWorkId) {
      await updateWork(editingWorkId, payload);
    } else {
      await createWork(payload);
    }

    hideUploadOverlaySuccess(editingWorkId ? "تم حفظ التعديل ✔" : "تمت إضافة العمل ✔");
    resetWorksForm();
    statusEl.textContent = "";
  } catch (err) {
    console.error("Works Form Submit Error:", err);
    statusEl.textContent = "صار خطأ، جرب مرة ثانية";
    hideUploadOverlayNow();
  } finally {
    worksSubmitBtn.disabled = false;
    worksSubmitBtn.textContent = editingWorkId ? "حفظ التعديل" : "إضافة العمل";
  }
});

// === Functions ===

// بترجّع دالة إلغاء الاشتراك (unsubscribe) عشان auth.js يوقف الـ listener عند الخروج
export function listenWorks() {
  return subscribeToWorks((works) => {
    const list = document.getElementById("works-list");
    if (!works.length) {
      list.innerHTML = '<p class="empty-msg">لسا ما في أعمال مضافة</p>';
      return;
    }

    const frag = document.createDocumentFragment();
    works.forEach((item) => {
      const subCount = (item.subImages || []).length + (item.videos || []).length;
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <img src="${thumbUrl(item.img)}" alt="" loading="lazy" decoding="async" width="68" height="68">
        <div class="item-info">
          <span class="tag">${item.category || ""}</span>
          <p class="main">${item.title || ""}</p>
          <p class="sub">${item.sub || ""}</p>
          ${subCount ? `<p class="sub">${subCount + 1} ملفات</p>` : ""}
        </div>
        <div class="item-actions">
          <button class="edit">تعديل</button>
          <button class="del">حذف</button>
        </div>`;

      row.querySelector(".edit").addEventListener("click", () => startEditWork(item.id, item));
      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm("متأكد بدك تحذف هالعنصر؟")) {
          await deleteWork(item.id);
        }
      });

      frag.appendChild(row);
    });
    list.replaceChildren(frag);
  });
}

function startEditWork(id, item) {
  releaseAllUrls();
  editingWorkId = id;
  editingWorkImage = item.img || null;
  worksSubExistingUrls = [...(item.subImages || [])];
  worksSubNewFiles = [];
  worksVideos = [...(item.videos || [])];
  worksFileInput.required = false;
  worksFileInput.value = "";
  if (editingWorkImage) {
    worksPreview.src = mediumUrl(editingWorkImage);
    worksPreview.style.display = "block";
  }
  renderWorksSubPreview();
  renderWorksVideos();
  categorySelect.value = item.category || "";
  document.getElementById("works-main").value = item.title || "";
  document.getElementById("works-sub").value = item.sub || "";
  worksSubmitBtn.textContent = "حفظ التعديل";
  worksFormTitle.textContent = "تعديل عمل";
  worksCancelBtn.style.display = "inline-block";
  worksCard.classList.add("editing");
  requestAnimationFrame(() => worksCard.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function resetWorksForm() {
  releaseAllUrls();
  editingWorkId = null;
  editingWorkImage = null;
  worksSubExistingUrls = [];
  worksSubNewFiles = [];
  worksVideos = [];
  worksForm.reset();
  worksVideoList.innerHTML = "";
  worksPreview.style.display = "none";
  worksSubPreview.innerHTML = "";
  worksFileInput.required = true;
  worksSubmitBtn.textContent = "إضافة العمل";
  worksFormTitle.textContent = "إضافة عمل جديد";
  worksCancelBtn.style.display = "none";
  worksCard.classList.remove("editing");
}
