import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  CheckCircle, 
  X, 
  Edit, 
  Trash2, 
  Download, 
  Camera,
  Upload,
  Star,
  Calendar,
  User,
  Package,
  Wrench,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { apiClient } from '../utils/api';

interface DigitalServiceReport {
  _id: string;
  reportNumber: string;
  ticketId: {
    _id: string;
    ticketNumber: string;
    description: string;
    status: string;
  };
  technician: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  customer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  product?: {
    _id: string;
    name: string;
    category: string;
    brand: string;
    modelNumber: string;
  };
  serviceDate: string;
  workCompleted: string;
  partsUsed: Array<{
    product: {
      _id: string;
      name: string;
      category: string;
      price: number;
    };
    quantity: number;
    serialNumbers?: string[];
    cost: number;
  }>;
  recommendations: string;
  customerFeedback: string;
  customerSignature: string;
  technicianSignature: string;
  nextVisitRequired: boolean;
  nextVisitDate?: string;
  serviceQuality: 'excellent' | 'good' | 'average' | 'poor';
  customerSatisfaction: number;
  photos: string[];
  attachments: string[];
  status: 'draft' | 'completed' | 'approved' | 'rejected';
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface DigitalServiceReportProps {
  ticketId: string;
  onClose: () => void;
  onReportCreated?: (report: DigitalServiceReport) => void;
  onReportUpdated?: (report: DigitalServiceReport) => void;
}

const DigitalServiceReport: React.FC<DigitalServiceReportProps> = ({
  ticketId,
  onClose,
  onReportCreated,
  onReportUpdated
}) => {
  const [report, setReport] = useState<DigitalServiceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    workCompleted: '',
    partsUsed: [] as Array<{
      product: string;
      quantity: number;
      serialNumbers: string[];
      cost: number;
    }>,
    recommendations: '',
    customerFeedback: '',
    customerSignature: '',
    technicianSignature: '',
    nextVisitRequired: false,
    nextVisitDate: '',
    serviceQuality: 'good' as 'excellent' | 'good' | 'average' | 'poor',
    customerSatisfaction: 5,
    photos: [] as string[],
    attachments: [] as string[]
  });
  const [ticket, setTicket] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [partQuantity, setPartQuantity] = useState<number>(1);
  const [partCost, setPartCost] = useState<number>(0);
  const [serialNumbers, setSerialNumbers] = useState<string>('');
  const [showAddPart, setShowAddPart] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const customerSignatureRef = useRef<HTMLInputElement>(null);
  const technicianSignatureRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTicket();
    loadProducts();
    checkExistingReport();
  }, [ticketId]);

  // Reset form data when switching between create and edit modes
  useEffect(() => {
    if (report && isEditing) {
      populateFormData(report);
    }
  }, [report, isEditing]);

  const loadTicket = async () => {
    try {
      const response = await apiClient.services.getById(ticketId);
      if (response.success) {
        setTicket(response.data.ticket);
      }
    } catch (error) {
      setError('Failed to load ticket details');
    }
  };

  const loadProducts = async () => {
    try {
      const response = await apiClient.products.getAll();
      
      let productsData: any[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        productsData = response.data;
      } else if (
        response.data &&
        typeof response.data === 'object' &&
        !Array.isArray(response.data) &&
        response.data !== null &&
        Array.isArray((response.data as any).products)
      ) {
        productsData = (response.data as any).products;
      } else {
        productsData = [];
      }
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const checkExistingReport = async () => {
    try {
      const response = await apiClient.digitalServiceReports.getByTicket(ticketId);
      if (response.success) {
        setReport(response.data.report);
        setIsEditing(false);
      }
    } catch (error) {
      // No existing report found, this is expected for new reports
    }
  };

  const handleEditReport = () => {
    if (report) {
      populateFormData(report);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    if (report) {
      // Reset form data to original report data
      populateFormData(report);
    } else {
      // Reset to empty form for new reports
      setFormData({
        workCompleted: '',
        partsUsed: [],
        recommendations: '',
        customerFeedback: '',
        customerSignature: '',
        technicianSignature: '',
        nextVisitRequired: false,
        nextVisitDate: '',
        serviceQuality: 'good',
        customerSatisfaction: 5,
        photos: [],
        attachments: []
      });
    }
    setIsEditing(false);
  };

  const populateFormData = (report: DigitalServiceReport) => {
    setFormData({
      workCompleted: report.workCompleted || '',
      partsUsed: report.partsUsed.map(part => ({
        product: typeof part.product === 'string' ? part.product : part.product._id,
        quantity: part.quantity,
        serialNumbers: part.serialNumbers || [],
        cost: part.cost
      })),
      recommendations: report.recommendations || '',
      customerFeedback: report.customerFeedback || '',
      customerSignature: report.customerSignature || '',
      technicianSignature: report.technicianSignature || '',
      nextVisitRequired: report.nextVisitRequired || false,
      nextVisitDate: report.nextVisitDate ? new Date(report.nextVisitDate).toISOString().split('T')[0] : '',
      serviceQuality: report.serviceQuality || 'good',
      customerSatisfaction: report.customerSatisfaction || 5,
      photos: report.photos || [],
      attachments: report.attachments || []
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddPart = () => {
    if (!selectedProduct || partQuantity <= 0 || partCost < 0) {
      setError('Please fill all part details correctly');
      return;
    }

    const newPart = {
      product: selectedProduct,
      quantity: partQuantity,
      serialNumbers: serialNumbers.split(',').map(s => s.trim()).filter(s => s),
      cost: partCost
    };

    setFormData(prev => ({
      ...prev,
      partsUsed: [...prev.partsUsed, newPart]
    }));

    // Reset form
    setSelectedProduct('');
    setPartQuantity(1);
    setPartCost(0);
    setSerialNumbers('');
    setShowAddPart(false);
    setError(null);
  };

  const handleRemovePart = (index: number) => {
    setFormData(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'photos' | 'attachments') => {
    const files = event.target.files;
    if (files) {
      try {
        setLoading(true);
        setError(null);

        const fileArray = Array.from(files);
        console.log('Uploading files:', fileArray.map(f => f.name));
        
        // Upload files to server
        const response = await apiClient.files.uploadDigitalReport(
          type === 'photos' ? fileArray : [],
          type === 'attachments' ? fileArray : []
        );

        console.log('Upload response:', response);

        if (response.success) {
          const uploadedFiles = type === 'photos' ? response.data.photos : response.data.attachments;
          const fileUrls = uploadedFiles.map((file: any) => file.url);
          
          console.log('File URLs:', fileUrls);
          
          setFormData(prev => ({
            ...prev,
            [type]: [...prev[type], ...fileUrls]
          }));
        } else {
          setError('Failed to upload files');
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        setError('Failed to upload files');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'customerSignature' | 'technicianSignature') => {
    const files = event.target.files;
    if (files && files.length > 0) {
      try {
        setLoading(true);
        setError(null);

        const file = files[0];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please select an image file for signature');
          return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Signature file size must be less than 5MB');
          return;
        }
        
        console.log('Uploading signature:', file.name);
        
        // Upload signature file to server
        const response = await apiClient.files.uploadDigitalReport(
          [file], // photos array
          [] // attachments array
        );

        console.log('Signature upload response:', response);

        if (response.success && response.data.photos && response.data.photos.length > 0) {
          const signatureUrl = response.data.photos[0].url;
          
          console.log('Signature URL:', signatureUrl);
          
          setFormData(prev => ({
            ...prev,
            [type]: signatureUrl
          }));
        } else {
          setError('Failed to upload signature');
        }
      } catch (error) {
        console.error('Error uploading signature:', error);
        setError('Failed to upload signature');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.workCompleted || !formData.customerSignature || !formData.technicianSignature) {
      setError('Please fill all required fields including signatures');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reportData = {
        ticketId,
        ...formData
      };

      if (report) {
        // Update existing report
        const response = await apiClient.digitalServiceReports.update(report._id, reportData);
        if (response.success) {
          setReport(response.data.report);
          setIsEditing(false);
          onReportUpdated?.(response.data.report);
        }
      } else {
        // Create new report
        const response = await apiClient.digitalServiceReports.create(reportData);
        if (response.success) {
          setReport(response.data.report);
          onReportCreated?.(response.data.report);
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!report) return;

    setLoading(true);
    try {
      const response = await apiClient.digitalServiceReports.approve(report._id);
      if (response.success) {
        setReport(response.data.report);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to approve report');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!report) return;

    const reason = prompt('Please provide rejection reason:');
    if (!reason) return;

    setLoading(true);
    try {
      const response = await apiClient.digitalServiceReports.reject(report._id, reason);
      if (response.success) {
        setReport(response.data.report);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to reject report');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!report) return;

    setLoading(true);
    try {
      const response = await apiClient.digitalServiceReports.complete(report._id);
      if (response.success) {
        setReport(response.data.report);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to complete report');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!report || !confirm('Are you sure you want to delete this report?')) return;

    setLoading(true);
    try {
      await apiClient.digitalServiceReports.delete(report._id);
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to delete report');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'average': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!ticket) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Digital Service Report</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading ticket details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Digital Service Report</h2>
            <p className="text-sm text-gray-600">
              {report ? `Report #${report.reportNumber}` : 'Create new report'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {report && !isEditing ? (
          // Display existing report
          <div className="space-y-6">
            {/* Report Header */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Report Number</p>
                  <p className="text-lg font-semibold">{report.reportNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Service Date</p>
                  <p className="text-sm">{new Date(report.serviceDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Quality</p>
                  <span className={`text-sm font-medium ${getQualityColor(report.serviceQuality)}`}>
                    {report.serviceQuality}
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket Information */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Ticket Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ticket Number</p>
                  <p className="text-sm">{report.ticketId.ticketNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Description</p>
                  <p className="text-sm">{report.ticketId.description}</p>
                </div>
              </div>
            </div>

            {/* Customer & Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <User size={20} className="mr-2" />
                  Customer Information
                </h3>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium">Name:</span> {report.customer.name}</p>
                  <p className="text-sm"><span className="font-medium">Email:</span> {report.customer.email}</p>
                  <p className="text-sm"><span className="font-medium">Phone:</span> {report.customer.phone}</p>
                </div>
              </div>

              {report.product && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <Package size={20} className="mr-2" />
                    Product Information
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm"><span className="font-medium">Name:</span> {report.product.name}</p>
                    <p className="text-sm"><span className="font-medium">Category:</span> {report.product.category}</p>
                    <p className="text-sm"><span className="font-medium">Brand:</span> {report.product.brand}</p>
                    <p className="text-sm"><span className="font-medium">Model:</span> {report.product.modelNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Work Completed */}
            <div className="bg-yellow-50 p-4 rounded-lg">
                              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Wrench size={20} className="mr-2" />
                  Work Completed
                </h3>
              <p className="text-sm whitespace-pre-wrap">{report.workCompleted}</p>
            </div>

            {/* Parts Used */}
            {report.partsUsed.length > 0 && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Parts Used</h3>
                <div className="space-y-3">
                  {report.partsUsed.map((part, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{part.product.name}</p>
                          <p className="text-sm text-gray-600">
                            Quantity: {part.quantity} | Cost: ₹{part.cost}
                          </p>
                          {part.serialNumbers && part.serialNumbers.length > 0 && (
                            <p className="text-sm text-gray-600">
                              Serial Numbers: {part.serialNumbers.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations && (
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Recommendations</h3>
                <p className="text-sm whitespace-pre-wrap">{report.recommendations}</p>
              </div>
            )}

            {/* Customer Feedback */}
            {report.customerFeedback && (
              <div className="bg-pink-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Feedback</h3>
                <p className="text-sm">{report.customerFeedback}</p>
                <div className="mt-2 flex items-center">
                  <span className="text-sm font-medium mr-2">Satisfaction:</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={star <= report.customerSatisfaction ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Next Visit */}
            {report.nextVisitRequired && (
              <div className="bg-teal-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Calendar size={20} className="mr-2" />
                  Next Visit Required
                </h3>
                <p className="text-sm">
                  Date: {report.nextVisitDate ? new Date(report.nextVisitDate).toLocaleDateString() : 'Not specified'}
                </p>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Signature</h3>
                {report.customerSignature && (
                  <div className="bg-white p-2 rounded border">
                    <img src={report.customerSignature} alt="Customer Signature" className="max-w-full h-32 object-contain" />
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Technician Signature</h3>
                {report.technicianSignature && (
                  <div className="bg-white p-2 rounded border">
                    <img src={report.technicianSignature} alt="Technician Signature" className="max-w-full h-32 object-contain" />
                  </div>
                )}
              </div>
            </div>

            {/* Photos & Attachments */}
            {(report.photos.length > 0 || report.attachments.length > 0) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Photos & Attachments</h3>
                {report.photos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Photos</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {report.photos.map((photo, index) => (
                        <div key={index} className="bg-white p-2 rounded border">
                          <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-20 object-cover rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {report.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments</h4>
                    <div className="space-y-1">
                      {report.attachments.map((attachment, index) => (
                        <div key={index} className="bg-white p-2 rounded border text-sm">
                          <FileText size={16} className="inline mr-2" />
                          {attachment}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-end">
              {report.status === 'draft' && (
                <>
                  <button
                    onClick={handleEditReport}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                  >
                    <Edit size={16} className="mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Complete
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </button>
                </>
              )}

              {report.status === 'completed' && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                  >
                    <ThumbsUp size={16} className="mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
                  >
                    <ThumbsDown size={16} className="mr-2" />
                    Reject
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          // Form for creating/editing report
          <div className="space-y-6">
            {/* Ticket Information Display */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Ticket Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ticket Number</p>
                  <p className="text-sm">{ticket.ticketNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Description</p>
                  <p className="text-sm">{ticket.description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Customer</p>
                  <p className="text-sm">{ticket.customer?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Product</p>
                  <p className="text-sm">{ticket.product?.name}</p>
                </div>
              </div>
            </div>

            {/* Work Completed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Completed *
              </label>
              <textarea
                value={formData.workCompleted}
                onChange={(e) => handleInputChange('workCompleted', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Describe the work completed..."
                required
              />
            </div>

            {/* Parts Used */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Parts Used
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddPart(!showAddPart)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showAddPart ? 'Cancel' : 'Add Part'}
                </button>
              </div>

              {showAddPart && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                      <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Product</option>
                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name} - {product.category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={partQuantity}
                        onChange={(e) => setPartQuantity(Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                      <input
                        type="number"
                        value={partCost}
                        onChange={(e) => setPartCost(Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Serial Numbers (comma separated)</label>
                      <input
                        type="text"
                        value={serialNumbers}
                        onChange={(e) => setSerialNumbers(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="SN001, SN002"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddPart}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Part
                  </button>
                </div>
              )}

              {formData.partsUsed.length > 0 && (
                <div className="space-y-2">
                  {formData.partsUsed.map((part, index) => {
                    const product = products.find(p => p._id === part.product);
                    return (
                      <div key={index} className="bg-white p-3 rounded border flex justify-between items-center">
                        <div>
                          <p className="font-medium">{product?.name || 'Unknown Product'}</p>
                          <p className="text-sm text-gray-600">
                            Quantity: {part.quantity} | Cost: ₹{part.cost}
                          </p>
                          {part.serialNumbers.length > 0 && (
                            <p className="text-sm text-gray-600">
                              Serial Numbers: {part.serialNumbers.join(', ')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemovePart(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recommendations
              </label>
              <textarea
                value={formData.recommendations}
                onChange={(e) => handleInputChange('recommendations', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Any recommendations for future maintenance..."
              />
            </div>

            {/* Customer Feedback */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Feedback
              </label>
              <textarea
                value={formData.customerFeedback}
                onChange={(e) => handleInputChange('customerFeedback', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Customer feedback about the service..."
              />
            </div>

            {/* Service Quality & Customer Satisfaction */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Quality
                </label>
                <select
                  value={formData.serviceQuality}
                  onChange={(e) => handleInputChange('serviceQuality', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Satisfaction (1-5)
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleInputChange('customerSatisfaction', star)}
                      className="focus:outline-none"
                    >
                      <Star
                        size={24}
                        className={star <= formData.customerSatisfaction ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Next Visit */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.nextVisitRequired}
                  onChange={(e) => handleInputChange('nextVisitRequired', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Next Visit Required</span>
              </label>

              {formData.nextVisitRequired && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Visit Date
                  </label>
                  <input
                    type="date"
                    value={formData.nextVisitDate}
                    onChange={(e) => handleInputChange('nextVisitDate', e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>

            {/* File Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos
                </label>
                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'photos')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 flex items-center justify-center"
                >
                  <Camera size={20} className="mr-2" />
                  Upload Photos
                </button>
                {formData.photos.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Uploaded photos:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {formData.photos.map((photoUrl, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photoUrl}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                photos: prev.photos.filter((_, i) => i !== index)
                              }));
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'attachments')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 flex items-center justify-center"
                >
                  <Upload size={20} className="mr-2" />
                  Upload Files
                </button>
                {formData.attachments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Uploaded attachments:</p>
                    <ul className="space-y-1">
                      {formData.attachments.map((attachmentUrl, index) => (
                        <li key={index} className="flex items-center justify-between text-sm">
                          <a
                            href={attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Attachment {index + 1}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                attachments: prev.attachments.filter((_, i) => i !== index)
                              }));
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Signature *
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={customerSignatureRef}
                    onChange={(e) => handleSignatureUpload(e, 'customerSignature')}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => customerSignatureRef.current?.click()}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-center"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Customer Signature
                  </button>
                  {formData.customerSignature && (
                    <div className="bg-white p-2 rounded border">
                      <img src={formData.customerSignature} alt="Customer Signature" className="max-w-full h-24 object-contain" />
                      <button
                        type="button"
                        onClick={() => handleInputChange('customerSignature', '')}
                        className="mt-2 text-red-500 hover:text-red-700 text-sm flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technician Signature *
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={technicianSignatureRef}
                    onChange={(e) => handleSignatureUpload(e, 'technicianSignature')}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => technicianSignatureRef.current?.click()}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-center"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Technician Signature
                  </button>
                  {formData.technicianSignature && (
                    <div className="bg-white p-2 rounded border">
                      <img src={formData.technicianSignature} alt="Technician Signature" className="max-w-full h-24 object-contain" />
                      <button
                        type="button"
                        onClick={() => handleInputChange('technicianSignature', '')}
                        className="mt-2 text-red-500 hover:text-red-700 text-sm flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              {report && (
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <FileText size={16} className="mr-2" />
                )}
                {report ? 'Update Report' : 'Create Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalServiceReport; 