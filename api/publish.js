const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Using /tmp to ensure Vercel compatibility ephemerally,
// or current directory locally if /tmp is not available.
const isVercel = process.env.VERCEL === '1';
const DATA_FILE = isVercel ? '/tmp/data.json' : path.join(process.cwd(), 'data.json');

// Memory cache fallback in case file writes fail completely
const memoryStore = {};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Admin Password
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD || 'secret123'; // Default fallback for dev

  if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid password' });
  }

  const { embedCode } = req.body;

  if (!embedCode || !embedCode.includes('<iframe')) {
    return res.status(400).json({ error: 'Invalid embed code. Must be an iframe.' });
  }

  // Generate unique ID
  const id = crypto.randomUUID().split('-')[0] + '-' + Date.now().toString(36);

  try {
    let data = {};
    try {
      const fileData = await fs.readFile(DATA_FILE, 'utf8');
      data = JSON.parse(fileData);
    } catch (err) {
      // File doesn't exist yet, we will create it
      // If error is ENOENT, we just continue with empty data.
    }

    // Save to memory and file
    data[id] = { embedCode, createdAt: new Date().toISOString() };
    memoryStore[id] = data[id];

    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));

    return res.status(200).json({ success: true, id });
  } catch (err) {
    console.error('Storage Error:', err);
    
    // In case of error (e.g. read-only filesystem where /tmp isn't behaving as expected),
    // fallback to memory completely.
    memoryStore[id] = { embedCode, createdAt: new Date().toISOString() };
    return res.status(200).json({ success: true, id, note: 'Saved to memory due to FS error' });
  }
}
