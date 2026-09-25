/* =========================================================
   أنيميشن شاشة الرفع/الحفظ — شعار دوّار + شريط تقدم وهمي
   بيتحقن تلقائياً بالـ DOM (ما بيحتاج أي تعديل يدوي بـ index.html)
   ========================================================= */

let overlayEl = null;
let spinnerEl = null;
let successEl = null;
let textEl = null;
let progressFillEl = null;
let hideTimeout = null;
let progressInterval = null;
let simulatedPct = 0;

function ensureOverlay() {
  if (overlayEl) return;

  overlayEl = document.createElement("div");
  overlayEl.className = "upload-overlay";
  overlayEl.innerHTML = `
    <div class="upload-overlay-box">
      <div class="upload-spinner" id="upload-spinner">
        <div class="upload-spinner-logo" id="upload-spinner-logo">
          <img src="assets/images/white.png" alt="" onerror="this.style.display='none'; this.parentElement.classList.add('no-logo');" />
        </div>
      </div>
      <div class="upload-success-check" id="upload-success-check">✔</div>
      <div class="upload-overlay-text" id="upload-overlay-text"></div>
      <div class="upload-progress-track">
        <div class="upload-progress-fill" id="upload-progress-fill"></div>
      </div>
    </div>`;
  document.body.appendChild(overlayEl);

  spinnerEl = overlayEl.querySelector("#upload-spinner");
  successEl = overlayEl.querySelector("#upload-success-check");
  textEl = overlayEl.querySelector("#upload-overlay-text");
  progressFillEl = overlayEl.querySelector("#upload-progress-fill");
}

function startSimulatedProgress() {
  simulatedPct = 0;
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    // بيقرب تدريجياً من 90% وما بيوصلها، لحد ما تنادي hideUploadOverlaySuccess فيوصل 100%
    simulatedPct += (90 - simulatedPct) * 0.12 + 1;
    if (simulatedPct > 90) simulatedPct = 90;
    if (progressFillEl) progressFillEl.style.width = simulatedPct + "%";
  }, 250);
}

function stopSimulatedProgress() {
  clearInterval(progressInterval);
}

/** إظهار شاشة التحميل بنص مبدئي */
export function showUploadOverlay(text = "جاري الرفع...") {
  ensureOverlay();
  clearTimeout(hideTimeout);
  spinnerEl.style.display = "flex";
  successEl.style.display = "none";
  textEl.textContent = text;
  progressFillEl.style.width = "0%";
  requestAnimationFrame(() => overlayEl.classList.add("show"));
  startSimulatedProgress();
}

/** تحديث النص فقط أثناء التحميل (مثلاً "جاري رفع الصورة 2 من 5...") */
export function setUploadOverlayText(text) {
  if (!textEl) return;
  textEl.textContent = text;
}

/** إنهاء ناجح: يوصل الشريط لـ 100%، يبيّن علامة الصح، وبعدين يختفي تلقائياً */
export function hideUploadOverlaySuccess(text = "تم بنجاح ✔") {
  if (!overlayEl) return;
  stopSimulatedProgress();
  progressFillEl.style.width = "100%";
  setTimeout(() => {
    spinnerEl.style.display = "none";
    successEl.style.display = "flex";
    textEl.textContent = text;
    hideTimeout = setTimeout(() => {
      overlayEl.classList.remove("show");
    }, 900);
  }, 200);
}

/** إخفاء فوري بدون علامة نجاح (يُستخدم عند حدوث خطأ) */
export function hideUploadOverlayNow() {
  if (!overlayEl) return;
  stopSimulatedProgress();
  clearTimeout(hideTimeout);
  overlayEl.classList.remove("show");
}
