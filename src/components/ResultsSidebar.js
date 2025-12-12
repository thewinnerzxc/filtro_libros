'use client';
import { useSearchParams } from 'next/navigation';

export default function ResultsSidebar({ results = [] }) {
    const searchParams = useSearchParams();
    const q = searchParams.get('q') || '';
    // Split on space, dot, underscore, dash to match backend logic
    const tokens = q.toLowerCase().split(/[\s_\.\-]+/).filter(t => t);

    // Highlight logic: match any token
    const highlight = (text) => {
        if (!tokens.length) return text;
        // Escape regex spec chars in tokens
        const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        // Match any token, case insensitive
        const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

        // Split by regex including separator (captured group)
        const parts = text.split(regex);

        return parts.map((part, i) => {
            // Check if this part matches one of our tokens
            // The regex test is sufficient usually, but let's be safe
            if (regex.test(part)) {
                return (
                    <span key={i} style={{ background: '#ffeeba', color: 'black', fontWeight: 'bold' }}>
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    return (
        <div className="results-sidebar flex col" style={{
            height: '100%',
            borderRight: '1px solid var(--glass-border)',
            overflowY: 'auto',
            paddingRight: '10px'
        }}>
            <div className="p-3 mb-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <h4 className="fs-5 m-0" style={{ color: 'var(--foreground)' }}>
                    {results.length} coincidencias
                </h4>
                <span className="muted" style={{ fontSize: '0.8rem' }}>Top 50 mostradas</span>
            </div>

            <div className="flex col gap-3 p-2">
                {results.map(b => (
                    <div key={b.id} className="card p-3" style={{
                        background: 'rgba(255,255,255,0.95)',
                        color: '#333',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s'
                    }}>
                        <div style={{
                            fontWeight: '600',
                            marginBottom: '4px',
                            fontSize: '0.95rem',
                            lineHeight: '1.4',
                            wordBreak: 'break-word'
                        }}>
                            {highlight(b.title)}
                        </div>
                        {/* Optional: Show file_url if distinct? */}
                        <div style={{ fontSize: '0.75rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.notes}
                        </div>
                    </div>
                ))}
                {results.length === 0 && <div className="muted p-2">Sin coincidencias</div>}
            </div>
        </div>
    );
}
