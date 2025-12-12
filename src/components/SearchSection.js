'use client';
import { useState } from 'react';
import Search from './Search';
import TitleSuggester from './TitleSuggester';

import { syncLibrary } from '@/app/actions';

export default function SearchSection({ initialQuery }) {
    const [tags, setTags] = useState([]);
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        const res = await syncLibrary();
        setSyncing(false);
        if (res.success) {
            alert(`Sincronización completa. Se agregaron ${res.count} libros nuevos.`);
        } else {
            alert(`Error: ${res.message}`);
        }
    };

    return (
        <div className="card glass p-3 mb-4 rounded">
            <div className="flex gap-4" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <Search tags={tags} setTags={setTags} />
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="btn"
                    style={{ whiteSpace: 'nowrap', height: '42px' }}
                >
                    {syncing ? 'Sincronizando...' : 'Actualizar historial'}
                </button>
            </div>
            <div className="mt-3">
                <TitleSuggester initialValue={initialQuery} tags={tags} />
            </div>
        </div>
    );
}
