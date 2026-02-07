import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';

/**
 * @param {Object} props
 * @param {(query: string) => void} props.onSearch
 */
export default function SearchBar({ onSearch }) {
    const [query, setQuery] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(query);
    };

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-10">
            <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter a goal (e.g. 'Software Engineer at Tesla')..."
                    className="w-full bg-slate-800/90 backdrop-blur-md text-white border border-slate-600 rounded-full py-3 pl-12 pr-12 shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-500"
                />
                <button
                    type="submit"
                    className="absolute inset-y-1 right-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-colors flex items-center justify-center"
                    title="Analyze Goal"
                >
                    <Sparkles size={18} />
                </button>
            </form>
        </div>
    );
}
