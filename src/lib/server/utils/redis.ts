import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

if (!env.REDIS_URL) throw new Error('REDIS_URL is not set');

export const redis = new Redis(env.REDIS_URL, {
	// Queue commands issued before the connection finishes handshaking —
	// serverless cold starts otherwise throw "Stream isn't writeable" on
	// the very first request. maxRetriesPerRequest still bounds the wait.
	enableOfflineQueue: true,
	maxRetriesPerRequest: 3,
	retryStrategy(times) {
		return Math.min(times * 200, 2000);
	}
});

// Prevent Node from reporting ioredis "Unhandled error event".
redis.on('error', (error) => {
	console.error('[redis] connection error:', error.message);
});
