const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL environment variable is missing.');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function fixPaths() {
    const client = await pool.connect();
    try {
        console.log('Updating paths in database...');

        // Replace the full prefix with empty string to leave "\LIBROS SELECCIONADOS FINAL..."
        const prefixToRemove = 'C:\\Users\\vacue\\OneDrive\\medicalstrike.com';

        // PostgreSQL replace function
        // UPDATE books SET notes = REPLACE(notes, 'string_to_find', 'replacement_string')
        // We need to escape backslashes for SQL string literals if needed, usually passed as params it's safer.

        // However, UPDATE with REPLACE is powerful.

        const res = await client.query(
            `UPDATE books 
         SET notes = REPLACE(notes, $1, '') 
         WHERE notes LIKE $2`,
            [prefixToRemove, `${prefixToRemove}%`]
        );

        console.log(`Updated ${res.rowCount} records.`);

    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixPaths();
