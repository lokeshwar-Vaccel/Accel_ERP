import React from 'react';
import { MessageSquare, Mail, Phone, Send } from 'lucide-react';

const CommunicationManagement: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communications</h1>
          <p className="text-gray-600 mt-1">Manage email, SMS, and WhatsApp communications</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
          <Send className="w-5 h-5" />
          <span>Send Message</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
          <Mail className="w-12 h-12 mx-auto text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Email</h3>
          <p className="text-gray-500">Send email notifications and campaigns</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
          <Phone className="w-12 h-12 mx-auto text-green-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">SMS</h3>
          <p className="text-gray-500">Send SMS notifications to customers</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">WhatsApp</h3>
          <p className="text-gray-500">WhatsApp Business messaging</p>
        </div>
      </div>
    </div>
  );
};

export default CommunicationManagement; 