const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Target Directory
const TARGET_DIR = 'C:\\Users\\vacue\\OneDrive\\medicalstrike.com\\LIBROS SELECCIONADOS FINAL';

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

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            // Filter interesting files? User said "import all titles".
            // Let's exclude system files or junk if needed.
            // But for now, include everything that isn't a directory.
            // Maybe skip .ini, .db (Thumbs.db), etc.
            if (!file.match(/^(\.|Thumbs\.db|desktop\.ini)/i)) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

async function importFolder() {
    const client = await pool.connect();
    try {
        console.log(`Scanning directory: ${TARGET_DIR}`);
        if (!fs.existsSync(TARGET_DIR)) {
            throw new Error(`Directory not found: ${TARGET_DIR}`);
        }

        const files = getAllFiles(TARGET_DIR);
        console.log(`Found ${files.length} files.`);

        await client.query('BEGIN');

        // WIPE DATABASE as requested ("elimina todos los registros actuales")
        console.log('Deleting existing records...');
        await client.query('DELETE FROM books');

        // Reset sequence so IDs start at 1
        await client.query('ALTER SEQUENCE books_id_seq RESTART WITH 1');

        console.log('Inserting new records...');
        let inserted = 0;

        // Chunking to avoid massive transaction issues if thousands? 
        // files.length is likely < 5000 based on previous backups. One tx is fine.

        for (const filePath of files) {
            const fileName = path.basename(filePath); // Title: "MyBook.pdf"
            const folderPath = path.dirname(filePath); // Notes: "C:\...\Folder"

            // Remove file extension from title? "Compendium.pdf" -> "Compendium"
            // User said "titulos de los libros" usually means the name.
            // Let's keep extension or remove it?
            // In previous data "books.json", titles had .pdf (e.g., "11.Lens and Cataract.pdf").
            // So I will KEEP the extension to be safe and consistent with previous data.

            const title = fileName;

            // Simplify location: Remove prefix before "\LIBROS SELECCIONADOS FINAL"
            const notes = folderPath.replace('C:\\Users\\vacue\\OneDrive\\medicalstrike.com', '');

            const file_url = filePath; // Storing full path in file_url seems useful? Or leave empty? 
            // User didn't specify file_url. But "notes" has location.
            // I'll put path in file_url too, it identifies the record uniquely.

            await client.query(
                `INSERT INTO books (title, notes, file_url) VALUES ($1, $2, $3)`,
                [title, notes, file_url]
            );
            inserted++;
        }

        await client.query('COMMIT');
        console.log(`Successfully imported ${inserted} books from local folder.`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Import failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

importFolder();
