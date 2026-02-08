import React, { useState } from 'react';
import { Upload, FileText, X, ArrowRight, Loader2 } from 'lucide-react';
import { extractCV } from '../../services/api';

export default function CVUpload({ onComplete, onSkip }) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.type === "application/pdf") {
            setFile(droppedFile);
            setError(null);
        } else {
            setError("Please upload a PDF file.");
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile?.type === "application/pdf") {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await extractCV(file);
            onComplete(data);
        } catch (err) {
            console.error(err);
            setError("Failed to process CV. Please try again or skip.");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Upload your CV</h2>
            <p className="text-slate-400 text-center mb-6 text-sm">
                We'll extract your details to speed up registration.
            </p>

            {!file ? (
                <div
                    className={`w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('cv-input').click()}
                >
                    <Upload size={32} className={`mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
                    <p className="text-slate-300 font-medium">Click to upload or drag & drop</p>
                    <p className="text-slate-500 text-sm mt-1">PDF only (Max 5MB)</p>
                    <input
                        id="cv-input"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>
            ) : (
                <div className="w-full bg-slate-700/50 rounded-xl p-4 flex items-center justify-between border border-slate-600">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <FileText size={20} className="text-red-500" />
                        </div>
                        <span className="text-slate-200 truncate text-sm font-medium">{file.name}</span>
                    </div>
                    <button
                        onClick={() => setFile(null)}
                        className="p-1 hover:bg-slate-600 rounded-full transition text-slate-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

            <div className="w-full space-y-3 mt-8">
                <button
                    onClick={handleUpload}
                    disabled={!file || isLoading}
                    className={`w-full font-bold py-3 rounded-lg transition flex items-center justify-center space-x-2 ${!file || isLoading
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        <span>Continue</span>
                    )}
                </button>

                <button
                    onClick={onSkip}
                    className="w-full bg-transparent hover:bg-slate-700 text-slate-400 font-medium py-3 rounded-lg transition"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
}
