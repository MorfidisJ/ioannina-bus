import { getStopSchedule } from './_telematics.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let query = req.query;
  if (!query && req.url) {
    const urlObj = new URL(req.url, 'http://localhost');
    query = Object.fromEntries(urlObj.searchParams.entries());
  }

  const { stopCode, dayType, lang } = query || {};
  const code = String(stopCode || '930').trim();
  const day = parseInt(dayType || '1', 10);
  const selectedLang = lang === 'en' ? 'en' : 'el';

  try {
    const trips = await getStopSchedule(code, day, selectedLang);
    return res.status(200).json({
      success: true,
      stopCode: code,
      dayType: day,
      trips: Array.isArray(trips) ? trips : []
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      error: err.message,
      stopCode: code,
      dayType: day,
      trips: []
    });
  }
}
