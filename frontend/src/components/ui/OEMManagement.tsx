import React, { useState, useEffect } from 'react';
import { Button } from './Botton';
import { Input } from './Input';
import { Pagination } from './Pagination';
import { Plus, Filter } from 'lucide-react';
import OEMTable from './OEMTable';
import OEMCreateModal from './OEMCreateModal';
import OEMEditModal from './OEMEditModal';
import OEMViewModal from './OEMViewModal';
import { Modal } from './Modal';
import { toast } from 'react-hot-toast';
import apiClient from '../../utils/api';

interface OEM {
  _id: string;
  oemCode: string;
  companyName: string;
  alias?: string;
  gstDetails?: string;
  panNumber?: string;
  contactPersonName?: string;
  designation?: string;
  mobileNo?: string;
  email?: string;
  addresses?: Array<{
    address: string;
    district: string;
    state: string;
    pincode: string;
  }>;
  bankDetails?: Array<{
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch?: string;
    isDefault: boolean;
  }>;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OEMManagementProps {
  onOEMSelect?: (oem: OEM) => void;
  showCreateButton?: boolean;
  showSearch?: boolean;
  showPagination?: boolean;
  pageSize?: number;
}

const OEMManagement: React.FC<OEMManagementProps> = ({
  onOEMSelect,
  showCreateButton = true,
  showSearch = true,
  showPagination = true,
  pageSize = 10
}) => {
  const [oems, setOems] = useState<OEM[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOEM, setSelectedOEM] = useState<OEM | null>(null);

  // Fetch OEMs
  const fetchOEMs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: pageSize,
        ...(searchTerm && { search: searchTerm })
      };

      const response = await apiClient.dgSales.oems.getAll(params);
      setOems(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotalItems(response.total || 0);
    } catch (error) {
      console.error('Failed to fetch OEMs:', error);
      toast.error('Failed to fetch OEMs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOEMs();
  }, [currentPage, searchTerm]);

  // Handle OEM creation
  const handleCreateOEM = async (oemData: any) => {
    try {
      await apiClient.dgSales.oems.create(oemData);
      toast.success('OEM created successfully');
      setShowCreateModal(false);
      fetchOEMs();
    } catch (error: any) {
      throw error; // Let the modal handle the error display
    }
  };

  // Handle OEM update
  const handleUpdateOEM = async (oemData: any) => {
    if (!selectedOEM) return;
    
    try {
      await apiClient.dgSales.oems.update(selectedOEM._id, oemData);
      toast.success('OEM updated successfully');
      setShowEditModal(false);
      setSelectedOEM(null);
      fetchOEMs();
    } catch (error: any) {
      throw error; // Let the modal handle the error display
    }
  };

  // Handle OEM deletion
  const handleDeleteOEM = async () => {
    if (!selectedOEM) return;
    
    try {
      await apiClient.dgSales.oems.delete(selectedOEM._id);
      toast.success('OEM deleted successfully');
      setShowDeleteModal(false);
      setSelectedOEM(null);
      fetchOEMs();
    } catch (error: any) {
      console.error('Failed to delete OEM:', error);
      toast.error('Failed to delete OEM');
    }
  };

  // Handle status update
  const handleStatusUpdate = async (oemId: string, status: string) => {
    try {
      await apiClient.dgSales.oems.updateStatus(oemId, status);
      toast.success('Status updated successfully');
      fetchOEMs();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  // Handle view OEM
  const handleViewOEM = (oem: OEM) => {
    setSelectedOEM(oem);
    setShowViewModal(true);
  };

  // Handle edit OEM
  const handleEditOEM = (oem: OEM) => {
    setSelectedOEM(oem);
    setShowEditModal(true);
  };

  // Handle delete OEM
  const handleDeleteClick = (oem: OEM) => {
    setSelectedOEM(oem);
    setShowDeleteModal(true);
  };

  // Handle OEM selection
  const handleOEMSelect = (oem: OEM) => {
    if (onOEMSelect) {
      onOEMSelect(oem);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">OEM Management</h2>
        {showCreateButton && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add OEM
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      {showSearch && (
        <div className="flex gap-4">
          <Input
            placeholder="Search OEMs..."
            value={searchTerm}
            onChange={handleSearch}
            className="flex-1"
          />
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      )}

      {/* OEM Table */}
      <OEMTable
        oems={oems}
        loading={loading}
        onView={handleViewOEM}
        onEdit={handleEditOEM}
        onDelete={handleDeleteClick}
        onStatusUpdate={handleStatusUpdate}
        pagination={showPagination ? {
          page: currentPage,
          pages: totalPages,
          total: totalItems,
          limit: pageSize,
          onPageChange: handlePageChange
        } : undefined}
      />

      {/* Create Modal */}
      <OEMCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateOEM}
      />

      {/* Edit Modal */}
      <OEMEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedOEM(null);
        }}
        onSubmit={handleUpdateOEM}
        oem={selectedOEM}
      />

      {/* View Modal */}
      <OEMViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedOEM(null);
        }}
        oem={selectedOEM}
        onEdit={handleEditOEM}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedOEM(null);
        }}
        title="Delete OEM"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this OEM? This action cannot be undone.
          </p>
          {selectedOEM && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-medium">{selectedOEM.companyName}</p>
              <p className="text-sm text-gray-600">{selectedOEM.oemCode}</p>
            </div>
          )}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedOEM(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteOEM}
              className="text-red-600 hover:text-red-700"
            >
              Delete OEM
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OEMManagement;
