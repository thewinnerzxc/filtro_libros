const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

async function verify() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT count(*) FROM books');
        console.log(`Row count in 'books' table: ${res.rows[0].count}`);
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

verify();
