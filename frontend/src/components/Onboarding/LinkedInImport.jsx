import React, { useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle } from 'lucide-react';

export default function LinkedInImport({ onImport, onSkip }) {
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // LinkedIn Export format usually has: "First Name", "Last Name", "Company", "Position"
                // We map this to our Node structure
                const connections = results.data.map((row, index) => ({
                    id: `imported_${index}`,
                    name: `${row['First Name']} ${row['Last Name']}`.trim(),
                    info: {
                        major: "Unknown", // LinkedIn doesn't easily give this in simple export
                        experience: [row['Company'], row['Position']].filter(Boolean)
                    },
                    val: 1,
                    score: 0.1,
                    isFuzzy: false,
                    summary: `Connected via LinkedIn: ${row['Position']} at ${row['Company']}`
                })).filter(n => n.name); // Filter empty names

                onImport(connections);
            },
            error: (err) => {
                console.error("CSV Parse Error:", err);
                alert("Failed to parse CSV. Please try again.");
            }
        });
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
            <div className="mb-6 bg-blue-500/10 p-4 rounded-full">
                <Upload size={48} className="text-blue-500" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Import Connections</h2>
            <p className="text-slate-400 text-center mb-6 text-sm">
                Upload your <strong className="text-slate-200">Connections.csv</strong> from LinkedIn<br />
                (Settings &gt; Data Privacy &gt; Get a copy of your data)
            </p>

            <label className="w-full mb-4 group cursor-pointer">
                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition group-hover:border-blue-500/50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileText className="w-8 h-8 mb-3 text-slate-400 group-hover:text-blue-400 transition" />
                        <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    </div>
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </div>
            </label>

            <div className="flex w-full gap-3">
                <button
                    onClick={onSkip}
                    className="flex-1 py-2 px-4 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition text-sm font-medium"
                >
                    Skip (Use Mock Data)
                </button>
            </div>
        </div>
    );
}
