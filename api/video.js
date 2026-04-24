const fs = require('fs').promises;
const path = require('path');

const isVercel = process.env.VERCEL === '1';
const DATA_FILE = isVercel ? '/tmp/data.json' : path.join(process.cwd(), 'data.json');

// Reconstruct the memory cache from the other module's global space won't work in serverless
// properly across different endpoints (they might run in different containers),
// but we include it if they happen to share the same process locally.
// Note: This is an ephemeral hack for simplest storage.
const memoryStore = global.memoryStore || {};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing video ID parameter' });
  }

  try {
    let data = {};
    try {
      const fileData = await fs.readFile(DATA_FILE, 'utf8');
      data = JSON.parse(fileData);
    } catch (err) {
      // Ignore read errors, fallback to memory
    }

    const video = data[id] || memoryStore[id];

    if (!video) {
      return res.status(404).json({ error: 'Video not found or link expired.' });
    }

    // Optional: Return secure HTML directly or JSON?
    // We'll return JSON so the frontend watch.html can consume it and handle errors beautifully
    return res.status(200).json({ 
      embedCode: video.embedCode 
    });

  } catch (err) {
    console.error('Fetch Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
