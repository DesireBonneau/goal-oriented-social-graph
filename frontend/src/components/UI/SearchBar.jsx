import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, User, School, BookOpen, Briefcase } from 'lucide-react';
import { api } from '../../services/api';

/**
 * SearchBar with live dropdown results.
 *
 * @param {Object} props
 * @param {(query: string) => void} props.onSearch         - Called on form submit (keyword search → updates full graph)
 * @param {(suggestion: Object) => void} props.onSelectProfile - Called when a user profile is clicked in the dropdown
 */
export default function SearchBar({ onSearch, onSelectProfile }) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef(null);

    // Debounce: fetch suggestions as user types
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setIsLoading(true);
                const results = await api.getSuggestions(query);
                setSuggestions(results);
                setIsLoading(false);
            } else {
                setSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Submit → keyword/semantic search that filters the full graph
    const handleSubmit = (e) => {
        e?.preventDefault();
        setShowSuggestions(false);
        if (query.trim()) onSearch(query);
    };

    // Click on a user profile in the dropdown → open in Sidebar
    const handleSelectUser = (suggestion) => {
        setShowSuggestions(false);
        setQuery(suggestion.label);
        onSelectProfile?.(suggestion);
    };

    // Click on a category suggestion (major/faculty) → trigger full graph search
    const handleSelectCategory = (suggestion) => {
        setShowSuggestions(false);
        setQuery(suggestion.label);
        onSearch(suggestion.label);
    };

    const userSuggestions = suggestions.filter(s => s.type === 'user');
    const categorySuggestions = suggestions.filter(s => s.type !== 'user');

    const getCategoryIcon = (type) => {
        switch (type) {
            case 'faculty': return <School className="h-4 w-4 text-purple-400" />;
            case 'major': return <BookOpen className="h-4 w-4 text-blue-400" />;
            default: return <Search className="h-4 w-4 text-slate-400" />;
        }
    };

    /** Renders a brief matched experience snippet for the dropdown */
    const renderMatchedExperience = (suggestion) => {
        if (suggestion.search_type !== 'keyword') return null;
        const exp = suggestion.matched_experience?.[0];
        if (!exp) return null;

        const text = typeof exp === 'string'
            ? exp
            : [exp.position, exp.company].filter(Boolean).join(' @ ');

        return (
            <div className="flex items-center gap-1 mt-0.5">
                <Briefcase className="h-3 w-3 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-300 truncate max-w-[180px]">{text}</span>
            </div>
        );
    };

    const hasAnySuggestions = showSuggestions && suggestions.length > 0;

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
                        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                        placeholder="Search people, majors, or ask a question..."
                        className="w-full bg-slate-900/90 backdrop-blur-md text-white border border-slate-700 rounded-full py-3 pl-12 pr-12 shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-500"
                    />
                    <button
                        type="submit"
                        className="absolute inset-y-1 right-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-colors flex items-center justify-center"
                        title="Search / Analyze"
                    >
                        {isLoading
                            ? <span className="h-[18px] w-[18px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Sparkles size={18} />}
                    </button>
                </form>

                {/* Dropdown */}
                {hasAnySuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/97 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                        {/* User Results */}
                        {userSuggestions.length > 0 && (
                            <div>
                                <div className="px-4 pt-3 pb-1">
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">People</span>
                                </div>
                                <ul>
                                    {userSuggestions.map((item, index) => (
                                        <li key={`user-${item.id}-${index}`}>
                                            <button
                                                onClick={() => handleSelectUser(item)}
                                                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-800/80 transition-colors text-left group/item"
                                            >
                                                {/* Avatar icon */}
                                                <div className="bg-slate-700/60 border border-slate-600 group-hover/item:border-slate-500 rounded-full p-2 flex-shrink-0 transition">
                                                    <User className="h-4 w-4 text-blue-400" />
                                                </div>

                                                {/* Name + subtext */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-slate-200 font-medium text-sm">{item.label}</div>
                                                    <div className="text-slate-500 text-xs truncate">{item.subtext}</div>
                                                    {renderMatchedExperience(item)}
                                                </div>

                                                {/* Score badge — only shown for keyword search (name search has no pairwise score here) */}
                                                {item.search_type === 'keyword' ? (
                                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Matched</span>
                                                        {item.matched_fields?.length > 0 && (
                                                            <div className="flex gap-1 flex-wrap justify-end">
                                                                {item.matched_fields.slice(0, 2).map(f => (
                                                                    <span key={f} className="bg-amber-900/40 border border-amber-700/50 text-amber-300 text-[9px] px-1.5 py-0.5 rounded-full capitalize">
                                                                        {f}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex-shrink-0">
                                                        <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Profile</span>
                                                    </div>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Category Results (Major / Faculty) */}
                        {categorySuggestions.length > 0 && (
                            <div className={userSuggestions.length > 0 ? 'border-t border-slate-800' : ''}>
                                <div className="px-4 pt-3 pb-1">
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Search By</span>
                                </div>
                                <ul className="pb-2">
                                    {categorySuggestions.map((item, index) => (
                                        <li key={`cat-${item.type}-${item.id}-${index}`}>
                                            <button
                                                onClick={() => handleSelectCategory(item)}
                                                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-800/80 transition-colors text-left"
                                            >
                                                <div className="bg-slate-800 p-2 rounded-full border border-slate-700/50">
                                                    {getCategoryIcon(item.type)}
                                                </div>
                                                <div>
                                                    <div className="text-slate-200 font-medium text-sm">{item.label}</div>
                                                </div>
                                                <div className="ml-auto text-[10px] text-slate-600 uppercase tracking-wider font-semibold">
                                                    {item.type}
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
