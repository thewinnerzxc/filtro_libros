import { getBooks } from './actions';
import Search from '@/components/Search';
import TitleSuggester from '@/components/TitleSuggester';
import BookTable from '@/components/BookTable';
import ResultsSidebar from '@/components/ResultsSidebar';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
    const params = await searchParams;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 7;
    const q = params.q || '';

    const { books, total } = await getBooks(q, limit, page);

    return (
        <main className="container" style={{ maxWidth: '1800px' }}>
            <header className="mb-4">
                <h1>MS Books — Neon + Vercel</h1>
                <p className="muted">Dashboard de gestión de recursos</p>
            </header>

            <div className="mb-4">
                <Search />
            </div>

            <div className="mb-4">
                <TitleSuggester />
            </div>

            <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
                {q && (
                    <div style={{ width: '300px', flexShrink: 0 }}>
                        <ResultsSidebar books={books} />
                    </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                    <BookTable initialBooks={books} total={total} page={page} limit={limit} />
                </div>
            </div>

        </main>
    );
}
