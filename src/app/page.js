import { getBooks } from './actions';
import Search from '@/components/Search';
import TitleSuggester from '@/components/TitleSuggester';
                <h1>MS Books — Neon + Vercel</h1>
                <p className="muted">Dashboard de gestión de recursos</p>
            </header >

            <div className="mb-4">
                <Search />
            </div>

            <div className="mb-4">
                <TitleSuggester />
            </div>

            <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
                {/* Sidebar: Show if searching or if wanted always? 
            Original layout had it. Let's filter visualization.
            If Searching, show matches on left? 
        */}
                {q && (
                    <div style={{ width: '300px', flexShrink: 0 }}>
                        <ResultsSidebar books={books} />
                    </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                    <BookTable initialBooks={books} total={total} page={page} limit={limit} />
                </div>
            </div>

        </main >
    );
}
