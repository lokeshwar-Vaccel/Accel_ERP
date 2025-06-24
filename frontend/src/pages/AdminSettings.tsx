import React from 'react';
import { Settings, User, Shield, Mail, Globe } from 'lucide-react';

const AdminSettings: React.FC = () => {
  const settingCategories = [
    { id: 'general', name: 'General Settings', icon: Settings, description: 'Basic system configuration' },
    { id: 'users', name: 'User Management', icon: User, description: 'Manage users and permissions' },
    { id: 'security', name: 'Security', icon: Shield, description: 'Security and authentication settings' },
    { id: 'email', name: 'Email Configuration', icon: Mail, description: 'Email server and template settings' },
    { id: 'system', name: 'System Information', icon: Globe, description: 'System status and information' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-gray-600 mt-1">Configure system settings and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingCategories.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.id} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSettings; 