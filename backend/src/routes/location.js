const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');

// POST /api/location/ping — salesman sends GPS coordinate
router.post('/ping', authenticate, requireRole('salesman'), async (req, res, next) => {
  try {
    const { lat, lng, accuracy } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng are required numbers' });
    }

    const db = getDb();
    const salesmanId = req.user.uid;

    // Find active session
    const sessionSnap = await db.collection('dutySessions')
      .where('salesmanId', '==', salesmanId)
      .where('status', '==', 'active')
      .limit(1).get();

    if (sessionSnap.empty) {
      return res.status(404).json({ error: 'No active duty session' });
    }

    const sessionDoc = sessionSnap.docs[0];
    const sessionId = sessionDoc.id;
    const now = new Date();

    // Store ping
    const pingId = uuidv4();
    await db.collection('locationPings').doc(pingId).set({
      salesmanId,
      salesmanName: req.user.name,
      ownerId: req.user.ownerId,
      sessionId,
      lat,
      lng,
      accuracy: accuracy || null,
      timestamp: now,
    });

    // Update live location on user doc (for quick owner map reads)
    await db.collection('users').doc(salesmanId).update({
      liveLocation: { lat, lng, timestamp: now },
    });

    res.json({ message: 'Location recorded', pingId });
  } catch (err) {
    next(err);
  }
});

// GET /api/location/live — owner gets all on-duty salesmen live locations
router.get('/live', authenticate, requireRole('owner'), async (req, res, next) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('users')
      .where('ownerId', '==', req.user.uid)
      .where('role', '==', 'salesman')
      .where('dutyStatus', '==', 'On Duty')
      .get();

    const locations = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        uid: doc.id,
        name: d.name,
        liveLocation: d.liveLocation || null,
        activeSessionId: d.activeSessionId || null,
      };
    });

    res.json({ locations });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
