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

    // Query by recipientId (single where = no index needed)
    const snap1 = await db.collection('notifications').where('recipientId', '==', uid).get();

    // For owner: also fetch by ownerId to catch stop_event notifications
    let allDocs = [...snap1.docs];
    if (role === 'owner') {
      const snap2 = await db.collection('notifications').where('ownerId', '==', uid).get();
      const seen = new Set(snap1.docs.map((d) => d.id));
      snap2.docs.forEach((d) => { if (!seen.has(d.id)) allDocs.push(d); });
    }

    const notifications = allDocs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0))
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
    const data = doc.data();
    if (data.recipientId !== req.user.uid && data.ownerId !== req.user.uid)
      return res.status(403).json({ error: 'Forbidden' });
    await doc.ref.update({ read: true });
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

// POST /api/notifications/read-all
// Uses single where per query + in-memory filter to avoid composite index requirement
router.post('/read-all', authenticate, async (req, res, next) => {
  try {
    const db = getDb();
    const uid = req.user.uid;

    const snap1 = await db.collection('notifications').where('recipientId', '==', uid).get();
    let allDocs = [...snap1.docs];

    if (req.user.role === 'owner') {
      const snap2 = await db.collection('notifications').where('ownerId', '==', uid).get();
      const seen = new Set(snap1.docs.map((d) => d.id));
      snap2.docs.forEach((d) => { if (!seen.has(d.id)) allDocs.push(d); });
    }

    const batch = db.batch();
    allDocs
      .filter((doc) => doc.data().read === false)
      .forEach((doc) => batch.update(doc.ref, { read: true }));
    await batch.commit();
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
