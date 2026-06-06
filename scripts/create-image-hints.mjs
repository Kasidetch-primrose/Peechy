import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS image_hints (
    id serial PRIMARY KEY,
    created_at timestamp DEFAULT now() NOT NULL,
    deleted_at timestamp,
    image_id integer NOT NULL REFERENCES images(id),
    hint text NOT NULL,
    order_index integer DEFAULT 0 NOT NULL
  )
`);

console.log('image_hints table created (or already exists)');
await client.end();
