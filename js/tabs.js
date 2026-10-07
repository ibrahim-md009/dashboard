// ====== تبديل التبويبات (شريط سفلي بكبسولة فيزيائية) + السحب بين الأقسام على الموبايل ======
// الكبسولة الخضراء بتتحرك بنابض (spring) وبتتمدد "جيلي" مع السرعة، وبتترفع لما تلمسها،
// وتقدر تمسكها وتسحبها بين التبويبات (زي تيليجرام بالآيفون). نسخ العناصر الذهبية جوّاها
// بتشتغل كعدسة: الأيقونة تتلوّن بس لما الكبسولة تعدّي عليها.

const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const panelsViewport = document.getElementById("panels-viewport");
const tabsBar = document.querySelector(".tabs");
const tabOrder = tabButtons.map((b) => b.dataset.tab);

let activeIndex = Math.max(
  0,
  tabButtons.findIndex((b) => b.classList.contains("active")),
);
let pillNav = null; // واجهة الكبسولة (تتعبّى تحت)

/* ============================================================
   تفعيل تبويب
   ============================================================ */
function activateTab(tabName, { animateDir = null } = {}) {
  const idx = tabOrder.indexOf(tabName);
  const targetBtn = tabButtons[idx];
  const targetPanel = document.getElementById("panel-" + tabName);
  if (!targetBtn || !targetPanel) return;

  if (idx === activeIndex) {
    // نفس التبويب: بس رجّع الكبسولة لمكانها
    pillNav?.moveTo(idx);
    return;
  }

  // اتجاه الأنيميشن بيتحدد تلقائي من ترتيب التبويبات لو ما اتحدد يدوي
  const dir = animateDir || (idx > activeIndex ? "next" : "prev");

  tabButtons.forEach((b) => {
    b.classList.remove("active");
    b.removeAttribute("aria-current");
  });
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.remove("active", "enter-from-left", "enter-from-right");
  });

  targetBtn.classList.add("active");
  targetBtn.setAttribute("aria-current", "page");
  targetPanel.classList.add("active");
  targetPanel.classList.add(dir === "next" ? "enter-from-right" : "enter-from-left");

  activeIndex = idx;
  pillNav?.moveTo(idx);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

function goToNextTab() {
  const next = tabOrder[activeIndex + 1];
  if (next) activateTab(next, { animateDir: "next" });
}
function goToPrevTab() {
  const prev = tabOrder[activeIndex - 1];
  if (prev) activateTab(prev, { animateDir: "prev" });
}

/* ============================================================
   الكبسولة الفيزيائية
   ============================================================ */
const BN_LIFT = 1.08; // مقدار تكبير الكبسولة عند اللمس
const DRAG_THRESHOLD = 6; // px قبل اعتبار الحركة سحباً
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const buzz = (ms) => {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* iOS ما بيدعم الاهتزاز */
  }
};

function initPillNav(nav, items) {
  // --- بناء الكبسولة + النسخ الذهبية (من نفس أيقونات وأسماء الأزرار، فما تحتاج تعدّل الـ HTML) ---
  const pill = document.createElement("span");
  pill.className = "tab-pill";
  pill.setAttribute("aria-hidden", "true");

  const ghostBox = document.createElement("span");
  ghostBox.className = "tab-pill-ghosts";

  const ghosts = items.map((btn) => {
    const gh = document.createElement("span");
    gh.className = "tab-ghost";
    const svg = btn.querySelector("svg");
    const label = btn.querySelector("span");
    if (svg) gh.appendChild(svg.cloneNode(true));
    if (label) {
      const l = document.createElement("span");
      l.textContent = label.textContent;
      gh.appendChild(l);
    }
    ghostBox.appendChild(gh);
    return gh;
  });
  pill.appendChild(ghostBox);
  nav.appendChild(pill);

  const reduceMotion = !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bn = {
    x: 0, // موضع الكبسولة الحالي
    target: 0, // الموضع المطلوب
    v: 0, // سرعة النابض
    s: 1, // مقياس الرفع (1 = ساكنة)
    index: -1,
    lit: -1,
    raf: 0,
    last: 0,
    W: 0,
    H: 0,
    T: 0,
    ready: false,
    dragging: false,
    lifted: false,
  };

  /* ---------- أدوات القياس ---------- */
  const nearest = (center) => {
    let best = 0;
    let bestD = Infinity;
    items.forEach((it, i) => {
      const d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - center);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };

  // مقاومة مطاطية عند الوصول لطرفي الشريط
  const rubber = (v) => {
    const lefts = items.map((it) => it.offsetLeft);
    const min = Math.min(...lefts);
    const max = Math.max(...lefts);
    if (v >= min && v <= max) return v;
    const over = v < min ? min - v : v - max;
    const soft = 16 * (1 - Math.exp(-over / 36));
    return v < min ? min - soft : max + soft;
  };

  // قياسات الكبسولة ومواضع النسخ الذهبية (تتحدّث عند تغيّر المقاس فقط)
  const layout = (i) => {
    const ref = items[i] || items[0];
    bn.W = ref.offsetWidth;
    bn.H = ref.offsetHeight;
    bn.T = ref.offsetTop;
    pill.style.width = bn.W + "px";
    pill.style.height = bn.H + "px";
    pill.style.top = bn.T + "px";
    items.forEach((it, k) => {
      const gh = ghosts[k];
      gh.style.left = it.offsetLeft + "px";
      gh.style.top = it.offsetTop + "px";
      gh.style.width = it.offsetWidth + "px";
      gh.style.height = it.offsetHeight + "px";
    });
  };

  const render = () => {
    const W = bn.W || 1;
    const H = bn.H || 1;
    const stretch = Math.min(Math.abs(bn.target - bn.x) / W, 0.7); // تمدد "جيلي" بحسب السرعة
    const a = stretch * 0.22;
    const b = stretch * 0.07;
    pill.style.transform = `translate3d(${bn.x.toFixed(2)}px,0,0) scale(${(bn.s * (1 + a)).toFixed(3)},${(bn.s * (1 - b)).toFixed(3)})`;
    // النسخ الذهبية تبقى ثابتة بالنسبة للشريط (تعاكس حركة الكبسولة) وتتكبّر معها كعدسة
    const cx = W / 2;
    const cy = H / 2;
    ghostBox.style.transform = `translate(${cx}px,${cy}px) scale(${(1 / (1 + a)).toFixed(3)},${(1 / (1 - b)).toFixed(3)}) translate(${(-cx - bn.x).toFixed(2)}px,${-cy - bn.T}px)`;
  };

  // نقرة اهتزاز عند كل تبويب تعدّي عليه الكبسولة أثناء السحب
  const track = () => {
    const idx = bn.dragging ? nearest(bn.x + bn.W / 2) : bn.index;
    if (idx === bn.lit) return;
    if (bn.lit !== -1 && bn.dragging) buzz(6);
    bn.lit = idx;
  };

  /* ---------- الحركة (نابض + تتبع الإصبع) ---------- */
  const tick = (now) => {
    const f = Math.min(Math.max((now - (bn.last || now)) / 16.667, 0.25), 3); // ثبات السرعة على 60/120Hz
    bn.last = now;
    const d = bn.target - bn.x;
    if (bn.dragging) {
      // أثناء السحب: تتبع سلس بدون ارتداد
      bn.v = 0;
      bn.x += d * (1 - Math.pow(0.62, f));
    } else {
      // بعد الرفع: نابض بارتداد خفيف
      bn.v = (bn.v + 0.2 * d * f) * Math.pow(0.62, f);
      bn.x += bn.v * f;
    }
    const sT = bn.lifted ? BN_LIFT : 1;
    bn.s += (sT - bn.s) * (1 - Math.pow(0.72, f));
    render();
    track();
    if (Math.abs(bn.target - bn.x) < 0.25 && Math.abs(bn.v) < 0.25 && Math.abs(sT - bn.s) < 0.003) {
      bn.x = bn.target;
      bn.s = sT;
      bn.v = 0;
      bn.raf = 0;
      bn.last = 0;
      render();
      return;
    }
    bn.raf = requestAnimationFrame(tick);
  };
  const kick = () => {
    if (!bn.raf) {
      bn.last = 0;
      bn.raf = requestAnimationFrame(tick);
    }
  };

  // انقل الكبسولة للتبويب i (instant = بدون حركة، مثل تغيير حجم الشاشة)
  const moveTo = (i, instant = false) => {
    bn.index = i;
    const it = items[i];
    if (!it || !it.offsetWidth) {
      // الشريط مخفي (قبل تسجيل الدخول مثلاً)
      bn.ready = false;
      return;
    }
    pill.style.opacity = "1";
    layout(i);
    bn.target = it.offsetLeft;
    if (instant || !bn.ready || reduceMotion) {
      bn.x = bn.target;
      bn.v = 0;
      bn.ready = true;
      render();
    } else {
      kick();
    }
    track();
  };

  /* ---------- السحب بالإصبع (أو الماوس) على الشريط ---------- */
  let g = null; // الحركة الجارية
  let swallowClick = false; // لمنع "نقرة" وهمية بعد السحب
  let swallowTimer = 0;

  const fingerX = (clientX) => clientX - nav.getBoundingClientRect().left - nav.clientLeft;

  const onPointerDown = (e) => {
    if (g || (e.pointerType === "mouse" && e.button !== 0)) return;
    swallowClick = false;
    const item = e.target.closest ? e.target.closest(".tab-btn") : null;
    const onPill = !!item && item === items[activeIndex];
    g = {
      id: e.pointerId,
      startX: e.clientX,
      lastX: e.clientX,
      lastT: e.timeStamp,
      vx: 0,
      moved: false,
      grab: 0,
      onPill,
    };
    if (onPill) {
      // لمس الكبسولة نفسها: ترتفع فوراً
      bn.lifted = true;
      nav.classList.add("is-lifted");
      kick();
    }
  };

  const onPointerMove = (e) => {
    if (!g || e.pointerId !== g.id) return;
    const w = bn.W || 1;
    if (!g.moved) {
      if (Math.abs(e.clientX - g.startX) < DRAG_THRESHOLD) return;
      g.moved = true;
      bn.dragging = true;
      bn.lifted = true;
      nav.classList.add("is-lifted");
      try {
        nav.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      // لو بدأ السحب من الكبسولة نفسها نحافظ على مكان الإصبع عليها (بدون قفزة)
      if (g.onPill) g.grab = clamp(fingerX(g.startX) - (bn.x + w / 2), -w / 2, w / 2);
    }
    const dt = Math.max(1, e.timeStamp - g.lastT);
    g.vx = g.vx * 0.6 + ((e.clientX - g.lastX) / dt) * 0.4; // px/ms
    g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    bn.target = rubber(fingerX(e.clientX) - w / 2 - g.grab);
    kick();
  };

  const finish = (e, cancelled) => {
    if (!g || e.pointerId !== g.id) return;
    const gest = g;
    g = null;
    bn.dragging = false;
    bn.lifted = false;
    nav.classList.remove("is-lifted");
    try {
      nav.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (!gest.moved) {
      // مجرد نقرة: حدث click على الزر هو اللي بيبدّل التبويب
      kick();
      return;
    }

    swallowClick = true;
    clearTimeout(swallowTimer);
    swallowTimer = setTimeout(() => {
      swallowClick = false;
    }, 400);

    const w = bn.W || 1;
    // الحركة السريعة (flick) تدفع الاختيار للتبويب التالي؛ لو وقف الإصبع قبل الرفع فلا سرعة
    const idle = e.timeStamp - gest.lastT;
    const vx = idle > 90 || Math.abs(gest.vx) < 0.35 ? 0 : gest.vx; // px/ms
    const push = clamp(vx * 110, -w, w);
    const idx = cancelled ? activeIndex : nearest(bn.x + w / 2 + push);

    if (idx >= 0 && idx !== activeIndex) {
      buzz(10);
      activateTab(tabOrder[idx]); // بيحرّك الكبسولة للتبويب الجديد
    } else {
      moveTo(activeIndex); // نفس التبويب: ارتداد للمكان
    }
  };

  // لا تفعّل زر التبويب اللي انتهى عليه الإصبع بعد السحب
  const onClickCapture = (e) => {
    if (swallowClick) {
      e.preventDefault();
      e.stopPropagation();
      swallowClick = false;
    }
  };
  const stop = (e) => e.preventDefault();

  nav.addEventListener("pointerdown", onPointerDown);
  nav.addEventListener("pointermove", onPointerMove);
  nav.addEventListener("pointerup", (e) => finish(e, false));
  nav.addEventListener("pointercancel", (e) => finish(e, true));
  nav.addEventListener("click", onClickCapture, true);
  nav.addEventListener("contextmenu", stop);
  nav.addEventListener("dragstart", stop);

  // أعد ضبط الكبسولة فوراً لما حجم الشريط يتغيّر (تدوير الشاشة، أو ظهور الداش بعد تسجيل الدخول)
  const sync = () => {
    if (!bn.dragging) moveTo(activeIndex, true);
  };
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(sync).observe(nav);
  } else {
    window.addEventListener("resize", sync);
  }

  return { moveTo };
}

if (tabsBar && tabButtons.length) {
  tabButtons[activeIndex]?.setAttribute("aria-current", "page");
  pillNav = initPillNav(tabsBar, tabButtons);
  pillNav.moveTo(activeIndex, true);
}

/* ============================================================
   السحب الأفقي على منطقة المحتوى للتنقل بين التبويبات
   ============================================================ */
// هل بدأ اللمس داخل عنصر بيتمرّر أفقياً (زي شريط صور الأخبار) أو حقل إدخال؟ — بهالحالة السحب إله مو للتنقل بين التبويبات
function startsInNoSwipeZone(target, boundary) {
  if (!target || !target.closest) return false;
  if (target.closest(".item-images, [data-no-swipe], input, textarea, select")) return true;
  for (let n = target; n && n !== boundary; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 1) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
  }
  return false;
}

function bindSwipe(el, { minDistance = 40, ignoreVertical = true } = {}) {
  if (!el) return;
  let startX = 0;
  let startY = 0;
  let tracking = false;

  el.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      if (startsInNoSwipeZone(e.target, el)) {
        tracking = false;
        return;
      }
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

      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = e.changedTouches[0].clientY - startY;

      if (Math.abs(deltaX) < minDistance) return;
      if (ignoreVertical && Math.abs(deltaX) < Math.abs(deltaY) * 1.3) return;

      if (deltaX < 0)
        goToNextTab(); // سحب لليسار → التبويب التالي
      else goToPrevTab(); // سحب لليمين → التبويب السابق
    },
    { passive: true },
  );
}

bindSwipe(panelsViewport, { minDistance: 55, ignoreVertical: true });
