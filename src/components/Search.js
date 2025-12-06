'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Search() {
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const [term, setTerm] = useState(searchParams.get('q') || '');

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }
        params.set('page', '1'); // Reset page on search

        const timeout = setTimeout(() => {
            replace(`/?${params.toString()}`);
        }, 300);

        return () => clearTimeout(timeout);
    }, [term, replace, searchParams]);

    return (
        <div className="input-group flex center w-full">
            <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Búsqueda: título, notas, URL..."
                className="glass"
                style={{ maxWidth: '600px', fontSize: '1.1rem' }}
            />
            {term && (
                <button
                    onClick={() => setTerm('')}
                    className="btn glass"
                    style={{ marginLeft: '-40px', border: 'none', background: 'transparent', color: '#ccc' }}
                >
                    ×
                </button>
            )}
        </div>
    );
}
