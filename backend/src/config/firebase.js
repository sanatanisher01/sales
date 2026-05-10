const admin = require('firebase-admin');

let db;

function initFirebase() {
  if (admin.apps.length > 0) return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle both literal \n and real newlines in the private key
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '')
        .replace(/\\n/g, '\n')
        .replace(/^"|"$/g, ''), // strip surrounding quotes if any
    }),
  });

  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  console.log('Firebase Admin initialized');
}

function getDb() {
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

function getAdmin() {
  return admin;
}

module.exports = { initFirebase, getDb, getAdmin };
