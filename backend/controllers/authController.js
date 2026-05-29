const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required.' });
    }

    const [rows] = await db.execute('SELECT * FROM admins WHERE username = ? AND is_active = 1', [username]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Update last login
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    await db.execute('UPDATE admins SET last_login = NOW(), login_ip = ? WHERE id = ?', [ip, admin.id]);

    // Log activity
    await db.execute(
      'INSERT INTO activity_logs (admin_id, action, ip_address) VALUES (?,?,?)',
      [admin.id, 'LOGIN', ip]
    );

    const token = jwt.sign(
      { id: admin.id, username: admin.username, full_name: admin.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '8h' }
    );

    return res.json({ success: true, token, admin: { id: admin.id, username: admin.username, full_name: admin.full_name } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { login };
