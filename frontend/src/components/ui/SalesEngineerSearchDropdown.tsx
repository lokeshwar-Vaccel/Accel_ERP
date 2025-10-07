import React, { useState, useEffect, useRef } from 'react';
import { Search, User, ChevronDown, Loader2 } from 'lucide-react';
import apiClient from '../../utils/api';

interface SalesEngineer {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  salesEmployeeCode: string;
  status: string;
}

interface SalesEngineerSearchDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onSalesEngineerSelect: (salesEngineer: SalesEngineer) => void;
  placeholder?: string;
  error?: string;
}

export default function SalesEngineerSearchDropdown({
  value,
  onChange,
  onSalesEngineerSelect,
  placeholder = "Search sales engineers...",
  error
}: SalesEngineerSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [salesEngineers, setSalesEngineers] = useState<SalesEngineer[]>([]);
  const [filteredSalesEngineers, setFilteredSalesEngineers] = useState<SalesEngineer[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch sales engineers on component mount
  useEffect(() => {
    fetchSalesEngineers();
  }, []);

  // Update search term when value prop changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchSalesEngineers = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.users.getSalesEngineers();
      
      if (response.success && response.data?.salesEngineers) {
        setSalesEngineers(response.data.salesEngineers);
        setFilteredSalesEngineers(response.data.salesEngineers);
      }
    } catch (error) {
      console.error('Error fetching sales engineers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onChange(term);
    
    if (term.trim().length === 0) {
      // Show all sales engineers when search term is empty
      setFilteredSalesEngineers(salesEngineers);
      return;
    }
    
    const filtered = salesEngineers.filter(engineer =>
      engineer.fullName.toLowerCase().includes(term.toLowerCase()) ||
      engineer.salesEmployeeCode.toLowerCase().includes(term.toLowerCase()) ||
      engineer.email.toLowerCase().includes(term.toLowerCase())
    );
    
    setFilteredSalesEngineers(filtered);
  };

  const handleSalesEngineerSelect = (salesEngineer: SalesEngineer) => {
    setSearchTerm(salesEngineer.fullName);
    onChange(salesEngineer.fullName);
    onSalesEngineerSelect(salesEngineer);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Show all sales engineers when focused, or filter if there's a search term
    if (searchTerm.trim().length > 0) {
      handleSearch(searchTerm);
    } else {
      // Show all sales engineers when focused with no search term
      setFilteredSalesEngineers(salesEngineers);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow for click events
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-gray-500 flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading sales engineers...
            </div>
          ) : filteredSalesEngineers.length > 0 ? (
            <div className="py-1">
              {filteredSalesEngineers.map((engineer) => (
                <button
                  key={engineer._id}
                  type="button"
                  onClick={() => handleSalesEngineerSelect(engineer)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-3" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {engineer.fullName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {engineer.salesEmployeeCode} • {engineer.email}
                      </div>
                    </div>
                    <div className="ml-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        engineer.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {engineer.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : salesEngineers.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              No sales engineers available
            </div>
          ) : searchTerm.trim().length > 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              No sales engineers found matching "{searchTerm}"
            </div>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              Start typing to search sales engineers
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
