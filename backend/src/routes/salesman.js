const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('salesman'));

// POST /api/salesman/duty/start
router.post('/duty/start', async (req, res, next) => {
  try {
    const db = getDb();
    const salesmanId = req.user.uid;

    const existing = await db.collection('dutySessions')
      .where('salesmanId', '==', salesmanId)
      .where('status', '==', 'active')
      .limit(1).get();

    if (!existing.empty)
      return res.status(409).json({ error: 'A duty session is already in progress' });

    const sessionId = uuidv4();
    const now = new Date();

    await db.collection('dutySessions').doc(sessionId).set({
      salesmanId, salesmanName: req.user.name,
      ownerId: req.user.ownerId,
      status: 'active', startedAt: now, endedAt: null, totalDistanceKm: 0,
    });

    await db.collection('users').doc(salesmanId).update({
      dutyStatus: 'On Duty', activeSessionId: sessionId,
    });

    res.status(201).json({ message: 'Duty session started', sessionId });
  } catch (err) {
    next(err);
  }
});

// POST /api/salesman/duty/stop
router.post('/duty/stop', async (req, res, next) => {
  try {
    const db = getDb();
    const salesmanId = req.user.uid;

    const existing = await db.collection('dutySessions')
      .where('salesmanId', '==', salesmanId)
      .where('status', '==', 'active')
      .limit(1).get();

    if (existing.empty)
      return res.status(404).json({ error: 'No active duty session found' });

    const sessionDoc = existing.docs[0];
    const now = new Date();

    // Single where — avoids composite index; filter resolved in memory
    const stopEventsSnap = await db.collection('stopEvents')
      .where('sessionId', '==', sessionDoc.id)
      .get();

    const batch = db.batch();
    stopEventsSnap.docs
      .filter((doc) => doc.data().resolved === false)
      .forEach((doc) => batch.update(doc.ref, { resolved: true, endTime: now }));

    batch.update(sessionDoc.ref, { status: 'ended', endedAt: now });

    // Clear liveLocation so owner map removes marker immediately
    batch.update(db.collection('users').doc(salesmanId), {
      dutyStatus: 'Off Duty',
      activeSessionId: null,
      liveLocation: null,
    });

    await batch.commit();
    res.json({ message: 'Duty session ended', sessionId: sessionDoc.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/salesman/duty/status
router.get('/duty/status', async (req, res, next) => {
  try {
    const db = getDb();
    const existing = await db.collection('dutySessions')
      .where('salesmanId', '==', req.user.uid)
      .where('status', '==', 'active')
      .limit(1).get();

    if (existing.empty) return res.json({ onDuty: false, session: null });

    const session = existing.docs[0];
    res.json({ onDuty: true, session: { id: session.id, ...session.data() } });
  } catch (err) {
    next(err);
  }
});

// GET /api/salesman/orders — single where, sort in memory
router.get('/orders', async (req, res, next) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('orders')
      .where('salesmanId', '==', req.user.uid)
      .get();

    const orders = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?._seconds ?? 0;
        const tb = b.createdAt?._seconds ?? 0;
        return tb - ta;
      })
      .slice(0, 100);

    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
