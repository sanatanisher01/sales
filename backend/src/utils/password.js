const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12; // bcrypt work factor

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function validatePasswordStrength(password) {
  if (!password || password.length < 12) {
    return 'Password must be at least 12 characters long';
  }
  if (password.length > 128) {
    return 'Password must not exceed 128 characters';
  }
  return null;
}

module.exports = { hashPassword, comparePassword, validatePasswordStrength };
