const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function importData() {
    const client = await pool.connect();
    try {
        const dataPath = path.join(__dirname, '../legacy_backup/books.json');
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const books = JSON.parse(rawData);

        console.log(`Found ${books.length} books to import.`);

        await client.query('BEGIN');

        // Use a loop for simplicity, or we could construct a giant INSERT.
        // Given ~2000 rows, a loop with prepared statement is fine, or small batches.
        // Let's do a transaction.

        let inserted = 0;
        for (const book of books) {
            // Handle optional fields
            const title = book.title;
            const notes = book.notes || '';
            const file_url = book.file_url || '';
            const date_added = book.date_added;
            // We preserve ID if possible, but if ID 1 already exists (from my test), we might conflict.
            // Actually, my test added a book. It probably got ID 1.
            // I should probably clean the table first since this is a "Restore".

            // Let's use ON CONFLICT DO NOTHING to be safe, or just DELETE content first if the user wants 'importar previos' as a full restore.
            // I'll try to insert with ID. If ID conflicts, I'll log it.

            const res = await client.query(
                `INSERT INTO books (id, title, notes, file_url, date_added) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (id) DO UPDATE SET 
                title=EXCLUDED.title, 
                notes=EXCLUDED.notes, 
                file_url=EXCLUDED.file_url,
                date_added=EXCLUDED.date_added
            `,
                [book.id, title, notes, file_url, date_added]
            );
            inserted++;
        }

        console.log(`Imported/Updated ${inserted} records.`);

        // Reset sequence
        await client.query(`SELECT setval('books_id_seq', (SELECT MAX(id) FROM books))`);
        console.log('Sequence reset.');

        await client.query('COMMIT');
        console.log('Import successful.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Import failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

importData();
