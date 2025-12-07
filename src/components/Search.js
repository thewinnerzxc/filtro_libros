'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addBook } from '@/app/actions';
import { cleanTitle } from '@/lib/utils';

export default function Search() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [term, setTerm] = useState(searchParams.get('q') || '');
    const [showToast, setShowToast] = useState(false);

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
            formData.append('notes', '');
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
        </div>
    );
}
