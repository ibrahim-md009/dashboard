import {
  createStatistic,
  updateStatistic,
  deleteStatistic,
  subscribeToStatistics,
} from "./services/statisticsService.js";

// === DOM Elements ===
const statsForm = document.getElementById("form-statistics");
const statsTitleInput = document.getElementById("statistics-title");
const statsValueInput = document.getElementById("statistics-value");
const statsSuffixSelect = document.getElementById("statistics-suffix");
const statsSubmitBtn = document.getElementById("statistics-submit-btn");
const statsCancelBtn = document.getElementById("statistics-cancel-btn");
const statsFormTitle = document.getElementById("statistics-form-title");
const statsStatusEl = document.getElementById("statistics-status");
const statsCard = statsForm.closest(".card");

// === State ===
let editingStatId = null;

// === Event Listeners ===
statsCancelBtn.addEventListener("click", resetStatsForm);

statsForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = statsTitleInput.value.trim();
  const value = Number(statsValueInput.value);

  if (!title) {
    statsStatusEl.textContent = "الاسم إلزامي";
    return;
  }
  if (statsValueInput.value === "" || Number.isNaN(value)) {
    statsStatusEl.textContent = "الرقم غير صحيح";
    return;
  }

  statsSubmitBtn.disabled = true;
  statsSubmitBtn.textContent = editingStatId ? "جاري الحفظ..." : "جاري الإضافة...";

  try {
    const payload = { title, value, suffix: statsSuffixSelect.value };

    if (editingStatId) {
      await updateStatistic(editingStatId, payload);
    } else {
      await createStatistic(payload);
    }

    resetStatsForm();
    statsStatusEl.textContent = "";
  } catch (err) {
    console.error("Statistics Form Submit Error:", err);
    statsStatusEl.textContent = "صار خطأ، جرب مرة ثانية";
  } finally {
    statsSubmitBtn.disabled = false;
    statsSubmitBtn.textContent = editingStatId ? "حفظ التعديل" : "إضافة الإحصائية";
  }
});

// === Functions ===

export function listenStatistics() {
  subscribeToStatistics((stats) => {
    const list = document.getElementById("statistics-list");

    if (!stats.length) {
      list.innerHTML = '<p class="empty-msg">لسا ما في إحصائيات مضافة</p>';
      return;
    }

    list.innerHTML = "";
    stats.forEach((item) => {
      const row = document.createElement("div");
      row.className = "item";

      const info = document.createElement("div");
      info.className = "item-info";

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = `${item.value ?? ""}${item.suffix || ""}`;

      const main = document.createElement("p");
      main.className = "main";
      main.textContent = item.title || "";

      info.append(tag, main);

      const actions = document.createElement("div");
      actions.className = "item-actions";
      actions.innerHTML = `
        <button class="edit">تعديل</button>
        <button class="del">حذف</button>`;

      actions.querySelector(".edit").addEventListener("click", () => startEditStat(item));
      actions.querySelector(".del").addEventListener("click", async () => {
        if (confirm("متأكد بدك تحذف هالإحصائية؟")) {
          try {
            await deleteStatistic(item.id);
            if (editingStatId === item.id) resetStatsForm();
          } catch (err) {
            console.error("Delete Statistic Error:", err);
            alert("تعذر الحذف، جرب مرة ثانية");
          }
        }
      });

      row.append(info, actions);
      list.appendChild(row);
    });
  });
}

function startEditStat(item) {
  editingStatId = item.id;
  statsTitleInput.value = item.title || "";
  statsValueInput.value = item.value ?? "";
  statsSuffixSelect.value = item.suffix || "";
  statsSubmitBtn.textContent = "حفظ التعديل";
  statsFormTitle.textContent = "تعديل إحصائية";
  statsCancelBtn.style.display = "inline-block";
  statsCard.classList.add("editing");
  statsCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetStatsForm() {
  editingStatId = null;
  statsForm.reset();
  statsSubmitBtn.textContent = "إضافة الإحصائية";
  statsFormTitle.textContent = "إضافة إحصائية جديدة";
  statsCancelBtn.style.display = "none";
  statsCard.classList.remove("editing");
}
