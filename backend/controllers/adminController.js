const db = require('../config/db');
const ExcelJS = require('exceljs');
const xss = require('xss');

// GET /api/admin/leads
const getLeads = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const offset = (page - 1) * limit;

    let where = ['l.is_deleted = 0'];
    let params = [];

    if (req.query.status) { where.push('l.lead_status = ?'); params.push(req.query.status); }
    if (req.query.country) { where.push('l.country = ?'); params.push(req.query.country); }
    if (req.query.device) { where.push('l.device = ?'); params.push(req.query.device); }
    if (req.query.browser) { where.push('l.browser = ?'); params.push(req.query.browser); }
    if (req.query.utm_source) { where.push('l.utm_source = ?'); params.push(req.query.utm_source); }
    if (req.query.source_button) { where.push('l.source_button = ?'); params.push(req.query.source_button); }
    if (req.query.spam_risk) { where.push('l.spam_risk_score >= ?'); params.push(parseInt(req.query.spam_risk)); }
    if (req.query.date_from) { where.push('DATE(l.submitted_at) >= ?'); params.push(req.query.date_from); }
    if (req.query.date_to) { where.push('DATE(l.submitted_at) <= ?'); params.push(req.query.date_to); }
    if (req.query.search) {
      where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)');
      const s = `%${req.query.search}%`;
      params.push(s, s, s);
    }

    const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [countRows] = await db.execute(`SELECT COUNT(*) as total FROM leads l ${whereStr}`, params);
    const total = countRows[0].total;

    const [leads] = await db.execute(
      `SELECT l.*, GROUP_CONCAT(n.note ORDER BY n.created_at DESC SEPARATOR '|||') as notes
       FROM leads l
       LEFT JOIN lead_notes n ON n.lead_id = l.id
       ${whereStr}
       GROUP BY l.id
       ORDER BY l.submitted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({ success: true, data: leads, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('getLeads error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/leads/:id
const getLead = async (req, res) => {
  try {
    const [leads] = await db.execute('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!leads.length) return res.status(404).json({ success: false, message: 'Lead not found.' });
    const [notes] = await db.execute(
      'SELECT n.*, a.username FROM lead_notes n JOIN admins a ON a.id = n.admin_id WHERE n.lead_id = ? ORDER BY n.created_at DESC',
      [req.params.id]
    );
    return res.json({ success: true, data: { ...leads[0], notes } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/admin/leads/:id/status
const updateStatus = async (req, res) => {
  try {
    const validStatuses = ['New','Contacted','Interested','Site Visit','Closed','Spam'];
    const { status } = req.body;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    await db.execute('UPDATE leads SET lead_status = ? WHERE id = ?', [status, req.params.id]);
    await db.execute(
      'INSERT INTO activity_logs (admin_id, action, entity, entity_id, details) VALUES (?,?,?,?,?)',
      [req.admin.id, 'UPDATE_STATUS', 'lead', req.params.id, `Status → ${status}`]
    );
    return res.json({ success: true, message: 'Status updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/admin/leads/:id/delete
const softDelete = async (req, res) => {
  try {
    await db.execute('UPDATE leads SET is_deleted = 1 WHERE id = ?', [req.params.id]);
    await db.execute(
      'INSERT INTO activity_logs (admin_id, action, entity, entity_id) VALUES (?,?,?,?)',
      [req.admin.id, 'SOFT_DELETE', 'lead', req.params.id]
    );
    return res.json({ success: true, message: 'Lead deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/admin/leads/:id/notes
const addNote = async (req, res) => {
  try {
    const note = xss(req.body.note || '').trim();
    if (!note) return res.status(400).json({ success: false, message: 'Note is required.' });
    await db.execute('INSERT INTO lead_notes (lead_id, admin_id, note) VALUES (?,?,?)', [req.params.id, req.admin.id, note]);
    return res.json({ success: true, message: 'Note added.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [[{ total }]] = await db.execute("SELECT COUNT(*) as total FROM leads WHERE is_deleted = 0");
    const [[{ today }]] = await db.execute("SELECT COUNT(*) as today FROM leads WHERE is_deleted = 0 AND DATE(submitted_at) = CURDATE()");
    const [[{ this_week }]] = await db.execute("SELECT COUNT(*) as this_week FROM leads WHERE is_deleted = 0 AND submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    const [device_breakdown] = await db.execute("SELECT device, COUNT(*) as count FROM leads WHERE is_deleted = 0 GROUP BY device ORDER BY count DESC");
    const [browser_breakdown] = await db.execute("SELECT browser, COUNT(*) as count FROM leads WHERE is_deleted = 0 GROUP BY browser ORDER BY count DESC");
    const [country_breakdown] = await db.execute("SELECT country_flag, country, COUNT(*) as count FROM leads WHERE is_deleted = 0 AND country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10");
    const [source_breakdown] = await db.execute("SELECT source_button, COUNT(*) as count FROM leads WHERE is_deleted = 0 GROUP BY source_button ORDER BY count DESC");
    const [campaign_breakdown] = await db.execute("SELECT utm_source, utm_campaign, COUNT(*) as count FROM leads WHERE is_deleted = 0 AND utm_source IS NOT NULL GROUP BY utm_source, utm_campaign ORDER BY count DESC LIMIT 10");
    const [status_breakdown] = await db.execute("SELECT lead_status, COUNT(*) as count FROM leads WHERE is_deleted = 0 GROUP BY lead_status");
    const [daily_trend] = await db.execute("SELECT DATE(submitted_at) as date, COUNT(*) as count FROM leads WHERE is_deleted = 0 AND submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(submitted_at) ORDER BY date ASC");

    return res.json({ success: true, data: { total, today, this_week, device_breakdown, browser_breakdown, country_breakdown, source_breakdown, campaign_breakdown, status_breakdown, daily_trend } });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/admin/export
const exportLeads = async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    let where = ['is_deleted = 0'];
    let params = [];
    if (req.query.status) { where.push('lead_status = ?'); params.push(req.query.status); }
    if (req.query.date_from) { where.push('DATE(submitted_at) >= ?'); params.push(req.query.date_from); }
    if (req.query.date_to) { where.push('DATE(submitted_at) <= ?'); params.push(req.query.date_to); }

    const [leads] = await db.execute(
      `SELECT id,name,phone,email,country_flag,country,city,ip_address,device,browser,
              utm_source,utm_medium,utm_campaign,refer_url,source_button,lead_status,
              spam_risk_score,submitted_at
       FROM leads WHERE ${where.join(' AND ')} ORDER BY submitted_at DESC`,
      params
    );

    if (format === 'csv') {
      const headers = ['ID','Name','Phone','Email','Flag','Country','City','IP','Device','Browser','UTM Source','UTM Medium','Campaign','Refer URL','Source Button','Status','Spam Score','Submitted At'];
      const rows = leads.map(l => [
        l.id,l.name,l.phone,l.email||'',l.country_flag||'',l.country||'',l.city||'',l.ip_address||'',
        l.device||'',l.browser||'',l.utm_source||'',l.utm_medium||'',l.utm_campaign||'',
        l.refer_url||'',l.source_button||'',l.lead_status,l.spam_risk_score,l.submitted_at
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="GreenGold_Leads_${Date.now()}.csv"`);
      return res.send('\uFEFF' + [headers.join(','), ...rows].join('\n'));
    }

    // Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leads');
    sheet.columns = [
      {header:'ID',key:'id',width:8},{header:'Name',key:'name',width:20},{header:'Phone',key:'phone',width:18},
      {header:'Email',key:'email',width:25},{header:'Flag',key:'country_flag',width:6},{header:'Country',key:'country',width:15},
      {header:'City',key:'city',width:15},{header:'IP',key:'ip_address',width:18},{header:'Device',key:'device',width:20},
      {header:'Browser',key:'browser',width:15},{header:'UTM Source',key:'utm_source',width:15},{header:'UTM Medium',key:'utm_medium',width:15},
      {header:'Campaign',key:'utm_campaign',width:20},{header:'Refer URL',key:'refer_url',width:30},
      {header:'Source Button',key:'source_button',width:20},{header:'Status',key:'lead_status',width:15},
      {header:'Spam Score',key:'spam_risk_score',width:12},{header:'Submitted At',key:'submitted_at',width:22}
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF0A4A2E'} };
    sheet.getRow(1).font = { bold: true, color:{argb:'FFD4AF37'} };
    leads.forEach(l => sheet.addRow(l));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="GreenGold_Leads_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error('Export error:', err);
    return res.status(500).json({ success: false, message: 'Export failed.' });
  }
};

module.exports = { getLeads, getLead, updateStatus, softDelete, addNote, getStats, exportLeads };
