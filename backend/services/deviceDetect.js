/**
 * Device & Browser Detection from User-Agent
 */

const detectDevice = (ua) => {
  if (!ua) return 'Unknown';
  const s = ua.toLowerCase();

  if (/ipad/.test(s)) return 'iPad / Tablet (iOS)';
  if (/iphone/.test(s)) return 'iPhone (iOS)';
  if (/android/.test(s) && /mobile/.test(s)) return 'Android Mobile';
  if (/android/.test(s)) return 'Android Tablet';
  if (/macintosh|mac os x/.test(s) && !/mobile/.test(s)) return 'Mac Desktop';
  if (/windows/.test(s) && !/mobile/.test(s)) return 'Windows Desktop';
  if (/linux/.test(s) && !/mobile/.test(s)) return 'Linux Desktop';
  if (/mobile/.test(s)) return 'Android Mobile';
  return 'Windows Desktop';
};

const detectBrowser = (ua) => {
  if (!ua) return 'Unknown';
  const s = ua.toLowerCase();

  if (/edg\//.test(s)) return 'Edge';
  if (/samsungbrowser/.test(s)) return 'Samsung Internet';
  if (/opr\/|opera/.test(s)) return 'Opera';
  if (/firefox/.test(s)) return 'Firefox';
  if (/chrome/.test(s)) return 'Chrome';
  if (/safari/.test(s)) return 'Safari';
  return 'Other';
};

module.exports = { detectDevice, detectBrowser };
