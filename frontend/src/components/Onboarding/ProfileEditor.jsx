import React, { useState, useEffect } from 'react';
import { User, BookOpen, Briefcase, Users, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import AutocompleteInput from '../UI/AutocompleteInput';
import { MAJORS, MINORS, FACULTIES } from '../../data/academicOptions';

export default function ProfileEditor({ onSave, initialData = {} }) {
    // Extract LinkedIn handle from full URL if provided
    const getLinkedinHandle = () => {
        const url = initialData.linkedinUrl || initialData.socials?.linkedinUrl || "";
        return url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "");
    };

    const [formData, setFormData] = useState({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        email: initialData.email || "",
        graduationYear: initialData.graduationYear || "",
        faculty: initialData.faculty || "",
        major: initialData.major || "",
        minor: initialData.minor || "",
        linkedinHandle: getLinkedinHandle(),
        clubs: initialData.clubs || [],
        experience: initialData.experience || [],
        preferredWorkPlace: initialData.preferredWorkPlace || ""
    });

    // If initialData has "name" but not first/last, try to split it (migration helper)
    useEffect(() => {
        if (initialData.name && !formData.firstName) {
            const parts = initialData.name.split(' ');
            setFormData(prev => ({
                ...prev,
                firstName: parts[0] || "",
                lastName: parts.slice(1).join(' ') || ""
            }));
        }
    }, [initialData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleClubChange = (index, value) => {
        const newClubs = [...formData.clubs];
        newClubs[index] = value;
        setFormData(prev => ({ ...prev, clubs: newClubs }));
    };

    const addClub = () => {
        setFormData(prev => ({ ...prev, clubs: [...prev.clubs, ""] }));
    };

    const removeClub = (index) => {
        const newClubs = formData.clubs.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, clubs: newClubs }));
    };

    const handleExpChange = (index, field, value) => {
        const newExp = [...formData.experience];
        newExp[index] = { ...newExp[index], [field]: value };
        setFormData(prev => ({ ...prev, experience: newExp }));
    };

    const addExperience = () => {
        setFormData(prev => ({
            ...prev,
            experience: [...prev.experience, { position: "", company: "", dates: "", location: "" }]
        }));
    };

    const removeExperience = (index) => {
        const newExp = formData.experience.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, experience: newExp }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Build full LinkedIn URL from handle
        const dataToSave = {
            ...formData,
            // Ensure graduationYear is an integer
            graduationYear: formData.graduationYear ? parseInt(formData.graduationYear, 10) : null,
            linkedinUrl: undefined, // Remove old field if present
            socials: {
                linkedinUrl: formData.linkedinHandle
                    ? `https://linkedin.com/in/${formData.linkedinHandle}`
                    : "",
                other: []
            }
        };
        delete dataToSave.linkedinHandle;
        onSave(dataToSave);
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700 animate-fade-in my-8">
            <h2 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h2>
            <p className="text-slate-400 mb-8">Tell us about yourself to find your peers.</p>

            <form onSubmit={handleSubmit} className="w-full space-y-6">

                {/* Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
                        <User size={20} /> Basic Info
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">First Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                value={formData.firstName}
                                onChange={e => handleChange('firstName', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Last Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                value={formData.lastName}
                                onChange={e => handleChange('lastName', e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">LinkedIn</label>
                        <div className="relative flex">
                            <span className="inline-flex items-center px-3 bg-slate-700 border border-r-0 border-slate-600 rounded-l-lg text-slate-400 text-sm">
                                <LinkIcon size={14} className="mr-1" />
                                linkedin.com/in/
                            </span>
                            <input
                                type="text"
                                className="flex-1 bg-slate-900 border border-slate-600 rounded-r-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                value={formData.linkedinHandle}
                                onChange={e => handleChange('linkedinHandle', e.target.value)}
                                placeholder="your-handle"
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-700 pt-6 space-y-4">
                    <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                        <BookOpen size={20} /> Education
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Faculty</label>
                            <AutocompleteInput
                                options={FACULTIES}
                                value={formData.faculty}
                                onChange={(value) => handleChange('faculty', value)}
                                placeholder="Faculty of Science"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Graduation Year</label>
                            <input
                                type="number"
                                required
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                value={formData.graduationYear}
                                onChange={e => handleChange('graduationYear', e.target.value)}
                                placeholder="2026"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Major</label>
                            <AutocompleteInput
                                options={MAJORS}
                                value={formData.major}
                                onChange={(value) => handleChange('major', value)}
                                placeholder="Computer Science"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Minor / Concentration</label>
                            <AutocompleteInput
                                options={MINORS}
                                value={formData.minor}
                                onChange={(value) => handleChange('minor', value)}
                                placeholder="Optional"
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-700 pt-6 space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
                        <Briefcase size={20} /> Experience
                    </h3>
                    {formData.experience.map((exp, index) => (
                        <div key={index} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 relative group">
                            <button
                                type="button"
                                onClick={() => removeExperience(index)}
                                className="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                            >
                                <Trash2 size={16} />
                            </button>
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <input
                                    placeholder="Position"
                                    className="bg-transparent border-b border-slate-600 focus:border-purple-500 outline-none text-white px-2 py-1"
                                    value={exp.position}
                                    onChange={e => handleExpChange(index, 'position', e.target.value)}
                                />
                                <input
                                    placeholder="Company"
                                    className="bg-transparent border-b border-slate-600 focus:border-purple-500 outline-none text-white px-2 py-1"
                                    value={exp.company}
                                    onChange={e => handleExpChange(index, 'company', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    placeholder="Dates (e.g. Summer 2023)"
                                    className="bg-transparent border-b border-slate-600 focus:border-purple-500 outline-none text-slate-400 text-sm px-2 py-1"
                                    value={exp.dates}
                                    onChange={e => handleExpChange(index, 'dates', e.target.value)}
                                />
                                <input
                                    placeholder="Location"
                                    className="bg-transparent border-b border-slate-600 focus:border-purple-500 outline-none text-slate-400 text-sm px-2 py-1"
                                    value={exp.location}
                                    onChange={e => handleExpChange(index, 'location', e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addExperience}
                        className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
                    >
                        <Plus size={16} /> Add Experience
                    </button>
                </div>

                <div className="border-t border-slate-700 pt-6 space-y-4">
                    <h3 className="text-xl font-semibold text-orange-400 flex items-center gap-2">
                        <Users size={20} /> Clubs & Activities
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {formData.clubs.map((club, index) => (
                            <div key={index} className="flex items-center bg-slate-900 border border-slate-600 rounded-full px-3 py-1">
                                <input
                                    className="bg-transparent outline-none text-white text-sm w-32"
                                    value={club}
                                    onChange={e => handleClubChange(index, e.target.value)}
                                    placeholder="Club Name"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeClub(index)}
                                    className="ml-2 text-slate-500 hover:text-red-400"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addClub}
                            className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1 font-medium px-3 py-1 border border-dashed border-orange-500/50 rounded-full"
                        >
                            <Plus size={16} /> Add
                        </button>
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-emerald-900/20 text-lg"
                    >
                        Join the Graph
                    </button>
                </div>
            </form>
        </div>
    );
}

// Helper icon
function X({ size = 24, className }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}
