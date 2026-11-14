import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function getGitToken() {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN.trim();
  }
  try {
    const output = execSync('git credential fill', {
      input: 'url=https://github.com\n',
      encoding: 'utf-8'
    });
    const match = output.match(/password=(.+)/);
    if (match) return match[1].trim();
  } catch {}

  throw new Error('Could not retrieve token from git credential manager. Please set GITHUB_TOKEN environment variable.');
}

async function uploadRelease() {
  const token = getGitToken();
  const repo = 'MorfidisJ/ioannina-bus';
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
  const tag = `v${pkg.version || '1.1.0'}`;
  const apkPath = path.resolve('ioannina-bus.apk');

  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK not found at ${apkPath}`);
  }

  const apkStats = fs.statSync(apkPath);
  console.log(`Found APK: ${apkPath} (${(apkStats.size / (1024 * 1024)).toFixed(2)} MB)`);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'IoanninaBus-Release-Uploader',
    'Accept': 'application/vnd.github.v3+json'
  };

  // Check if release already exists
  console.log(`Checking existing releases for tag ${tag}...`);
  let release = null;
  const listRes = await fetch(`https://api.github.com/repos/${repo}/releases`, { headers });
  if (listRes.ok) {
    const releases = await listRes.json();
    release = releases.find(r => r.tag_name === tag);
  }

  if (!release) {
    console.log(`Creating new release ${tag}...`);
    const createRes = await fetch(`https://api.github.com/repos/${repo}/releases`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tag_name: tag,
        target_commitish: 'main',
        name: `Ioannina Bus ${tag} - Android APK & Live Map`,
        body: `## 🚌 Αστικό ΚΤΕΛ Ιωαννίνων - Android Native & Web ${tag}

Ενημερωμένη έκδοση Android (APK) με υποστήριξη διαδραστικού live χάρτη, ειδοποιήσεων άφιξης και ζωντανής τηλεματικής.

### ✨ Νέα Χαρακτηριστικά (v1.1.0):
- 🗺️ **Διαδραστικός Live Χάρτης (Leaflet / Dark Mode)**:
  - Εμφάνιση της επιλεγμένης στάσης και των κοντινών στάσεων (σε ακτίνα 800m).
  - Ζωντανές θέσεις λεωφορείων με αυθεντικά badges γραμμών και εκτιμώμενο χρόνο άφιξης σε πραγματικό χρόνο.
  - Αυτόματη εστίαση στη στάση ή σε όλα τα κινούμενα λεωφορεία.
  - Εντοπισμός τοποθεσίας χρήστη μέσω GPS.
- 🔔 **Σύστημα Ειδοποιήσεων Άφιξης (Arrival Push Alarms)**:
  - Ορισμός ειδοποίησης (2', 5' ή 8' πριν την άφιξη) με ένα πάτημα στο εικονίδιο καμπάνας.
  - Native Push Notifications στο Android μέσω \`@capacitor/local-notifications\`.
  - Ηχητική ειδοποίηση (Transit Chime) μέσω Web Audio API & δόνηση συσκευής.
  - Μόνιμο floating banner ενεργής ειδοποίησης με δυνατότητα άμεσης ακύρωσης.
- ⏱️ **Ομαλή Αντίστροφη Μέτρηση Δευτερολέπτων**:
  - Live ticker δευτερολέπτων ανάμεσα στα διαστήματα ανανέωσης των 20 δευτερολέπτων.

---
### 📲 Εγκατάσταση:
Κατεβάστε το αρχείο **\`ioannina-bus.apk\`** από τα παρακάτω Assets και ανοίξτε το στο Android κινητό σας για εγκατάσταση.`,
        draft: false,
        prerelease: false
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create release: ${createRes.status} ${errText}`);
    }
    release = await createRes.json();
    console.log(`Release created: ${release.html_url}`);
  } else {
    console.log(`Using existing release ID: ${release.id}`);
  }

  // Delete asset if it already exists in the release
  if (Array.isArray(release.assets)) {
    const existingAsset = release.assets.find(a => a.name === 'ioannina-bus.apk');
    if (existingAsset) {
      console.log(`Deleting existing asset ${existingAsset.id}...`);
      await fetch(`https://api.github.com/repos/${repo}/releases/assets/${existingAsset.id}`, {
        method: 'DELETE',
        headers
      });
    }
  }

  // Upload asset
  const uploadUrl = release.upload_url.replace(/\{(\?name,label|\?name)\}/, '') + '?name=ioannina-bus.apk';
  console.log(`Uploading APK asset (${(apkStats.size / (1024 * 1024)).toFixed(2)} MB)...`);

  const apkBuffer = fs.readFileSync(apkPath);
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'IoanninaBus-Release-Uploader',
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': apkStats.size.toString()
    },
    body: apkBuffer
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Failed to upload asset: ${uploadRes.status} ${errText}`);
  }

  const asset = await uploadRes.json();
  console.log(`\nSUCCESS! APK uploaded successfully to GitHub Releases:`);
  console.log(`Release URL: ${release.html_url}`);
  console.log(`Download URL: ${asset.browser_download_url}`);
}

uploadRelease().catch(err => {
  console.error('\nUpload error:', err);
  process.exit(1);
});
