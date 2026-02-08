import React, { useState } from 'react';
import AuthGate from './AuthGate';
import CVUpload from './CVUpload';
import ProfileForm from './ProfileEditor';
import { api } from '../../services/api';

export default function RegistrationFlow({ onComplete }) {
    const [step, setStep] = useState('auth'); // auth, cv, profile
    const [data, setData] = useState({});

    const handleAuth = async (email, password) => {
        try {
            // Try to login first
            const user = await api.login(email, password);
            console.log("Logged in:", user);
            onComplete(user);
        } catch (err) {
            // If user not found, proceed to registration
            if (err.message === "User not found") {
                setData(prev => ({ ...prev, email, password }));
                setStep('cv');
            } else {
                // Wrong password or other error -> throw back to AuthGate
                throw err;
            }
        }
    };

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

    const handleCVExtracted = (cvData) => {
        setData(prev => ({ ...prev, ...cvData }));
        setStep('profile');
    };

    const handleCVSkip = () => {
        setStep('profile');
    };

    const handleProfileSubmit = (profileData) => {
        const finalData = { ...data, ...profileData };
        // We might want to remove password if we don't want to pass it around, 
        // but api.createUser needs it. 
        onComplete(finalData);
    };

    return (
        <div className="w-full h-screen bg-slate-900 flex items-center justify-center p-4">
            {step === 'auth' && (
                <AuthGate
                    onLogin={handleAuth}
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
