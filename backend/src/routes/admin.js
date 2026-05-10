const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');
const { authenticate, requireRole } = require('../middleware/auth');
const { hashPassword, validatePasswordStrength } = require('../utils/password');
const { sendVerificationEmail } = require('../utils/email');

router.use(authenticate, requireRole('admin'));

// GET /api/admin/owners — paginated list
router.get('/owners', async (req, res, next) => {
  try {
    const db = getDb();
    const page = parseInt(req.query.page) || 1;
    const pageSize = 25;

    // No orderBy — sort in memory to avoid composite index requirement
    const allDocs = await db.collection('users').where('role', '==', 'owner').get();

    const owners = allDocs.docs
      .map((doc) => {
        const d = doc.data();
        return { uid: doc.id, name: d.name, email: d.email, createdAt: d.createdAt, isActive: d.isActive };
      })
      .sort((a, b) => {
        const ta = a.createdAt?._seconds ?? 0;
        const tb = b.createdAt?._seconds ?? 0;
        return tb - ta; // desc
      });

    const total = owners.length;
    const start = (page - 1) * pageSize;
    const paginated = owners.slice(start, start + pageSize);

    res.json({ owners: paginated, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/owners — create owner
router.post('/owners', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || name.length < 1 || name.length > 100)
      return res.status(400).json({ error: 'Name must be 1–100 characters' });
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Valid email address required (max 254 chars)' });
    const pwErr = validatePasswordStrength(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const db = getDb();
    const existing = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (!existing.empty) return res.status(409).json({ error: 'Email address is already in use' });

    const passwordHash = await hashPassword(password);
    const uid = uuidv4();
    const now = new Date();

    await db.collection('users').doc(uid).set({
      name, email: email.toLowerCase(), passwordHash,
      role: 'owner', isActive: true,
      createdAt: now, updatedAt: now,
      failedLoginAttempts: 0, lockedUntil: null,
      ownerId: uid,
    });

    sendVerificationEmail(email, name).catch((e) => console.error('Email error:', e));
    res.status(201).json({ message: 'Owner account created', uid });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/owners/:uid/deactivate
router.patch('/owners/:uid/deactivate', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const db = getDb();

    const ownerDoc = await db.collection('users').doc(uid).get();
    if (!ownerDoc.exists || ownerDoc.data().role !== 'owner')
      return res.status(404).json({ error: 'Owner not found' });

    const batch = db.batch();
    batch.update(ownerDoc.ref, { isActive: false, updatedAt: new Date() });

    const teamSnapshot = await db.collection('users').where('ownerId', '==', uid).get();
    teamSnapshot.docs.forEach((doc) => {
      if (doc.id !== uid) batch.update(doc.ref, { isActive: false, updatedAt: new Date() });
    });

    // End active duty sessions — no orderBy needed
    const activeSessions = await db.collection('dutySessions')
      .where('ownerId', '==', uid)
      .where('status', '==', 'active')
      .get();
    activeSessions.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'ended', endedAt: new Date() });
    });

    await batch.commit();
    res.json({ message: 'Owner and all team members deactivated' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/owners/:uid/activate
router.patch('/owners/:uid/activate', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const db = getDb();
    const ownerDoc = await db.collection('users').doc(uid).get();
    if (!ownerDoc.exists || ownerDoc.data().role !== 'owner')
      return res.status(404).json({ error: 'Owner not found' });
    await ownerDoc.ref.update({ isActive: true, updatedAt: new Date() });
    res.json({ message: 'Owner activated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
