import { getBooks, searchForSidebar } from './actions';
import SearchSection from '@/components/SearchSection';
import BookTable from '@/components/BookTable';
import ResultsSidebar from '@/components/ResultsSidebar';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
    const params = await searchParams;
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 500;
    const q = params.q || '';      // Sidebar / Top Search
    const tq = params.tq || '';    // Table Search
    const sort = params.sort || 'date_desc';

    // Parallel fetch: main table data (using tq) AND sidebar search matches (using q)
    const booksPromise = getBooks(tq, limit, page, sort);
    const sidebarPromise = q ? searchForSidebar(q) : Promise.resolve([]);

    const [{ books, total }, sidebarResults] = await Promise.all([booksPromise, sidebarPromise]);

    return (
        <main className="container-fluid" style={{ maxWidth: '100vw', padding: '20px', background: 'var(--background)' }}>
            {/* Header Section */}
            <header className="flex mb-4 gap-4" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>MS Books — Neon + Vercel</h1>
                    <p className="muted" style={{ margin: 0 }}>Dashboard de gestión de recursos</p>
                </div>
            </header>

            {/* Global Controls */}
            <SearchSection initialQuery={q} />

            {/* Main Content Layout */}
            <div className="main-layout responsive-layout">

                {/* Left Sidebar - Always visible area, content optional */}
                <div style={{ height: 'calc(100vh - 250px)', overflow: 'hidden' }}>
                    {q ? (
                        <ResultsSidebar results={sidebarResults} />
                    ) : (
                        <div className="muted p-4 text-center">Sin búsqueda activa</div>
                    )}
                </div>

                {/* Right Content - Table */}
                <div style={{ minWidth: 0 }}>
                    <BookTable initialBooks={books} total={total} page={page} limit={limit} currentSort={sort} currentTq={tq} allTitles={[]} />
                </div>
            </div>

        </main>
    );
}
