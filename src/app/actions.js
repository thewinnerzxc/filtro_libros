'use server';
import pool from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getBooks(query = '', limit = 7, page = 1) {
    const client = await pool.connect();
    try {
        const offset = (page - 1) * limit;
        let whereClause = '';
        const params = [limit, offset];

        if (query.trim()) {
            whereClause = 'WHERE ';
            const tokens = query.trim().split(/\s+/);
            const conditions = [];
            tokens.forEach((token, idx) => {
                const pLen = params.length;
                params.push(`%${token}%`);
                conditions.push(`(title ILIKE $${pLen + 1} OR notes ILIKE $${pLen + 1} OR file_url ILIKE $${pLen + 1})`);
            });
            whereClause += conditions.join(' AND ');
        }

        const sql = `
      SELECT *, count(*) OVER() as full_count 
      FROM books 
      ${whereClause}
      ORDER BY date_added DESC, id DESC
      LIMIT $1 OFFSET $2
    `;

        const res = await client.query(sql, params);
        const total = res.rows.length > 0 ? parseInt(res.rows[0].full_count) : 0;

        return {
            books: res.rows.map(r => ({
                id: r.id,
                title: r.title,
                notes: r.notes || '',
                file_url: r.file_url || '',
                date_added: r.date_added ? r.date_added.toISOString() : null
            })),
            total
        };
    } finally {
        client.release();
    }
}

export async function addBook(formData) {
    const client = await pool.connect();
    try {
        const title = formData.get('title');
        const notes = formData.get('notes');
        const file_url = formData.get('file_url');

        if (!title) return { success: false, message: 'Título requerido' };

        const res = await client.query(
            'INSERT INTO books (title, notes, file_url) VALUES ($1, $2, $3) RETURNING id',
            [title, notes, file_url]
        );
        revalidatePath('/');
        return { success: true, id: res.rows[0].id };
    } catch (e) {
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}

export async function deleteBook(id) {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM books WHERE id = $1', [id]);
        revalidatePath('/');
        return { success: true };
    } finally {
        client.release();
    }
}

export async function updateBook(id, data) {
    const client = await pool.connect();
    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (typeof data.title !== 'undefined') { fields.push(`title=$${idx++}`); values.push(data.title); }
        if (typeof data.notes !== 'undefined') { fields.push(`notes=$${idx++}`); values.push(data.notes); }
        if (typeof data.file_url !== 'undefined') { fields.push(`file_url=$${idx++}`); values.push(data.file_url); }

        if (fields.length === 0) return { success: true };

        values.push(id);
        const sql = `UPDATE books SET ${fields.join(', ')} WHERE id=$${idx}`;
        await client.query(sql, values);

        revalidatePath('/');
        return { success: true };
    } finally {
        client.release();
    }
}

export async function bulkAdd(text) {
    const lines = text.split(/\r?\n/).filter(x => x.trim());
    const client = await pool.connect();
    let added = 0;
    try {
        await client.query('BEGIN');
        for (const line of lines) {
            let parts = line.split('|');
            if (parts.length === 1) parts = line.split(',');

            const title = parts[0]?.trim();
            const notes = parts[1]?.trim() || '';
            const url = parts[2]?.trim() || '';

            if (title) {
                const exist = await client.query('SELECT 1 FROM books WHERE title = $1', [title]);
                if (exist.rowCount === 0) {
                    await client.query('INSERT INTO books (title, notes, file_url) VALUES ($1, $2, $3)', [title, notes, url]);
                    added++;
                }
            }
        }
        await client.query('COMMIT');
        revalidatePath('/');
        return { success: true, count: added };
    } catch (e) {
        await client.query('ROLLBACK');
        return { success: false, message: e.message };
    } finally {
        client.release();
    }
}
