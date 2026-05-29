const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: { rejectUnauthorized: false }
});

const sendLeadNotification = async (lead) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
  if (!adminEmails.length) return;

  const spamBadge = lead.spam_risk_score > 50
    ? `<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;">⚠️ HIGH SPAM RISK: ${lead.spam_risk_score}/100</span>`
    : `<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;">✅ CLEAN: ${lead.spam_risk_score}/100</span>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#0a4a2e,#1a7a4a);padding:20px 30px;">
      <h1 style="color:#D4AF37;margin:0;font-size:22px;">🏡 New Lead — ${process.env.PROJECT_NAME || 'Codename Vana Veda'}</h1>
      <p style="color:#a0c8a0;margin:5px 0 0;font-size:13px;">Submitted: ${new Date(lead.submitted_at).toLocaleString('en-IN', {timeZone:'Asia/Kolkata'})}</p>
    </div>
    <div style="padding:25px 30px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#f9f9f9;">
          <td style="padding:10px;font-weight:bold;color:#555;width:40%;border-bottom:1px solid #eee;">👤 Name</td>
          <td style="padding:10px;color:#222;border-bottom:1px solid #eee;">${lead.name}</td>
        </tr>
        <tr>
          <td style="padding:10px;font-weight:bold;color:#555;border-bottom:1px solid #eee;">📞 Phone</td>
          <td style="padding:10px;color:#222;border-bottom:1px solid #eee;">${lead.phone}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="padding:10px;font-weight:bold;color:#555;border-bottom:1px solid #eee;">📧 Email</td>
          <td style="padding:10px;color:#222;border-bottom:1px solid #eee;">${lead.email || '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px;font-weight:bold;color:#555;border-bottom:1px solid #eee;">🌍 Country / City</td>
          <td style="padding:10px;color:#222;border-bottom:1px solid #eee;">${lead.country_flag || ''} ${lead.country || '—'} / ${lead.city || '—'}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="padding:10px;font-weight:bold;color:#555;border-bottom:1px solid #eee;">🌐 IP Address</td>
          <td style="padding:10px;color:#222;border-bottom:1px solid #eee;">${lead.ip_address || '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px;font-weight:bold;color:#555;border-bottom:1px solid #eee;">📱 Device</td>
          <td style="padding:10px;color:#222;border-bottom:1px solid #eee;">${lead.device || '—'}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="padding:10px;font-weight:bold;color:#555;border-bottom:1px solid #eee;">🌐 Browser</td>
          <td style="padding:10px;color:#222;border-bottom:1px solid #eee;">${lead.browser || '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px;font-weight:bold;color:#555;border-bottom:1px solid #eee;">📣 Source</td>
          <td style="padding:10px;color:#222;border-bottom:1px solid #eee;">${lead.source_button || '—'}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="padding:10px;font-weight:bold;color:#555;border-bottom:1px solid #eee;">🎯 UTM Source</td>
          <td style="padding:10px;color:#222;border-bottom:1px solid #eee;">${lead.utm_source || '—'} / ${lead.utm_medium || '—'} / ${lead.utm_campaign || '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px;font-weight:bold;color:#555;border-bottom:1px solid #eee;">🔗 Refer URL</td>
          <td style="padding:10px;color:#222;border-bottom:1px solid #eee;">${lead.refer_url || '—'}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="padding:10px;font-weight:bold;color:#555;">🛡️ Spam Score</td>
          <td style="padding:10px;">${spamBadge}</td>
        </tr>
      </table>
    </div>
    <div style="background:#0a4a2e;padding:15px 30px;text-align:center;">
      <p style="color:#D4AF37;margin:0;font-size:12px;">${process.env.PROJECT_NAME || 'Codename Vana Veda'} — Sai Developers | ${process.env.SMTP_FROM_NAME || 'Vana Veda Leads'}</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: adminEmails.join(', '),
    subject: `🏡 New Lead: ${lead.name} | ${lead.phone} | ${process.env.PROJECT_NAME || 'Codename Vana Veda'}`,
    html
  });
};

module.exports = { sendLeadNotification };
