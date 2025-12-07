'use client';
import { useState, useEffect, useCallback } from 'react';
import { deleteBook, updateBook } from '@/app/actions';
import { useRouter, useSearchParams } from 'next/navigation';

export default function BookTable({ initialBooks, total, page, limit, currentSort, currentTq }) {
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

    // Date formatter (Manual UTC-5 for consistency)
    const formatDate = (isoString) => {
        if (!isoString) return '-';
        try {
            // Ensure input is treated as UTC if missing timezone info
            let safeIso = isoString;
            if (typeof safeIso === 'string') {
                if (safeIso.includes(' ')) safeIso = safeIso.replace(' ', 'T');
                if (!safeIso.endsWith('Z') && !safeIso.includes('+') && !safeIso.includes('-')) {
                    safeIso += 'Z';
                }
            }

            const d = new Date(safeIso);
            // Shift -5 hours from UTC
            const limaTime = new Date(d.getTime() - (5 * 60 * 60 * 1000));

            const day = String(limaTime.getUTCDate()).padStart(2, '0');
            const month = String(limaTime.getUTCMonth() + 1).padStart(2, '0');
            const year = String(limaTime.getUTCFullYear()).slice(-2);
            const hour = String(limaTime.getUTCHours()).padStart(2, '0');
            const min = String(limaTime.getUTCMinutes()).padStart(2, '0');

            return `${day}/${month}/${year}, ${hour}:${min}`;
        } catch (e) {
            return '-';
        }
    };

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
                                    <td className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div
                                            onClick={() => copyToClipboard(book.title)}
                                            style={{ cursor: 'pointer', color: 'var(--foreground)' }}
                                            className="hover-bright"
                                            title="Click para copiar"
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
