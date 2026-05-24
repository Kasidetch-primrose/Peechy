import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

if (!env.REDIS_URL) throw new Error('REDIS_URL is not set');

export const redis = new Redis(env.REDIS_URL, {
	// Fail fast when Redis is down instead of queueing requests forever.
	enableOfflineQueue: false,
	maxRetriesPerRequest: 1,
	retryStrategy(times) {
		return Math.min(times * 200, 2000);
	}
});

// Prevent Node from reporting ioredis "Unhandled error event".
redis.on('error', (error) => {
	console.error('[redis] connection error:', error.message);
});
