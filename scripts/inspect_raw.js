import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspect() {
  const res = await fetch('https://ioannina.citybus.gr/el/stops', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const token = html.match(/const\s+token\s*=\s*['"]([^'"]+)['"]/)[1];

  const stops = await fetch('https://rest.citybus.gr/api/v1/el/106/stops', {
    headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://ioannina.citybus.gr' }
  }).then(r => r.json());

  console.log('Sample raw stop (keys and values):', stops[0]);
  console.log('Find stop 930:', stops.find(s => s.StopCode == '930' || s.stopCode == '930' || s.code == '930' || s.StopID == '930'));
  console.log('Find stop 400:', stops.find(s => s.StopCode == '400' || s.stopCode == '400' || s.code == '400' || s.StopID == '400'));

  const lines = await fetch('https://rest.citybus.gr/api/v1/el/106/lines', {
    headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://ioannina.citybus.gr' }
  }).then(r => r.json());
  console.log('Sample raw line:', lines[0]);
}

inspect();

