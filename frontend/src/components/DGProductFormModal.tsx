import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { DGProduct } from '../types';

interface DGProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<DGProduct>) => void;
  product?: DGProduct | null;
  isEditing?: boolean;
  submitting?: boolean;
}

const DGProductFormModal: React.FC<DGProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  product,
  isEditing = false,
  submitting = false
}) => {
  const [formData, setFormData] = useState({
    description: '',
    isActive: true,
    kva: '',
    phase: 'single' as 'single' | 'three',
    annexureRating: '',
    dgModel: '',
    numberOfCylinders: 1,
    subject: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product && isEditing) {
      setFormData({
        description: product.description || '',
        isActive: product.isActive,
        kva: product.kva,
        phase: product.phase,
        annexureRating: product.annexureRating,
        dgModel: product.dgModel,
        numberOfCylinders: product.numberOfCylinders,
        subject: product.subject
      });
    } else {
      setFormData({
        description: '',
        isActive: true,
        kva: '',
        phase: 'single',
        annexureRating: '',
        dgModel: '',
        numberOfCylinders: 1,
        subject: ''
      });
    }
    setErrors({});
  }, [product, isEditing]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.kva.trim()) {
      newErrors.kva = 'KVA rating is required';
    }

    if (!formData.annexureRating.trim()) {
      newErrors.annexureRating = 'Annexure rating is required';
    }

    if (!formData.dgModel.trim()) {
      newErrors.dgModel = 'DG model is required';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (formData.numberOfCylinders < 1) {
      newErrors.numberOfCylinders = 'Number of cylinders must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit DG Product' : 'Add New DG Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Enter product description..."
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          {/* KVA and Phase Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                KVA Rating <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.kva}
                onChange={(e) => handleInputChange('kva', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.kva ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., 25, 50, 100"
              />
              {errors.kva && <p className="mt-1 text-sm text-red-600">{errors.kva}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phase <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.phase}
                onChange={(e) => handleInputChange('phase', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="single">Single Phase</option>
                <option value="three">Three Phase</option>
              </select>
            </div>
          </div>

          {/* Annexure Rating and DG Model Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annexure Rating <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.annexureRating}
                onChange={(e) => handleInputChange('annexureRating', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.annexureRating ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., CPCB IV+"
              />
              {errors.annexureRating && <p className="mt-1 text-sm text-red-600">{errors.annexureRating}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DG Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.dgModel}
                onChange={(e) => handleInputChange('dgModel', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.dgModel ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., MDI-25KVA"
              />
              {errors.dgModel && <p className="mt-1 text-sm text-red-600">{errors.dgModel}</p>}
            </div>
          </div>

          {/* Number of Cylinders and Subject Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Cylinders <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.numberOfCylinders}
                onChange={(e) => handleInputChange('numberOfCylinders', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.numberOfCylinders ? 'border-red-500' : 'border-gray-300'
                }`}
                min="1"
                placeholder="e.g., 2, 4, 6"
              />
              {errors.numberOfCylinders && <p className="mt-1 text-sm text-red-600">{errors.numberOfCylinders}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.subject ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter subject..."
              />
              {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? 'Update Product' : 'Create Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DGProductFormModal; 