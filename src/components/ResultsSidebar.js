'use client';
import { useSearchParams } from 'next/navigation';

export default function ResultsSidebar({ books }) {
    const searchParams = useSearchParams();
    const q = searchParams.get('q') || '';

    // Highlight helper
    const highlight = (text) => {
        if (!q) return text;
        const parts = text.split(new RegExp(`(${q})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === q.toLowerCase() ?
                <span key={i} style={{ background: 'yellow', color: 'black' }}>{part}</span> : part
        );
    };

    return (
        <div className="results-sidebar p-2" style={{ borderRight: '1px solid var(--glass-border)', height: '100%' }}>
            <h4 className="mb-2 muted">{books.length} resultados visibles</h4>
            <div className="flex col gap-2">
                {books.map(b => (
                    <div key={b.id} className="card glass p-2" style={{ fontSize: '0.9rem' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{highlight(b.title)}</div>
                        <div className="muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.file_url}
                        </div>
                    </div>
                ))}
                {books.length === 0 && <div className="muted p-2">Sin resultados</div>}
            </div>
        </div>
    );
}
