import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Mail, 
  Phone, 
  MessageSquare,
  Save,
  Monitor,
  Database,
  Lock,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Form } from '../components/ui/Form';
import PageHeader from '../components/ui/PageHeader';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { Navigate } from 'react-router-dom';
import { 
  fetchSettings, 
  updateMultipleSettings, 
  clearError, 
  clearSuccess,
  setFormData,
  SystemSetting,
  fetchCompanyData,
  createCompanyData,
  updateCompanyData,
  setCompanyFormData,
  CompanyData
} from '../redux/settings/settingsSlice';

// Define interfaces locally to avoid conflicts
interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FormErrors {
  [key: string]: string;
}

const AdminSettings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const settingsState = useSelector((state: RootState) => state.settings);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  console.log('Settings State:', settingsState); // Debug log
  console.log('Auth State:', { isAuthenticated, user }); // Debug auth state
  const { settings = [], companyData, loading = false, saving = false, error = null, success = null } = settingsState || {};
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [companyFormData, setCompanyFormData] = useState<Partial<CompanyData>>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Validation functions
  const validateIFSC = (ifsc: string): string => {
    if (!ifsc) return 'IFSC code is required';
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc.toUpperCase())) {
      return 'Invalid IFSC code format (e.g., SBIN0001234)';
    }
    return '';
  };

  const validateAccountNumber = (accNo: string): string => {
    if (!accNo) return 'Account number is required';
    const accNoRegex = /^\d{9,18}$/;
    if (!accNoRegex.test(accNo)) {
      return 'Account number must be 9-18 digits';
    }
    return '';
  };

  const validatePAN = (pan: string): string => {
    if (!pan) return 'PAN number is required';
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan.toUpperCase())) {
      return 'Invalid PAN format (e.g., ABCDE1234F)';
    }
    return '';
  };

  const validatePhone = (phone: string): string => {
    if (!phone) return 'Phone number is required';
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return 'Invalid phone number (10 digits starting with 6-9)';
    }
    return '';
  };

  const validateEmail = (email: string): string => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }
    return '';
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'ifscCode':
        return validateIFSC(value);
      case 'accNo':
        return validateAccountNumber(value);
      case 'companyPan':
        return validatePAN(value);
      case 'contactPhone':
        return validatePhone(value);
      case 'contactEmail':
        return validateEmail(value);
      case 'companyName':
        if (!value.trim()) return 'Company name is required';
        return '';
      case 'companyAddress':
        if (!value.trim()) return 'Company address is required';
        return '';
      case 'bankName':
        if (!value.trim()) return 'Bank name is required';
        return '';
      case 'branch':
        if (!value.trim()) return 'Bank branch is required';
        return '';
      default:
        return '';
    }
  };

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    console.log('Dispatching fetchSettings'); // Debug log
    console.log('Auth token:', localStorage.getItem('authToken')); // Debug auth token
    dispatch(fetchSettings());
    dispatch(fetchCompanyData());
  }, [dispatch]);

  // Update form data when settings change
  useEffect(() => {
    console.log('Settings changed:', settings); // Debug log
    if (settings && settings.length > 0) {
      const data: { [key: string]: any } = {};
      settings.forEach((setting: SystemSetting) => {
        data[setting.key] = setting.dataType === 'password' ? '' : setting.value;
      });
      setFormData(data);
    }
  }, [settings]);

  // Update company form data when company data changes
  useEffect(() => {
    console.log('Company data changed:', companyData); // Debug log
    if (companyData) {
      setCompanyFormData({
        companyName: companyData.companyName || '',
        companyAddress: companyData.companyAddress || '',
        contactPhone: companyData.contactPhone || '',
        contactEmail: companyData.contactEmail || '',
        companyPan: companyData.companyPan || '',
        companyBankDetails: {
          accNo: companyData.companyBankDetails?.accNo || '',
          bankName: companyData.companyBankDetails?.bankName || '',
          ifscCode: companyData.companyBankDetails?.ifscCode || '',
          branch: companyData.companyBankDetails?.branch || '',
        }
      });
      // Clear form errors when data is loaded
      setFormErrors({});
    }
  }, [companyData]);

  // Clear error/success messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => dispatch(clearSuccess()), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  const handleSave = async (category: string) => {
    if (category === 'general') {
      // Validate all required fields
      const flattenedValues = getFlattenedCompanyValues();
      const errors: FormErrors = {};
      
      // Validate each field
      Object.keys(flattenedValues).forEach(key => {
        const error = validateField(key, flattenedValues[key as keyof typeof flattenedValues]);
        if (error) {
          errors[key] = error;
        }
      });

      // Check if there are any validation errors
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      // Clear any existing errors
      setFormErrors({});

      // Handle company data save
      if (companyData?._id) {
        // Update existing company
        dispatch(updateCompanyData({ id: companyData._id, companyData: companyFormData }));
      } else {
        // Create new company
        dispatch(createCompanyData(companyFormData as Omit<CompanyData, '_id'>));
      }
    } else {
      // Handle other settings
      const categorySettings = settings?.filter((s: any) => s.category === category) || [];
      const settingsToUpdate = categorySettings.map((setting: any) => ({
        key: setting.key,
        value: formData[setting.key]
      }));
      
      dispatch(updateMultipleSettings(settingsToUpdate));
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: <Settings className="w-5 h-5" /> },
    { id: 'email', name: 'Email', icon: <Mail className="w-5 h-5" /> },
    { id: 'sms', name: 'SMS', icon: <Phone className="w-5 h-5" /> },
    { id: 'whatsapp', name: 'WhatsApp', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'security', name: 'Security', icon: <Lock className="w-5 h-5" /> },
    { id: 'system', name: 'System', icon: <Monitor className="w-5 h-5" /> }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Clear form errors when switching tabs
    setFormErrors({});
  };

  const getFieldsForCategory = (category: string): FormField[] => {
    if (!settings || !Array.isArray(settings)) {
      return [];
    }
    if (category !== 'general') {
    return settings
      .filter(setting => setting.category === category)
      .map(setting => ({
        name: setting.key,
        label: setting.displayName || setting.key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        type: setting.dataType === 'boolean' ? 'checkbox' : 
              setting.dataType === 'number' ? 'number' : 
            setting.dataType === 'password' ? 'password' :
            setting.dataType === 'textarea' ? 'textarea' :
            setting.dataType === 'email' ? 'email' :
            'text',
        required: false,
        placeholder: setting.description
      }));
    }
    // For general, return company fields matching backend model
    const generalFields: FormField[] = [
      { name: 'companyName', label: 'Company Name', type: 'text', required: true },
      { name: 'companyAddress', label: 'Company Address', type: 'textarea', required: true },
      { name: 'companyPan', label: 'Company PAN', type: 'text', required: true },
      { name: 'contactPhone', label: 'Contact Phone', type: 'text', required: true },
      { name: 'contactEmail', label: 'Contact Email', type: 'email', required: true },
      { name: 'accNo', label: 'Bank Account Number', type: 'text', required: true },
      { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
      { name: 'ifscCode', label: 'Bank IFSC Code', type: 'text', required: true },
      { name: 'branch', label: 'Bank Branch', type: 'text', required: true },
    ];
    return generalFields;
  };

  // Create flattened values for form (bank details need to be flattened)
  const getFlattenedCompanyValues = () => {
    return {
      companyName: companyFormData.companyName || '',
      companyAddress: companyFormData.companyAddress || '',
      companyPan: companyFormData.companyPan || '',
      contactPhone: companyFormData.contactPhone || '',
      contactEmail: companyFormData.contactEmail || '',
      accNo: companyFormData.companyBankDetails?.accNo || '',
      bankName: companyFormData.companyBankDetails?.bankName || '',
      ifscCode: companyFormData.companyBankDetails?.ifscCode || '',
      branch: companyFormData.companyBankDetails?.branch || '',
    };
  };

  // Handle form field changes
  const handleCompanyFieldChange = (name: string, value: any) => {
    // Validate the field
    const error = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));

    if (name === 'accNo' || name === 'bankName' || name === 'ifscCode' || name === 'branch') {
      // Handle bank details
      setCompanyFormData({
        ...companyFormData,
        companyBankDetails: {
          accNo: companyFormData.companyBankDetails?.accNo || '',
          bankName: companyFormData.companyBankDetails?.bankName || '',
          ifscCode: companyFormData.companyBankDetails?.ifscCode || '',
          branch: companyFormData.companyBankDetails?.branch || '',
          [name]: value
        }
      });
    } else {
      // Handle regular fields
      setCompanyFormData({ ...companyFormData, [name]: value });
    }
  };

  if (loading || !settingsState) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      {/* Header */}
      <PageHeader 
        title="Admin Settings"
        subtitle="Configure system settings and preferences"
      />

      {/* Error Alert */}
      {(error || success) && (
        <div className={`border rounded-lg p-4 ${
          error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex">
            {error ? (
              <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
            ) : (
              <div className="w-5 h-5 text-green-400 mr-2 mt-0.5">✓</div>
            )}
            <div>
              <h3 className={`text-sm font-medium ${
                error ? 'text-red-800' : 'text-green-800'
              }`}>
                {error ? 'Error' : 'Success'}
              </h3>
              <p className={`text-sm mt-1 ${
                error ? 'text-red-700' : 'text-green-700'
              }`}>
                {error || success}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <nav className="space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {tabs.find(t => t.id === activeTab)?.name} Settings
              </h2>
            </div>
            
            <div className="p-4">
              {getFieldsForCategory(activeTab).length > 0 ? (
                <>
                  {activeTab === 'general' ? (
                    <>
                      <div className="mb-6">
                        <h3 className="text-md font-semibold mb-2">Company Information</h3>
                        <Form
                          fields={getFieldsForCategory('general').slice(0, 3)}
                          values={getFlattenedCompanyValues()}
                          onChange={handleCompanyFieldChange}
                          errors={formErrors}
                        />
                      </div>
                      <div className="mb-6">
                        <h3 className="text-md font-semibold mb-2">Contact Information</h3>
                        <Form
                          fields={getFieldsForCategory('general').slice(3, 5)}
                          values={getFlattenedCompanyValues()}
                          onChange={handleCompanyFieldChange}
                          errors={formErrors}
                        />
                      </div>
                      <div className="mb-6">
                        <h3 className="text-md font-semibold mb-2">Bank Details</h3>
                        <Form
                          fields={getFieldsForCategory('general').slice(5, 9)}
                          values={getFlattenedCompanyValues()}
                          onChange={handleCompanyFieldChange}
                          errors={formErrors}
                        />
                      </div>
                    </>
                  ) : (
                  <Form
                    fields={getFieldsForCategory(activeTab)}
                    values={formData}
                    onChange={(name, value) => setFormData({ ...formData, [name]: value })}
                  />
                  )}
                  <div className="flex justify-end mt-6">
                    {activeTab === 'general' && Object.keys(formErrors).length > 0 && (
                      <div className="flex items-center text-red-600 text-sm mr-4">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Please fix validation errors
                      </div>
                    )}
                    <Button 
                      onClick={() => handleSave(activeTab)}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-base font-medium mb-2">No Settings Available</h3>
                  <p className="text-sm">No configuration options found for this category.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings; 