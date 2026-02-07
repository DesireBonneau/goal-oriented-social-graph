import React, { useState } from 'react';
import { Lock } from 'lucide-react';

export default function AuthGate({ onLogin }) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        // Validate McGill Email
        if (!email.toLowerCase().endsWith("@mail.mcgill.ca") && !email.toLowerCase().endsWith("@mcgill.ca")) {
            setError("Please use a valid McGill email (@mail.mcgill.ca)");
            return;
        }
        onLogin(email);
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-700">
            <div className="mb-6 bg-emerald-500/10 p-4 rounded-full">
                <Lock size={32} className="text-emerald-500" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">Goal<span className="text-blue-500">Graph</span></h1>
            <p className="text-slate-400 text-center mb-8 text-sm">Sign in to discover your path.</p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">McGill Email</label>
                    <input
                        type="email"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition placeholder-slate-600"
                        value={email}
                        onChange={e => {
                            setEmail(e.target.value);
                            setError("");
                        }}
                        placeholder="first.last@mail.mcgill.ca"
                    />
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                </div>

                <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-emerald-900/20"
                >
                    Sign In
                </button>
            </form>
        </div>
    );
}
