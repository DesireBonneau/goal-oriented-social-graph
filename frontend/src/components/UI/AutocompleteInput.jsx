import React, { useState, useRef, useEffect } from 'react';

/**
 * Autocomplete input component with dropdown suggestions.
 * @param {Object} props
 * @param {string[]} props.options - List of options to suggest
 * @param {string} props.value - Current input value
 * @param {(value: string) => void} props.onChange - Callback when value changes
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.required] - Whether field is required
 */
export default function AutocompleteInput({
    options,
    value,
    onChange,
    placeholder = "",
    className = "",
    required = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState([]);
    const wrapperRef = useRef(null);

    // Filter options based on input
    useEffect(() => {
        if (value.trim() === "") {
            setFilteredOptions(options.slice(0, 8)); // Show first 8 when empty
        } else {
            const filtered = options.filter(opt =>
                opt.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 8);
            setFilteredOptions(filtered);
        }
    }, [value, options]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                required={required}
                className={`w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition ${className}`}
            />

            {isOpen && filteredOptions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredOptions.map((option, index) => (
                        <li
                            key={index}
                            onClick={() => handleSelect(option)}
                            className="px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer transition"
                        >
                            {option}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
