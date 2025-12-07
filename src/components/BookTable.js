'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { deleteBook, updateBook } from '@/app/actions';
import { useRouter, useSearchParams } from 'next/navigation';

export default function BookTable({ initialBooks, total, page, limit, currentSort, currentTq, allTitles = [] }) {
    const [books, setBooks] = useState(initialBooks);
    // Sync state with props when data matches (for server updates)
    useEffect(() => { setBooks(initialBooks); }, [initialBooks]);

    const router = useRouter();
    const searchParams = useSearchParams();

    // Table Search State
    const [tq, setTq] = useState(currentTq || '');

    // Debounce Table Search
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (tq !== (currentTq || '')) {
                const params = new URLSearchParams(searchParams);
                if (tq) params.set('tq', tq);
                else params.delete('tq');
                params.set('page', '1'); // Reset page on filter
                router.replace(`/?${params.toString()}`);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [tq, currentTq, router, searchParams]);

    const [selected, setSelected] = useState(new Set());
    const [lastSelected, setLastSelected] = useState(null);
    const [newIds, setNewIds] = useState(new Set());

    useEffect(() => {
        try {
            const stored = JSON.parse(sessionStorage.getItem('new_ids') || '[]');
            setNewIds(new Set(stored));
        } catch { }
    }, []);

    // Global ESC handler to clear selections and search
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (tq) setTq(''); // Clear table search
                setSelected(new Set()); // Clear selection
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [tq]);


    const toggleSelect = (id, shiftKey) => {
        const next = new Set(selected);

        if (shiftKey && lastSelected !== null) {
            const ids = books.map(b => b.id);
            const start = ids.indexOf(lastSelected);
            const end = ids.indexOf(id);

            if (start !== -1 && end !== -1) {
                const low = Math.min(start, end);
                const high = Math.max(start, end);
                const range = ids.slice(low, high + 1);
                range.forEach(rid => next.add(rid));
            }
        } else {
            if (next.has(id)) next.delete(id);
            else next.add(id);
        }

        setLastSelected(id);
        setSelected(next);
    };

    const handleEdit = async (id, field, value) => {
        // Optimistic update
        setBooks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
        await updateBook(id, { [field]: value });
    };

    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', onConfirm: null });

    const copyTitles = (list) => {
        if (!list.length) return alert('Nada para copiar');
        navigator.clipboard.writeText(list.join('\n')).then(() => {
            alert(`Copiado ${list.length} títulos`);
        });
    };

    const copySelected = () => {
        const titles = books.filter(b => selected.has(b.id)).map(b => b.title);
        copyTitles(titles);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        const el = document.createElement('div');
        el.textContent = 'Copiado!';
        el.style.cssText = `
            position: fixed; top: 20px; right: 20px; 
            background: var(--accent); color: white; padding: 5px 10px; 
            border-radius: 4px; z-index: 9999; animation: fadeOut 2s forwards;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    };

    const handleDelete = (id) => {
        setConfirmModal({
            show: true,
            title: '¿Eliminar este libro?',
            onConfirm: async () => {
                await deleteBook(id);
                setBooks(prev => prev.filter(b => b.id !== id));
                if (selected.has(id)) {
                    const next = new Set(selected);
                    next.delete(id);
                    setSelected(next);
                }
                setConfirmModal({ show: false, title: '', onConfirm: null });
            }
        });
    };

    const deleteSelectedRows = () => {
        if (!selected.size) return;
        setConfirmModal({
            show: true,
            title: `¿Eliminar ${selected.size} libros seleccionados?`,
            onConfirm: async () => {
                await Promise.all([...selected].map(id => deleteBook(id)));
                setSelected(new Set());
                setConfirmModal({ show: false, title: '', onConfirm: null });
            }
        });
    };

    const toggleSort = () => {
        const params = new URLSearchParams(searchParams);
        const newSort = currentSort === 'title_asc' ? 'title_desc' : 'title_asc';
        params.set('sort', newSort);
        router.replace(`/?${params.toString()}`);
    };

    // Date formatter
    const formatDate = (isoString) => {
        if (!isoString) return '-';
        try {
            // isoString is now the local time string from DB (e.g. "2025-12-06T21:30:00...")
            // We just need to display it as DD/MM/YY, HH:MM
            const d = new Date(isoString);

            // Should verify if browser interprets this "local string" correctly or if we need to force it.
            // If DB sends "2025-12-06 21:30:00", new Date() might assume local browser time (which is correct for "wall clock" display).
            // Let's use simple string parsing to avoid any browser timezone interference.

            // Example ISO from DB (after manual constructing or standard ISOS): "2025-12-06T21:30:00.000Z" 
            // Wait, if we cast to UTC in DB, it comes out as UTC.

            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear()).slice(-2);
            const hour = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');

            return `${day}/${month}/${year}, ${hour}:${min}`;
        } catch (e) {
            return '-';
        }
    };

    // Calculate duplicates for current page
    // Calculate duplicates for current page using Global scope
    // "aunque deberian permanecer marcados todo el tiempo aún si salgo de la funcion de busqueda"
    // Calculate duplicates for current page using Global scope
    // "aunque deberian permanecer marcados todo el tiempo aún si salgo de la funcion de busqueda"
    // "este caso tambien debe considerarse implicado en duplicidad, es decir cuando en lugar de espacio entrre palabras se use algún simbolo"
    const duplicateIds = useMemo(() => {
        const ids = new Set();

        // Helper to normalize title for comparison: 
        // 1. Remove file extensions (.pdf, .epub, .rar, .zip)
        // 2. Lowercase 
        // 3. Replace separators (_, ., -) with spaces 
        // 4. Collapse multiple spaces -> single space
        const normalize = (t) => {
            if (!t) return '';
            let s = t.toLowerCase();
            // Remove extensions
            s = s.replace(/\.(pdf|epub|mobi|azw3|djvu|txt|rtf|docx?|zip|rar|7z)$/i, '');
            // Replace separators
            s = s.replace(/[_\.-]/g, ' ');
            // Collapse spaces
            return s.replace(/\s+/g, ' ').trim();
        };

        const currentItems = books.map(b => ({
            id: b.id,
            title: normalize(b.title)
        }));

        const allNormalized = allTitles.map(t => ({
            id: t.id,
            title: normalize(t.title)
        }));

        for (let i = 0; i < currentItems.length; i++) {
            const t1 = currentItems[i].title;
            const id1 = currentItems[i].id;

            if (!t1) continue;

            for (let j = 0; j < allNormalized.length; j++) {
                const t2 = allNormalized[j].title;
                const id2 = allNormalized[j].id;

                if (id1 === id2) continue; // Skip self

                // Check inclusion
                if (t2.includes(t1)) {
                    // t1 is inside t2. t1 is duplicate.
                    ids.add(id1);
                    ids.add(id2);
                }
            }
        }
        return ids;
    }, [books, allTitles]);

    return (
        <div className="card glass p-4 rounded mt-4" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Custom Modal Overlay */}
            {confirmModal.show && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    borderRadius: '8px',
                    backdropFilter: 'blur(2px)'
                }}>
                    <div className="card p-4" style={{
                        background: '#1a1a1a',
                        border: '1px solid var(--glass-border)',
                        minWidth: '300px',
                        textAlign: 'center'
                    }}>
                        <h4 className="mb-4">{confirmModal.title}</h4>
                        <div className="flex center gap-4">
                            <button
                                onClick={() => setConfirmModal({ show: false, title: '', onConfirm: null })}
                                className="btn"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="btn btn-danger"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination Top */}
            <div className="flex center mb-3 gap-4" style={{ justifyContent: 'flex-end' }}>
                <a href={page > 1 ? `/?page=${page - 1}&limit=500&tq=${tq}&sort=${currentSort}` : '#'} className={`btn ${page <= 1 ? 'disabled' : ''}`}>Prev</a>
                <span>Página {page}</span>
                <a href={`/?page=${page + 1}&limit=500&tq=${tq}&sort=${currentSort}`} className="btn">Next</a>
            </div>

            <div className="toolbar flex gap-2 mb-2" style={{ justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="flex gap-2 center">
                    <strong>Tabla ({total} total)</strong>
                    <button onClick={() => setSelected(new Set())} className="btn small">Clear Selection</button>

                    {/* Table Search */}
                    <div className="flex relative gap-2" style={{ alignItems: 'center', marginLeft: '10px' }}>
                        <input
                            value={tq}
                            onChange={(e) => setTq(e.target.value)}
                            placeholder="Buscar en tabla..."
                            className="input small"
                            style={{ width: '100%', maxWidth: '400px', padding: '8px' }}
                        />
                        {tq && (
                            <button
                                onClick={() => setTq('')}
                                style={{
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', borderRadius: '3px',
                                    padding: '8px 12px', cursor: 'pointer', color: 'var(--muted)'
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={copySelected} className="btn">Copiar seleccionados</button>
                    <button onClick={deleteSelectedRows} className="btn btn-danger">Eliminar seleccionados</button>
                </div>
            </div>

            <div style={{ overflowX: 'auto', flex: 1 }}>
                <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                            <th className="p-3">#</th>
                            <th className="p-3"><input type="checkbox" onChange={(e) => {
                                if (e.target.checked) setSelected(new Set(books.map(b => b.id)));
                                else setSelected(new Set());
                            }} /></th>
                            <th className="p-3">Fecha</th>
                            <th
                                className="p-3"
                                style={{ cursor: 'pointer', userSelect: 'none', textDecoration: 'underline' }}
                                onClick={toggleSort}
                                title="Click para ordenar"
                            >
                                Título {currentSort === 'title_asc' ? '▲' : (currentSort === 'title_desc' ? '▼' : '')}
                            </th>
                            <th className="p-3">Notas</th>
                            <th className="p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {books.map((book) => {
                            const isNew = newIds.has(book.id);
                            const isDuplicate = duplicateIds.has(book.id);

                            return (
                                <tr key={book.id} style={{
                                    background: isNew ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
                                }}>
                                    <td className="p-3 muted" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>{book.id}</td>
                                    <td className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(book.id)}
                                            onClick={(e) => toggleSelect(book.id, e.shiftKey)}
                                            readOnly // handled by onClick, readonly for react strictness (although onClick prevents actual toggle without set)
                                        />
                                    </td>
                                    <td className="p-3 muted" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        {formatDate(book.date_added)}
                                    </td>
                                    <td className="p-3" style={{
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        background: isDuplicate ? 'rgba(239, 68, 68, 0.15)' : 'transparent', // Subtle red for duplicates
                                        color: isDuplicate ? '#fca5a5' : 'inherit'
                                    }}>
                                        <div
                                            onClick={() => copyToClipboard(book.title)}
                                            style={{ cursor: 'pointer' }}
                                            className="hover-bright"
                                            title={isDuplicate ? "Título duplicado" : "Click para copiar"}
                                        >
                                            {book.title}
                                        </div>
                                    </td>
                                    <td className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => handleEdit(book.id, 'notes', e.target.innerText)}
                                            className="editable muted"
                                            style={{ fontSize: '0.9em' }}
                                        >{book.notes}</div>
                                    </td>
                                    <td className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <button onClick={() => handleDelete(book.id)} className="btn btn-danger small">×</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
