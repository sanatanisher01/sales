import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

export function usePushNotifications() {
  const { user } = useAuthStore();
  const { startListener, stopListener, subscribePush, checkPushStatus, pushSupported } =
    useNotificationStore();
  const navigate = useNavigate();

  // Start real-time Firestore listener
  useEffect(() => {
    if (user?.role !== 'owner' || !user?.uid) return;
    startListener(user.uid);
    return () => stopListener();
  }, [user?.uid, user?.role, startListener, stopListener]);

  // Register service worker
  useEffect(() => {
    if (!pushSupported || user?.role !== 'owner') return;
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered:', reg.scope);
      checkPushStatus();
    }).catch((err) => console.warn('SW registration failed:', err));
  }, [user, pushSupported, checkPushStatus]);

  // Auto-subscribe to push when SW is ready
  useEffect(() => {
    if (!pushSupported || user?.role !== 'owner') return;
    const autoSubscribe = async () => {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (!existing) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') await subscribePush();
      }
    };
    autoSubscribe().catch(() => {});
  }, [user, pushSupported, subscribePush]);

  // Listen for SW navigation messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
      if (event.data?.type === 'NAVIGATE' && event.data.url) navigate(event.data.url);
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [navigate]);
}
