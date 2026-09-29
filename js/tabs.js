// ====== تبديل التبويبات (شريط سفلي) + السحب بين الأقسام على الموبايل ======
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const panelsViewport = document.getElementById("panels-viewport");
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

// ---------- السحب (Swipe) بالموبايل بين الأقسام ----------
if (panelsViewport) {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  panelsViewport.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    },
    { passive: true },
  );

  panelsViewport.addEventListener(
    "touchend",
    (e) => {
      if (!tracking) return;
      tracking = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // نتجاهل الحركة العمودية (سكرول عادي) أو أي سحب قصير جداً
      if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) return;

      const activeBtn = tabButtons.find((b) => b.classList.contains("active"));
      const currentIndex = tabOrder.indexOf(activeBtn?.dataset.tab);
      if (currentIndex === -1) return;

      if (deltaX < 0) {
        // سحب لليسار → القسم التالي
        const next = tabOrder[currentIndex + 1];
        if (next) activateTab(next, { animateDir: "next" });
      } else {
        // سحب لليمين → القسم السابق
        const prev = tabOrder[currentIndex - 1];
        if (prev) activateTab(prev, { animateDir: "prev" });
      }
    },
    { passive: true },
  );
}
