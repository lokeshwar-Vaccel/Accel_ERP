import React from 'react';
import { CheckCircle, Home, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const PaymentSuccess: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your payment has been processed successfully. You will receive a confirmation email with the payment receipt shortly.
        </p>
        
        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Link>
          
          <div className="text-sm text-gray-500">
            Thank you for your business!
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess; 