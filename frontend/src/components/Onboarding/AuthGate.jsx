import React, { useState } from 'react';
import { Lock, UserPlus, LogIn, User, ArrowLeft } from 'lucide-react';

/**
 * AuthGate — Landing screen with separate Login and Sign Up views.
 *
 * Props:
 *   onLogin(email, password)     → attempt login (throws if bad creds / not found)
 *   onRegister(email, password)  → proceed to CV + profile creation flow
 *   onGuest()                    → bypass auth entirely
 */
export default function AuthGate({ onLogin, onRegister, onGuest }) {
    const [mode, setMode] = useState('landing'); // 'landing' | 'login' | 'signup'

    if (mode === 'login') {
        return (
            <LoginForm
                onSubmit={onLogin}
                onBack={() => setMode('landing')}
            />
        );
    }

    if (mode === 'signup') {
        return (
            <SignUpForm
                onSubmit={onRegister}
                onBack={() => setMode('landing')}
            />
        );
    }

    // ── Landing ──────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col items-center justify-center p-10 bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full border border-slate-700/60">
            {/* Logo */}
            <div className="mb-3 bg-emerald-500/10 p-5 rounded-full ring-1 ring-emerald-500/20">
                <Lock size={36} className="text-emerald-400" />
            </div>

            <h1 className="text-4xl font-extrabold text-white mb-1 tracking-tight">
                Goal<span className="text-blue-500">Graph</span>
            </h1>
            <p className="text-slate-400 text-center mb-10 text-sm">
                Discover your path at McGill.
            </p>

            {/* Primary actions */}
            <div className="w-full space-y-3">
                <button
                    onClick={() => setMode('login')}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
                >
                    <LogIn size={18} />
                    Sign In
                </button>

                <button
                    onClick={() => setMode('signup')}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98]"
                >
                    <UserPlus size={18} />
                    Create Account
                </button>
            </div>

            {/* Guest */}
            <div className="mt-8 pt-6 border-t border-slate-700/60 w-full flex flex-col items-center">
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


// ── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onSubmit, onBack }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!email.toLowerCase().endsWith('@mail.mcgill.ca') && !email.toLowerCase().endsWith('@mcgill.ca')) {
            setError('Please use a valid McGill email (@mail.mcgill.ca)');
            setIsLoading(false);
            return;
        }

        try {
            await onSubmit(email, password);
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-10 bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full border border-slate-700/60 animate-fade-in">
            {/* Back */}
            <button
                onClick={onBack}
                className="self-start flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            <div className="mb-4 bg-emerald-500/10 p-4 rounded-full ring-1 ring-emerald-500/20">
                <LogIn size={28} className="text-emerald-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Welcome Back</h2>
            <p className="text-slate-400 text-center mb-8 text-sm">Sign in with your McGill email.</p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">McGill Email</label>
                    <input
                        id="login-email"
                        type="email"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition placeholder-slate-600"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        placeholder="first.last@mail.mcgill.ca"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                    <input
                        id="login-password"
                        type="password"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition placeholder-slate-600"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(''); }}
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                        <p className="text-red-400 text-xs">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
        </div>
    );
}


// ── Sign‑Up Form ─────────────────────────────────────────────────────────────
function SignUpForm({ onSubmit, onBack }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.toLowerCase().endsWith('@mail.mcgill.ca') && !email.toLowerCase().endsWith('@mcgill.ca')) {
            setError('Please use a valid McGill email (@mail.mcgill.ca)');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            await onSubmit(email, password);
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-10 bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full border border-slate-700/60 animate-fade-in">
            {/* Back */}
            <button
                onClick={onBack}
                className="self-start flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            <div className="mb-4 bg-blue-500/10 p-4 rounded-full ring-1 ring-blue-500/20">
                <UserPlus size={28} className="text-blue-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>
            <p className="text-slate-400 text-center mb-8 text-sm">Join the McGill network.</p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">McGill Email</label>
                    <input
                        id="signup-email"
                        type="email"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition placeholder-slate-600"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        placeholder="first.last@mail.mcgill.ca"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                    <input
                        id="signup-password"
                        type="password"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition placeholder-slate-600"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(''); }}
                        placeholder="Min. 6 characters"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Confirm Password</label>
                    <input
                        id="signup-confirm-password"
                        type="password"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition placeholder-slate-600"
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                        <p className="text-red-400 text-xs">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {isLoading ? 'Creating Account...' : 'Continue'}
                </button>
            </form>
        </div>
    );
}
