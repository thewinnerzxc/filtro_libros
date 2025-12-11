'use client';
import { useState } from 'react';
import Search from './Search';
import TitleSuggester from './TitleSuggester';

export default function SearchSection({ initialQuery }) {
    const [tags, setTags] = useState([]);

    return (
        <div className="card glass p-3 mb-4 rounded">
            <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <Search tags={tags} setTags={setTags} />
                </div>
            </div>
            <div className="mt-3">
                <TitleSuggester initialValue={initialQuery} tags={tags} />
            </div>
        </div>
    );
}
