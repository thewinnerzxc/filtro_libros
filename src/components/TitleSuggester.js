'use client';
import { useState } from 'react';
import { cleanTitle } from '@/lib/utils';
import { addBook } from '@/app/actions';

export default function TitleSuggester() {
    const [raw, setRaw] = useState('');
    const [suggestion, setSuggestion] = useState('');

    const handleInput = (e) => {
        const val = e.target.value;
        setRaw(val);
        setSuggestion(cleanTitle(val));
    };

    const copySuggestion = () => {
        if (!suggestion) return;
        navigator.clipboard.writeText(suggestion);
        alert('Copiado!');
    };

    const addSuggestion = async () => {
        if (!suggestion) return;
        // Call server action
        const formData = new FormData();
        formData.append('title', suggestion);
        formData.append('notes', '');
        formData.append('file_url', '');

        // Optimistic UI or wait?
        const res = await addBook(formData);
        if (res.success) {
            setRaw('');
            setSuggestion('');
            alert('Agregado!');
        } else {
            alert('Error: ' + res.message);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            addSuggestion();
        }
    };

    return (
        <div className="glass p-4 rounded mb-4 flex col gap-2">
            <h3 className="muted">Sugerencia de Título</h3>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <input
                    value={raw}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Pega el nombre feo aquí..."
                    style={{ flex: 1, minWidth: '300px' }}
                />
                <input
                    value={suggestion}
                    readOnly
                    placeholder="Sugerencia..."
                    style={{ flex: 1, minWidth: '300px', color: 'var(--accent)' }}
                />
                <div className="flex gap-2">
                    <button onClick={copySuggestion} className="btn" title="Copiar Título Sugerido">📋 Copiar</button>
                    <button onClick={addSuggestion} className="btn btn-primary" title="Agregar a Tabla">➕ Agregar</button>
                </div>
            </div>
        </div>
    );
}
