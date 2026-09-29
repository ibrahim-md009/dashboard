// ====== تبديل التبويبات (شريط سفلي) + السحب بين الأقسام على الموبايل ======
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const panelsViewport = document.getElementById("panels-viewport");
const tabsBar = document.querySelector(".tabs");
const tabOrder = tabButtons.map((b) => b.dataset.tab);

function activateTab(tabName, { animateDir = null } = {}) {
  const targetBtn = tabButtons.find((b) => b.dataset.tab === tabName);
  const targetPanel = document.getElementById("panel-" + tabName);
  if (!targetBtn || !targetPanel) return;

  tabButtons.forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.remove("active", "enter-from-left", "enter-from-right");
  });

  targetBtn.classList.add("active");
  targetPanel.classList.add("active");

  if (animateDir) {
    // إعادة الأنيميشن من الصفر حتى لو الكلاس نفسه انضاف قبل (يضمن تشغيلها كل مرة)
    targetPanel.classList.add(animateDir === "next" ? "enter-from-right" : "enter-from-left");
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

function goToNextTab() {
  const activeBtn = tabButtons.find((b) => b.classList.contains("active"));
  const currentIndex = tabOrder.indexOf(activeBtn?.dataset.tab);
  if (currentIndex === -1) return;
  const next = tabOrder[currentIndex + 1];
  if (next) activateTab(next, { animateDir: "next" });
}

function goToPrevTab() {
  const activeBtn = tabButtons.find((b) => b.classList.contains("active"));
  const currentIndex = tabOrder.indexOf(activeBtn?.dataset.tab);
  if (currentIndex === -1) return;
  const prev = tabOrder[currentIndex - 1];
  if (prev) activateTab(prev, { animateDir: "prev" });
}

/**
 * تفعيل السحب (Swipe) الأفقي على عنصر معيّن للتنقل بين التبويبات،
 * بنفس روح تيليجرام بالآيفون: تسحب على شريط التبويبات نفسه أو على
 * منطقة المحتوى، وبينتقل. `ignoreVertical` بيتجاهل السحب لو كان
 * عمودي أكتر منه أفقي (يعني المستخدم بيسكرول عادي مش بيبدّل تبويب).
 */
function bindSwipe(el, { minDistance = 40, ignoreVertical = true } = {}) {
  if (!el) return;
  let startX = 0;
  let startY = 0;
  let tracking = false;

  el.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    },
    { passive: true },
  );

  el.addEventListener(
    "touchend",
    (e) => {
      if (!tracking) return;
      tracking = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      if (Math.abs(deltaX) < minDistance) return;
      if (ignoreVertical && Math.abs(deltaX) < Math.abs(deltaY) * 1.3) return;

      if (deltaX < 0) goToNextTab(); // سحب لليسار → التبويب التالي
      else goToPrevTab(); // سحب لليمين → التبويب السابق
    },
    { passive: true },
  );
}

// السحب على منطقة المحتوى (البطاقات)
bindSwipe(panelsViewport, { minDistance: 55, ignoreVertical: true });

// السحب على الشريط السفلي نفسه (زي تيليجرام بالآيفون) — مسافة أقصر
// لأن الشريط أصلاً عرضه محدود وما فيه سكرول عمودي نتجنبه
bindSwipe(tabsBar, { minDistance: 30, ignoreVertical: false });
