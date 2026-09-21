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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COLLECTION_NAME = "works";

/**
 * إضافة عمل جديد
 * @param {Object} payload
 */
export const createWork = async (payload) => {
  return await addDoc(collection(db, COLLECTION_NAME), {
    ...payload,
    createdAt: serverTimestamp(),
  });
};

/**
 * تعديل عمل حالي
 * @param {string} id
 * @param {Object} payload
 */
export const updateWork = async (id, payload) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return await updateDoc(docRef, payload);
};

/**
 * حذف عمل
 * @param {string} id
 */
export const deleteWork = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id); // ✅ تم التصحيح: doc واحدة فقط تاخد db و collection و id
  return await deleteDoc(docRef);
};

/**
 * الاشتراك في التغييرات الحية للأعمال (Realtime Listener)
 * @param {Function} onDataChanged - Callback يتم استدعاؤه فور أي تغيير في الداتا
 */
export const subscribeToWorks = (onDataChanged) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const works = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    onDataChanged(works);
  });
};
