const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Using dotenv just for the script if running standalone
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

function parseCSV(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i];
        const values = [];
        let currentVal = '';
        let inQuotes = false;
        for (let char of currentLine) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentVal.trim());
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
        values.push(currentVal.trim());

        const entry = {};
        headers.forEach((h, index) => {
            let val = values[index] || '';
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            entry[h] = val;
        });
        data.push(entry);
    }
    return data;
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Creating table books...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT,
        file_url TEXT,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Check for books.csv in root or src? 
        // It is in root now.
        const csvPath = path.join(__dirname, '../books.csv');
        if (fs.existsSync(csvPath)) {
            console.log('Reading books.csv...');
            const csvContent = fs.readFileSync(csvPath, 'utf8');
            const rows = parseCSV(csvContent);

            console.log(`Found ${rows.length} rows. Inserting...`);

            await client.query('BEGIN');

            for (const row of rows) {
                const dateVal = row.date && row.date !== 'null' ? row.date : new Date().toISOString();

                await client.query(`
                INSERT INTO books (id, title, notes, file_url, date_added)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE 
                SET title = EXCLUDED.title,
                    notes = EXCLUDED.notes, 
                    file_url = EXCLUDED.file_url,
                    date_added = EXCLUDED.date_added;
            `, [row.id, row.title, row.notes, row.file_url, dateVal]);
            }

            await client.query(`SELECT setval('books_id_seq', (SELECT MAX(id) FROM books));`);
            await client.query('COMMIT');
            console.log('Migration complete.');
        } else {
            console.log('books.csv not found, skipping data import.');
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
