const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { hashPassword, validatePasswordStrength } = require('../utils/password');

router.use(authenticate, requireRole('owner'));

// GET /api/owner/team
router.get('/team', async (req, res, next) => {
  try {
    const db = getDb();
    // Single where clause — no composite index needed
    const snapshot = await db.collection('users').where('ownerId', '==', req.user.uid).get();

    const team = snapshot.docs
      .map((doc) => {
        const d = doc.data();
        return {
          uid: doc.id, name: d.name, email: d.email,
          phone: d.phone || null, role: d.role,
          isActive: d.isActive, dutyStatus: d.dutyStatus || 'Off Duty',
          createdAt: d.createdAt,
        };
      })
      .filter((m) => m.role === 'salesman' || m.role === 'accountant')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/team/salesman
router.post('/team/salesman', async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || name.length < 1 || name.length > 100)
      return res.status(400).json({ error: 'Name must be 1–100 characters' });
    if (!phone || !/^\d{7,15}$/.test(phone))
      return res.status(400).json({ error: 'Phone must be 7–15 digits' });
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Valid email required (max 254 chars)' });
    const pwErr = validatePasswordStrength(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const db = getDb();
    // Check duplicate email under this owner — single where, no index needed
    const existing = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (!existing.empty && existing.docs[0].data().ownerId === req.user.uid)
      return res.status(409).json({ error: 'Email already registered under your account' });

    const passwordHash = await hashPassword(password);
    const uid = uuidv4();
    const now = new Date();

    await db.collection('users').doc(uid).set({
      name, phone, email: email.toLowerCase(), passwordHash,
      role: 'salesman', ownerId: req.user.uid,
      isActive: true, dutyStatus: 'Off Duty',
      createdAt: now, updatedAt: now,
      failedLoginAttempts: 0, lockedUntil: null,
    });

    res.status(201).json({ message: 'Salesman created', uid });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/team/accountant
router.post('/team/accountant', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || name.length < 1 || name.length > 100)
      return res.status(400).json({ error: 'Name must be 1–100 characters' });
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Valid email required (max 254 chars)' });
    const pwErr = validatePasswordStrength(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const db = getDb();
    const existing = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (!existing.empty && existing.docs[0].data().ownerId === req.user.uid)
      return res.status(409).json({ error: 'Email already registered under your account' });

    const passwordHash = await hashPassword(password);
    const uid = uuidv4();
    const now = new Date();

    await db.collection('users').doc(uid).set({
      name, email: email.toLowerCase(), passwordHash,
      role: 'accountant', ownerId: req.user.uid,
      isActive: true, createdAt: now, updatedAt: now,
      failedLoginAttempts: 0, lockedUntil: null,
    });

    res.status(201).json({ message: 'Accountant created', uid });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/owner/team/:uid/deactivate
router.patch('/team/:uid/deactivate', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const db = getDb();

    const memberDoc = await db.collection('users').doc(uid).get();
    if (!memberDoc.exists || memberDoc.data().ownerId !== req.user.uid)
      return res.status(404).json({ error: 'Team member not found' });

    const batch = db.batch();
    batch.update(memberDoc.ref, { isActive: false, updatedAt: new Date() });

    // End active duty session — two where clauses, no orderBy, no index needed
    const activeSessions = await db.collection('dutySessions')
      .where('salesmanId', '==', uid)
      .where('status', '==', 'active')
      .limit(1).get();
    activeSessions.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'ended', endedAt: new Date() });
    });

    await batch.commit();
    res.json({ message: 'Team member deactivated' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/owner/team/:uid/activate
router.patch('/team/:uid/activate', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const db = getDb();
    const memberDoc = await db.collection('users').doc(uid).get();
    if (!memberDoc.exists || memberDoc.data().ownerId !== req.user.uid)
      return res.status(404).json({ error: 'Team member not found' });
    await memberDoc.ref.update({ isActive: true, updatedAt: new Date() });
    res.json({ message: 'Team member activated' });
  } catch (err) {
    next(err);
  }
});

// GET /api/owner/duty-sessions
router.get('/duty-sessions', async (req, res, next) => {
  try {
    const db = getDb();
    const { salesmanId, status } = req.query;

    // Base query — single where, no index needed
    let query = db.collection('dutySessions').where('ownerId', '==', req.user.uid);
    const snapshot = await query.get();

    let sessions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Filter in memory
    if (salesmanId) sessions = sessions.filter((s) => s.salesmanId === salesmanId);
    if (status) sessions = sessions.filter((s) => s.status === status);

    // Sort by startedAt desc in memory
    sessions.sort((a, b) => {
      const ta = a.startedAt?._seconds ?? 0;
      const tb = b.startedAt?._seconds ?? 0;
      return tb - ta;
    });

    res.json({ sessions: sessions.slice(0, 100) });
  } catch (err) {
    next(err);
  }
});

// GET /api/owner/duty-sessions/:sessionId/trail
router.get('/duty-sessions/:sessionId/trail', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const db = getDb();

    const sessionDoc = await db.collection('dutySessions').doc(sessionId).get();
    if (!sessionDoc.exists || sessionDoc.data().ownerId !== req.user.uid)
      return res.status(404).json({ error: 'Session not found' });

    // Single where — no composite index needed; sort in memory
    const trailSnapshot = await db.collection('locationPings')
      .where('sessionId', '==', sessionId)
      .get();

    const trail = trailSnapshot.docs
      .map((doc) => {
        const d = doc.data();
        return { lat: d.lat, lng: d.lng, timestamp: d.timestamp };
      })
      .sort((a, b) => {
        const ta = a.timestamp?._seconds ?? 0;
        const tb = b.timestamp?._seconds ?? 0;
        return ta - tb; // asc
      });

    res.json({ trail, session: { id: sessionDoc.id, ...sessionDoc.data() } });
  } catch (err) {
    next(err);
  }
});

// GET /api/owner/stop-events
router.get('/stop-events', async (req, res, next) => {
  try {
    const db = getDb();
    // Single where — no index needed; sort in memory
    const snapshot = await db.collection('stopEvents')
      .where('ownerId', '==', req.user.uid)
      .get();

    const events = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const ta = a.startTime?._seconds ?? 0;
        const tb = b.startTime?._seconds ?? 0;
        return tb - ta;
      })
      .slice(0, 50);

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
