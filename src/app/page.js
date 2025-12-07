import { getBooks, searchForSidebar, getAllTitles } from './actions';
import Search from '@/components/Search';
import TitleSuggester from '@/components/TitleSuggester';
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

    // Parallel fetch: main table data (using tq) AND sidebar search matches (using q) AND all titles for duplicates
    const booksPromise = getBooks(tq, limit, page, sort);
    const sidebarPromise = q ? searchForSidebar(q) : Promise.resolve([]);
    const allTitlesPromise = getAllTitles();

    const [{ books, total }, sidebarResults, allTitles] = await Promise.all([booksPromise, sidebarPromise, allTitlesPromise]);

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
            <div className="card glass p-3 mb-4 rounded">
                <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                    <div style={{ width: '25%', minWidth: '300px' }}>
                        <Search />
                    </div>
                    {/* Place for specific legacy controls if needed. Currently clean. */}
                </div>
                <div className="mt-3">
                    <TitleSuggester initialValue={q} />
                </div>
            </div>

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
                    <BookTable initialBooks={books} total={total} page={page} limit={limit} currentSort={sort} currentTq={tq} allTitles={allTitles} />
                </div>
            </div>

        </main>
    );
}
