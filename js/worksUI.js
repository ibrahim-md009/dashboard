import { createWork, updateWork, deleteWork, subscribeToWorks } from "./services/worksService.js";
import { uploadOneToCloudinary } from "./image-upload.js";
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
const worksSubmitBtn = document.getElementById("works-submit-btn");
const worksCancelBtn = document.getElementById("works-cancel-btn");
const worksFormTitle = document.getElementById("works-form-title");
const worksCard = worksForm.closest(".card");

// === State ===
let editingWorkId = null;
let editingWorkImage = null;
let worksPreviewObjectUrl = null;

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
  showUploadOverlay(file ? "جاري رفع الصورة..." : "جاري الحفظ...");

  try {
    let imgUrl = editingWorkImage;
    if (file) {
      statusEl.textContent = "جاري رفع الصورة...";
      imgUrl = await uploadOneToCloudinary(file, statusEl);
      statusEl.textContent = "تم رفع الصورة ✔";
    }

    setUploadOverlayText("جاري الحفظ...");

    const payload = {
      img: imgUrl,
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
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <img src="${thumbUrl(item.img)}" alt="" loading="lazy" decoding="async" width="68" height="68">
        <div class="item-info">
          <span class="tag">${item.category || ""}</span>
          <p class="main">${item.title || ""}</p>
          <p class="sub">${item.sub || ""}</p>
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
  editingWorkId = id;
  editingWorkImage = item.img || null;
  worksFileInput.required = false;
  worksFileInput.value = "";
  if (editingWorkImage) {
    worksPreview.src = mediumUrl(editingWorkImage);
    worksPreview.style.display = "block";
  }
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
