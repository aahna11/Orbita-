// Sends email through Brevo's HTTPS API when BREVO_API_KEY is set (Render's free plan blocks SMTP ports).
// Without the key it falls back to the local SMTP test mailbox (Mailpit) used in development.
const nodemailer = require('nodemailer');
const smtp = nodemailer.createTransport({ host: process.env.MAIL_HOST || 'localhost', port: 1025, secure: false });
module.exports = {
  async sendMail({ to, subject, text }) {
    const key = process.env.BREVO_API_KEY;
    if (!key) return smtp.sendMail({ from: 'ORBITA <no-reply@orbita.local>', to, subject, text });
    const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'ORBITA', email: process.env.MAIL_FROM }, to: [{ email: to }], subject, textContent: text }) });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
  },
};
