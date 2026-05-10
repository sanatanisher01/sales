const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');
const { comparePassword, hashPassword, validatePasswordStrength } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { loginLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const snapshot = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Check lockout
    if (user.lockedUntil && user.lockedUntil.toDate() > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.toDate() - new Date()) / 60000);
      return res.status(423).json({
        error: `Account locked. Try again in ${remaining} minute(s).`,
        remainingMinutes: remaining,
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account deactivated' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      const failCount = (user.failedLoginAttempts || 0) + 1;
      const updates = { failedLoginAttempts: failCount };
      if (failCount >= 3) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        updates.failedLoginAttempts = 0;
      }
      await userDoc.ref.update(updates);
      if (failCount >= 3) {
        return res.status(423).json({ error: 'Account locked for 15 minutes due to too many failed attempts.', remainingMinutes: 15 });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on success
    await userDoc.ref.update({ failedLoginAttempts: 0, lockedUntil: null, lastLogin: new Date() });

    const token = generateToken({ uid: userDoc.id, role: user.role, ownerId: user.ownerId || null });
    res.json({
      token,
      user: {
        uid: userDoc.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ownerId: user.ownerId || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout (client-side token discard; server records last activity)
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await getDb().collection('users').doc(req.user.uid).update({ lastLogout: new Date() });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const err = validatePasswordStrength(newPassword);
    if (err) return res.status(400).json({ error: err });

    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const user = userDoc.data();

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await hashPassword(newPassword);
    await userDoc.ref.update({ passwordHash: newHash, updatedAt: new Date() });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { uid, name, email, role, ownerId } = req.user;
  res.json({ uid, name, email, role, ownerId });
});

// GET /api/auth/firebase-token — mint a Firebase custom token for Firestore SDK
router.get('/firebase-token', authenticate, async (req, res, next) => {
  try {
    const { getAdmin } = require('../config/firebase');
    const customToken = await getAdmin().auth().createCustomToken(req.user.uid, {
      role: req.user.role,
      ownerId: req.user.ownerId || req.user.uid,
    });
    res.json({ customToken });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
