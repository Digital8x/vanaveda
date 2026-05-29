/**
 * Spam Detection Service
 * Scores leads 0-100 (higher = more suspicious)
 * Does NOT block — only flags for admin review
 */

const DISPOSABLE_DOMAINS = [
  'mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com',
  'throwaway.email','yopmail.com','sharklasers.com','guerrillamailblock.com',
  'grr.la','guerrillamail.info','trashmail.com','spam4.me','fakeinbox.com',
  'mailnull.com','spamgourmet.com','trashmail.me','dispostable.com',
  'maildrop.cc','tempr.email','discard.email','tempinbox.com','mailtemp.org'
];

const FAKE_NAME_PATTERNS = [
  /^test$/i, /^admin$/i, /^asdf/i, /^qwerty/i, /^abcd/i, /^xxx/i,
  /^1234/i, /^aaa+$/i, /^zzz/i, /^hello/i, /^user$/i, /^name$/i,
  /^dummy/i, /^sample/i, /^fake/i, /^null/i, /^undefined/i,
  /(.)\1{4,}/i // repeated chars like "aaaaaaa"
];

const SUSPICIOUS_PHONE_PATTERNS = [
  /^(\d)\1{7,}$/, // all same digit: 0000000000
  /^1234567/, /^9876543/, /^0000000/, /^1111111/,
  /^9999999/, /^8888888/, /^7777777/
];

const calculateSpamScore = (data) => {
  let score = 0;
  const reasons = [];

  const { name, phone, email, ip_address, user_agent, source_button } = data;

  // 1. Fake name check
  if (name) {
    const nameTrimmed = name.trim();
    if (nameTrimmed.length < 3) { score += 20; reasons.push('Name too short'); }
    if (!/\s/.test(nameTrimmed) && nameTrimmed.length < 4) { score += 10; reasons.push('Single very short name'); }
    for (const pattern of FAKE_NAME_PATTERNS) {
      if (pattern.test(nameTrimmed)) { score += 30; reasons.push('Fake name pattern'); break; }
    }
    if (/^\d+$/.test(nameTrimmed)) { score += 25; reasons.push('Name is all numbers'); }
  }

  // 2. Phone check
  if (phone) {
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 7) { score += 20; reasons.push('Phone too short'); }
    for (const pattern of SUSPICIOUS_PHONE_PATTERNS) {
      if (pattern.test(digitsOnly)) { score += 25; reasons.push('Suspicious phone pattern'); break; }
    }
  }

  // 3. Disposable email check
  if (email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && DISPOSABLE_DOMAINS.includes(domain)) {
      score += 35; reasons.push('Disposable email domain');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      score += 15; reasons.push('Invalid email format');
    }
  }

  // 4. Bot / empty user agent
  if (!user_agent || user_agent.length < 20) {
    score += 20; reasons.push('Missing or short user agent');
  }

  // 5. Localhost IP
  if (ip_address === '127.0.0.1' || ip_address === '::1') {
    score += 5; reasons.push('Localhost IP');
  }

  const finalScore = Math.min(score, 100);
  return { spam_risk_score: finalScore, spam_reasons: reasons };
};

module.exports = { calculateSpamScore };
