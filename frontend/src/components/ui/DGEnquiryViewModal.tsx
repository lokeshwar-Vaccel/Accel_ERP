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

    if (!enquiry.customer?._id) {
      toast.error('Customer ID not found');
      return;
    }

    setLoading(true);
    try {
      // Update customer status to 'Converted' instead of enquiry status
      const response = await apiClient.customers.update(enquiry.customer._id, {
        status: 'converted'
      });

      if (response.success) {
        toast.success('Customer status updated to Converted successfully!');
        onSuccess();
        onClose();
      } else {
        throw new Error('Failed to update customer status');
      }
    } catch (error: any) {
      console.error('Error updating customer status:', error);
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
              disabled={loading || enquiry.customer?.status === 'converted'}
              variant={enquiry.customer?.status === 'converted' ? 'outline' : 'primary'}
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{enquiry.customer?.status === 'converted' ? 'Customer Already Converted' : 'Qualify Customer'}</span>
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
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Customer Information
              </h3>
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
                  <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                    {enquiry.panNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Type</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <Badge variant={enquiry.customerType === 'Corporate' ? 'warning' : 'info'}>
                      {enquiry.customerType || 'Retail'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Finance Required</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <Badge variant={enquiry.financeRequired ? 'warning' : 'success'}>
                      {enquiry.financeRequired ? 'Yes' : 'No'}
                    </Badge>
                  </p>
                </div>
                {enquiry.financeRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Finance Company</label>
                    <p className="mt-1 text-sm text-gray-900">{enquiry.financeCompany || 'N/A'}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">DG Ownership</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <Badge variant={enquiry.dgOwnership === 'OWNED' ? 'success' : 'info'}>
                      {enquiry.dgOwnership || 'NOT_OWNED'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Status</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <Badge variant={enquiry.customer?.status === 'converted' ? 'success' : 'info'}>
                      {enquiry.customer?.status === 'converted' ? 'Converted' : 'New'}
                    </Badge>
                  </p>
                </div>
                {enquiry.alice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Alice</label>
                    <p className="mt-1 text-sm text-gray-900">{enquiry.alice}</p>
                  </div>
                )}
                {enquiry.designation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Designation</label>
                    <p className="mt-1 text-sm text-gray-900">{enquiry.designation}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                Address Information
              </h3>
              {enquiry.addresses && enquiry.addresses.length > 0 ? (
                <div className="space-y-4">
                  {enquiry.addresses.map((address: any, index: number) => (
                    <div key={address.id || index} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Address {index + 1}
                          {address.isPrimary && (
                            <Badge variant="success" className="ml-2">Primary</Badge>
                          )}
                        </h4>
                        <Badge variant={address.registrationStatus === 'registered' ? 'success' : 'warning'}>
                          {address.registrationStatus === 'registered' ? 'Registered' : 'Non-Registered'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Address</label>
                          <p className="mt-1 text-sm text-gray-900">{address.address || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">State</label>
                          <p className="mt-1 text-sm text-gray-900">{address.state || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">District</label>
                          <p className="mt-1 text-sm text-gray-900">{address.district || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Pincode</label>
                          <p className="mt-1 text-sm text-gray-900">{address.pincode || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">GST Number</label>
                          <p className="mt-1 text-sm text-gray-900">{address.gstNumber || 'N/A'}</p>
                        </div>
                        {address.contactPersonName && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                            <p className="mt-1 text-sm text-gray-900 flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-400" />
                              {address.contactPersonName}
                            </p>
                          </div>
                        )}
                        {address.email && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <p className="mt-1 text-sm text-gray-900 flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-gray-400" />
                              {address.email}
                            </p>
                          </div>
                        )}
                        {address.phone && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                            <p className="mt-1 text-sm text-gray-900 flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-gray-400" />
                              {address.phone}
                            </p>
                          </div>
                        )}
                        {address.notes && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{address.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No address information available</p>
                </div>
              )}
            </div>

            {/* DG Requirements */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-blue-600" />
                DG Requirements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">KVA Required</label>
                  <p className="mt-1 text-2xl font-bold text-blue-600">
                    {enquiry.kva || enquiry.kvaRequired || 'N/A'}
                    {typeof (enquiry.kva || enquiry.kvaRequired) === 'number' && ' KVA'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Phase</label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    <Badge variant={enquiry.phase === 'Three Phase' ? 'success' : 'info'}>
                      {enquiry.phase || 'Three Phase'}
                    </Badge>
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{enquiry.quantity || '1'}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Segment</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.segment || enquiry.applicationArea || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Sub Segment</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.subSegment || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Events</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.events || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Employee Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Employee Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Assigned Employee Code</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                    {enquiry.assignedEmployeeCode || 'N/A'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Assigned Employee Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{enquiry.assignedEmployeeName || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Employee Status</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <Badge variant={enquiry.employeeStatus === 'Active' ? 'success' : 'warning'}>
                      {enquiry.employeeStatus || 'N/A'}
                    </Badge>
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Reference Employee Name</label>
                  <p className="mt-1 text-sm text-gray-900">{enquiry.referenceEmployeeName || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Reference Employee Mobile</label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {enquiry.referenceEmployeeMobileNumber || 'N/A'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Number of Follow-ups</label>
                  <p className="mt-1 text-lg font-semibold text-blue-600">{enquiry.numberOfFollowUps || '0'}</p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Additional Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg border min-h-[80px]">
                    {enquiry.remarks || 'No remarks available'}
                  </p>
                </div>
                {enquiry.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded-lg border min-h-[60px]">
                      {enquiry.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Important Dates */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Important Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">EO/PO Date</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{formatDate(enquiry.eoPoDate)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Planned Follow-up Date</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{formatDate(enquiry.plannedFollowUpDate)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Last Follow-up Date</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{formatDate(enquiry.lastFollowUpDate)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">Enquiry Closure Date</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{formatDate(enquiry.enquiryClosureDate)}</p>
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