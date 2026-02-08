import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';

export default function AuthGate({ onLogin, onGuest }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        // Validate McGill Email
        if (!email.toLowerCase().endsWith("@mail.mcgill.ca") && !email.toLowerCase().endsWith("@mcgill.ca")) {
            setError("Please use a valid McGill email (@mail.mcgill.ca)");
            setIsLoading(false);
            return;
        }

        try {
            await onLogin(email, password);
        } catch (err) {
            setError(err.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
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
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                    <input
                        type="password"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition placeholder-slate-600"
                        value={password}
                        onChange={e => {
                            setPassword(e.target.value);
                            setError("");
                        }}
                        placeholder="••••••••"
                    />
                </div>

                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Signing In..." : "Sign In / Register"}
                </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-700 w-full flex flex-col items-center">
                <p className="text-slate-500 text-xs mb-3">Just looking around?</p>
                <button
                    onClick={onGuest}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm font-medium"
                >
                    <User size={16} />
                    Continue as Guest
                </button>
            </div>
        </div>
    );
}
