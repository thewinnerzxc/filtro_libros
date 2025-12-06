'use client';
import { useState, useEffect } from 'react';
import { deleteBook, updateBook } from '@/app/actions';

export default function BookTable({ initialBooks, total, page, limit }) {
    const [books, setBooks] = useState(initialBooks);
    // Sync state with props when data matches (for server updates)
    useEffect(() => { setBooks(initialBooks); }, [initialBooks]);

    const [selected, setSelected] = useState(new Set());
    const [newIds, setNewIds] = useState(new Set());

    useEffect(() => {
        try {
            const stored = JSON.parse(sessionStorage.getItem('new_ids') || '[]');
            setNewIds(new Set(stored));
        } catch { }
    }, []);

    const toggleSelect = (id) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const handleEdit = async (id, field, value) => {
        // Optimistic update
        setBooks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
        await updateBook(id, { [field]: value });
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar?')) return;
        await deleteBook(id);
        // Optimistic remove
        setBooks(prev => prev.filter(b => b.id !== id));
        selected.delete(id);
        setSelected(new Set(selected));
    };

    const copyTitles = (list) => {
        if (!list.length) return alert('Nada para copiar');
        navigator.clipboard.writeText(list.join('\n')).then(() => alert(`Copiado ${list.length} títulos`));
    };

    const copySelected = () => {
        const titles = books.filter(b => selected.has(b.id)).map(b => b.title);
        copyTitles(titles);
    };

    const deleteSelectedRows = async () => {
        if (!selected.size) return;
        if (!confirm(`¿Eliminar ${selected.size} libros?`)) return;
        // loop delete (server action)
        // Parallelize
        await Promise.all([...selected].map(id => deleteBook(id)));
        setSelected(new Set());
    };

    return (
        <div className="card glass p-4 rounded mt-4" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="toolbar flex gap-2 mb-2" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div className="flex gap-2 center">
                    <strong>Tabla ({total} total)</strong>
                    <button onClick={() => setSelected(new Set())} className="btn small">Clear Selection</button>
                </div>
                <div className="flex gap-2">
                    {/* "Copiar verdes" removed as requested */}
                    <button onClick={copySelected} className="btn">Copiar seleccionados</button>
                    <button onClick={deleteSelectedRows} className="btn btn-danger">Eliminar seleccionados</button>
                </div>
            </div>

            <div style={{ overflowX: 'auto', flex: 1 }}>
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                            <th className="p-2">#</th>
                            <th className="p-2"><input type="checkbox" onChange={(e) => {
                                if (e.target.checked) setSelected(new Set(books.map(b => b.id)));
                                else setSelected(new Set());
                            }} /></th>
                            <th className="p-2">Título</th>
                            <th className="p-2">Notas</th>
                            <th className="p-2">Link</th>
                            <th className="p-2">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {books.map((book) => {
                            const isNew = newIds.has(book.id);
                            return (
                                <tr key={book.id} style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: isNew ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
                                }}>
                                    <td className="p-2 muted">{book.id}</td>
                                    <td className="p-2">
                                        <input type="checkbox" checked={selected.has(book.id)} onChange={() => toggleSelect(book.id)} />
                                    </td>
                                    <td className="p-2">
                                        <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleEdit(book.id, 'title', e.target.innerText)}
                                            className="editable"
                                        >{book.title}</div>
                                    </td>
                                    <td className="p-2">
                                        <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleEdit(book.id, 'notes', e.target.innerText)}
                                            className="editable muted"
                                            style={{ fontSize: '0.9em' }}
                                        >{book.notes}</div>
                                    </td>
                                    <td className="p-2">
                                        <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleEdit(book.id, 'file_url', e.target.innerText)}
                                            className="editable"
                                            style={{ color: 'var(--accent)', fontSize: '0.9em', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        >{book.file_url}</div>
                                    </td>
                                    <td className="p-2">
                                        <button onClick={() => handleDelete(book.id)} className="btn btn-danger small">×</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex center mt-4 gap-4">
                <a href={page > 1 ? `/?page=${page - 1}&limit=${limit}` : '#'} className={`btn ${page <= 1 ? 'disabled' : ''}`}>Prev</a>
                <span>Página {page}</span>
                <a href={`/?page=${page + 1}&limit=${limit}`} className="btn">Next</a>
            </div>
        </div>
    );
}
