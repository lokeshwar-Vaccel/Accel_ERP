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
  Eye,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Settings,
  FileText,
  Download,
  Upload,
  X,
  Edit,
  Trash2,
  Calendar,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { apiClient } from '../utils/api';

// Types for Communication Management - matching backend structure
type MessageType = 'email' | 'sms' | 'whatsapp';
type MessageStatus = 'pending' | 'sent' | 'failed' | 'queued';
type MessagePriority = 'low' | 'medium' | 'high';

// Updated interface to match backend structure
interface CommunicationMessage {
  id: string;
  type: MessageType;
  to: string[];
  subject?: string;
  message: string;
  status: MessageStatus;
  priority: MessagePriority;
  sentAt?: string;
  sentBy: string;
  error?: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category: string;
  isActive: boolean;
}

interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  type: string;
}

interface MessageFormData {
  type: MessageType;
  recipients: string[];
  subject?: string;
  message: string;
  templateId?: string;
  variables?: Record<string, any>;
  priority: MessagePriority;
  scheduled?: boolean;
  scheduledDate?: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
}

interface BulkMessageData {
  type: MessageType;
  recipients: Array<{
    name: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  }>;
  message: string;
  subject?: string;
  templateId?: string;
  variables: Record<string, any>;
  priority: MessagePriority;
}

const CommunicationManagement: React.FC = () => {
  // Core state
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<MessageType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MessageStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Modal states
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Form data
  const [messageFormData, setMessageFormData] = useState<MessageFormData>({
    type: 'email',
    recipients: [],
    message: '',
    priority: 'medium'
  });

  const [bulkFormData, setBulkFormData] = useState<BulkMessageData>({
    type: 'email',
    recipients: [],
    message: '',
    variables: {},
    priority: 'medium'
  });

  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'general',
    variables: '',
    isActive: true
  });

  // Error handling
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Stats
  const [stats, setStats] = useState({
    totalMessages: 0,
    emailsSent: 0,
    smsSent: 0,
    whatsappSent: 0,
    successRate: 0,
    failedMessages: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  // Recalculate stats when messages change
  useEffect(() => {
    if (messages.length > 0) {
      calculateStatsFromMessages();
    }
  }, [messages]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMessages(),
        fetchCustomers(),
        fetchTemplates(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages...');
      const response = await apiClient.communications.getHistory();
      console.log('Messages response:', response);
      
      let messagesData: CommunicationMessage[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          messagesData = response.data;
        } else if ((response.data as any).messages && Array.isArray((response.data as any).messages)) {
          messagesData = (response.data as any).messages;
        }
      }

      // Fallback demo data if no real data
      if (messagesData.length === 0) {
        messagesData = [
          {
            id: '1',
            type: 'email' as MessageType,
            to: ['customer1@example.com'],
            subject: 'Service Ticket Update - #ST-001',
            message: 'Your service ticket has been updated. Our technician will arrive tomorrow at 2 PM.',
            status: 'sent' as MessageStatus,
            priority: 'high' as MessagePriority,
            sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            sentBy: 'Admin User',
            relatedEntity: { type: 'ticket', id: 'ticket-1' }
          },
          {
            id: '2',
            type: 'sms' as MessageType,
            to: ['+919876543210'],
            message: 'AMC reminder: Your contract expires in 15 days. Contact us to renew.',
            status: 'sent' as MessageStatus,
            priority: 'medium' as MessagePriority,
            sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            sentBy: 'System',
            relatedEntity: { type: 'amc', id: 'amc-1' }
          },
          {
            id: '3',
            type: 'whatsapp' as MessageType,
            to: ['+919876543211'],
            message: 'Thank you for choosing Sun Power Services! Your generator service is complete.',
            status: 'sent' as MessageStatus,
            priority: 'medium' as MessagePriority,
            sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            sentBy: 'Admin User',
            relatedEntity: { type: 'ticket', id: 'ticket-2' }
          },
          {
            id: '4',
            type: 'email' as MessageType,
            to: ['customer2@example.com'],
            subject: 'Purchase Order Confirmation - PO-202412-0001',
            message: 'Your purchase order has been confirmed and items will be delivered by tomorrow.',
            status: 'failed' as MessageStatus,
            priority: 'high' as MessagePriority,
            sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            sentBy: 'Admin User',
            error: 'Invalid email address',
            relatedEntity: { type: 'purchase_order', id: 'po-1' }
          }
        ];
      }

      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll();
      let customersData: Customer[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        customersData = response.data;
      }
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await apiClient.admin.getEmailTemplates();
      let templatesData: EmailTemplate[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        templatesData = response.data;
      }
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.communications.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        // Calculate from local data
        calculateStatsFromMessages();
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Calculate fallback stats from local data
      calculateStatsFromMessages();
    }
  };

  const calculateStatsFromMessages = () => {
    const totalMessages = messages.length;
    const emailsSent = messages.filter(m => m.type === 'email').length;
    const smsSent = messages.filter(m => m.type === 'sms').length;
    const whatsappSent = messages.filter(m => m.type === 'whatsapp').length;
    const sentMessages = messages.filter(m => m.status === 'sent').length;
    const failedMessages = messages.filter(m => m.status === 'failed').length;
    
    setStats({
      totalMessages,
      emailsSent,
      smsSent,
      whatsappSent,
      successRate: totalMessages > 0 ? Math.round((sentMessages / totalMessages) * 100) : 0,
      failedMessages
    });
  };

  const handleComposeMessage = (type: MessageType) => {
    setMessageFormData({
      type,
      recipients: [],
      message: '',
      priority: 'medium',
      ...(type === 'email' && { subject: '' })
    });
    setFormErrors({});
    setShowComposeModal(true);
  };

  const handleSendMessage = async () => {
    if (!validateMessageForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});

      const messageData = {
        to: messageFormData.recipients,
        message: messageFormData.message,
        priority: messageFormData.priority,
        ...(messageFormData.type === 'email' && { subject: messageFormData.subject }),
        ...(messageFormData.templateId && { templateId: messageFormData.templateId }),
        ...(messageFormData.variables && { variables: messageFormData.variables }),
        ...(messageFormData.relatedEntity && { relatedEntity: messageFormData.relatedEntity })
      };

      let response;
      switch (messageFormData.type) {
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

      await fetchMessages();
      setShowComposeModal(false);
      resetMessageForm();
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to send message' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSend = async () => {
    if (!validateBulkForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});

      const response = await apiClient.communications.bulkSend({
        type: bulkFormData.type,
        recipients: bulkFormData.recipients,
        message: bulkFormData.message,
        ...(bulkFormData.type === 'email' && { subject: bulkFormData.subject }),
        ...(bulkFormData.templateId && { templateId: bulkFormData.templateId }),
        variables: bulkFormData.variables,
        priority: bulkFormData.priority
      });

      await fetchMessages();
      setShowBulkModal(false);
      resetBulkForm();
    } catch (error: any) {
      console.error('Error sending bulk messages:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to send bulk messages' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const validateMessageForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (messageFormData.recipients.length === 0) {
      errors.recipients = 'At least one recipient is required';
    }
    if (!messageFormData.message.trim()) {
      errors.message = 'Message content is required';
    }
    if (messageFormData.type === 'email' && !messageFormData.subject?.trim()) {
      errors.subject = 'Subject is required for emails';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBulkForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (bulkFormData.recipients.length === 0) {
      errors.recipients = 'At least one recipient is required';
    }
    if (!bulkFormData.message.trim()) {
      errors.message = 'Message content is required';
    }
    if (bulkFormData.type === 'email' && !bulkFormData.subject?.trim()) {
      errors.subject = 'Subject is required for emails';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetMessageForm = () => {
    setMessageFormData({
      type: 'email',
      recipients: [],
      message: '',
      priority: 'medium'
    });
  };

  const resetBulkForm = () => {
    setBulkFormData({
      type: 'email',
      recipients: [],
      message: '',
      variables: {},
      priority: 'medium'
    });
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                         message.to.some((recipient: string) => recipient.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || message.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all' && message.sentAt) {
      const messageDate = new Date(message.sentAt);
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          matchesDate = messageDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = messageDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = messageDate >= monthAgo;
          break;
      }
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: MessageStatus) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'queued':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'pending':
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: MessageType) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'sms':
        return <Phone className="w-4 h-4 text-green-600" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  // Statistics cards with null checks
  const statsCards = [
    {
      title: 'Total Messages',
      value: (stats?.totalMessages || 0).toString(),
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Success Rate',
      value: `${stats?.successRate || 0}%`,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Emails Sent',
      value: (stats?.emailsSent || 0).toString(),
      icon: <Mail className="w-6 h-6" />,
      color: 'indigo'
    },
    {
      title: 'SMS Sent',
      value: (stats?.smsSent || 0).toString(),
      icon: <Phone className="w-6 h-6" />,
      color: 'purple'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communication Management</h1>
          <p className="text-gray-600 mt-1">Send and manage customer communications across multiple channels</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchAllData}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowStatsModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => handleComposeMessage('email')}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 text-left group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Send Email</h3>
              <p className="text-sm text-gray-600">Professional emails</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleComposeMessage('sms')}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 text-left group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Send SMS</h3>
              <p className="text-sm text-gray-600">Quick text messages</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleComposeMessage('whatsapp')}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 text-left group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">WhatsApp</h3>
              <p className="text-sm text-gray-600">Business messages</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowBulkModal(true)}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 text-left group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Bulk Send</h3>
              <p className="text-sm text-gray-600">Multiple recipients</p>
            </div>
          </div>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
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

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MessageType | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MessageStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Showing {filteredMessages.length} of {messages.length} messages
          </span>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading messages...</td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No messages found</td>
                </tr>
              ) : (
                filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(message.type)}
                        <div>
                          <div className="text-sm font-medium text-gray-900 capitalize">{message.type}</div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(message.status)}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(message.status)}`}>
                              {message.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {message.to.slice(0, 2).join(', ')}
                        {message.to.length > 2 && (
                          <span className="text-gray-500"> +{message.to.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        {message.subject && (
                          <div className="text-sm font-medium text-gray-900 truncate">{message.subject}</div>
                        )}
                        <div className="text-sm text-gray-600 truncate">{message.message}</div>
                        {message.error && (
                          <div className="text-sm text-red-600 mt-1">Error: {message.error}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          message.priority === 'high' ? 'bg-red-100 text-red-800' :
                          message.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {message.priority}
                        </span>
                        {message.sentAt && (
                          <div className="text-sm text-gray-600 mt-1">{formatDate(message.sentAt)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{message.sentBy}</div>
                      {message.relatedEntity && (
                        <div className="text-sm text-gray-500">
                          {message.relatedEntity.type}: {message.relatedEntity.id}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compose Message Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Compose {messageFormData.type.charAt(0).toUpperCase() + messageFormData.type.slice(1)}
              </h2>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-6 space-y-6">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Type
                  </label>
                  <select
                    value={messageFormData.type}
                    onChange={(e) => setMessageFormData({ ...messageFormData, type: e.target.value as MessageType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={messageFormData.priority}
                    onChange={(e) => setMessageFormData({ ...messageFormData, priority: e.target.value as MessagePriority })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipients *
                </label>
                <select
                  multiple
                  value={messageFormData.recipients}
                  onChange={(e) => setMessageFormData({ 
                    ...messageFormData, 
                    recipients: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-24 ${
                    formErrors.recipients ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {customers.map(customer => (
                    <option key={customer._id} value={messageFormData.type === 'email' ? customer.email : customer.phone}>
                      {customer.name} ({messageFormData.type === 'email' ? customer.email : customer.phone})
                    </option>
                  ))}
                </select>
                {formErrors.recipients && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.recipients}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple recipients</p>
              </div>

              {messageFormData.type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={messageFormData.subject || ''}
                    onChange={(e) => setMessageFormData({ ...messageFormData, subject: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.subject ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter email subject"
                  />
                  {formErrors.subject && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.subject}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Content *
                </label>
                <textarea
                  value={messageFormData.message}
                  onChange={(e) => setMessageFormData({ ...messageFormData, message: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32 ${
                    formErrors.message ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your message content"
                />
                {formErrors.message && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.message}</p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationManagement; 