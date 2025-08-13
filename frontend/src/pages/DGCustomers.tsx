import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Botton';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import {
  Filter,
  Download,
  Eye,
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import apiClient from '../utils/api';
import { toast } from 'react-hot-toast';

interface ConvertedCustomer {
  _id: string;
  customerId?: string;
  name: string;
  email?: string;
  phone?: string;
  customerType: string;
  leadSource?: string;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  status: string;
  addresses: Array<{
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function DGCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<ConvertedCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Load customers data
  useEffect(() => {
    loadCustomers();
  }, [currentPage, searchTerm]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage
      };
      
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await apiClient.customers.convertedCustomers.getAll(params);
      
      if (response.success) {
        setCustomers(response.data || []);
        setTotalItems(response.pagination?.total || 0);
        setTotalPages(response.pagination?.pages || 1);
        setCurrentPage(response.pagination?.page || 1);
        setItemsPerPage(response.pagination?.limit || 10);
      }
    } catch (error: any) {
      console.error('Failed to load customers:', error);
      setError(error.message || 'Failed to load customers');
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadCustomers();
  };

  const handleReset = () => {
    setSearchTerm('');
    setCurrentPage(1);
    loadCustomers();
  };

  const exportCustomers = () => {
    // Implementation for exporting customers to CSV/Excel
    toast.success('Export functionality will be implemented');
  };

  const getCustomerTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'retail': 'Retail',
      'corporate': 'Corporate',
      'industrial': 'Industrial',
      'commercial': 'Commercial',
      'residential': 'Residential',
      'telecom': 'Telecom',
      'ev': 'EV',
      'dg': 'DG',
      'jenaral': 'General',
      'je': 'JE'
    };
    return typeMap[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'converted':
        return 'success';
      case 'active':
        return 'info';
      case 'inactive':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="relative mb-4">
          {/* Main Header Container */}
          <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-100/50 to-red-100/50 rounded-full -translate-y-4 translate-x-4 blur-xl"></div>
            <div className="absolute bottom-0 left-0 w-14 h-14 bg-gradient-to-tr from-orange-200/30 to-yellow-200/30 rounded-full translate-y-2 -translate-x-2 blur-lg"></div>
            
            <div className="relative flex justify-between items-start">
              <div className="flex-1">
                {/* Title with gradient underline */}
                <div className="relative inline-block">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1.5">
                    DG Customers
                  </h1>
                  {/* Straight thick gradient underline */}
                  <div className="w-full h-1 bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 rounded-full animate-pulse"></div>
                </div>
                
                <p className="text-gray-600 mt-1.5 text-sm max-w-2xl">
                  Converted customers from DG Sales workflow
                </p>
              </div>
              
              {/* Back Button */}
              <div className="flex-shrink-0 ml-4">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </div>
            </div>
          </div>
          
          {/* Bottom curved shadow */}
          <div className="relative -mt-1.5">
            <svg
              className="w-full h-4 text-gray-200"
              viewBox="0 0 1200 16"
              preserveAspectRatio="none"
            >
              <path
                d="M0,0 C300,16 900,16 1200,0 L1200,16 L0,16 Z"
                fill="currentColor"
                opacity="0.3"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4 items-end">
          <div className="w-80">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Customers
            </label>
            <Input
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSearch}>
              <Filter className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Total: <span className="font-semibold">{totalItems}</span> customers
            </span>
            <span className="text-sm text-gray-600">
              Page: <span className="font-semibold">{currentPage}</span> of {totalPages}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCustomers}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow">
        <Table
          columns={[
            { key: 'customerId', title: 'Customer ID', sortable: true },
            { key: 'name', title: 'Customer Name', sortable: true },
            { key: 'contact', title: 'Contact Info' },
            { key: 'address', title: 'Address' },
            { key: 'customerType', title: 'Type', sortable: true },
            { key: 'leadSource', title: 'Lead Source' },
            { key: 'assignedTo', title: 'Assigned To' },
            { key: 'createdAt', title: 'Created Date', sortable: true },
            { key: 'actions', title: 'Actions' }
          ]}
          data={customers.map(customer => ({
            customerId: customer.customerId || 'N/A',
            name: (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{customer.name}</span>
              </div>
            ),
            contact: (
              <div className="space-y-1">
                {customer.email && (
                  <div className="flex items-center gap-1 text-sm">
                    <Mail className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-700">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-700">{customer.phone}</span>
                  </div>
                )}
              </div>
            ),
            address: (
              <div className="space-y-1">
                {customer.addresses && customer.addresses.length > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-700">
                      {customer.addresses[0]?.district}, {customer.addresses[0]?.state}
                    </span>
                  </div>
                )}
                {customer.addresses && customer.addresses.length > 0 && customer.addresses[0]?.pincode && (
                  <div className="text-xs text-gray-500">
                    PIN: {customer.addresses[0].pincode}
                  </div>
                )}
              </div>
            ),
            customerType: (
              <Badge variant="info">
                {getCustomerTypeLabel(customer.customerType)}
              </Badge>
            ),
            leadSource: (
              <span className="text-sm text-gray-600 capitalize">
                {customer.leadSource?.replace('_', ' ') || 'N/A'}
              </span>
            ),
            assignedTo: (
              <div className="flex items-center gap-2">
                {customer.assignedTo ? (
                  <>
                    <User className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">{customer.assignedTo.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Unassigned</span>
                )}
              </div>
            ),
            createdAt: (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="w-3 h-3" />
                {new Date(customer.createdAt).toLocaleDateString()}
              </div>
            ),
            actions: (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Navigate to customer details or edit page
                    toast.success('Customer details view will be implemented');
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Navigate to edit customer page
                    toast.success('Customer edit will be implemented');
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            )
          }))}
          loading={loading}
          pagination={{
            page: currentPage,
            pages: totalPages,
            total: totalItems,
            limit: itemsPerPage
          }}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
} 