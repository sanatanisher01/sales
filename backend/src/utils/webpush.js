const webpush = require('web-push');

let initialized = false;

function initWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured — push notifications disabled');
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@salestrack.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  initialized = true;
  console.log('Web Push (VAPID) initialized');
}

/**
 * Send a push notification with retry logic (up to 3 attempts, 30s apart).
 */
async function sendPushNotification(subscription, payload, attempt = 1) {
  if (!initialized) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    // 410 Gone = subscription expired/unsubscribed — don't retry
    if (err.statusCode === 410) {
      console.warn('Push subscription expired (410), skipping retry');
      return;
    }
    if (attempt < 3) {
      console.warn(`Push notification failed (attempt ${attempt}), retrying in 30s…`);
      await new Promise((r) => setTimeout(r, 30000));
      return sendPushNotification(subscription, payload, attempt + 1);
    }
    console.error('Push notification failed after 3 attempts:', err.message);
  }
}

function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

module.exports = { initWebPush, sendPushNotification, getVapidPublicKey };
