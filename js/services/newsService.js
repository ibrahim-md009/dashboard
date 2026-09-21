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

const COLLECTION_NAME = "news";

/**
 * إضافة خبر جديد
 * @param {Object} payload
 */
export const createNews = async (payload) => {
  return await addDoc(collection(db, COLLECTION_NAME), {
    ...payload,
    createdAt: serverTimestamp(),
  });
};

/**
 * تعديل خبر حالي
 * @param {string} id
 * @param {Object} payload
 */
export const updateNews = async (id, payload) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return await updateDoc(docRef, payload);
};

/**
 * حذف خبر
 * @param {string} id
 */
export const deleteNews = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return await deleteDoc(docRef);
};

/**
 * الاشتراك الحي في قائمة الأخبار (Realtime Listener)
 * @param {Function} onDataChanged
 */
export const subscribeToNews = (onDataChanged) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const newsList = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    onDataChanged(newsList);
  });
};
