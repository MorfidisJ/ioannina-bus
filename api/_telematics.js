// Shared telematics service for Astiko KTEL Ioannina (Agency 106)
let cachedToken = null;
let cachedTokenExpiry = 0;

const BASE_WEB_URL = 'https://ioannina.citybus.gr/el/stops';
const BASE_API_URL = 'https://rest.citybus.gr/api/v1';
const AGENCY_ID = 106;

export async function getActiveToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry) {
    return cachedToken;
  }

  try {
    const res = await fetch(BASE_WEB_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) throw new Error(`Failed to fetch telematics page: HTTP ${res.status}`);
    const html = await res.text();
    const match = html.match(/const\s+token\s*=\s*['"]([^'"]+)['"]/);
    if (!match) throw new Error('JWT token regex match failed in HTML');

    cachedToken = match[1];
    // Cache for 40 minutes
    cachedTokenExpiry = now + 40 * 60 * 1000;
    return cachedToken;
  } catch (err) {
    if (cachedToken) return cachedToken;
    throw err;
  }
}

export async function getLiveStopDepartures(stopCode, lang = 'el') {
  let token = await getActiveToken();
  const url = `${BASE_API_URL}/${lang}/${AGENCY_ID}/stops/live/${stopCode}`;

  const fetchWithToken = async (t) => {
    return await fetch(url, {
      headers: {
        'Authorization': `Bearer ${t}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin': 'https://ioannina.citybus.gr',
        'Referer': 'https://ioannina.citybus.gr/'
      }
    });
  };

  let res = await fetchWithToken(token);

  if (res.status === 200) {
    return await res.json();
  }
  if (res.status === 404) {
    // Normal 404 when no vehicles are within the 30m window
    return { stopCode, vehicles: [] };
  }
  if (res.status === 401) {
    cachedToken = null;
    cachedTokenExpiry = 0;
    token = await getActiveToken();
    res = await fetchWithToken(token);
    if (res.status === 200) return await res.json();
    return { stopCode, vehicles: [] };
  }

  return { stopCode, vehicles: [] };
}

export async function getStopSchedule(stopCode, dayType = 1, lang = 'el') {
  let token = await getActiveToken();
  const url = `${BASE_API_URL}/${lang}/${AGENCY_ID}/trips/stop/${stopCode}/day/${dayType}`;

  const fetchWithToken = async (t) => {
    return await fetch(url, {
      headers: {
        'Authorization': `Bearer ${t}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Origin': 'https://ioannina.citybus.gr',
        'Referer': 'https://ioannina.citybus.gr/'
      }
    });
  };

  let res = await fetchWithToken(token);
  if (res.status === 401) {
    cachedToken = null;
    token = await getActiveToken();
    res = await fetchWithToken(token);
  }

  if (res.status === 200) {
    return await res.json();
  }
  return [];
}

