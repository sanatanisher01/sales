require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { initFirebase, getDb } = require('../src/config/firebase');
const { hashPassword } = require('../src/utils/password');
const { v4: uuidv4 } = require('uuid');

async function createAdmin() {
  initFirebase();
  const db = getDb();

  const email = 'admin@salestrack.com';
  const password = 'Admin@123456';
  const name = 'Super Admin';

  // Check if already exists
  const existing = await db.collection('users').where('email', '==', email).limit(1).get();
  if (!existing.empty) {
    console.log('Admin already exists:', email);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  const uid = uuidv4();
  const now = new Date();

  await db.collection('users').doc(uid).set({
    name,
    email,
    passwordHash,
    role: 'admin',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ownerId: null,
  });

  console.log('✅ Admin created successfully!');
  console.log('   Email:   ', email);
  console.log('   Password:', password);
  console.log('   UID:     ', uid);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
