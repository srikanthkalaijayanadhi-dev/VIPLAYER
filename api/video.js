const { Redis } = require('@upstash/redis');

// Initialize Redis client securely using environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing video ID parameter' });
  }

  try {
    // Lookup the value for this specific video ID in Upstash
    const video = await redis.get(id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found or link expired.' });
    }

    // Return the embed code exactly to the frontend
    return res.status(200).json({ 
      embedCode: video.embedCode 
    });

  } catch (err) {
    console.error('Redis Fetch Error:', err);
    return res.status(500).json({ error: 'Internal database error' });
  }
}
