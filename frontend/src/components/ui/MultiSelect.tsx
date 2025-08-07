import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, X, Search, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  category?: string;
  brand?: string;
  modelNumber?: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  maxHeight?: number;
  searchable?: boolean;
}

export interface MultiSelectRef {
  open: () => void;
  close: () => void;
  focus: () => void;
}

export const MultiSelect = forwardRef<MultiSelectRef, MultiSelectProps>(({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  label,
  error,
  className = "",
  maxHeight = 200,
  searchable = true
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    open: () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    close: () => {
      setIsOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
    },
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected options
  const selectedOptions = options.filter(option => value.includes(option.value));

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            handleOptionToggle(filteredOptions[highlightedIndex].value);
          }
          break;
        case 'Tab':
          // Allow Tab to work normally for navigation
          setIsOpen(false);
          setSearchTerm("");
          setHighlightedIndex(-1);
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm("");
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);

  const handleOptionToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleRemoveOption = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selectedOptions.length === 0) return placeholder;
    if (selectedOptions.length === 1) return selectedOptions[0].label;
    return `${selectedOptions.length} items selected`;
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div
        ref={dropdownRef}
        className={`relative border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        {/* Selected items display */}
        <div className="flex flex-wrap gap-1 p-2 min-h-[42px]">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
            >
              <span className="truncate max-w-[150px]">{option.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveOption(option.value);
                }}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          
          {selectedOptions.length === 0 && (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>

        {/* Dropdown toggle button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
        >
          <ChevronDown 
            size={16} 
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setHighlightedIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        // Allow Tab to work normally for navigation
                        setIsOpen(false);
                        setSearchTerm("");
                        setHighlightedIndex(-1);
                      }
                    }}
                    placeholder="Search products..."
                    className="w-full pl-8 pr-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Options list */}
            <div 
              className="overflow-y-auto"
              style={{ maxHeight: `${maxHeight}px` }}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No products found
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = value.includes(option.value);
                  const isHighlighted = index === highlightedIndex;
                  
                  return (
                    <div
                      key={option.value}
                      className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-50 ${
                        isHighlighted ? 'bg-gray-50' : ''
                      } ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => handleOptionToggle(option.value)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          {(option.category || option.brand) && (
                            <div className="text-xs text-gray-500">
                              {option.category} {option.brand && `• ${option.brand}`}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check size={16} className="text-blue-600 ml-2" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Clear all button */}
            {selectedOptions.length > 0 && (
              <div className="p-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="w-full text-sm text-red-600 hover:text-red-800 hover:bg-red-50 py-1 rounded"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}); 