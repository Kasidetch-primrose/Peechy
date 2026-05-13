import { S3Client } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

if (!env.R2_ACCOUNT_ID) throw new Error('R2_ACCOUNT_ID is not set');
if (!env.R2_ACCESS_KEY_ID) throw new Error('R2_ACCESS_KEY_ID is not set');
if (!env.R2_SECRET_ACCESS_KEY) throw new Error('R2_SECRET_ACCESS_KEY is not set');

export const r2 = new S3Client({
	region: 'auto',
	endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY
	}
});
