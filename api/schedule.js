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
    const rawTrips = await getStopSchedule(code, day, selectedLang);
    const trips = (Array.isArray(rawTrips) ? rawTrips : []).map(t => {
      const timeStr = String(t.tripTime || t.departureTime || '').trim();
      const parts = timeStr.split(':');
      const hour = t.tripTimeHour !== undefined ? Number(t.tripTimeHour) : (parts[0] ? parseInt(parts[0], 10) : 0);
      const minute = t.tripTimeMinute !== undefined ? Number(t.tripTimeMinute) : (parts[1] ? parseInt(parts[1], 10) : 0);
      return {
        id: t.id,
        day: t.day || day,
        lineCode: String(t.lineCode || '').trim(),
        lineName: t.lineName || '',
        lineColor: t.lineColor || '#2563eb',
        lineTextColor: t.lineTextColor || '#ffffff',
        routeCode: String(t.routeCode || ''),
        routeName: t.routeName || '',
        departureTime: timeStr,
        tripTime: timeStr,
        hour,
        minute,
        totalMinutes: hour * 60 + minute
      };
    }).sort((a, b) => a.totalMinutes - b.totalMinutes);

    return res.status(200).json({
      success: true,
      stopCode: code,
      dayType: day,
      trips
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
