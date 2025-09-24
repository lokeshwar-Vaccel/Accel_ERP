import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wrench, Package, Settings, ArrowLeft } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '../components/ui/Botton';
import QuotationForm from '../pages/QuotationForm';
import AMCQuotationForm from '../components/quotations/AMCQuotationForm';

type QuotationType = 'service' | 'spare' | 'amc';

interface QuotationOption {
  value: QuotationType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const quotationOptions: QuotationOption[] = [
  {
    value: 'service',
    label: 'Service Quotation',
    icon: <Wrench className="w-5 h-5" />,
    description: 'Create quotations for service requests and maintenance work'
  },
  {
    value: 'spare',
    label: 'Spare Quotation',
    icon: <Package className="w-5 h-5" />,
    description: 'Create quotations for spare parts and components'
  },
  {
    value: 'amc',
    label: 'AMC Quotation',
    icon: <Settings className="w-5 h-5" />,
    description: 'Create quotations for Annual Maintenance Contracts'
  }
];

const QuotationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const quotationType = location.state?.quotationType as QuotationType;
  const [selectedType, setSelectedType] = useState<QuotationType>(quotationType || 'service');

  const renderQuotationForm = () => {
    switch (selectedType) {
      case 'service':
        return <QuotationForm showHeader={false} selectedType={selectedType} />;
      case 'spare':
        return <QuotationForm showHeader={false} selectedType={selectedType} />;
      case 'amc':
        return <AMCQuotationForm />;
      default:
        return <QuotationForm showHeader={false} />;
    }
  };

  const getDynamicTitle = () => {
    switch (selectedType) {
      case 'service':
        return 'Create Service Quotation';
      case 'spare':
        return 'Create Spare Quotation';
      case 'amc':
        return 'Create AMC Quotation';
      default:
        return 'Create Service Quotation';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={getDynamicTitle()}
        subtitle="Create and manage different types of quotations"
      >
        <div className="flex items-center space-x-4">
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {quotationOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedType === option.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedType(option.value)}
              >
                <div className={`${selectedType === option.value ? 'text-blue-600' : 'text-gray-500'}`}>
                  {option.icon}
                </div>
                <span>{option.label}</span>
              </button>
            ))}
          </div>

          {/* Back Button */}
          <Button
            variant="outline"
            onClick={() => navigate('/billing')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
        </div>
      </PageHeader>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Dynamic Quotation Form */}
        {renderQuotationForm()}
      </div>
    </div>
  );
};

export default QuotationPage;
