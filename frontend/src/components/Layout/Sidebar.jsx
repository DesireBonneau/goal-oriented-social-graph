import React, { useState, useEffect, useRef } from 'react';
import {
    X, UserPlus, UserMinus, Briefcase, GraduationCap,
    ChevronDown, ChevronUp, Pencil, GitCompare, CheckCircle,
    XCircle, Loader2, Users, ChevronRight, Search, User
} from 'lucide-react';
import { api } from '../../services/api';

/**
 * @param {Object} props
 * @param {Object | null} props.node              - Primary selected node
 * @param {Object | null} props.comparisonNode    - Node currently being compared against
 * @param {string | null} props.currentUserId     - The logged-in user's ID
 * @param {boolean} props.isGuest                 - Whether the user is a guest
 * @param {() => void} props.onClose
 * @param {(nodeId: string) => void} [props.onToggleConnection]
 * @param {() => void} [props.onEditProfile]
 * @param {(suggestion: Object) => void} [props.onSelectComparison]  - Called when user picks a comparison target
 * @param {() => void} [props.onClearComparison]  - Called when user wants to exit comparison mode
 * @param {Object|null} props.searchContext       - { search_type, matched_experience, matched_fields } from search dropdown
 */
export default function Sidebar({
    node,
    comparisonNode,
    currentUserId,
    isGuest,
    onClose,
    onToggleConnection,
    onEditProfile,
    onSelectComparison,
    onClearComparison,
    searchContext,
}) {
    const [showOptions, setShowOptions] = useState(false);
    const [similarity, setSimilarity] = useState(null);
    const [loadingSimilarity, setLoadingSimilarity] = useState(false);

    // Mini search bar state
    const [showCompareSearch, setShowCompareSearch] = useState(false);
    const [compareQuery, setCompareQuery] = useState('');
    const [compareSuggestions, setCompareSuggestions] = useState([]);
    const [compareLoading, setCompareLoading] = useState(false);
    const compareInputRef = useRef(null);

    const isSelf = currentUserId && node?.id === currentUserId;
    const isLoggedIn = !!currentUserId && !isGuest;
    const isComparisonMode = !!comparisonNode;
    const isKeywordSearch = searchContext?.search_type === 'keyword';

    // Auto-focus the mini search bar when it opens
    useEffect(() => {
        if (showCompareSearch) {
            setTimeout(() => compareInputRef.current?.focus(), 50);
        } else {
            setCompareQuery('');
            setCompareSuggestions([]);
        }
    }, [showCompareSearch]);

    // Debounced search for comparison target (name only)
    useEffect(() => {
        if (!showCompareSearch) return;
        const timer = setTimeout(async () => {
            if (compareQuery.length >= 2) {
                setCompareLoading(true);
                const results = await api.getSuggestions(compareQuery);
                // Only show user results, exclude the currently selected node
                setCompareSuggestions(results.filter(r => r.type === 'user' && r.id !== node?.id));
                setCompareLoading(false);
            } else {
                setCompareSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [compareQuery, showCompareSearch, node?.id]);

    // Fetch similarity when node or comparisonNode changes
    useEffect(() => {
        setSimilarity(null);
        if (!node) return;

        const targetId = comparisonNode ? comparisonNode.id : (isLoggedIn && !isSelf ? node.id : null);
        const sourceId = comparisonNode ? node.id : (isLoggedIn ? currentUserId : null);

        if (!sourceId || !targetId || sourceId === targetId) return;

        setLoadingSimilarity(true);
        api.getSimilarity(sourceId, targetId)
            .then(data => setSimilarity(data))
            .finally(() => setLoadingSimilarity(false));
    }, [node?.id, comparisonNode?.id, currentUserId, isLoggedIn, isSelf]);

    // Reset compare search when comparison is cleared
    useEffect(() => {
        if (!isComparisonMode) setShowCompareSearch(false);
    }, [isComparisonMode]);

    if (!node) return null;

    const displayNode = comparisonNode || node;
    const isConnected = displayNode.isConnected;

    const handleSelectComparison = (suggestion) => {
        setShowCompareSearch(false);
        onSelectComparison?.(suggestion);
    };

    // ─── Score bar ─────────────────────────────────────────────────────────────
    const ScoreBar = ({ score, label }) => (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-slate-300">{label}</span>
                <span className="text-sm font-bold text-pink-400">{(score * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                    className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-700"
                    style={{ width: `${score * 100}%` }}
                />
            </div>
        </div>
    );

    // ─── Similarity breakdown ──────────────────────────────────────────────────
    const SimilaritySection = () => {
        if (!isLoggedIn && !isComparisonMode) return null;
        if (isSelf && !isComparisonMode) return null;

        const title = isComparisonMode
            ? `${node.name} vs ${comparisonNode.name}`
            : 'Why you\'re matched';

        return (
            <div className="bg-slate-700/40 border border-slate-600/50 rounded-xl p-4 mb-4">
                <h3 className="text-xs font-semibold text-pink-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <GitCompare size={13} />
                    {title}
                </h3>
                {loadingSimilarity ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Loader2 size={14} className="animate-spin" />
                        Calculating…
                    </div>
                ) : similarity ? (
                    <>
                        <ScoreBar score={similarity.score} label="Similarity Score" />
                        {similarity.breakdown?.length > 0 ? (
                            <ul className="space-y-2 mt-3">
                                {similarity.breakdown.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        {item.match
                                            ? <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                            : <XCircle size={15} className="text-slate-500 mt-0.5 flex-shrink-0" />}
                                        <div>
                                            <span className={`font-medium ${item.match ? 'text-slate-200' : 'text-slate-500'}`}>
                                                {item.field}:
                                            </span>{' '}
                                            <span className={item.match ? 'text-slate-300' : 'text-slate-600'}>
                                                {item.detail}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-500 text-sm italic">No direct academic overlap found.</p>
                        )}
                    </>
                ) : (
                    <p className="text-slate-500 text-sm italic">Could not load similarity data.</p>
                )}
            </div>
        );
    };

    // ─── Keyword search context ────────────────────────────────────────────────
    const SearchContextSection = () => {
        if (!isKeywordSearch || !searchContext?.matched_experience?.length) return null;
        return (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 mb-4">
                <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Briefcase size={13} />
                    Relevant Experience
                </h3>
                <ul className="space-y-2">
                    {searchContext.matched_experience.map((exp, i) => (
                        <li key={i} className="text-sm text-amber-200/80 bg-amber-900/30 p-2 rounded-lg border border-amber-700/30">
                            {typeof exp === 'string' ? exp : (
                                <div>
                                    <span className="font-medium">{exp.position}</span>
                                    {exp.company && <span className="text-amber-300/60"> @ {exp.company}</span>}
                                    {exp.dates && <span className="text-amber-300/40 text-xs ml-1">• {exp.dates}</span>}
                                </div>
                            )}
                        </li>
                    ))}
                    {searchContext.matched_fields?.filter(f => f !== 'experience').length > 0 && (
                        <p className="text-xs text-amber-400/60 mt-1">
                            Also matched: {searchContext.matched_fields.filter(f => f !== 'experience').join(', ')}
                        </p>
                    )}
                </ul>
            </div>
        );
    };

    // ─── Experience list ───────────────────────────────────────────────────────
    const ExperienceList = ({ nodeData }) => {
        const experiences = nodeData?.info?.experience || nodeData?.experience || [];
        return (
            <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
                    <Briefcase size={16} className="text-slate-400" /> Experience
                </h3>
                <ul className="space-y-2">
                    {experiences.map((exp, i) => (
                        <li key={i} className="text-sm text-slate-300 bg-slate-800 p-2 rounded-lg border border-slate-700/50">
                            {typeof exp === 'string' ? exp : (
                                <div className="flex flex-col">
                                    <span className="font-medium text-slate-200">{exp.position}</span>
                                    <span className="text-xs text-slate-400">{exp.company}{exp.dates ? ` • ${exp.dates}` : ''}</span>
                                </div>
                            )}
                        </li>
                    ))}
                    {experiences.length === 0 && (
                        <li className="text-sm text-slate-500 italic">No experience listed</li>
                    )}
                </ul>
            </div>
        );
    };

    // ─── Mini comparison search bar ────────────────────────────────────────────
    const CompareSearchBar = () => (
        <div className="mt-2 bg-slate-700/50 border border-slate-600 rounded-xl p-3 space-y-2">
            <p className="text-xs text-slate-400 font-medium">
                Search a second person to compare with <span className="text-white">{node.name}</span>:
            </p>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {compareLoading
                        ? <span className="h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        : <Search size={13} className="text-slate-400" />}
                </div>
                <input
                    ref={compareInputRef}
                    type="text"
                    value={compareQuery}
                    onChange={e => setCompareQuery(e.target.value)}
                    placeholder="Type a name…"
                    className="w-full bg-slate-800 text-white text-sm border border-slate-600 focus:border-blue-500 rounded-lg py-2 pl-8 pr-3 focus:outline-none transition placeholder-slate-500"
                />
            </div>
            {compareSuggestions.length > 0 && (
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {compareSuggestions.map(s => (
                        <li key={s.id}>
                            <button
                                onClick={() => handleSelectComparison(s)}
                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-600/60 transition text-left"
                            >
                                <div className="bg-slate-700 rounded-full p-1.5 flex-shrink-0">
                                    <User size={12} className="text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm text-slate-200 font-medium truncate">{s.label}</div>
                                    <div className="text-xs text-slate-500 truncate">{s.subtext}</div>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {compareQuery.length >= 2 && compareSuggestions.length === 0 && !compareLoading && (
                <p className="text-xs text-slate-500 italic px-1">No matching profiles found.</p>
            )}
            <button
                onClick={() => setShowCompareSearch(false)}
                className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
                Cancel
            </button>
        </div>
    );

    return (
        <div className="absolute top-0 right-0 h-full w-80 z-30 bg-slate-800/95 backdrop-blur shadow-2xl border-l border-slate-700 flex flex-col text-slate-100">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex justify-between items-start p-6 pb-4 flex-shrink-0">
                <div className="min-w-0 flex-1">
                    {isComparisonMode && (
                        <div className="flex items-center gap-1.5 mb-1">
                            <Users size={12} className="text-orange-400 flex-shrink-0" />
                            <span className="text-orange-400 text-[10px] font-semibold uppercase tracking-wider">Comparison Mode</span>
                        </div>
                    )}
                    <h2 className="text-xl font-bold text-white truncate">
                        {isSelf && !isComparisonMode ? `${node.name} (You)` : displayNode.name}
                    </h2>
                    <p className="text-slate-400 text-sm truncate">
                        {displayNode.info?.major || displayNode.major || 'Unknown Major'}
                    </p>
                    {isComparisonMode && (
                        <p className="text-slate-500 text-xs mt-1 truncate">
                            Comparing with: <span className="text-orange-400">{node.name}</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {isComparisonMode && (
                        <button
                            onClick={onClearComparison}
                            className="p-1.5 hover:bg-orange-900/30 text-orange-400 rounded-lg transition"
                            title="Exit comparison"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── Scrollable Content ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">

                {/* Goal Match Score — only for logged-in users looking at someone else */}
                {isLoggedIn && !isSelf && !isComparisonMode && displayNode.score != null && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-slate-300">Goal Match</span>
                            <span className="text-sm font-bold text-blue-400">
                                {(displayNode.score * 100).toFixed(0)}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${displayNode.score * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Self card */}
                {isSelf && !isComparisonMode && (
                    <div className="bg-emerald-900/30 p-4 rounded-xl border border-emerald-700/50">
                        <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1">Your Profile</h3>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            This is your node in the graph. Click "Edit Profile" below to update your information.
                        </p>
                    </div>
                )}

                <SearchContextSection />
                <SimilaritySection />

                <div className="border-t border-slate-700/60" />

                <ExperienceList nodeData={isComparisonMode ? comparisonNode : displayNode} />

                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
                        <GraduationCap size={16} className="text-slate-400" /> Education
                    </h3>
                    <p className="text-sm text-slate-300">McGill University</p>
                    <p className="text-xs text-slate-400">
                        Class of {(isComparisonMode ? comparisonNode : displayNode).info?.graduationYear
                            || (isComparisonMode ? comparisonNode : displayNode).graduationYear
                            || '—'}
                    </p>
                </div>
            </div>

            {/* ── Footer Actions ─────────────────────────────────────────────── */}
            <div className="flex-shrink-0 p-6 pt-4 border-t border-slate-700 space-y-2">
                {isSelf && !isComparisonMode ? (
                    <button
                        onClick={onEditProfile}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-xl font-medium transition shadow-lg shadow-emerald-900/20"
                    >
                        <Pencil size={16} /> Edit Profile
                    </button>
                ) : isComparisonMode ? (
                    <button
                        onClick={onClearComparison}
                        className="w-full flex items-center justify-center gap-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 py-2 px-4 rounded-xl font-medium transition"
                    >
                        <X size={16} /> Exit Comparison
                    </button>
                ) : (
                    <>
                        {isConnected ? (
                            <div>
                                <button
                                    onClick={() => setShowOptions(!showOptions)}
                                    className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200 py-2 px-3 rounded-xl transition text-sm"
                                >
                                    <span>Options</span>
                                    {showOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {showOptions && (
                                    <button
                                        onClick={() => onToggleConnection?.(node.id)}
                                        className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 py-2 px-4 rounded-xl font-medium transition mt-1"
                                    >
                                        <UserMinus size={16} /> Remove Connection
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => onToggleConnection?.(node.id)}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-xl font-medium transition shadow-lg shadow-blue-900/20"
                            >
                                <UserPlus size={16} /> Add Connection
                            </button>
                        )}

                        {/* Compare with someone else */}
                        <button
                            onClick={() => setShowCompareSearch(v => !v)}
                            className={`w-full flex items-center justify-center gap-2 border py-2 px-4 rounded-xl font-medium transition text-sm ${
                                showCompareSearch
                                    ? 'bg-blue-900/30 border-blue-600 text-blue-300'
                                    : 'bg-slate-700/60 hover:bg-slate-700 border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white'
                            }`}
                        >
                            <GitCompare size={15} />
                            Compare with someone else
                            <ChevronRight size={14} className="ml-auto opacity-50" />
                        </button>

                        {showCompareSearch && <CompareSearchBar />}
                    </>
                )}
            </div>
        </div>
    );
}
