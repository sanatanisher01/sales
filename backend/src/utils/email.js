const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendVerificationEmail(toEmail, ownerName) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@salestrack.com',
    to: toEmail,
    subject: 'Welcome to SalesTrack — Account Created',
    html: `
      <h2>Welcome, ${ownerName}!</h2>
      <p>Your Owner account has been created on SalesTrack.</p>
      <p>You can now log in at <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
      <p>If you did not request this account, please contact support.</p>
    `,
  });
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@salestrack.com',
    to: toEmail,
    subject: 'SalesTrack — Password Reset',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>If you did not request this, ignore this email.</p>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
