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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              DG Enquiry Details
            </h2>
            {getStatusBadge(enquiry.enquiryStatus || enquiry.status)}
            {getStageBadge(enquiry.enquiryStage)}
            <Badge variant="default">
              {enquiry.enquiryNo || enquiry.enquiryId || 'ENQ-001'}
            </Badge>
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
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Enquiry Number</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{enquiry.enquiryNo || enquiry.enquiryId || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Enquiry Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(enquiry.enquiryDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Enquiry Type</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.enquiryType || 'New'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.source || 'Website'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Type</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.customerType || 'Retail'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Referred By</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.referredBy || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{enquiry.customerName || 'N/A'}</p>
                </div>
                {enquiry.customerType === 'Corporate' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Corporate Name</label>
                    <p className="mt-1 text-sm text-gray-900">{enquiry.corporateName || 'N/A'}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {enquiry.phoneNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {enquiry.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.panNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Finance Required</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.financeRequired ? 'Yes' : 'No'}</p>
                </div>
                {enquiry.financeRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Finance Company</label>
                    <p className="mt-1 text-sm text-gray-900">{enquiry.financeCompany || 'N/A'}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">DG Ownership</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.dgOwnership || 'NOT_OWNED'}</p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.address || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pincode</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.pincode || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tehsil</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.tehsil || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">District</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.district || enquiry.customerDistrict || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.state || enquiry.customerState || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Zone</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.zone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* DG Requirements */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">DG Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">KVA Required</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">
                    {enquiry.kva || enquiry.kvaRequired || 'N/A'}
                    {typeof (enquiry.kva || enquiry.kvaRequired) === 'number' && ' KVA'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phase</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.phase || 'Three Phase'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.quantity || '1'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Segment</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.segment || enquiry.applicationArea || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sub Segment</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.subSegment || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Events</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.events || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Employee Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Employee Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned Employee Code</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.assignedEmployeeCode || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned Employee Name</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.assignedEmployeeName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee Status</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.employeeStatus || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference Employee Name</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.referenceEmployeeName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference Employee Mobile</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.referenceEmployeeMobileNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Number of Follow-ups</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.numberOfFollowUps || '0'}</p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg border">
                  {enquiry.remarks || 'No remarks available'}
                </p>
              </div>
            </div>

            {/* Important Dates */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Important Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">EO/PO Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(enquiry.eoPoDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Planned Follow-up Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(enquiry.plannedFollowUpDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Follow-up Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(enquiry.lastFollowUpDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Enquiry Closure Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(enquiry.enquiryClosureDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Status:</span>
            {getStatusBadge(enquiry.enquiryStatus || enquiry.status)}
            <span className="text-sm text-gray-600 ml-4">Stage:</span>
            {getStageBadge(enquiry.enquiryStage)}
          </div>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
} 