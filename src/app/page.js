import { getBooks } from './actions';
import Search from '@/components/Search';
import TitleSuggester from '@/components/TitleSuggester';
import BookTable from '@/components/BookTable';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
    const page = parseInt(searchParams.page) || 1;
    const limit = parseInt(searchParams.limit) || 7;
    const q = searchParams.q || '';

    const { books, total } = await getBooks(q, limit, page);

    return (
        <main className="container">
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

            <BookTable initialBooks={books} total={total} page={page} limit={limit} />

        </main>
    );
}
