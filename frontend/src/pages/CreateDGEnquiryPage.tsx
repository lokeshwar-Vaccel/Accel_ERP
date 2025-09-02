import React, { useState } from 'react';
import ComprehensiveDGEnquiryForm from '../components/ui/ComprehensiveDGEnquiryForm';
import { Button } from '../components/ui/Botton';
import { Plus } from 'lucide-react';

export default function CreateDGEnquiryPage() {
  const [showForm, setShowForm] = useState(false);

  const handleSuccess = () => {
    console.log('DG Enquiry and Customer created successfully!');
    // You can add navigation or other success actions here
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create New DG Enquiry & Customer
          </h1>
          <p className="text-gray-600">
            Use this form to create a new DG Enquiry and automatically create a customer record.
            The form includes all necessary fields for both customer information and DG requirements.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Start Creating DG Enquiry
              </h2>
              <p className="text-gray-600 mb-6">
                Click the button below to open the comprehensive DG Enquiry form.
                This form will create both an enquiry and a customer record.
              </p>
            </div>

            <Button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New DG Enquiry & Customer
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What this form includes:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Basic enquiry information</li>
                <li>• Complete customer details</li>
                <li>• Multiple address management</li>
                <li>• DG requirements specification</li>
                <li>• Detailed DG specifications</li>
                <li>• Employee assignment information</li>
                <li>• Additional notes and remarks</li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Benefits:</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Automatic customer creation</li>
                <li>• Comprehensive data collection</li>
                <li>• Streamlined workflow</li>
                <li>• Better data organization</li>
                <li>• Enhanced customer management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive DG Enquiry Form Modal */}
      {showForm && (
        <ComprehensiveDGEnquiryForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleSuccess}
          mode="create"
        />
      )}
    </div>
  );
} 