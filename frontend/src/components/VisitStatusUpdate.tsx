import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  FileText,
  Camera,
  Package
} from 'lucide-react';
import { apiClient } from '../utils/api';
import toast from 'react-hot-toast';

interface VisitStatusUpdateProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any;
  visitIndex: number; // Add visit index
  amcId: string;
  onSuccess?: () => void;
  mode?: 'edit' | 'view'; // Add mode prop for edit/view
}

interface Issue {
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  resolved?: boolean;
  followUpRequired?: boolean;
}

interface Image {
  url: string;
  description?: string;
  type?: 'before' | 'during' | 'after' | 'issue';
}

const VisitStatusUpdate: React.FC<VisitStatusUpdateProps> = ({ 
  isOpen, 
  onClose, 
  visit, 
  visitIndex,
  amcId, 
  onSuccess,
  mode = 'edit' // Default to edit mode
}) => {
  const [formData, setFormData] = useState({
    completedDate: '',
    serviceReport: '',
    issues: [] as Issue[],
    customerSignature: '',
    nextVisitRecommendations: '',
    images: [] as Image[]
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && visit) {
      if (mode === 'view' && visit.status === 'completed') {
        // For view mode, populate with existing data
        setFormData({
          completedDate: visit.completedDate ? new Date(visit.completedDate).toISOString().split('T')[0] : '',
          serviceReport: visit.serviceReport || '',
          issues: visit.issues || [],
          customerSignature: visit.customerSignature || '',
          nextVisitRecommendations: visit.nextVisitRecommendations || '',
          images: visit.images || []
        });
      } else {
        // For edit mode, set completion date to scheduled date by default
        const scheduledDate = new Date(visit.scheduledDate).toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          completedDate: scheduledDate
        }));
      }
    }
  }, [isOpen, visit, mode]);

  const updateIssue = (index: number, field: keyof Issue, value: any) => {
    setFormData(prev => ({
      ...prev,
      issues: prev.issues.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addIssue = () => {
    setFormData(prev => ({
      ...prev,
      issues: [...prev.issues, { description: '', severity: 'medium', resolved: false, followUpRequired: false }]
    }));
  };

  const removeIssue = (index: number) => {
    setFormData(prev => ({
      ...prev,
      issues: prev.issues.filter((_, i) => i !== index)
    }));
  };

  const handleClose = () => {
    // Reset form data when closing
    setFormData({
      completedDate: '',
      serviceReport: '',
      issues: [],
      customerSignature: '',
      nextVisitRecommendations: '',
      images: []
    });
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.serviceReport.trim()) {
        setError('Service report is required');
        setSubmitting(false);
        return;
      }



      // Prepare the data to send, excluding empty fields
      const visitData: any = {
        completedDate: new Date(formData.completedDate).toISOString(),
        serviceReport: formData.serviceReport,
        issues: formData.issues,
        nextVisitRecommendations: formData.nextVisitRecommendations
      };

      // Only include customerSignature if it's not empty
      if (formData.customerSignature && formData.customerSignature.trim() !== '') {
        visitData.customerSignature = formData.customerSignature;
      }

      console.log('Completing visit with data:', { visitId: visit._id, visitData });
      
      // Add visit index to the data for backend identification
      visitData.visitIndex = visitIndex;
      
      // Check if visit has an ID, if not use the visit index
      let visitIdentifier = visit._id;
      if (!visitIdentifier) {
        // If no _id, we'll need to find the visit by its position in the array
        // This is a fallback for visits created before we added _id support
        console.log('Visit has no _id, will use index-based identification');
        visitIdentifier = visitIndex.toString(); // Use index as identifier
      }
      
      // Submit the visit completion
      await apiClient.amc.completeVisit(amcId, visitData);

      toast.success('Visit completed successfully!');
      
      if (onSuccess) {
        onSuccess();
      }

      handleClose();
    } catch (error: any) {
      console.error('Error completing visit:', error);
      setError(error.message || 'Failed to complete visit');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'view' ? 'Visit Details' : 'Complete Visit'}
            </h2>
            <p className="text-gray-600">
              {mode === 'view' ? 'View completed visit details' : `Complete visit scheduled for ${formatDate(visit.scheduledDate)}`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">


            {/* Visit Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Visit Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date
                  </label>
                  <p className="text-sm text-gray-900">{formatDate(visit.scheduledDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Completion Date
                  </label>
                  {mode === 'view' ? (
                    <p className="text-sm text-gray-900">{formData.completedDate ? formatDate(formData.completedDate) : 'Not set'}</p>
                  ) : (
                    <input
                      type="date"
                      value={formData.completedDate}
                      onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visit Type
                  </label>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    visit.visitType === 'emergency' ? 'bg-red-100 text-red-800' :
                    visit.visitType === 'followup' ? 'bg-blue-100 text-blue-800' :
                    visit.visitType === 'inspection' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {visit.visitType || 'Routine'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <p className="text-sm text-gray-900">
                    {visit.duration ? `${visit.duration} hours` : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Service Report */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Report {mode === 'edit' ? '*' : ''}
              </label>
              {mode === 'view' ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {formData.serviceReport || 'No service report available'}
                  </p>
                </div>
              ) : (
                <textarea
                  required
                  value={formData.serviceReport}
                  onChange={(e) => setFormData({ ...formData, serviceReport: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the work performed, findings, and any recommendations..."
                />
              )}
            </div>



            {/* Issues Found */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Issues Found
                </h3>
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={addIssue}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Issue</span>
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {formData.issues.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-300" />
                    <p className="text-green-600 font-medium">No issues found during this visit</p>
                    <p className="text-xs text-gray-500 mt-1">All systems are functioning properly</p>
                  </div>
                ) : (
                  formData.issues.map((issue, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Issue {index + 1}</span>
                        {mode === 'edit' && (
                          <button
                            type="button"
                            onClick={() => removeIssue(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                          {mode === 'view' ? (
                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border">
                              {issue.description}
                            </p>
                          ) : (
                            <textarea
                              value={issue.description}
                              onChange={(e) => updateIssue(index, 'description', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="Describe the issue found..."
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                          {mode === 'view' ? (
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              issue.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {issue.severity}
                            </span>
                          ) : (
                            <select
                              value={issue.severity}
                              onChange={(e) => updateIssue(index, 'severity', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-3">
                        <label className="flex items-center">
                          {mode === 'view' ? (
                            <span className={`text-xs font-medium ${issue.resolved ? 'text-green-600' : 'text-gray-500'}`}>
                              {issue.resolved ? '✓ Resolved' : '✗ Not Resolved'}
                            </span>
                          ) : (
                            <>
                              <input
                                type="checkbox"
                                checked={issue.resolved}
                                onChange={(e) => updateIssue(index, 'resolved', e.target.checked)}
                                className="mr-2"
                              />
                              <span className="text-xs text-gray-700">Resolved</span>
                            </>
                          )}
                        </label>
                        <label className="flex items-center">
                          {mode === 'view' ? (
                            <span className={`text-xs font-medium ${issue.followUpRequired ? 'text-blue-600' : 'text-gray-500'}`}>
                              {issue.followUpRequired ? '⚠ Follow-up Required' : 'No Follow-up'}
                            </span>
                          ) : (
                            <>
                              <input
                                type="checkbox"
                                checked={issue.followUpRequired}
                                onChange={(e) => updateIssue(index, 'followUpRequired', e.target.checked)}
                                className="mr-2"
                              />
                              <span className="text-xs text-gray-700">Follow-up Required</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>



            {/* Customer Signature */}
            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Signature (Optional)
                </label>
                <textarea
                  value={formData.customerSignature}
                  onChange={(e) => setFormData({ ...formData, customerSignature: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Customer signature or approval note..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add customer signature details or approval notes for this visit
                </p>
              </div>
            )}

            {/* Customer Signature Display for View Mode */}
            {mode === 'view' && formData.customerSignature && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Signature
                </label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700">
                    {formData.customerSignature}
                  </p>
                </div>
              </div>
            )}

            {/* Checklist Items (View Mode Only) */}
            {mode === 'view' && visit.checklistItems && visit.checklistItems.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Checklist Items
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="space-y-2">
                    {visit.checklistItems.map((item: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className={`w-4 h-4 rounded-full ${
                          item.completed ? 'bg-green-500' : 'bg-gray-300'
                        }`}></span>
                        <span className={`text-sm ${item.completed ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                          {item.item}
                        </span>
                        {item.notes && (
                          <span className="text-xs text-gray-500 ml-2">({item.notes})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Parts Used (View Mode Only) */}
            {mode === 'view' && visit.partsUsed && visit.partsUsed.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Parts Used
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="space-y-2">
                    {visit.partsUsed.map((part: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="text-sm font-medium text-gray-700">{part.product}</span>
                          <span className="text-xs text-gray-500 ml-2">Qty: {part.quantity}</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          ₹{part.cost?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Customer Feedback (View Mode Only) */}
            {mode === 'view' && visit.customerFeedback && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Customer Feedback
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {visit.customerFeedback.rating}/5
                      </div>
                      <div className="text-xs text-gray-600">Rating</div>
                    </div>
                    {visit.customerFeedback.comments && (
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700 mb-1">Comments</div>
                        <p className="text-sm text-gray-600">{visit.customerFeedback.comments}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Service Ticket Information (View Mode Only) */}
            {mode === 'view' && visit.serviceTicket && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Service Ticket
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Ticket Number</div>
                      <div className="text-sm text-gray-900 font-mono">{visit.serviceTicket}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Status</div>
                      <div className="text-sm text-gray-900">Linked to this visit</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visit Notes (View Mode Only) */}
            {mode === 'view' && visit.notes && visit.notes.trim() !== '' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Visit Notes
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {visit.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Next Visit Recommendations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Visit Recommendations
              </label>
              {mode === 'view' ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {formData.nextVisitRecommendations || 'No recommendations provided'}
                  </p>
                </div>
              ) : (
                <textarea
                  value={formData.nextVisitRecommendations}
                  onChange={(e) => setFormData({ ...formData, nextVisitRecommendations: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Recommendations for the next visit..."
                />
              )}
            </div>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {mode === 'view' ? 'Close' : 'Cancel'}
          </button>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Completing Visit...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete Visit</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitStatusUpdate; 