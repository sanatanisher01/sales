import { create } from 'zustand';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import api from '../api/axios';

let unsubscribeListener = null;

export const useSalesmanNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,

  // Start real-time Firestore listener for salesman notifications
  startListener: (salesmanId) => {
    if (unsubscribeListener) { unsubscribeListener(); unsubscribeListener = null; }

    set({ loading: true });

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', salesmanId)
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
      console.error('Salesman notification listener error:', err);
      set({ loading: false });
    });
  },

  stopListener: () => {
    if (unsubscribeListener) { unsubscribeListener(); unsubscribeListener = null; }
    set({ notifications: [], unreadCount: 0 });
  },

  markRead: async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch {
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
}));
