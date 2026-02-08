import React, { useState } from 'react';
import { X, UserPlus, UserMinus, Briefcase, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { graphConfig } from '../../config/graphConfig';

/**
 * @param {Object} props
 * @param {import('../../utils/schema').Node | null} props.node
 * @param {() => void} props.onClose
 * @param {(nodeId: string) => void} [props.onToggleConnection]
 */
export default function Sidebar({ node, onClose, onToggleConnection }) {
    const [showOptions, setShowOptions] = useState(false);

    if (!node) return null;

    const isSelf = node.id === graphConfig.selfId;
    const isConnected = node.isConnected;

    return (
        <div className="absolute top-0 right-0 h-full w-80 z-30 bg-slate-800/95 backdrop-blur shadow-xl border-l border-slate-700 p-6 flex flex-col text-slate-100 transition-transform transform translate-x-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">{node.name}</h2>
                    <p className="text-slate-400 text-sm">{node.info.major}</p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded transition">
                    <X size={20} />
                </button>
            </div>

            {/* Match Score */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-300">Goal Match</span>
                    <span className="text-sm font-bold text-blue-400">{(node.score * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${node.score * 100}%` }}
                    />
                </div>
            </div>

            {/* AI Summary */}
            <div className="bg-slate-700/50 p-4 rounded-lg mb-6 border border-slate-600">
                <h3 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">Why this match?</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                    {node.summary || "This student shares valid paths to your goal based on their academic history."}
                </p>
            </div>

            {/* Details */}
            <div className="space-y-4 flex-1 overflow-y-auto">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
                        <Briefcase size={16} className="text-slate-400" /> Experience
                    </h3>
                    <ul className="space-y-2">
                        {node.info.experience.map((exp, i) => (
                            <li key={i} className="text-sm text-slate-300 bg-slate-800 p-2 rounded border border-slate-700/50">
                                {typeof exp === 'string' ? (
                                    exp
                                ) : (
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-200">{exp.position}</span>
                                        <span className="text-xs text-slate-400">{exp.company} • {exp.dates}</span>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
                        <GraduationCap size={16} className="text-slate-400" /> Education
                    </h3>
                    <p className="text-sm text-slate-300">McGill University</p>
                    <p className="text-xs text-slate-400">Class of 2026</p>
                </div>
            </div>

            {/* Action */}
            {!isSelf && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                    {isConnected ? (
                        <div>
                            <button
                                onClick={() => setShowOptions(!showOptions)}
                                className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200 py-2 px-3 rounded transition text-sm"
                            >
                                <span>Options</span>
                                {showOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {showOptions && (
                                <button
                                    onClick={() => onToggleConnection?.(node.id)}
                                    className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 py-2 px-4 rounded-lg font-medium transition mt-2"
                                >
                                    <UserMinus size={18} />
                                    Remove Connection
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => onToggleConnection?.(node.id)}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg font-medium transition shadow-lg shadow-blue-900/20"
                        >
                            <UserPlus size={18} />
                            Add Connection
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
