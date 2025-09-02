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
  Camera
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
  onSuccess 
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
      // Set completion date to scheduled date by default
      const scheduledDate = new Date(visit.scheduledDate).toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        completedDate: scheduledDate
      }));
    }
  }, [isOpen, visit]);

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

      onClose();
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
            <h2 className="text-xl font-semibold text-gray-900">Complete Visit</h2>
            <p className="text-gray-600">
              Complete visit scheduled for {formatDate(visit.scheduledDate)}
            </p>
          </div>
          <button
            onClick={onClose}
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
                Visit Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <input
                    type="date"
                    value={formData.completedDate}
                    onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>
            </div>

            {/* Service Report */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Report *
              </label>
              <textarea
                required
                value={formData.serviceReport}
                onChange={(e) => setFormData({ ...formData, serviceReport: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the work performed, findings, and any recommendations..."
              />
            </div>



            {/* Issues Found */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Issues Found
                </h3>
                <button
                  type="button"
                  onClick={addIssue}
                  className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Issue</span>
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.issues.map((issue, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Issue {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeIssue(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={issue.description}
                          onChange={(e) => updateIssue(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Describe the issue found..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
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
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={issue.resolved}
                          onChange={(e) => updateIssue(index, 'resolved', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-xs text-gray-700">Resolved</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={issue.followUpRequired}
                          onChange={(e) => updateIssue(index, 'followUpRequired', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-xs text-gray-700">Follow-up Required</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>



            {/* Next Visit Recommendations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Visit Recommendations
              </label>
              <textarea
                value={formData.nextVisitRecommendations}
                onChange={(e) => setFormData({ ...formData, nextVisitRecommendations: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Recommendations for the next visit..."
              />
            </div>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
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
        </div>
      </div>
    </div>
  );
};

export default VisitStatusUpdate; 