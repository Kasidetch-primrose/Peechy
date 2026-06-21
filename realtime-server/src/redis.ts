import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) throw new Error('REDIS_URL is not set');

export const redis = new Redis(REDIS_URL, {
	enableOfflineQueue: false,
	maxRetriesPerRequest: 1,
	retryStrategy(times) {
		return Math.min(times * 200, 2000);
	}
});

redis.on('error', (error) => {
	console.error('[redis] connection error:', error.message);
});

export const ROOM_TTL_SEC = 4 * 60 * 60; // 4h, refreshed on every activity
