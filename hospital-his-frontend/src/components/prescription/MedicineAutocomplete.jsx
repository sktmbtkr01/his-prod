/**
 * MedicineAutocomplete Component
 * Smart dropdown for medicine selection with database-backed search
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pill, Search, Loader2, AlertCircle, Check } from 'lucide-react';
import { searchMedicines } from '../../services/medicine.service';
import './MedicineAutocomplete.css';

const MedicineAutocomplete = ({
    value,
    onChange,
    placeholder = "Start typing medicine name...",
    required = false,
    disabled = false,
    className = ""
}) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [error, setError] = useState(null);
    const [isValidSelection, setIsValidSelection] = useState(false);

    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const debounceRef = useRef(null);

    // Sync external value changes
    useEffect(() => {
        if (value !== inputValue) {
            setInputValue(value || '');
            setIsValidSelection(!!value);
        }
    }, [value]);

    // Debounced search function
    const fetchSuggestions = useCallback(async (query) => {
        if (!query || query.length < 1) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await searchMedicines(query, 15);
            setSuggestions(result.data || []);
            setIsOpen(result.data?.length > 0);
            setSelectedIndex(-1);
        } catch (err) {
            console.error('Medicine search error:', err);
            setError('Failed to load medicines');
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle input change with debounce
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setIsValidSelection(false);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Debounce the search (300ms)
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(newValue);
        }, 300);
    };

    // Handle medicine selection
    const handleSelect = (medicine) => {
        const displayValue = medicine.name;
        setInputValue(displayValue);
        setIsValidSelection(true);
        setIsOpen(false);
        setSuggestions([]);
        onChange(displayValue, medicine);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' && inputValue) {
                fetchSuggestions(inputValue);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    handleSelect(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target) &&
                inputRef.current &&
                !inputRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && dropdownRef.current) {
            const selectedElement = dropdownRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // Highlight matching text
    const highlightMatch = (text, query) => {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <span key={i} className="medicine-highlight">{part}</span>
            ) : part
        );
    };

    return (
        <div className={`medicine-autocomplete ${className}`}>
            <div className="medicine-input-wrapper">
                <div className="medicine-input-icon">
                    {isLoading ? (
                        <Loader2 size={16} className="spinning" />
                    ) : (
                        <Pill size={16} />
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className={`medicine-input ${isValidSelection ? 'valid' : ''}`}
                    autoComplete="off"
                />
                {isValidSelection && (
                    <div className="medicine-valid-icon">
                        <Check size={14} />
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div ref={dropdownRef} className="medicine-dropdown">
                    {error ? (
                        <div className="medicine-error">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                        </div>
                    ) : suggestions.length === 0 ? (
                        <div className="medicine-no-results">
                            <Search size={14} />
                            <span>No medicines found</span>
                        </div>
                    ) : (
                        suggestions.map((medicine, index) => (
                            <div
                                key={medicine._id}
                                className={`medicine-option ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleSelect(medicine)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="medicine-option-name">
                                    {highlightMatch(medicine.name, inputValue)}
                                </div>
                                {medicine.category && (
                                    <div className="medicine-option-category">
                                        {medicine.category}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default MedicineAutocomplete;
