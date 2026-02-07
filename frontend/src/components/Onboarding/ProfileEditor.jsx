import React, { useState } from 'react';

export default function ProfileEditor({ onSave, initialData = {} }) {
    const [formData, setFormData] = useState({
        name: initialData.name || "",
        major: initialData.major || "",
        experience: initialData.experience || ""
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            experience: formData.experience.split(',').map(s => s.trim()).filter(Boolean)
        });
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-6">Your Profile</h2>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Jane Doe"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">University</label>
                    <input
                        type="text"
                        disabled
                        value="McGill University"
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-400 cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Major</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={formData.major}
                        onChange={e => setFormData({ ...formData, major: e.target.value })}
                        placeholder="Computer Science"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Experience (Comma separated)</label>
                    <textarea
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[100px]"
                        value={formData.experience}
                        onChange={e => setFormData({ ...formData, experience: e.target.value })}
                        placeholder="Intern at Google, TA for COMP 202, President of CSUS"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-blue-900/20 mt-4"
                >
                    Continue
                </button>
            </form>
        </div>
    );
}
