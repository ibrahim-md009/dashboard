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

const COLLECTION_NAME = "statistics";

/**
 * إضافة إحصائية جديدة
 * @param {{title: string, value: number, suffix: string}} payload
 */
export const createStatistic = async (payload) => {
  return await addDoc(collection(db, COLLECTION_NAME), {
    ...payload,
    createdAt: serverTimestamp(),
  });
};

/**
 * تعديل إحصائية
 */
export const updateStatistic = async (id, payload) => {
  return await updateDoc(doc(db, COLLECTION_NAME, id), payload);
};

/**
 * حذف إحصائية
 */
export const deleteStatistic = async (id) => {
  return await deleteDoc(doc(db, COLLECTION_NAME, id));
};

/**
 * الاشتراك في التغييرات الحية للإحصائيات
 */
export const subscribeToStatistics = (onDataChanged) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const stats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onDataChanged(stats);
  });
};
