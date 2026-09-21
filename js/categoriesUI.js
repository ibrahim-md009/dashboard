import { createCategory, updateCategory, deleteCategory, subscribeToCategories } from "./services/categoriesService.js";

// مُصدَّر لأن نموذج "آخر الأعمال" بحاجة يقرأ منه القيمة المختارة
export const categorySelect = document.getElementById("works-category");

// === DOM Elements ===
const categoryForm = document.getElementById("form-category");
const categoryInput = document.getElementById("category-name-input");
const categorySaveBtn = document.getElementById("category-save-btn");
const categoryCancelBtn = document.getElementById("category-cancel-btn");
const categoryFormTitle = document.getElementById("category-form-title");

// === State ===
let editingCategoryId = null;

// === Event Listeners ===
categoryCancelBtn.addEventListener("click", resetCategoryForm);

categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = categoryInput.value.trim();
  if (!name) return;

  categorySaveBtn.disabled = true;

  try {
    if (editingCategoryId) {
      await updateCategory(editingCategoryId, name);
    } else {
      await createCategory(name);
    }
    resetCategoryForm();
  } catch (err) {
    console.error("Category Form Submit Error:", err);
    alert("صار خطأ: " + err.message);
  } finally {
    categorySaveBtn.disabled = false;
  }
});

// === Main Module Functions ===

export function listenCategories() {
  subscribeToCategories((categories) => {
    // 1. تحديث قائمة الاختيار بفورم الأعمال (works.js)
    categorySelect.innerHTML = "";
    if (!categories.length) {
      const opt = document.createElement("option");
      opt.textContent = "أضف تصنيف أولاً من تبويب التصنيفات";
      opt.disabled = true;
      categorySelect.appendChild(opt);
    } else {
      categories.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat.name;
        opt.textContent = cat.name;
        categorySelect.appendChild(opt);
      });
    }

    // 2. تحديث قائمة إدارة التصنيفات في شاشة التبويب
    const list = document.getElementById("categories-list");
    if (!categories.length) {
      list.innerHTML = '<p class="empty-msg">لسا ما في تصنيفات مضافة</p>';
      return;
    }

    list.innerHTML = "";
    categories.forEach((cat) => {
      const row = document.createElement("div");
      row.className = "category-row";
      row.innerHTML = `
        <span class="cat-name">${cat.name}</span>
        <div class="item-actions">
          <button class="edit" data-id="${cat.id}" data-name="${cat.name}">تعديل</button>
          <button class="del" data-id="${cat.id}">حذف</button>
        </div>`;

      row.querySelector(".edit").addEventListener("click", () => startEditCategory(cat.id, cat.name));
      row.querySelector(".del").addEventListener("click", async () => {
        if (confirm(`متأكد بدك تحذف تصنيف "${cat.name}"؟ (الأعمال القديمة المرتبطة فيه رح تحتفظ باسمه القديم)`)) {
          await deleteCategory(cat.id);
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
