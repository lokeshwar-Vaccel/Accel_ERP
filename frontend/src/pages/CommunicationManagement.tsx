import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Send,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Form } from '../components/ui/Form';
import { Button } from '../components/ui/Botton';
import { CommunicationMessage, Customer, TableColumn, FormField, MessageStatus } from '../types';
import { apiClient } from '../utils/api';

const CommunicationManagement: React.FC = () => {
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [messageType, setMessageType] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<any>({});

  useEffect(() => {
    Promise.all([
      fetchMessages(),
      fetchCustomers()
    ]);
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.communications.getHistory();
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCompose = (type: 'email' | 'sms' | 'whatsapp') => {
    setMessageType(type);
    setFormData({
      type,
      recipients: [],
      subject: type === 'email' ? '' : undefined,
      content: '',
      scheduled: false,
      scheduledDate: ''
    });
    setFormErrors({});
    setShowComposeModal(true);
  };

  const handleSendMessage = async () => {
    try {
      setFormErrors({});
      
      const messageData = {
        recipients: formData.recipients,
        content: formData.content,
        ...(messageType === 'email' && { subject: formData.subject }),
        ...(formData.scheduled && { scheduledDate: formData.scheduledDate })
      };

      let response;
      switch (messageType) {
        case 'email':
          response = await apiClient.communications.sendEmail(messageData);
          break;
        case 'sms':
          response = await apiClient.communications.sendSMS(messageData);
          break;
        case 'whatsapp':
          response = await apiClient.communications.sendWhatsApp(messageData);
          break;
      }

      await fetchMessages(); // Refresh messages
      setShowComposeModal(false);
      setFormData({});
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      }
    }
  };

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case MessageStatus.SENT:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case MessageStatus.DELIVERED:
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case MessageStatus.READ:
        return <Eye className="w-4 h-4 text-purple-600" />;
      case MessageStatus.FAILED:
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: MessageStatus) => {
    switch (status) {
      case MessageStatus.SENT:
        return 'text-green-800 bg-green-100';
      case MessageStatus.DELIVERED:
        return 'text-blue-800 bg-blue-100';
      case MessageStatus.READ:
        return 'text-purple-800 bg-purple-100';
      case MessageStatus.FAILED:
        return 'text-red-800 bg-red-100';
      default:
        return 'text-yellow-800 bg-yellow-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <Phone className="w-4 h-4" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'type',
      title: 'Type',
      render: (value) => (
        <div className="flex items-center space-x-2">
          {getTypeIcon(value)}
          <span className="capitalize">{value}</span>
        </div>
      )
    },
    {
      key: 'recipient',
      title: 'Recipient',
      render: (value) => (
        <div className="font-medium">{value}</div>
      )
    },
    {
      key: 'subject',
      title: 'Subject/Content',
      render: (value, record) => (
        <div className="max-w-xs">
          {record.subject && (
            <div className="font-medium text-sm">{record.subject}</div>
          )}
          <div className="text-gray-600 text-sm truncate">
            {record.content}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(value)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        </div>
      )
    },
    {
      key: 'sentAt',
      title: 'Sent At',
      render: (value) => new Date(value).toLocaleString()
    }
  ];

  const getFormFields = (): FormField[] => {
    const baseFields: FormField[] = [
      {
        name: 'recipients',
        label: 'Recipients',
        type: 'multiselect',
        required: true,
        options: customers.map(customer => ({
          value: customer.email || customer.phone,
          label: `${customer.name} (${customer.email || customer.phone})`
        }))
      }
    ];

    if (messageType === 'email') {
      baseFields.push({
        name: 'subject',
        label: 'Subject',
        type: 'text',
        required: true
      });
    }

    baseFields.push(
      {
        name: 'content',
        label: messageType === 'email' ? 'Message Body' : 'Message',
        type: 'textarea',
        required: true
      },
      {
        name: 'scheduled',
        label: 'Schedule for later',
        type: 'checkbox',
        required: false
      }
    );

    return baseFields;
  };

  const stats = [
    {
      title: 'Total Messages',
      value: messages.length.toString(),
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Emails Sent',
      value: messages.filter(m => m.type === 'email').length.toString(),
      icon: <Mail className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'SMS Sent',
      value: messages.filter(m => m.type === 'sms').length.toString(),
      icon: <Phone className="w-6 h-6" />,
      color: 'purple'
    },
    {
      title: 'WhatsApp Sent',
      value: messages.filter(m => m.type === 'whatsapp').length.toString(),
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'orange'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communication Management</h1>
          <p className="text-gray-600 mt-1">Send and manage customer communications</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => handleCompose('email')}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 text-left group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Compose Email</h3>
              <p className="text-sm text-gray-600">Send professional emails to customers</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleCompose('sms')}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 text-left group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Send SMS</h3>
              <p className="text-sm text-gray-600">Quick text messages to customers</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleCompose('whatsapp')}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 text-left group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">WhatsApp Message</h3>
              <p className="text-sm text-gray-600">Send WhatsApp Business messages</p>
            </div>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100 text-${stat.color}-600`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Message History</h2>
        </div>
        <Table
          columns={columns}
          data={messages}
          loading={loading}
          actions={false}
        />
      </div>

      {/* Compose Modal */}
      <Modal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        title={`Compose ${messageType.charAt(0).toUpperCase() + messageType.slice(1)}`}
        size="lg"
      >
        <Form
          fields={getFormFields()}
          values={formData}
          onChange={(name, value) => setFormData({ ...formData, [name]: value })}
          errors={formErrors}
        />
        
        {formData.scheduled && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setShowComposeModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendMessage}>
            <Send className="w-4 h-4 mr-2" />
            {formData.scheduled ? 'Schedule Message' : 'Send Message'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CommunicationManagement; 