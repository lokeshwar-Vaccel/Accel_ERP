import { forgotPassword } from "redux/auth/authSlice";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('authToken');

    // Don't set Content-Type for FormData - let browser set it automatically
    const isFormData = options.body instanceof FormData;
    
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    const config: RequestInit = {
      headers,
      ...options,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Authentication APIs
  auth = {
    login: (credentials: { email: string; password: string }) =>
      this.makeRequest<{ success: boolean; data: { user: any; token: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    register: (userData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),

    getProfile: () =>
      this.makeRequest<{ success: boolean; data: any }>('/auth/me'),

    updateProfile: (data: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      this.makeRequest<{ success: boolean }>('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    resetPassword: (data: { token: string; newPassword: string }) =>
      this.makeRequest<{ success: boolean }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    forgotPassword: (data: { email: string }) =>
      this.makeRequest<{ success: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    logout: () =>
      this.makeRequest<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      }),
  };

  // User Management APIs
  users = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/users${params ? `?${new URLSearchParams(params)}` : ''}`),

    create: (userData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/users/${id}`),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/users/${id}`, {
        method: 'DELETE',
      }),

    resetPassword: (id: string, newPassword: string) =>
      this.makeRequest<{ success: boolean }>(`/users/${id}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword }),
      }),

    restore: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/users/${id}/restore`, {
        method: 'PUT',
      }),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/users/stats'),
  };

  // Customer Management APIs
  customers = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/customers${params ? `?${new URLSearchParams(params)}` : ''}`),

    create: (customerData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      }),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/customers/${id}`),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/customers/${id}`, {
        method: 'DELETE',
      }),

    addContact: (id: string, contactData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/customers/${id}/contact`, {
        method: 'POST',
        body: JSON.stringify(contactData),
      }),
  };

  // Product Management APIs
  products = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/products${params ? `?${new URLSearchParams(params)}` : ''}`),

    create: (productData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      }),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/products/${id}`),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/products/${id}`, {
        method: 'DELETE',
      }),
  };

  // Stock Management APIs
  stock = {
    // Stock Locations
    getLocations: () =>
      this.makeRequest<{ success: boolean; data: any[] }>('/stock/locations'),
    getRooms: () =>
      this.makeRequest<{ success: boolean; data: any[] }>('/stock/rooms'),
    getRacks: () =>
      this.makeRequest<{ success: boolean; data: any[] }>('/stock/racks'),

    createLocation: (locationData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/stock/locations', {
        method: 'POST',
        body: JSON.stringify(locationData),
      }),

    createRoom: (roomData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/stock/rooms', {
        method: 'POST',
        body: JSON.stringify(roomData),
      }),

    createRack: (rackData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/stock/racks', {
        method: 'POST',
        body: JSON.stringify(rackData),
      }),

    updateLocation: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/stock/locations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateRoom: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/stock/rooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    updateRack: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/stock/racks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteLocation: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/stock/locations/${id}`, {
        method: 'DELETE',
      }),

    // Stock Management
    getStock: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/stock${params ? `?${new URLSearchParams(params)}` : ''}`),

    adjustStock: (adjustmentData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/stock/adjust', {
        method: 'POST',
        body: JSON.stringify(adjustmentData),
      }),

    transferStock: (transferData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/stock/transfer', {
        method: 'POST',
        body: JSON.stringify(transferData),
      }),

    // Stock Analytics
    getLowStockItems: (locationId?: string) =>
      this.makeRequest<{ success: boolean; data: any[] }>(`/stock?lowStock=true${locationId ? `&location=${locationId}` : ''}`),

    getInventoryReport: (params: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/reports/inventory', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  };

  // Invoice Management APIs
  invoices = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: { invoices: any[] } }>(`/invoices${params ? `?${new URLSearchParams(params)}` : ''}`),

    create: (invoiceData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      }),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/invoices/stats'),
  };

  // Stock Ledger APIs
  stockLedger = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: { ledgers: any[] }; pagination: any }>(`/ledger${params ? `?${new URLSearchParams(params)}` : ''}`),

    getByProduct: (productId: string, locationId?: string, params?: any) => {
      const allParams = { stockId: productId, ...(locationId && { location: locationId }), ...params };
      return this.makeRequest<{ success: boolean; data: { ledgers: any[] }; pagination: any }>(`/ledger?${new URLSearchParams(allParams)}`);
    },
  };

  // Service Management APIs
  services = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/services${params ? `?${new URLSearchParams(params)}` : ''}`),

    create: (serviceData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/services', {
        method: 'POST',
        body: JSON.stringify(serviceData),
      }),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/services/${id}`),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/services/${id}`, {
        method: 'DELETE',
      }),

    assign: (id: string, technicianId: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/services/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ technicianId }),
      }),

    updateStatus: (id: string, status: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/services/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),

    addParts: (id: string, partsData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/services/${id}/parts`, {
        method: 'POST',
        body: JSON.stringify(partsData),
      }),

    submitReport: (id: string, reportData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/services/${id}/report`, {
        method: 'POST',
        body: JSON.stringify(reportData),
      }),
  };

  // AMC Management APIs
  amc = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/amc${params ? `?${new URLSearchParams(params)}` : ''}`),

    create: (amcData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/amc', {
        method: 'POST',
        body: JSON.stringify(amcData),
      }),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}`),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/amc/${id}`, {
        method: 'DELETE',
      }),

    scheduleVisit: (id: string, visitData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/visit`, {
        method: 'POST',
        body: JSON.stringify(visitData),
      }),

    getVisits: (id: string) =>
      this.makeRequest<{ success: boolean; data: any[] }>(`/amc/${id}/visits`),

    renew: (id: string, renewalData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/renew`, {
        method: 'PUT',
        body: JSON.stringify(renewalData),
      }),
  };

  // Purchase Orders APIs
  purchaseOrders = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/purchase-orders${params ? `?${new URLSearchParams(params)}` : ''}`),

    create: (poData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(poData),
      }),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/purchase-orders/${id}`),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/purchase-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/purchase-orders/${id}`, {
        method: 'DELETE',
      }),

    updateStatus: (id: string, status: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/purchase-orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),

    receiveItems: (id: string, receiptData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/purchase-orders/${id}/receive`, {
        method: 'POST',
        body: JSON.stringify(receiptData),
      }),

    // Preview import from Excel/CSV - shows what will be imported without saving
    previewImportFromFile: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      return this.makeRequest<{ 
        success: boolean; 
        data: {
          ordersToCreate: any[];
          productsToCreate: any[];
          existingProducts: any[];
          errors: string[];
          summary: {
            totalRows: number;
            uniqueOrders: number;
            newProducts: number;
            existingProducts: number;
          };
        } 
      }>('/purchase-orders/preview-import', {
        method: 'POST',
        body: formData,
      });
    },

    // Import from Excel/CSV
    importFromFile: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      return this.makeRequest<{ 
        success: boolean; 
        data: {
          summary: {
            totalRows: number;
            uniqueOrders: number;
            successful: number;
            failed: number;
          };
          createdOrders: any[];
          errors: string[];
        } 
      }>('/purchase-orders/import', {
        method: 'POST',
        body: formData,
      });
    },
  };

  // Reports APIs
  reports = {
    serviceTickets: (params: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/reports/service-tickets', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    inventory: (params: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/reports/inventory', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    revenue: (params: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/reports/revenue', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    customers: (params: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/reports/customers', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    performance: (params: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/reports/performance', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    custom: (params: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/reports/custom', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    schedule: (scheduleData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/reports/schedule', {
        method: 'POST',
        body: JSON.stringify(scheduleData),
      }),

    getScheduled: () =>
      this.makeRequest<{ success: boolean; data: any[] }>('/reports/schedule'),

    export: (exportData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/reports/export', {
        method: 'POST',
        body: JSON.stringify(exportData),
      }),

    getHistory: () =>
      this.makeRequest<{ success: boolean; data: any[] }>('/reports/history'),
  };

  // File Management APIs
  files = {
    upload: (file: File, metadata?: any) => {
      const formData = new FormData();
      formData.append('file', file);
      if (metadata) {
        Object.keys(metadata).forEach(key => {
          formData.append(key, metadata[key]);
        });
      }

      return this.makeRequest<{ success: boolean; data: any }>('/files/upload', {
        method: 'POST',
        headers: {},
        body: formData,
      });
    },

    uploadMultiple: (files: File[], metadata?: any) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (metadata) {
        Object.keys(metadata).forEach(key => {
          formData.append(key, metadata[key]);
        });
      }

      return this.makeRequest<{ success: boolean; data: any[] }>('/files/upload-multiple', {
        method: 'POST',
        headers: {},
        body: formData,
      });
    },

    uploadSignature: (signatureData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/files/signature', {
        method: 'POST',
        body: JSON.stringify(signatureData),
      }),

    download: (fileId: string) =>
      fetch(`${this.baseURL}/files/${fileId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      }),

    getById: (fileId: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/files/${fileId}`),

    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/files${params ? `?${new URLSearchParams(params)}` : ''}`),

    delete: (fileId: string) =>
      this.makeRequest<{ success: boolean }>(`/files/${fileId}`, {
        method: 'DELETE',
      }),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/files/stats/overview'),
  };

  // Admin APIs
  admin = {
    getSettings: () =>
      this.makeRequest<{ success: boolean; data: any }>('/admin/settings'),

    getSetting: (key: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/admin/settings/${key}`),

    updateSetting: (key: string, value: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/admin/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      }),

    getEmailTemplates: () =>
      this.makeRequest<{ success: boolean; data: any[] }>('/admin/email-templates'),

    createEmailTemplate: (templateData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/admin/email-templates', {
        method: 'POST',
        body: JSON.stringify(templateData),
      }),

    updateEmailTemplate: (id: string, templateData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/admin/email-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(templateData),
      }),

    deleteEmailTemplate: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/admin/email-templates/${id}`, {
        method: 'DELETE',
      }),

    testEmail: (emailData: any) =>
      this.makeRequest<{ success: boolean }>('/admin/test-email', {
        method: 'POST',
        body: JSON.stringify(emailData),
      }),

    getSystemInfo: () =>
      this.makeRequest<{ success: boolean; data: any }>('/admin/system-info'),
  };

  // Communications APIs
  communications = {
    sendEmail: (emailData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/communications/email/send', {
        method: 'POST',
        body: JSON.stringify(emailData),
      }),

    sendSMS: (smsData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/communications/sms/send', {
        method: 'POST',
        body: JSON.stringify(smsData),
      }),

    sendWhatsApp: (whatsappData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/communications/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify(whatsappData),
      }),

    getMessageStatus: (type: string, messageId: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/communications/${type}/${messageId}/status`),

    getHistory: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/communications/history${params ? `?${new URLSearchParams(params)}` : ''}`),

    bulkSend: (bulkData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/communications/bulk-send', {
        method: 'POST',
        body: JSON.stringify(bulkData),
      }),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/communications/stats'),
  };

  // Dashboard APIs
  dashboard = {
    getOverview: () =>
      this.makeRequest<{ success: boolean; data: any }>('/dashboard/overview'),

    getRecentActivities: () =>
      this.makeRequest<{ success: boolean; data: any[] }>('/dashboard/recent-activities'),

    getPerformanceMetrics: () =>
      this.makeRequest<{ success: boolean; data: any }>('/dashboard/performance-metrics'),

    getAlerts: () =>
      this.makeRequest<{ success: boolean; data: any[] }>('/dashboard/alerts'),
  };
}

export const apiClient = new ApiClient();
export default apiClient; 