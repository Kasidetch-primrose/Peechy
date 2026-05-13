import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

export const mailer = nodemailer.createTransport({
	host: env.SMTP_HOST,
	port: Number(env.SMTP_PORT ?? 587),
	secure: Number(env.SMTP_PORT ?? 587) === 465,
	auth: {
		user: env.SMTP_USER,
		pass: env.SMTP_PASS
	}
});
