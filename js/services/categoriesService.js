import { db } from "../config.js";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COLLECTION_NAME = "categories";

/**
 * إنشاء تصنيف جديد
 * @param {string} name
 */
export const createCategory = async (name) => {
  return await addDoc(collection(db, COLLECTION_NAME), { name });
};

/**
 * تعديل اسم تصنيف حالي
 * @param {string} id
 * @param {string} name
 */
export const updateCategory = async (id, name) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return await updateDoc(docRef, { name });
};

/**
 * حذف تصنيف
 * @param {string} id
 */
export const deleteCategory = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return await deleteDoc(docRef);
};

/**
 * الاستماع الحي للتصنيفات مرتبة أبجدياً
 * @param {Function} onDataChanged
 */
export const subscribeToCategories = (onDataChanged) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("name"));

  return onSnapshot(q, (snap) => {
    const categories = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    onDataChanged(categories);
  });
};
