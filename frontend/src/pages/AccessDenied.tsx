import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Botton';

const AccessDenied: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <ShieldX className="mx-auto h-24 w-24 text-red-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this page.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Contact your administrator if you believe this is an error.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Button
            onClick={handleGoDashboard}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Go to Dashboard
          </Button>
          
          <Button
            onClick={handleGoBack}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        <div className="mt-8">
          <p className="text-xs text-gray-400">
            Error Code: 403 - Forbidden Access
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
