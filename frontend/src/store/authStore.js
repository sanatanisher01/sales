import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';
import { signInToFirebase, signOutFromFirebase } from '../lib/firebase';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { token, user } = res.data;
        set({ token, user });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Mint Firebase custom token and sign into Firestore SDK
        try {
          const fbRes = await api.get('/auth/firebase-token');
          await signInToFirebase(fbRes.data.customToken);
        } catch (err) {
          console.warn('Firebase sign-in skipped:', err.message);
        }

        return user;
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch {}
        await signOutFromFirebase();
        set({ user: null, token: null });
        delete api.defaults.headers.common['Authorization'];
      },

      setToken: (token) => {
        set({ token });
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      hydrate: async () => {
        const { token } = get();
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          // Re-sign into Firebase on page reload
          try {
            const fbRes = await api.get('/auth/firebase-token');
            await signInToFirebase(fbRes.data.customToken);
          } catch { /* silent — token may be expired */ }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
