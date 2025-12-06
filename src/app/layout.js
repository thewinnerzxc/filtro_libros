import './globals.css';

export const metadata = {
    title: 'MS Books — Neon + Vercel',
    description: 'Gestor de libros y recursos médicos.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body>{children}</body>
        </html>
    );
}
