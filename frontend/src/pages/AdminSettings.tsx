import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Mail, 
  Phone, 
  MessageSquare,
  Save,
  Monitor,
  Database,
  Lock
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Form } from '../components/ui/Form';
import { FormField, SystemSetting } from '../types';
import { apiClient } from '../utils/api';

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.admin.getSettings();
      setSettings(response.data);
      
      // Transform settings into form data
      const data: any = {};
      response.data.forEach((setting: SystemSetting) => {
        data[setting.key] = setting.value;
      });
      setFormData(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (category: string) => {
    try {
      const categorySettings = settings.filter(s => s.category === category);
      await Promise.all(
        categorySettings.map(setting => 
          apiClient.admin.updateSetting(setting.key, formData[setting.key])
        )
      );
      await fetchSettings(); // Refresh
    } catch (error) {
      console.error('Error saving settings:', error);
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
    return settings
      .filter(setting => setting.category === category)
      .map(setting => ({
        name: setting.key,
        label: setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: typeof setting.value === 'boolean' ? 'checkbox' : 
              typeof setting.value === 'number' ? 'number' : 'text',
        required: false
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-gray-600 mt-1">Configure system settings and preferences</p>
        </div>
      </div>

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
                    <Button onClick={() => handleSave(activeTab)}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
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