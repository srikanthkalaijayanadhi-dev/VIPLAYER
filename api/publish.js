const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

// Initialize Redis client using the environment variables automatically provided by Vercel Upstash Integration
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://glorious-beagle-83532.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "gQAAAAAAAUZMAAIgcDFkOTZmM2I1NjczOGE0ODFkYWJkYjgxNzU0ZGMyMmNiMw",
});

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
    // Save directly to Upstash Redis
    // We are mapping the string ID to an object holding the iframe
    await redis.set(id, { embedCode, createdAt: new Date().toISOString() });

    return res.status(200).json({ success: true, id });
  } catch (err) {
    console.error('Redis Storage Error:', err);
    return res.status(500).json({ error: 'Database error. Check your Upstash environment variables on Vercel.' });
  }
}
