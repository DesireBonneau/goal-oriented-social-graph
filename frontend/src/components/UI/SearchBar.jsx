import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, User, School, BookOpen } from 'lucide-react';
import { api } from '../../services/api';

/**
 * @param {Object} props
 * @param {(query: string) => void} props.onSearch
 */
export default function SearchBar({ onSearch }) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    // Debounce search suggestions
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                const results = await api.getSuggestions(query);
                setSuggestions(results);
            } else {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Handle clicking outside to close suggestions
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSubmit = (e) => {
        e?.preventDefault();
        setShowSuggestions(false);
        onSearch(query);
    };

    const handleSelectSuggestion = (suggestion) => {
        setQuery(suggestion.label);
        setShowSuggestions(false);
        onSearch(suggestion.label);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'user': return <User className="h-4 w-4 text-emerald-400" />;
            case 'faculty': return <School className="h-4 w-4 text-purple-400" />;
            case 'major': return <BookOpen className="h-4 w-4 text-blue-400" />;
            default: return <Search className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <div ref={wrapperRef} className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-10">
            <div className="relative group">
                <form onSubmit={handleSubmit}>
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search for people, majors, or ask a question..."
                        className="w-full bg-slate-900/90 backdrop-blur-md text-white border border-slate-700 rounded-full py-3 pl-12 pr-12 shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-500"
                    />
                    <button
                        type="submit"
                        className="absolute inset-y-1 right-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-colors flex items-center justify-center"
                        title="Search / Analyze"
                    >
                        <Sparkles size={18} />
                    </button>
                </form>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <ul className="py-2">
                            {suggestions.map((item, index) => (
                                <li key={`${item.type}-${item.id}-${index}`}>
                                    <button
                                        onClick={() => handleSelectSuggestion(item)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors text-left group"
                                    >
                                        <div className="bg-slate-800 p-2 rounded-full border border-slate-700 group-hover:border-slate-600 group-hover:bg-slate-700/50 transition">
                                            {getIcon(item.type)}
                                        </div>
                                        <div>
                                            <div className="text-slate-200 font-medium text-sm">
                                                {item.label}
                                            </div>
                                            {item.subtext && (
                                                <div className="text-slate-500 text-xs mt-0.5">
                                                    {item.subtext}
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-auto text-xs text-slate-600 uppercase tracking-wider font-semibold">
                                            {item.type}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
