'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        if (res.ok) {
            router.push('/');
            router.refresh();
        } else {
            setError(true);
        }
    };

    return (
        <div className="flex center col" style={{ minHeight: '100vh' }}>
            <div className="glass p-4 rounded col gap-4" style={{ width: '300px' }}>
                <h2 style={{ textAlign: 'center' }}>Acceso Restringido</h2>
                <form onSubmit={handleSubmit} className="col gap-4">
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                    />
                    {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'center' }}>Incorrecto</span>}
                    <button type="submit" className="btn btn-primary">Entrar</button>
                </form>
            </div>
        </div>
    );
}
