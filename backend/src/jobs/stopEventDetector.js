const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { haversineDistance, reverseGeocode } = require('../utils/geo');
const { sendPushNotification } = require('../utils/webpush');

const STOP_RADIUS_METRES = 50;
const STOP_DURATION_MS = 5 * 60 * 1000;

async function detectStopEvents() {
  try {
    const db = getDb();

    const sessionsSnap = await db.collection('dutySessions').where('status', '==', 'active').get();
    if (sessionsSnap.empty) return;

    for (const sessionDoc of sessionsSnap.docs) {
      const session = sessionDoc.data();
      const sessionId = sessionDoc.id;
      const salesmanId = session.salesmanId;
      const ownerId = session.ownerId;

      // Single where — sort in memory
      const cutoff = new Date(Date.now() - 10 * 60 * 1000);
      const pingsSnap = await db.collection('locationPings')
        .where('sessionId', '==', sessionId)
        .get();

      const pings = pingsSnap.docs
        .map((d) => ({ ...d.data(), id: d.id }))
        .filter((p) => p.timestamp.toDate() >= cutoff)
        .sort((a, b) => a.timestamp._seconds - b.timestamp._seconds);

      if (pings.length < 2) continue;

      const stopCandidateStart = new Date(Date.now() - STOP_DURATION_MS);
      const recentPings = pings.filter((p) => p.timestamp.toDate() >= stopCandidateStart);
      if (recentPings.length < 2) continue;

      const anchor = recentPings[0];
      const allWithinRadius = recentPings.every((p) =>
        haversineDistance(anchor.lat, anchor.lng, p.lat, p.lng) <= STOP_RADIUS_METRES
      );

      const openStopSnap = await db.collection('stopEvents')
        .where('sessionId', '==', sessionId)
        .where('resolved', '==', false)
        .limit(1).get();

      if (allWithinRadius) {
        if (openStopSnap.empty) {
          // New stop event
          const stopId = uuidv4();
          const stopLat = anchor.lat;
          const stopLng = anchor.lng;
          const startTime = anchor.timestamp.toDate();

          let address = await reverseGeocode(stopLat, stopLng);
          if (!address) address = `${stopLat.toFixed(6)}, ${stopLng.toFixed(6)}`;

          const now = new Date();

          // Save stop event
          await db.collection('stopEvents').doc(stopId).set({
            sessionId, salesmanId, salesmanName: session.salesmanName,
            ownerId, lat: stopLat, lng: stopLng, address,
            startTime, endTime: null, resolved: false, createdAt: now,
          });

          const title = `${session.salesmanName} stopped`;
          const body = `Stopped at: ${address}`;

          // Save in-app notification record
          await db.collection('notifications').doc(uuidv4()).set({
            ownerId,
            type: 'stop_event',
            title,
            body,
            stopId,
            salesmanId,
            salesmanName: session.salesmanName,
            sessionId,
            read: false,
            createdAt: now,
          });

          // Send Web Push to owner
          const subSnap = await db.collection('pushSubscriptions').doc(ownerId).get();
          if (subSnap.exists) {
            const { subscription } = subSnap.data();
            sendPushNotification(subscription, {
              title,
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              data: { type: 'stop_event', stopId, salesmanId, sessionId, url: '/owner/map' },
            });
          }
        }
      } else {
        // Salesman moving — resolve open stop event
        if (!openStopSnap.empty) {
          const stopDoc = openStopSnap.docs[0];
          const stopData = stopDoc.data();
          const endTime = new Date();
          await stopDoc.ref.update({ resolved: true, endTime });

          // Save resolved notification
          await db.collection('notifications').doc(uuidv4()).set({
            ownerId,
            type: 'stop_resolved',
            title: `${session.salesmanName} is moving again`,
            body: `Resumed from: ${stopData.address || 'unknown location'}`,
            stopId: stopDoc.id,
            salesmanId,
            salesmanName: session.salesmanName,
            sessionId,
            read: false,
            createdAt: endTime,
          });

          // Send Web Push for resolution too
          const subSnap = await db.collection('pushSubscriptions').doc(ownerId).get();
          if (subSnap.exists) {
            const { subscription } = subSnap.data();
            sendPushNotification(subscription, {
              title: `${session.salesmanName} is moving again`,
              body: `Resumed from: ${stopData.address || 'unknown location'}`,
              icon: '/pwa-192x192.png',
              data: { type: 'stop_resolved', salesmanId, sessionId, url: '/owner/map' },
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Stop event detector error:', err.message);
  }
}

function startStopEventCron() {
  cron.schedule('* * * * *', detectStopEvents);
  console.log('Stop event detector cron started');
}

module.exports = { startStopEventCron, detectStopEvents };
