'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addBook } from '@/app/actions';
import { cleanTitle } from '@/lib/utils';

export default function Search({ tags, setTags }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [term, setTerm] = useState(searchParams.get('q') || '');
    const [showToast, setShowToast] = useState(false);
    // Removed local tags state
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [tempTags, setTempTags] = useState('');

    // Debounce params update (For Sidebar Suggestions ONLY)
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }
        params.set('page', '1');

        const timeout = setTimeout(() => {
            router.replace(`/?${params.toString()}`);
        }, 300);

        return () => clearTimeout(timeout);
    }, [term, router, searchParams]);

    const handleKeyDown = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!term.trim()) return;

            const finalTitle = cleanTitle(term);
            const formData = new FormData();
            formData.append('title', finalTitle);

            // Append tags to notes
            const notesWithTags = tags.length > 0 ? tags.join(', ') : '';
            formData.append('notes', notesWithTags);

            formData.append('file_url', '');

            const res = await addBook(formData);
            if (res.success) {
                setTerm(''); // Clear input
                setShowToast('Agregado correctamente!');
                setTimeout(() => setShowToast(false), 2000);

                // Clear URL query immediately
                const params = new URLSearchParams(searchParams);
                params.delete('q');
                router.replace(`/?${params.toString()}`);
            } else {
                alert('Error: ' + res.message);
            }
        }
        if (e.key === 'Escape') {
            setTerm('');
            const params = new URLSearchParams(searchParams);
            params.delete('q');
            router.replace(`/?${params.toString()}`);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setTerm(text);
                // Optionally submit or just set the term. User just asked to "paste".
                // I will just set the term for now to let them edit if needed.
            }
        } catch (err) {
            console.error('Failed to read clipboard', err);
            setShowToast('Permiso denegado o error al pegar');
            setTimeout(() => setShowToast(false), 2000);
        }
    };

    return (
        <div className="flex w-full gap-2 relative" style={{ alignItems: 'center' }}>
            {/* Toast Notification */}
            {showToast && (
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent)',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    animation: 'fadeIn 0.3s ease',
                    zIndex: 100
                }}>
                    {showToast}
                </div>
            )}

            <button
                onClick={handlePaste}
                style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    padding: '12px 16px',
                    whiteSpace: 'nowrap',
                    height: '100%'
                }}
                className="hover-opacity"
                title="Pegar del portapapeles"
            >
                Paste
            </button>

            <input
                className="input"
                placeholder="Búsqueda: título, notas, URL..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ flex: 1, fontSize: '1.2rem', padding: '12px 16px' }}
                autoFocus
            />
            {term && (
                <button
                    onClick={() => {
                        setTerm('');
                        // Clear URL
                        const params = new URLSearchParams(searchParams);
                        params.delete('q');
                        router.replace(`/?${params.toString()}`);
                    }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        color: 'var(--muted)',
                        padding: '12px 16px',
                        whiteSpace: 'nowrap',
                        height: '100%'
                    }}
                    title="Limpiar (Esc)"
                    className="hover-opacity"
                >
                    Clear
                </button>
            )}

            {/* Tags Section */}
            <div className="flex gap-2" style={{ alignItems: 'center', marginLeft: '8px' }}>
                {tags.map((tag, i) => (
                    <span key={i} style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        whiteSpace: 'nowrap'
                    }}>
                        {tag}
                    </span>
                ))}
                <button
                    onClick={() => {
                        setTempTags(tags.join(', '));
                        setIsEditingTags(true);
                    }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--muted)',
                        transition: 'background 0.2s'
                    }}
                    className="hover-bg-glass"
                    title="Editar etiquetas automáticas"
                >
                    ✏️
                </button>
            </div>

            {/* Edit Tags Modal */}
            {isEditingTags && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 200,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setIsEditingTags(false)}>
                    <div style={{
                        background: '#0f172a', // Dark theme bg
                        border: '1px solid var(--glass-border)',
                        padding: '24px',
                        borderRadius: '8px',
                        width: '100%',
                        maxWidth: '400px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', color: '#fff' }}>Editar Etiquetas</h3>
                        <p style={{ marginBottom: '8px', color: '#94a3b8', fontSize: '0.9rem' }}>
                            Separadas por coma (se agregarán a "notas"):
                        </p>
                        <input
                            autoFocus
                            value={tempTags}
                            onChange={(e) => setTempTags(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                color: '#fff',
                                marginBottom: '20px',
                                fontSize: '1rem'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const newTags = tempTags.split(',').map(t => t.trim()).filter(Boolean);
                                    setTags(newTags);
                                    setIsEditingTags(false);
                                }
                            }}
                        />
                        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setIsEditingTags(false)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    border: '1px solid #334155',
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const newTags = tempTags.split(',').map(t => t.trim()).filter(Boolean);
                                    setTags(newTags);
                                    setIsEditingTags(false);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: '#3b82f6',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
