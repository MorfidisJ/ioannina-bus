import { getLiveStopDepartures } from './_telematics.js';

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

  const { stopCode, lang } = query || {};
  const code = String(stopCode || '930').trim();
  const selectedLang = lang === 'en' ? 'en' : 'el';

  try {
    const data = await getLiveStopDepartures(code, selectedLang);
    const vehicles = Array.isArray(data?.vehicles) ? data.vehicles : [];

    const normalizedVehicles = vehicles.map(v => {
      const departureMins = v.departureMins ?? 0;
      const departureSeconds = v.departureSeconds ?? 0;
      const mins = (departureMins === 0 && departureSeconds <= 30) ? 0 : departureMins + 1;

      return {
        line: v.lineCode || '',
        lineName: v.lineName || '',
        routeName: v.routeName || '',
        minutesUntil: mins,
        departureSeconds,
        vehicleCode: v.vehicleCode || '',
        latitude: v.latitude,
        longitude: v.longitude
      };
    });

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      stopCode: code,
      isLive: normalizedVehicles.length > 0,
      vehicles: normalizedVehicles
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      error: err.message || 'Error querying telematics',
      stopCode: code,
      isLive: false,
      vehicles: []
    });
  }
}

