const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { getVapidPublicKey } = require('../utils/webpush');

// GET /api/notifications/vapid-public-key
router.get('/vapid-public-key', authenticate, (req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(503).json({ error: 'Push notifications not configured' });
  res.json({ publicKey: key });
});

// POST /api/notifications/subscribe — owner saves push subscription
router.post('/subscribe', authenticate, requireRole('owner'), async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint)
      return res.status(400).json({ error: 'Invalid push subscription' });
    const db = getDb();
    await db.collection('pushSubscriptions').doc(req.user.uid).set({
      uid: req.user.uid, subscription, updatedAt: new Date(),
    });
    res.json({ message: 'Push subscription saved' });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/subscribe
router.delete('/subscribe', authenticate, requireRole('owner'), async (req, res, next) => {
  try {
    await getDb().collection('pushSubscriptions').doc(req.user.uid).delete();
    res.json({ message: 'Push subscription removed' });
  } catch (err) { next(err); }
});

// GET /api/notifications — works for both owner and salesman
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDb();
    const uid = req.user.uid;
    const role = req.user.role;

    // Query by recipientId field (works for both roles, single where = no index needed)
    const snapshot = await db.collection('notifications')
      .where('recipientId', '==', uid)
      .get();

    // Fallback: also query by ownerId for legacy stop_event notifications
    let extra = [];
    if (role === 'owner') {
      const legacySnap = await db.collection('notifications')
        .where('ownerId', '==', uid)
        .get();
      const legacyIds = new Set(snapshot.docs.map((d) => d.id));
      extra = legacySnap.docs
        .filter((d) => !legacyIds.has(d.id))
        .map((d) => ({ id: d.id, ...d.data() }));
    }

    const notifications = [
      ...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      ...extra,
    ].sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0))
      .slice(0, 50);

    res.json({ notifications });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const db = getDb();
    const doc = await db.collection('notifications').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Notification not found' });
    // Only the recipient can mark it read
    const data = doc.data();
    if (data.recipientId !== req.user.uid && data.ownerId !== req.user.uid)
      return res.status(403).json({ error: 'Forbidden' });
    await doc.ref.update({ read: true });
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

// POST /api/notifications/read-all
router.post('/read-all', authenticate, async (req, res, next) => {
  try {
    const db = getDb();
    const uid = req.user.uid;

    const snap1 = await db.collection('notifications').where('recipientId', '==', uid).where('read', '==', false).get();
    const snap2 = req.user.role === 'owner'
      ? await db.collection('notifications').where('ownerId', '==', uid).where('read', '==', false).get()
      : { docs: [] };

    const seen = new Set();
    const batch = db.batch();
    [...snap1.docs, ...snap2.docs].forEach((doc) => {
      if (!seen.has(doc.id)) { seen.add(doc.id); batch.update(doc.ref, { read: true }); }
    });
    await batch.commit();
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
