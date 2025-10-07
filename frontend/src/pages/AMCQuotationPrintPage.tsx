import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../utils/api';
import AMCQuotationPrintView from '../components/quotations/AMCQuotationPrintView';
import toast from 'react-hot-toast';

const AMCQuotationPrintPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchQuotation();
    }
  }, [id]);

  const fetchQuotation = async () => {
    try {
      setLoading(true);
      const response = await apiClient.amcQuotations.getById(id!);
      if (response.success && response.data) {
        setQuotation(response.data);
      } else {
        toast.error('AMC quotation not found');
        navigate('/amc-quotations');
      }
    } catch (error) {
      console.error('Error fetching AMC quotation:', error);
      toast.error('Failed to load AMC quotation');
      navigate('/amc-quotations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">AMC Quotation Not Found</h2>
          <p className="text-gray-600 mb-6">The requested AMC quotation could not be found.</p>
          <button
            onClick={() => navigate('/amc-quotations')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to AMC Quotations
          </button>
        </div>
      </div>
    );
  }

  // Render the print view with quotation data
  return <AMCQuotationPrintView quotation={quotation} />;
};

export default AMCQuotationPrintPage;
