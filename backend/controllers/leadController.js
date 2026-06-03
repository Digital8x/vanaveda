const db = require('../config/db');
const { getFullGeoData } = require('../services/geoip');
const { calculateSpamScore } = require('../services/spam');
const { detectDevice, detectBrowser } = require('../services/deviceDetect');
const { sendLeadNotification } = require('../services/mailer');
const xss = require('xss');

// Get real IP address
const getRealIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.connection?.remoteAddress || req.ip || '0.0.0.0';
};

// Check per-IP rate limit (3/hour)
const checkIpRateLimit = async (ip) => {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') return false;
  const oneHourAgo = new Date(Date.now() - 3600000);
  const [rows] = await db.execute(
    'SELECT COUNT(*) as cnt FROM `rate_limit_log` WHERE `ip_address` = ? AND `submitted_at` > ?',
    [ip, oneHourAgo]
  );
  return rows[0].cnt >= 3;
};

// Submit a new lead
const submitLead = async (req, res) => {
  try {
    const ip = getRealIp(req);
    const ua = req.headers['user-agent'] || '';

    // Rate limit check
    const limited = await checkIpRateLimit(ip);
    if (limited) {
      return res.status(429).json({ success: false, message: 'Too many submissions. Please try again later.' });
    }

    // Sanitize inputs
    const name = xss(req.body.name || '').trim();
    const phone = xss(req.body.phone || '').trim();
    const email = xss(req.body.email || '').trim().toLowerCase() || null;

    // Validate required
    if (!name || name.length < 2) return res.status(400).json({ success: false, message: 'Please enter a valid name.' });
    if (!phone || phone.replace(/\D/g,'').length < 7) return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });

    // Honeypot check
    if (req.body._honey_trap && req.body._honey_trap.trim() !== '') {
      // Silent success to fool bots
      return res.json({ success: true, message: 'Thank you! We will contact you shortly.' });
    }

    // Email format check
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    // Geo & device data
    const geo = getFullGeoData(ip);
    const device = detectDevice(ua);
    const browser = detectBrowser(ua);

    // UTM & tracking
    const utm_source = xss(req.body.utm_source || '').trim() || null;
    const utm_medium = xss(req.body.utm_medium || '').trim() || null;
    const utm_campaign = xss(req.body.utm_campaign || '').trim() || null;
    const utm_term = xss(req.body.utm_term || '').trim() || null;
    const utm_content = xss(req.body.utm_content || '').trim() || null;
    const refer_url = xss(req.body.refer_url || '').trim() || null;
    const source_button = xss(req.body.source_button || 'Website Form').trim();
    const page_url = xss(req.body.page_url || '').trim() || null;

    // Spam score
    const { spam_risk_score } = calculateSpamScore({ name, phone, email, ip_address: ip, user_agent: ua, source_button });

    // Insert lead
    const [result] = await db.execute(
      `INSERT INTO leads 
        (name, phone, email, country, country_code, country_flag, city, ip_address,
         device, browser, user_agent, utm_source, utm_medium, utm_campaign, utm_term,
         utm_content, refer_url, project, source_button, page_url, spam_risk_score)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        name, phone, email,
        geo.country, geo.country_code, geo.country_flag, geo.city, ip,
        device, browser, ua,
        utm_source, utm_medium, utm_campaign, utm_term,
        utm_content, refer_url,
        process.env.PROJECT_NAME || 'Vana Veda', source_button, page_url,
        spam_risk_score
      ]
    );

    // Rate limit log
    await db.execute('INSERT INTO rate_limit_log (ip_address) VALUES (?)', [ip]);

    // Get inserted lead for email
    const [leads] = await db.execute('SELECT * FROM leads WHERE id = ?', [result.insertId]);
    const lead = leads[0];

    // Send admin notification (non-blocking)
    sendLeadNotification(lead).catch(err => console.error('Email error:', err.message));

    return res.json({ success: true, message: 'Thank you! Our team will contact you shortly.' });

  } catch (err) {
    console.error('Lead submission error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

module.exports = { submitLead };
