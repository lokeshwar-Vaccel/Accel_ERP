import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, CheckCircle, X, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/api';
import toast from 'react-hot-toast';

interface FeedbackData {
  _id: string;
  ticketId: {
    _id: string;
    ticketNumber: string;
    description: string;
    customer: {
      name: string;
      email: string;
    };
    product?: {
      name: string;
      category: string;
    };
    assignedTo?: {
      firstName: string;
      lastName: string;
    };
  };
  customerEmail: string;
  customerName: string;
  rating: number;
  comments?: string;
  serviceQuality: 'excellent' | 'good' | 'average' | 'poor';
  technicianRating: number;
  timelinessRating: number;
  qualityRating: number;
  wouldRecommend: boolean;
  improvementSuggestions?: string;
  isSubmitted: boolean;
  expiresAt: string;
}

const CustomerFeedback: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    rating: 0,
    comments: '',
    serviceQuality: 'good' as 'excellent' | 'good' | 'average' | 'poor',
    technicianRating: 0,
    timelinessRating: 0,
    qualityRating: 0,
    wouldRecommend: false,
    improvementSuggestions: ''
  });

  useEffect(() => {
    if (token) {
      loadFeedbackData();
    }
  }, [token]);

  const loadFeedbackData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.feedback.getByToken(token!);
      
      if (response.success) {
        setFeedback(response.data.feedback);
      } else {
        setError('Failed to load feedback form');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load feedback form');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.rating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    if (formData.technicianRating === 0) {
      toast.error('Please rate the technician');
      return;
    }

    if (formData.timelinessRating === 0) {
      toast.error('Please rate the timeliness');
      return;
    }

    if (formData.qualityRating === 0) {
      toast.error('Please rate the service quality');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.feedback.submit(token!, formData);
      
      if (response.success) {
        toast.success('Thank you for your feedback!');
        // Show success message and redirect after a delay
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        toast.error('Failed to submit feedback');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, onRatingChange: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="focus:outline-none"
          >
            <Star
              size={24}
              className={star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading feedback form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Feedback Not Found</h2>
          <p className="text-gray-600 mb-4">The feedback form could not be found or has expired.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-center text-white">
            <h1 className="text-3xl font-bold mb-2">Service Feedback</h1>
            <p className="text-blue-100">We value your opinion! Please share your experience with us.</p>
          </div>

          <div className="p-6">
            {/* Ticket Information */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Service Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Ticket Number:</strong> {feedback.ticketId.ticketNumber}</p>
                  <p><strong>Customer:</strong> {feedback.customerName}</p>
                  <p><strong>Description:</strong> {feedback.ticketId.description}</p>
                </div>
                <div>
                  {feedback.ticketId.product && (
                    <p><strong>Product:</strong> {feedback.ticketId.product.name}</p>
                  )}
                  {feedback.ticketId.assignedTo && (
                    <p><strong>Technician:</strong> {feedback.ticketId.assignedTo.firstName} {feedback.ticketId.assignedTo.lastName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Feedback Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Overall Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Rating *
                </label>
                {renderStars(formData.rating, (rating) => handleRatingChange('rating', rating))}
                <p className="text-sm text-gray-500 mt-1">
                  {formData.rating === 0 && 'Please select a rating'}
                  {formData.rating === 1 && 'Poor'}
                  {formData.rating === 2 && 'Fair'}
                  {formData.rating === 3 && 'Good'}
                  {formData.rating === 4 && 'Very Good'}
                  {formData.rating === 5 && 'Excellent'}
                </p>
              </div>

              {/* Service Quality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Quality *
                </label>
                <select
                  value={formData.serviceQuality}
                  onChange={(e) => handleInputChange('serviceQuality', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              {/* Technician Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technician Rating *
                </label>
                {renderStars(formData.technicianRating, (rating) => handleRatingChange('technicianRating', rating))}
              </div>

              {/* Timeliness Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeliness Rating *
                </label>
                {renderStars(formData.timelinessRating, (rating) => handleRatingChange('timelinessRating', rating))}
              </div>

              {/* Quality Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Quality Rating *
                </label>
                {renderStars(formData.qualityRating, (rating) => handleRatingChange('qualityRating', rating))}
              </div>

              {/* Would Recommend */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.wouldRecommend}
                    onChange={(e) => handleInputChange('wouldRecommend', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    I would recommend this service to others
                  </span>
                </label>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments
                </label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => handleInputChange('comments', e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please share your experience, suggestions, or any additional comments..."
                />
              </div>

              {/* Improvement Suggestions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suggestions for Improvement
                </label>
                <textarea
                  value={formData.improvementSuggestions}
                  onChange={(e) => handleInputChange('improvementSuggestions', e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="How can we improve our services?"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerFeedback; 