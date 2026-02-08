import React, { useState } from 'react';
import AuthGate from './AuthGate';
import CVUpload from './CVUpload';
import ProfileForm from './ProfileEditor'; // We'll update the file content but keep the filename for now

export default function RegistrationFlow({ onComplete }) {
    const [step, setStep] = useState('auth'); // auth, cv, profile
    const [data, setData] = useState({});

    const handleAuth = (email) => {
        setData(prev => ({ ...prev, email }));
        setStep('cv');
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
        onComplete(finalData);
    };

    return (
        <div className="w-full h-screen bg-slate-900 flex items-center justify-center p-4">
            {step === 'auth' && (
                <AuthGate onLogin={handleAuth} />
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
