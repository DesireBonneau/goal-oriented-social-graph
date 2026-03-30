import React, { useState } from 'react';
import AuthGate from './AuthGate';
import CVUpload from './CVUpload';
import ProfileForm from './ProfileEditor';
import { api } from '../../services/api';

export default function RegistrationFlow({ onComplete }) {
    const [step, setStep] = useState('auth'); // auth, cv, profile
    const [data, setData] = useState({});

    // ── Login (existing user) ────────────────────────────────────────────────
    const handleLogin = async (email, password) => {
        const user = await api.login(email, password);
        console.log("Logged in:", user);
        onComplete(user);
    };

    // ── Register (new user → proceed to CV / profile) ────────────────────────
    const handleRegister = async (email, password) => {
        // Check if user already exists by attempting login
        try {
            const user = await api.login(email, password);
            // If login succeeds, user already exists — just log them in
            console.log("Account already exists, logged in:", user);
            onComplete(user);
            return;
        } catch (err) {
            // "User not found" means they're truly new — continue to registration
            if (err.message !== "User not found") {
                // Some other error (wrong password for existing account, server error)
                throw new Error("An account with this email may already exist. Try signing in instead.");
            }
        }

        // New user → save email/password and continue to CV step
        setData(prev => ({ ...prev, email, password }));
        setStep('cv');
    };

    // ── Guest access ─────────────────────────────────────────────────────────
    const handleGuestAccess = () => {
        const guestUser = {
            id: 'guest_' + Date.now(),
            firstName: "Guest",
            lastName: "User",
            email: "guest@mcgill.ca",
            major: "Undecided",
            year: "U0",
            courses: [],
            skills: [],
            interests: [],
            isGuest: true
        };
        onComplete(guestUser);
    };

    // ── CV step ──────────────────────────────────────────────────────────────
    const handleCVExtracted = (cvData) => {
        setData(prev => ({ ...prev, ...cvData }));
        setStep('profile');
    };

    const handleCVSkip = () => {
        setStep('profile');
    };

    // ── Profile submit ───────────────────────────────────────────────────────
    const handleProfileSubmit = (profileData) => {
        const finalData = { ...data, ...profileData };
        onComplete(finalData);
    };

    return (
        <div className="w-full min-h-screen bg-slate-900 flex items-center justify-center p-4 overflow-y-auto">
            {step === 'auth' && (
                <AuthGate
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    onGuest={handleGuestAccess}
                />
            )}

            {step === 'cv' && (
                <CVUpload onComplete={handleCVExtracted} onSkip={handleCVSkip} />
            )}

            {step === 'profile' && (
                <ProfileForm
                    initialData={data}
                    onSave={handleProfileSubmit}
                />
            )}
        </div>
    );
}
