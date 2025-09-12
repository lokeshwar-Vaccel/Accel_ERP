import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Plus, X } from 'lucide-react';
import apiClient from '../../utils/api';

interface Customer {
  _id: string;
  name: string;
  alice?: string;
  designation?: string;
  contactPersonName?: string;
  email?: string;
  phone?: string;
  panNumber?: string;
  addresses: Array<{
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
    contactPersonName?: string;
    email?: string;
    phone?: string;
    registrationStatus: 'registered' | 'non_registered';
  }>;
}

interface CustomerSearchDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onCustomerSelect: (customer: Customer) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export default function CustomerSearchDropdown({
  value,
  onChange,
  onCustomerSelect,
  placeholder = "Search customers...",
  error,
  disabled = false
}: CustomerSearchDropdownProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [showCreateOption, setShowCreateOption] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Handle clicks outside dropdown
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

  // Update search term when value prop changes
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.customers.getAllForDropdown({type: 'customer'});
      if (response.success) {
        // Handle both paginated and non-paginated responses
        let customerData: Customer[] = [];
        if (Array.isArray(response.data)) {
          customerData = response.data;
        } else if (response.data && typeof response.data === 'object' && 'customers' in response.data && Array.isArray((response.data as any).customers)) {
          customerData = (response.data as any).customers;
        }
        setCustomers(customerData);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    onChange(term);
    
    if (term.trim().length === 0) {
      // Show all customers when search term is empty
      setFilteredCustomers(customers);
      setShowCreateOption(false);
      return;
    }

    // Filter customers based on search term
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(term.toLowerCase()) ||
      (customer.alice && customer.alice.toLowerCase().includes(term.toLowerCase())) ||
      (customer.email && customer.email.toLowerCase().includes(term.toLowerCase())) ||
      (customer.phone && customer.phone.includes(term))
    );

    setFilteredCustomers(filtered);
    
    // Show create option if no exact match found
    const exactMatch = customers.find(customer => 
      customer.name.toLowerCase() === term.toLowerCase()
    );
    setShowCreateOption(!exactMatch && term.trim().length > 0);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSearchTerm(customer.name);
    onChange(customer.name);
    onCustomerSelect(customer);
    setIsOpen(false);
    setShowCreateOption(false);
  };

  const handleCreateNew = () => {
    // Keep the current search term as the new customer name
    const newCustomer: Customer = {
      _id: 'new',
      name: searchTerm,
      alice: '',
      designation: '',
      contactPersonName: '',
      email: '',
      phone: '',
      panNumber: '',
      addresses: [{
        id: 1,
        address: '',
        state: '',
        district: '',
        pincode: '',
        isPrimary: true,
        gstNumber: '',
        contactPersonName: '',
        email: '',
        phone: '',
        registrationStatus: 'non_registered'
      }]
    };
    
    onCustomerSelect(newCustomer);
    setIsOpen(false);
    setShowCreateOption(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Show all customers when focused, or filter if there's a search term
    if (searchTerm.trim().length > 0) {
      handleSearch(searchTerm);
    } else {
      // Show all customers when focused with no search term
      setFilteredCustomers(customers);
      setShowCreateOption(false);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow for clicks on dropdown items
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const clearInput = () => {
    setSearchTerm('');
    onChange('');
    setFilteredCustomers([]);
    setShowCreateOption(false);
    inputRef.current?.focus();
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
          disabled={disabled}
          className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        />
        {searchTerm && !disabled && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-gray-500 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              Loading customers...
            </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="py-1">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer._id}
                  type="button"
                  onClick={() => handleCustomerSelect(customer)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {customer.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {customer.alice && `Alias: ${customer.alice}`}
                        {customer.email && ` • ${customer.email}`}
                        {customer.phone && ` • ${customer.phone}`}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              No customers available
            </div>
          ) : searchTerm.trim().length > 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              No customers found matching "{searchTerm}"
            </div>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              Start typing to search customers
            </div>
          )}

          {showCreateOption && (
            <div className="border-t border-gray-200">
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center"
              >
                <Plus className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Create new customer: "{searchTerm}"
                  </div>
                  <div className="text-xs text-gray-500">
                    This will create a new customer with the entered name
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
