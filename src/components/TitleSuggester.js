'use client';
import { useState, useEffect } from 'react';
import { cleanTitle } from '@/lib/utils';
import { addBook } from '@/app/actions';

export default function TitleSuggester({ initialValue = '' }) {
    const [raw, setRaw] = useState(initialValue);
    const [suggestion, setSuggestion] = useState(initialValue ? cleanTitle(initialValue) : '');
    const [showToast, setShowToast] = useState(false);

    // Sync from search query automatically
    useEffect(() => {
        if (initialValue) {
            setRaw(initialValue);
            setSuggestion(cleanTitle(initialValue));
        }
    }, [initialValue]);

    const handleInput = (e) => {
        const val = e.target.value;
        setRaw(val);
        setSuggestion(cleanTitle(val));
    };

    const copySuggestion = () => {
        if (!suggestion) return;
        navigator.clipboard.writeText(suggestion);
        setShowToast('Copiado!');
        setTimeout(() => setShowToast(false), 2000);
    };

    const addSuggestion = async () => {
        if (!suggestion) return;

        const formData = new FormData();
        formData.append('title', suggestion);
        formData.append('notes', '');
        formData.append('file_url', '');

        const res = await addBook(formData);
        if (res.success) {
            setRaw('');
            setSuggestion('');
            setShowToast('Agregado correctamente');
            setTimeout(() => setShowToast(false), 2000);
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
        <div className="glass p-4 rounded mb-4 flex col gap-2" style={{ position: 'relative' }}>
            {/* Toast Notification */}
            {showToast && (
                <div style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '0',
                    background: 'var(--accent)',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    animation: 'fadeIn 0.3s ease',
                    zIndex: 10
                }}>
                    {showToast}
                </div>
            )}

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
