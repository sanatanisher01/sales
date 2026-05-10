import { create } from 'zustand';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import api from '../api/axios';

let unsubscribeListener = null;
let unsubscribeAuth = null;

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,
  pushSupported: 'serviceWorker' in navigator && 'PushManager' in window,
  pushSubscribed: false,

  // Start real-time Firestore listener for owner notifications
  startListener: (ownerId) => {
    if (unsubscribeListener) { unsubscribeListener(); unsubscribeListener = null; }
    if (unsubscribeAuth) { unsubscribeAuth(); unsubscribeAuth = null; }

    set({ loading: true });

    // Wait for Firebase auth before attaching listener (critical on mobile)
    unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeListener) { unsubscribeListener(); unsubscribeListener = null; }
      if (!firebaseUser) { set({ loading: false }); return; }

      const q = query(
        collection(db, 'notifications'),
        where('ownerId', '==', ownerId)
      );

      unsubscribeListener = onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ta = a.createdAt?.seconds ?? 0;
            const tb = b.createdAt?.seconds ?? 0;
            return tb - ta;
          })
          .slice(0, 50);

        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length,
          loading: false,
        });
      }, (err) => {
        console.error('Notification listener error:', err);
        set({ loading: false });
      });
    });
  },

  stopListener: () => {
    if (unsubscribeListener) { unsubscribeListener(); unsubscribeListener = null; }
    if (unsubscribeAuth) { unsubscribeAuth(); unsubscribeAuth = null; }
    set({ notifications: [], unreadCount: 0 });
  },

  markRead: async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      // onSnapshot will auto-update the store
    } catch {
      // fallback to API
      await api.patch(`/notifications/${id}/read`).catch(() => {});
    }
  },

  markAllRead: async () => {
    try {
      const { notifications } = get();
      const unread = notifications.filter((n) => !n.read);
      if (unread.length === 0) return;
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }));
      await batch.commit();
    } catch {
      await api.post('/notifications/read-all').catch(() => {});
    }
  },

  // Subscribe to Web Push
  subscribePush: async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await api.get('/notifications/vapid-public-key');
      const applicationServerKey = urlBase64ToUint8Array(keyRes.data.publicKey);
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      await api.post('/notifications/subscribe', { subscription });
      set({ pushSubscribed: true });
      return true;
    } catch (err) {
      console.error('Push subscribe error:', err);
      return false;
    }
  },

  unsubscribePush: async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await api.delete('/notifications/subscribe');
      set({ pushSubscribed: false });
      return true;
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      return false;
    }
  },

  checkPushStatus: async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      set({ pushSubscribed: !!sub });
    } catch { /* silent */ }
  },
}));

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
