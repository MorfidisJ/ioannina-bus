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
      const departureMins = parseInt(v.departureMins, 10) || 0;
      const departureSeconds = parseInt(v.departureSeconds, 10) || 0;
      const totalSeconds = departureMins * 60 + departureSeconds;
      const mins = totalSeconds <= 30 ? 0 : Math.ceil(totalSeconds / 60);

      const lat = parseFloat(v.latitude);
      const lng = parseFloat(v.longitude);
      const isValidGps = !isNaN(lat) && !isNaN(lng) && lat > 39.0 && lat < 40.5 && lng > 20.0 && lng < 21.5;

      return {
        line: v.lineCode || '',
        lineName: v.lineName || '',
        routeName: v.routeName || '',
        minutesUntil: mins,
        departureSeconds: totalSeconds,
        vehicleCode: v.vehicleCode || '',
        latitude: isValidGps ? lat : undefined,
        longitude: isValidGps ? lng : undefined
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

