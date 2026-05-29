const geoip = require('geoip-lite');

const countryFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return countryCode.toUpperCase().replace(/./g, char =>
    String.fromCodePoint(char.charCodeAt(0) + 127397)
  );
};

const getGeoData = (ip) => {
  try {
    const cleanIp = ip === '::1' || ip === '127.0.0.1' ? '8.8.8.8' : ip;
    const geo = geoip.lookup(cleanIp);
    if (!geo) return { country: null, country_code: null, country_flag: null, city: null };
    return {
      country: geo.country ? require('geoip-lite').lookup(cleanIp)?.country : null,
      country_code: geo.country || null,
      country_flag: countryFlagEmoji(geo.country),
      city: (geo.city && geo.city.trim()) || null
    };
  } catch (e) {
    return { country: null, country_code: null, country_flag: null, city: null };
  }
};

// Resolve country name from code
const countryNames = {
  IN: 'India', US: 'United States', GB: 'United Kingdom', AE: 'UAE',
  SG: 'Singapore', AU: 'Australia', CA: 'Canada', DE: 'Germany',
  FR: 'France', NZ: 'New Zealand', MY: 'Malaysia', QA: 'Qatar',
  SA: 'Saudi Arabia', KW: 'Kuwait', OM: 'Oman', BH: 'Bahrain',
  NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', CH: 'Switzerland'
};

const getFullGeoData = (ip) => {
  const data = getGeoData(ip);
  if (data.country_code && countryNames[data.country_code]) {
    data.country = countryNames[data.country_code];
  } else if (data.country_code) {
    data.country = data.country_code;
  }
  return data;
};

module.exports = { getFullGeoData };
