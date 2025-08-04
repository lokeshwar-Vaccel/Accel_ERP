import React, { useState } from 'react';
import { X, User, Building, Phone, Mail, MapPin, Settings, FileText, Calendar, Tag, Award, Users, CheckCircle } from 'lucide-react';
import { Button } from './Botton';
import { Badge } from './Badge';
import { toast } from 'react-hot-toast';
import apiClient from '../../utils/api';

interface DGEnquiryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  enquiry: any;
}

export default function DGEnquiryViewModal({ isOpen, onClose, onSuccess, enquiry }: DGEnquiryViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  if (!isOpen || !enquiry) return null;

  const formatDate = (date: any) => {
    if (!date) return 'Not specified';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return <Badge variant="info">Open</Badge>;
      case 'in progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'closed':
        return <Badge variant="success">Closed</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      case 'qualified':
        return <Badge variant="success">Qualified</Badge>;
      default:
        return <Badge variant="info">{status || 'Open'}</Badge>;
    }
  };

  const getStageBadge = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'initial':
        return <Badge variant="info">Initial</Badge>;
      case 'quotation':
        return <Badge variant="warning">Quotation</Badge>;
      case 'negotiation':
        return <Badge variant="warning">Negotiation</Badge>;
      case 'order':
        return <Badge variant="success">Order</Badge>;
      default:
        return <Badge variant="info">{stage || 'Initial'}</Badge>;
    }
  };

  const handleQualifyCustomer = async () => {
    if (!enquiry._id) {
      toast.error('Enquiry ID not found');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.dgSales.enquiries.update(enquiry._id, {
        enquiryStatus: 'Qualified'
      });

      if (response.success) {
        toast.success('Customer status changed to Qualified successfully!');
        onSuccess();
        onClose();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update customer status');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'customer', label: 'Customer', icon: User },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'requirements', label: 'DG Requirements', icon: Settings },
    { id: 'employee', label: 'Employee', icon: Users },
    { id: 'additional', label: 'Additional', icon: Tag }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Enquiry Details
              </h2>
              <p className="text-sm text-gray-500">
                {enquiry.enquiryNo || enquiry.enquiryId || 'ENQ-001'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleQualifyCustomer}
              disabled={loading || enquiry.enquiryStatus === 'Qualified'}
              variant={enquiry.enquiryStatus === 'Qualified' ? 'outline' : 'primary'}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{enquiry.enquiryStatus === 'Qualified' ? 'Already Qualified' : 'Qualify Customer'}</span>
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 p-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry Number</label>
                    <p className="text-lg font-semibold text-gray-900">{enquiry.enquiryNo || enquiry.enquiryId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry Date</label>
                    <p className="text-gray-900">{formatDate(enquiry.enquiryDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="mt-1">{getStatusBadge(enquiry.enquiryStatus || enquiry.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                    <div className="mt-1">{getStageBadge(enquiry.enquiryStage)}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry Type</label>
                    <p className="text-gray-900">{enquiry.enquiryType || 'New'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <p className="text-gray-900">{enquiry.source || 'Website'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                    <p className="text-gray-900">{enquiry.customerType || 'Retail'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
                    <p className="text-gray-900">{enquiry.referredBy || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customer' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                    <p className="text-lg font-semibold text-gray-900">{enquiry.customerName || 'N/A'}</p>
                  </div>
                  {enquiry.customerType === 'Corporate' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Corporate Name</label>
                      <p className="text-gray-900">{enquiry.corporateName || 'N/A'}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <p className="text-gray-900 flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {enquiry.phoneNumber || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900 flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {enquiry.email || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                    <p className="text-gray-900">{enquiry.panNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Finance Required</label>
                    <p className="text-gray-900">{enquiry.financeRequired ? 'Yes' : 'No'}</p>
                  </div>
                  {enquiry.financeRequired && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Finance Company</label>
                      <p className="text-gray-900">{enquiry.financeCompany || 'N/A'}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DG Ownership</label>
                    <p className="text-gray-900">{enquiry.dgOwnership || 'NOT_OWNED'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'address' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <p className="text-gray-900">{enquiry.address || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <p className="text-gray-900">{enquiry.pincode || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tehsil</label>
                    <p className="text-gray-900">{enquiry.tehsil || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                    <p className="text-gray-900">{enquiry.district || enquiry.customerDistrict || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <p className="text-gray-900">{enquiry.state || enquiry.customerState || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                    <p className="text-gray-900">{enquiry.zone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">KVA Required</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {enquiry.kva || enquiry.kvaRequired || 'N/A'}
                      {typeof (enquiry.kva || enquiry.kvaRequired) === 'number' && ' KVA'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
                    <p className="text-gray-900">{enquiry.phase || 'Three Phase'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <p className="text-gray-900">{enquiry.quantity || '1'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Segment</label>
                    <p className="text-gray-900">{enquiry.segment || enquiry.applicationArea || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sub Segment</label>
                    <p className="text-gray-900">{enquiry.subSegment || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Events</label>
                    <p className="text-gray-900">{enquiry.events || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employee' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Employee Code</label>
                    <p className="text-gray-900">{enquiry.assignedEmployeeCode || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Employee Name</label>
                    <p className="text-gray-900">{enquiry.assignedEmployeeName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee Status</label>
                    <p className="text-gray-900">{enquiry.employeeStatus || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Employee Name</label>
                    <p className="text-gray-900">{enquiry.referenceEmployeeName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Employee Mobile</label>
                    <p className="text-gray-900">{enquiry.referenceEmployeeMobileNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Follow-ups</label>
                    <p className="text-gray-900">{enquiry.numberOfFollowUps || '0'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'additional' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {enquiry.remarks || 'No remarks available'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">EO/PO Date</label>
                    <p className="text-gray-900">{formatDate(enquiry.eoPoDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Planned Follow-up Date</label>
                    <p className="text-gray-900">{formatDate(enquiry.plannedFollowUpDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Follow-up Date</label>
                    <p className="text-gray-900">{formatDate(enquiry.lastFollowUpDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry Closure Date</label>
                    <p className="text-gray-900">{formatDate(enquiry.enquiryClosureDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
} 