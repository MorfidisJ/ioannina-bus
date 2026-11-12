import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function getGitToken() {
  const output = execSync('git credential fill', {
    input: 'url=https://github.com\n',
    encoding: 'utf-8'
  });
  const match = output.match(/password=(.+)/);
  if (!match) throw new Error('Could not retrieve token from git credential manager');
  return match[1].trim();
}

async function uploadRelease() {
  const token = getGitToken();
  const repo = 'MorfidisJ/ioannina-bus';
  const tag = 'v1.0.0';
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
        name: 'Ioannina Bus v1.0.0 - Android APK',
        body: `## 🚌 Αστικό ΚΤΕΛ Ιωαννίνων - Android Native v1.0.0

Επίσημη αυτόνομη έκδοση Android (APK) με υποστήριξη ζωντανής τηλεματικής και προγραμμάτων στάσεων.

### ✨ Χαρακτηριστικά:
- **Ζωντανές Αφίξεις (GPS)**: Παρακολούθηση λεωφορείων σε πραγματικό χρόνο για όλες τις 429 στάσεις.
- **Αγαπημένες Στάσεις**: Αποθήκευση στάσεων (π.χ. *Φιλοσοφική / Λέσχη #930*, *Δικαστικό #400*, *Πανεπ. Νοσοκομείο #451*) με προσαρμοσμένα ονόματα.
- **Πλήρες Πρόγραμμα Δρομολογίων**: Καθημερινές, Σάββατα και Κυριακές/Αργίες με αυτόματο εντοπισμό επόμενου δρομολογίου.
- **Αυτόνομο στο Android**: Επικοινωνεί απευθείας με το σύστημα τηλεματικής του Αστικού ΚΤΕΛ μέσω Capacitor χωρίς να απαιτεί εξωτερικό backend.
- **Εύρεση Κοντινών Στάσεων (GPS)**: Υπολογισμός απόστασης και εμφάνιση πλησιέστερων στάσεων.

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
