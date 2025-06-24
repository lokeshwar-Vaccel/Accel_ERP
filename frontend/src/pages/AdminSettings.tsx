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
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';

// Define interfaces locally to avoid conflicts
interface SystemSetting {
  id: string;
  category: 'general' | 'email' | 'sms' | 'whatsapp' | 'notifications' | 'security' | 'business';
  key: string;
  value: any;
  displayName: string;
  description?: string;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'password';
  isPublic: boolean;
  updatedBy: string;
  updatedAt: Date;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.admin.getSettings();
      console.log('Settings API Response:', response);
      
      // Handle the correct response structure: response.data.settings
      const settingsData = response.data?.settings || [];
      
      if (!Array.isArray(settingsData)) {
        throw new Error('Invalid response format: settings should be an array');
      }
      
      setSettings(settingsData);
      
      // Transform settings into form data
      const data: any = {};
      settingsData.forEach((setting: SystemSetting) => {
        // Handle password fields differently
        data[setting.key] = setting.dataType === 'password' ? '' : setting.value;
      });
      setFormData(data);
      
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      setError(error.message || 'Failed to fetch settings');
      
      // Set fallback demo data for testing
      const fallbackSettings: SystemSetting[] = [
        {
          id: '1',
          category: 'general',
          key: 'company_name',
          value: 'Sun Power Services',
          displayName: 'Company Name',
          description: 'Official company name displayed in the system',
          dataType: 'string',
          isPublic: true,
          updatedBy: 'system',
          updatedAt: new Date()
        },
        {
          id: '2',
          category: 'general',
          key: 'contact_phone',
          value: '+91-9876543210',
          displayName: 'Contact Phone',
          description: 'Primary contact phone number',
          dataType: 'string',
          isPublic: true,
          updatedBy: 'system',
          updatedAt: new Date()
        },
        {
          id: '3',
          category: 'email',
          key: 'smtp_host',
          value: 'smtp.gmail.com',
          displayName: 'SMTP Host',
          description: 'Email server hostname',
          dataType: 'string',
          isPublic: false,
          updatedBy: 'system',
          updatedAt: new Date()
        },
        {
          id: '4',
          category: 'email',
          key: 'smtp_port',
          value: 587,
          displayName: 'SMTP Port',
          description: 'Email server port',
          dataType: 'number',
          isPublic: false,
          updatedBy: 'system',
          updatedAt: new Date()
        },
        {
          id: '5',
          category: 'security',
          key: 'session_timeout',
          value: 60,
          displayName: 'Session Timeout (minutes)',
          description: 'User session timeout duration',
          dataType: 'number',
          isPublic: false,
          updatedBy: 'system',
          updatedAt: new Date()
        },
        {
          id: '6',
          category: 'security',
          key: 'require_password_change',
          value: true,
          displayName: 'Require Password Change',
          description: 'Force password change on first login',
          dataType: 'boolean',
          isPublic: false,
          updatedBy: 'system',
          updatedAt: new Date()
        }
      ];
      
      setSettings(fallbackSettings);
      const fallbackData: any = {};
      fallbackSettings.forEach(setting => {
        fallbackData[setting.key] = setting.dataType === 'password' ? '' : setting.value;
      });
      setFormData(fallbackData);
      
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (category: string) => {
    try {
      setSaving(true);
      setError(null);
      
      const categorySettings = settings.filter(s => s.category === category);
      
      await Promise.all(
        categorySettings.map(setting => 
          apiClient.admin.updateSetting(setting.key, formData[setting.key])
        )
      );
      
      // Show success message
      alert('Settings saved successfully!');
      
      // Refresh settings
      await fetchSettings();
      
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setError(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
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

  const getFieldsForCategory = (category: string): FormField[] => {
    if (!Array.isArray(settings)) {
      return [];
    }
    
    return settings
      .filter(setting => setting.category === category)
      .map(setting => ({
        name: setting.key,
        label: setting.displayName || setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: setting.dataType === 'boolean' ? 'checkbox' : 
              setting.dataType === 'number' ? 'number' : 
              setting.dataType === 'password' ? 'password' : 'text',
        required: false,
        placeholder: setting.description
      }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader 
        title="Admin Settings"
        subtitle="Configure system settings and preferences"
      />

      {/* Error Alert */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Connection Issue</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {error}. Showing demo data for testing purposes.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <nav className="space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {tabs.find(t => t.id === activeTab)?.name} Settings
              </h2>
            </div>
            
            <div className="p-6">
              {getFieldsForCategory(activeTab).length > 0 ? (
                <>
                  <Form
                    fields={getFieldsForCategory(activeTab)}
                    values={formData}
                    onChange={(name, value) => setFormData({ ...formData, [name]: value })}
                  />
                  <div className="flex justify-end mt-6">
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
                <div className="text-center text-gray-500 py-12">
                  <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Settings Available</h3>
                  <p>No configuration options found for this category.</p>
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