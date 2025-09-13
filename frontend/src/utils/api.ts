// Remove circular import
// import { forgotPassword } from "redux/auth/authSlice";

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & { responseType?: 'json' | 'blob' } = {}
  ): Promise<T> {
    const token = localStorage.getItem('authToken');

    // Don't set Content-Type for FormData - let browser set it automatically
    const isFormData = options.body instanceof FormData;
    
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    const { responseType, ...fetchOptions } = options;
    const config: RequestInit = {
      headers,
      ...fetchOptions,
    };

    // Debug logging for API requests
    if (options.body) {
      console.log('=== DEBUG: API Request ===');
      console.log('Endpoint:', endpoint);
      console.log('Method:', options.method || 'GET');
      console.log('Headers:', headers);
      console.log('Body:', options.body);
      console.log('========================================');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    // Handle different response types
    if (responseType === 'blob') {
      return response.blob() as T;
    }
    
    return response.json();
  }

  // Public API method for unauthenticated requests
  private async makePublicRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Don't set Content-Type for FormData - let browser set it automatically
    const isFormData = options.body instanceof FormData;
    
    const headers: HeadersInit = {
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
      this.makeRequest<{ success: boolean; data: any , message:string}>('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/users/${id}`),

    update: (id: string, data: any  ) =>
      this.makeRequest<{ success: boolean; data: any, message:string }>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean, message:string }>(`/users/${id}`, {
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

    getFieldEngineers: () =>
      this.makeRequest<{ success: boolean; data: { fieldEngineers: any[] } }>('/users/field-engineers'),

    getSalesEngineers: () =>
      this.makeRequest<{ success: boolean; data: { salesEngineers: any[] } }>('/users/sales-engineers'),
  };

  // Lead Management APIs
  customers = {
    getAll: (params: any) => {

      return this.makeRequest<{ success: boolean; data:{customers:any[],counts:any}; pagination: any }>(`/customers${params ? `?${new URLSearchParams(params)}` : ''}`);
    },
    getAllForDropdown: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[] }>(`/customers/all${params ? `?${new URLSearchParams(params)}` : ''}`),
    dgCustomers: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; page: number; limit: number; total: number; totalPages: number }>(`/customers/dg-customers${params ? `?${new URLSearchParams(params)}` : ''}`),
    },
    oemCustomers: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/customers/oem${params ? `?${new URLSearchParams(params)}` : ''}`),
    },
    convertedCustomers: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/customers/converted${params ? `?${new URLSearchParams(params)}` : ''}`),
    },

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
      this.makeRequest<{ success: boolean; data: any }>(`/customers/${id}/contact-history`, {
        method: 'POST',
        body: JSON.stringify(contactData),
      }),
    // Excel import preview
    previewImportFromFile: (file: File, type: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      return this.makeRequest<{
        success: boolean;
        data: {
          customersToCreate: any[];
          existingCustomers: any[];
          errors: string[];
          summary: {
            totalRows: number;
            newCustomers: number;
            existingCustomers: number;
          };
        }
      }>('/customers/preview-import', {
        method: 'POST',
        body: formData,
      });
    },
    // Excel import
    importFromFile: (file: File, type: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      return this.makeRequest<{
        success: boolean;
        data: {
          summary: {
            totalRows: number;
            successful: number;
            failed: number;
          };
          createdCustomers: any[];
          errors: string[];
        }
      }>('/customers/import', {
        method: 'POST',
        body: formData,
      });
    },

    // Excel export
    export: (params?: any) => {
      const queryString = params ? `?${new URLSearchParams(params)}` : '';
      return fetch(`${this.baseURL}/customers/export${queryString}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      }).then(response => {
        if (!response.ok) {
          throw new Error('Export failed');
        }
        return response.blob();
      });
    },
  };

  // Product Management APIs
  products = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/products${params ? `?${new URLSearchParams(params)}` : ''}`),

    getForDropdown: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[] }>(`/products/productListWithoutPagination${params ? `?${new URLSearchParams(params)}` : ''}`),

    getWithInventory: (params?: any) =>
      this.makeRequest<{ success: boolean; data: { products: any[]; totalProducts: number } }>(`/products/with-inventory${params ? `?${new URLSearchParams(params)}` : ''}`),

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

  // DG Product Management APIs
  dgProducts = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/dg-products${params ? `?${new URLSearchParams(params)}` : ''}`),

    create: (productData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/dg-products', {
        method: 'POST',
        body: JSON.stringify(productData),
      }),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/dg-products/${id}`),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/dg-products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/dg-products/${id}`, {
        method: 'DELETE',
      }),

    getCategories: () =>
      this.makeRequest<{ success: boolean; data: any[] }>('/dg-products/categories'),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/dg-products/stats'),
    preview: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return this.makeRequest<{ success: boolean; data: any }>('/dg-products/preview', {
        method: 'POST',
        body: formData,
        // Remove manual Content-Type header - let browser set it automatically
      });
    },
    import: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return this.makeRequest<{ success: boolean; data: any }>('/dg-products/import', {
        method: 'POST',
        body: formData,
        // Remove manual Content-Type header - let browser set it automatically
      });
    }
  };

  // Stock Management APIs
  stock = {
    // Stock Locations
    getLocations: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/stock/locations${params ? `?${new URLSearchParams(params)}` : ''}`),
    getRooms: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/stock/rooms${params ? `?${new URLSearchParams(params)}` : ''}`), 
    getRacks: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/stock/racks${params ? `?${new URLSearchParams(params)}` : ''}`),

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
    getStock: (params?: any) =>{
      // this.makeRequest<{ success: boolean; data: any; pagination?: any }>(`/stock${params ? `?${new URLSearchParams(params)}` : ''}`),
      return this.makeRequest<{ success: boolean; data:{stockLevels:any[]}; totalStock: number; totalLowStock: number; totalOutOfStock: number; totalOverStocked: number; totalInStock: number; pagination: any }>(`/stock${params ? `?${new URLSearchParams(params)}` : ''}`);
  },
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

  // Billing APIs
  invoices = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: { invoices: any[],pagination: any } }>(`/invoices${params ? `?${new URLSearchParams(params)}` : ''}`),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/invoices/${id}`),

    create: (invoiceData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      }),

    createFromQuotation: (quotationId: string) =>
      this.makeRequest<{ success: boolean; data: any }>('/invoices/create-from-quotation', {
        method: 'POST',
        body: JSON.stringify({ quotationId }),
      }),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    priceUpdate: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/invoices/${id}/products`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    getStats: (invoiceType?: string) => {
      const queryString = invoiceType ? `?invoiceType=${invoiceType}` : '';
      return this.makeRequest<{ success: boolean; data: any }>(`/invoices/stats${queryString}`);
    },

    sendEmail: (id: string) =>
      this.makeRequest<{ success: boolean; data: { paymentLink: string }; message: string }>(`/invoices/${id}/send-email`, {
        method: 'POST',
      }),

    sendReminder: (id: string) =>
      this.makeRequest<{ success: boolean; message: string }>(`/invoices/${id}/send-reminder`, {
        method: 'PUT',
      }),

    export: (params?: any) => {
      const queryString = params ? `?${new URLSearchParams(params)}` : '';
      return this.makeRequest<{ success: boolean; data: any[]; message: string }>(`/invoices/export${queryString}`);
    },
  };

  // DG Invoice APIs
  dgInvoices = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: { invoices: any[]; pagination: any } }>(`/dg-invoices${params ? `?${new URLSearchParams(params)}` : ''}`),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: { invoice: any } }>(`/dg-invoices/${id}`),

    create: (invoiceData: any) =>
      this.makeRequest<{ success: boolean; data: { invoice: any }; message: string }>('/dg-invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      }),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: { invoice: any }; message: string }>(`/dg-invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean; message: string }>(`/dg-invoices/${id}`, {
        method: 'DELETE',
      }),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/dg-invoices/stats'),

    priceUpdate: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: { invoice: any }; message: string }>(`/dg-invoices/${id}/products`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    sendEmail: (id: string) =>
      this.makeRequest<{ success: boolean; data: { paymentLink: string }; message: string }>(`/dg-invoices/${id}/send-email`, {
        method: 'POST',
      }),

    sendReminder: (id: string) =>
      this.makeRequest<{ success: boolean; message: string }>(`/dg-invoices/${id}/send-reminder`, {
        method: 'POST',
      }),
  };

  // Payment Management APIs
  payments = {
    createRazorpayOrder: (orderData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify(orderData),
      }),

    verifyRazorpayPayment: (verificationData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/payments/verify', {
        method: 'POST',
        body: JSON.stringify(verificationData),
      }),

    processManualPayment: (paymentData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/payments/manual', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      }),

    getInvoicePayments: (invoiceId: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/payments/invoice/${invoiceId}`),
  };

  // Payment Links APIs
  paymentLinks = {
    verify: (token: string) =>
      this.makeRequest<{ success: boolean; data: { invoice: any } }>(`/payment-links/verify/${token}`),

    processPayment: (token: string, paymentData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/payment-links/process/${token}`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
      }),

    sendInvoiceEmail: (invoiceId: string) =>
      this.makeRequest<{ success: boolean; data: { paymentLink: string } }>(`/payment-links/send-invoice/${invoiceId}`, {
        method: 'POST',
      }),

    sendReminder: (invoiceId: string) =>
      this.makeRequest<{ success: boolean; message: string }>(`/payment-links/send-reminder/${invoiceId}`, {
        method: 'POST',
      }),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/payment-links/stats'),
  };

  // Stock Ledger APIs
  stockLedger = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: { ledgers: any[], totalInward: number, totalOutward: number, totalAdjustment: number }; pagination: any }>(`/ledger${params ? `?${new URLSearchParams(params)}` : ''}`),

    getByProduct: (productId: string, locationId?: string, params?: any) => {
      const allParams = { stockId: productId, ...(locationId && { location: locationId }), ...params };
      return this.makeRequest<{ success: boolean; data: { ledgers: any[] }; pagination: any }>(`/ledger?${new URLSearchParams(allParams)}`);
    },
  };

  // QR Code Management APIs
  qrCode = {
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('qrCodeImage', file);
      
      return this.makeRequest<{ success: boolean; data: any }>('/qr-code/upload', {
        method: 'POST',
        body: formData,
      });
    },

    delete: (filename: string) =>
      this.makeRequest<{ success: boolean; message: string }>(`/qr-code/${filename}`, {
        method: 'DELETE',
      }),

    getInfo: (filename: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/qr-code/${filename}`),
  };

    // PO Files Management APIs
    poFiles = {
      upload: (file: File) => {
        const formData = new FormData();
        formData.append('pdfFile', file);
        
        console.log('PO Files Upload - File details:', {
          name: file.name,
          size: file.size,
          type: file.type,
          hasToken: !!localStorage.getItem('authToken')
        });
        
        return this.makeRequest<{ success: boolean; data: any }>('/po-files/upload', {
          method: 'POST',
          body: formData,
        });
      },
  
      delete: (filename: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/po-files/${filename}`, {
          method: 'DELETE',
        }),
  
      getInfo: (filename: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/po-files/${filename}`),
    };

  // Service Management APIs
  services = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/services${params ? `?${new URLSearchParams(params)}` : ''}`),

    create: (serviceData: any) =>
      this.makeRequest<{ success: boolean; data: any }>( '/services', {
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

    bulkImport: (tickets: any[]) =>
      this.makeRequest<{ success: boolean; data: any }>( '/services/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ tickets }),
      }),

    export: (params?: any) =>
      this.makeRequest<{ success: boolean; data: { tickets: any[]; totalCount: number } }>(`/services/export${params ? `?${new URLSearchParams(params)}` : ''}`),

    getCustomerEngines: (customerId: string) =>
      this.makeRequest<{ success: boolean; data: { engines: any[]; count: number } }>(`/services/customer/${customerId}/engines`),

    getCustomerAddresses: (customerId: string) =>
      this.makeRequest<{ success: boolean; data: { addresses: any[]; count: number; customerName: string } }>(`/services/customer/${customerId}/addresses`),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: { totalTickets: number; openTickets: number; resolvedTickets: number; closedTickets: number; overdueTickets: number; ticketsByPriority: any[]; avgResolutionHours: number } }>( '/services/stats/overview'),

    updateExcelTicket: (id: string, excelData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/services/${id}/excel-update`, {
        method: 'PUT',
        body: JSON.stringify(excelData),
      }),

    getEngineerPaymentReport: (params?: { month?: string; engineerId?: string; customerId?: string; status?: string }) =>
      this.makeRequest<{ success: boolean; data: { period: any; rows: any[]; totals: { byEngineer: { engineerId: string; engineerName: string; totalAmount: number }[]; grandTotal: number } } }>(`/services/reports/engineer-payments${params ? `?${new URLSearchParams(params as any)}` : ''}`),

  };

  // Digital Service Report APIs
  digitalServiceReports = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/digital-service-reports${params ? `?${new URLSearchParams(params)}` : ''}`),

    create: (reportData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/digital-service-reports', {
        method: 'POST',
        body: JSON.stringify(reportData),
      }),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/digital-service-reports/${id}`),

    getByTicket: (ticketId: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/digital-service-reports/ticket/${ticketId}`),

    update: (id: string, data: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/digital-service-reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/digital-service-reports/${id}`, {
        method: 'DELETE',
      }),

    approve: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/digital-service-reports/${id}/approve`, {
        method: 'PUT',
      }),

    reject: (id: string, rejectionReason: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/digital-service-reports/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ rejectionReason }),
      }),

    complete: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/digital-service-reports/${id}/complete`, {
        method: 'PUT',
      }),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/digital-service-reports/stats/overview'),
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
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}`, {
        method: 'DELETE',
      }),

    bulkDelete: (contractIds: string[], reason?: string) =>
      this.makeRequest<{ success: boolean; data: any }>('/amc/bulk-delete', {
        method: 'DELETE',
        body: JSON.stringify({ contractIds, reason }),
      }),

    archive: (id: string, reason?: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/archive`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
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
        method: 'POST',
        body: JSON.stringify(renewalData),
      }),

    // Enhanced functionality
    scheduleEnhancedVisit: (id: string, visitData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/schedule-visit-enhanced`, {
        method: 'POST',
        body: JSON.stringify(visitData),
      }),

    scheduleVisitsBulk: (id: string, visits: any[]) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/schedule-visits-bulk`, {
        method: 'POST',
        body: JSON.stringify({ visits }),
      }),

          completeVisit: (amcId: string, visitData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/amc/${amcId}/complete-visit`, {
          method: 'POST',
          body: JSON.stringify(visitData),
        }),

    regenerateVisits: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/regenerate-visits`, {
        method: 'PUT',
      }),

    // Visit date filtering
    getByVisitDate: (params: any) =>
      this.makeRequest<{ success: boolean; data: any; pagination: any }>(`/amc/visits-by-date${params ? `?${new URLSearchParams(params)}` : ''}`),

    getVisitScheduleSummary: (params: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/visit-schedule-summary${params ? `?${new URLSearchParams(params)}` : ''}`),

    bulkRenew: (contractIds: string[], renewalData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/amc/bulk-renew', {
        method: 'POST',
        body: JSON.stringify({ contractIds, ...renewalData }),
      }),

    getPerformance: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/performance`),

    generateReport: (type: string, params?: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/reports/${type}${params ? `?${new URLSearchParams(params)}` : ''}`),

    getExpiringContracts: () =>
      this.makeRequest<{ success: boolean; data: any[] }>('/amc/expiring/contracts'),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/amc/stats/overview'),

    // Additional functionality
    getDetails: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/details`),

    updateStatus: (id: string, statusData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusData),
      }),

    getByCustomer: (customerId: string, params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/amc/customer/${customerId}${params ? `?${new URLSearchParams(params)}` : ''}`),

    getExpiringSoon: (days?: number) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/expiring-soon${days ? `?days=${days}` : ''}`),

    getVisitsDue: (days?: number) =>
      this.makeRequest<{ success: boolean; data: any }>(`/amc/visits-due${days ? `?days=${days}` : ''}`),

    getDashboard: () =>
      this.makeRequest<{ success: boolean; data: any }>('/amc/dashboard'),

    exportToExcel: (params?: any) => {
      const queryString = params ? `?${new URLSearchParams(params)}` : '';
      return fetch(`${this.baseURL}/amc/export-excel${queryString}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
    },
  };

  // Purchase Orders APIs
  purchaseOrders = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; pagination: any; totalPurchaseOrdersCount: number; pendingPurchaseOrdersCount: number; confirmedPurchaseOrdersCount: number }>(`/purchase-orders${params ? `?${new URLSearchParams(params)}` : ''}`),

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

    updatePayment: (id: string, paymentData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/purchase-orders/${id}/payment`, {
        method: 'PUT',
        body: JSON.stringify(paymentData),
      }),

    syncPaymentStatus: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/purchase-orders/${id}/sync-payment`, {
        method: 'PUT',
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

    checkGstInvoiceNumber: (gstInvoiceNumber: string) =>
      this.makeRequest<{ success: boolean; data: { exists: boolean; gstInvoiceNumber: string; foundIn: string | null }; message: string }>(`/purchase-orders/check-gst-invoice/${encodeURIComponent(gstInvoiceNumber)}`),

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

  // Purchase Order Payments APIs
  purchaseOrderPayments = {
    getByPurchaseOrder: (poId: string) =>
      this.makeRequest<{ success: boolean; data: { payments: any[] } }>(`/purchase-order-payments/po/${poId}`),

    create: (paymentData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/purchase-order-payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      }),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/purchase-order-payments/${id}`),

    generatePDF: (id: string) =>
      this.makeRequest<Blob>(`/purchase-order-payments/${id}/pdf`, {
        method: 'GET',
        responseType: 'blob',
      }),
  };

  // Reports APIs
  reports = {
    dashboardAnalytics: (params: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/reports/dashboard-analytics', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

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
        body: formData,
      });
    },

    uploadDigitalReport: (photos: File[], attachments: File[]) => {
      const formData = new FormData();
      photos.forEach(file => formData.append('photos', file));
      attachments.forEach(file => formData.append('attachments', file));

      return this.makeRequest<{ success: boolean; data: any }>('/files/upload-digital-report', {
        method: 'POST',
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

    delete: (filename: string) =>
      this.makeRequest<{ success: boolean }>(`/files/${filename}`, {
        method: 'DELETE',
      }),

    getInfo: (filename: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/files/info/${filename}`),

    getFileUrl: (filename: string) => `${this.baseURL}/files/${filename}`,

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

  // General Settings APIs
  generalSettings = {
    getAll: () =>
      this.makeRequest<{ success: boolean; data: { companies: any[]; pagination: any } }>('/generalSettings'),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/generalSettings/${id}`),

    create: (companyData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/generalSettings', {
        method: 'POST',
        body: JSON.stringify(companyData),
      }),

    update: (id: string, companyData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/generalSettings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(companyData),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean }>(`/generalSettings/${id}`, {
        method: 'DELETE',
      }),
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

  // Notifications APIs
  notifications = {
    getAll: (params?: any) => {
      const queryString = params ? `?${new URLSearchParams(params)}` : '';
      return this.makeRequest<{ success: boolean; data: { notifications: any[]; pagination: any; unreadCount: number } }>(`/notifications${queryString}`);
    },

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/notifications/stats'),

    markAsRead: (id: string) =>
      this.makeRequest<{ success: boolean; data: { notification: any } }>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),

    markAllAsRead: () =>
      this.makeRequest<{ success: boolean; data: { updatedCount: number } }>('/notifications/read-all', {
        method: 'PATCH',
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean; data: { deleted: boolean } }>(`/notifications/${id}`, {
        method: 'DELETE',
      }),

    create: (data: any) =>
      this.makeRequest<{ success: boolean; data: { notification: any } }>('/notifications/create', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Low stock notification methods
    getLowStockSummary: () =>
      this.makeRequest<{ success: boolean; data: { summary: any } }>('/notifications/low-stock-summary'),

    getLowStockItems: () =>
      this.makeRequest<{ success: boolean; data: { lowStockItems: any[]; outOfStockItems: any[]; totalLowStock: number; totalOutOfStock: number } }>('/notifications/low-stock-items'),

    triggerLowStockNotifications: () =>
      this.makeRequest<{ success: boolean; data: { notificationsCreated: number } }>('/notifications/trigger-low-stock', {
        method: 'POST',
      }),
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
 
  // Inventory Import APIs
  inventory = {
    downloadTemplate: () =>
      fetch(`${this.baseURL}/inventory/import-template`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.blob();
      }),

    exportExcel: () =>
      fetch(`${this.baseURL}/inventory/export-excel`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.blob();
      }),

    import: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch(`${this.baseURL}/inventory/import`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      }).then(res => {
        if (!res.ok) {
          return res.text().then(text => {
            try {
              const error = JSON.parse(text);
              throw new Error(error.message || error.error || `HTTP ${res.status}: ${res.statusText}`);
            } catch {
              throw new Error(text || `HTTP ${res.status}: ${res.statusText}`);
            }
          });
        }
        return res.json();
      })
    },

    previewImport: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch(`${this.baseURL}/inventory/preview-import`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      });
    }
  };

  quotations = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; page: number; limit: number; total: number; totalPages: number }>(`/quotations${params ? `?${new URLSearchParams(params)}` : ''}`),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/quotations/${id}`),

    create: (quotationData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/quotations', {
        method: 'POST',
        body: JSON.stringify(quotationData),
      }),

    update: (id: string, quotationData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/quotations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(quotationData),
      }),

    updatePayment: (id: string, paymentData: any) =>
      this.makeRequest<{ success: boolean; data: any; message: string }>(`/quotations/${id}/payment`, {
        method: 'PUT',
        body: JSON.stringify(paymentData),
      }),

    sendEmail: (id: string) =>
      this.makeRequest<{ success: boolean; message: string; data: any }>(`/quotations/${id}/send-email`, {
        method: 'POST',
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean; message: string }>(`/quotations/${id}`, {
        method: 'DELETE',
      }),

    generate: (invoiceId: string, params?: any) =>
      this.makeRequest(`/quotations/generate/${invoiceId}`, {
        method: 'POST',
        body: params ? JSON.stringify(params) : undefined,
      }),
    preview: (invoiceId: string) =>
      fetch(`${this.baseURL}/quotations/preview/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      }).then(res => res.text()),
    download: (invoiceId: string) =>
      fetch(`${this.baseURL}/api/v1/quotations/download/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      }).then(res => res.blob()),

    export: (params?: any) => {
      const queryString = params ? `?${new URLSearchParams(params)}` : '';
      return this.makeRequest<{ success: boolean; data: any[]; message: string }>(`/quotations/export${queryString}`);
    },

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/quotations/stats'),
  };

  quotationPayments = {
    create: (paymentData: any) =>
      this.makeRequest<{ success: boolean; data: any; message: string }>('/quotation-payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      }),

    getByQuotation: (quotationId: string) =>
      this.makeRequest<{ success: boolean; data: { payments: any[] } }>(`/quotation-payments/quotation/${quotationId}`),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: { payment: any } }>(`/quotation-payments/${id}`),

    update: (id: string, paymentData: any) =>
      this.makeRequest<{ success: boolean; data: { payment: any } }>(`/quotation-payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(paymentData),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean; message: string }>(`/quotation-payments/${id}`, {
        method: 'DELETE',
      }),

    generatePDF: (id: string) =>
      this.makeRequest<Blob>(`/quotation-payments/${id}/pdf`, {
        method: 'GET',
        responseType: 'blob',
      })
  };

  invoicePayments = {
    create: (paymentData: any) =>
      this.makeRequest<{ success: boolean; data: any; message: string }>('/invoice-payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      }),

    getByInvoice: (invoiceId: string) =>
      this.makeRequest<{ success: boolean; data: { payments: any[] } }>(`/invoice-payments/invoice/${invoiceId}`),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: { payment: any } }>(`/invoice-payments/${id}`),

    update: (id: string, paymentData: any) =>
      this.makeRequest<{ success: boolean; data: { payment: any } }>(`/invoice-payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(paymentData),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean; message: string }>(`/invoice-payments/${id}`, {
        method: 'DELETE',
      }),

    generatePDF: (id: string) =>
      this.makeRequest<Blob>(`/invoice-payments/${id}/pdf`, {
        method: 'GET',
        responseType: 'blob',
      })
  };

  // Delivery Challans
  deliveryChallans = {
    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: { deliveryChallans: any[]; pagination: any } }>(`/delivery-challans${params ? `?${new URLSearchParams(params)}` : ''}`),

    getById: (id: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/delivery-challans/${id}`),

    create: (challanData: any) =>
      this.makeRequest<{ success: boolean; data: any }>('/delivery-challans', {
        method: 'POST',
        body: JSON.stringify(challanData),
      }),

    update: (id: string, challanData: any) =>
      this.makeRequest<{ success: boolean; data: any }>(`/delivery-challans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(challanData),
      }),

    updateStatus: (id: string, status: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/delivery-challans/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    delete: (id: string) =>
      this.makeRequest<{ success: boolean; message: string }>(`/delivery-challans/${id}`, {
        method: 'DELETE',
      }),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/delivery-challans/stats'),

    getNextNumber: () =>
      this.makeRequest<{ success: boolean; data: { nextChallanNumber: string } }>('/delivery-challans/next-number'),

    export: (params?: any) =>
      this.makeRequest<{ success: boolean; data: any[]; message: string }>(`/delivery-challans/export${params ? `?${new URLSearchParams(params)}` : ''}`),

    exportPDF: async (id: string) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/delivery-challans/${id}/pdf`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      return response.blob();
    },
  };

  // DG Sales APIs
  dgSales = {
    // DG Enquiries
    enquiries: {
      previewImport: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return this.makeRequest<{ 
          success: boolean; 
          data: {
            summary: {
              totalRows: number;
              validRows: number;
              invalidRows: number;
              newCustomers: number;
              existingCustomers: number;
              duplicateCount: number;
              uniqueEnquiries: number;
              enquiriesToCreate: number;
            };
            errors: string[];
            sample: any[];
            enquiriesToCreate: any[];
            customersToCreate: any[];
            existingCustomers: any[];
            duplicateGroups: any[];
            duplicateRows: any[];
            unstoredRows: any[];
          }
        }>('/dg-enquiries/preview-import', {
          method: 'POST',
          body: formData,
        });
      },
      
      import: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return this.makeRequest<{ success: boolean; results: { created: any[]; skipped: any[]; errors: any[]; total: number } }>('/dg-enquiries/import', {
          method: 'POST',
          body: formData,
        });
      },
      
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/dg-enquiries${params ? `?${new URLSearchParams(params)}` : ''}`),
      
      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-enquiries/${id}`),
      
      create: (enquiryData: any) =>
        this.makeRequest<{ success: boolean; data: any }>('/dg-enquiries', {
          method: 'POST',
          body: JSON.stringify(enquiryData),
        }),
      
      update: (id: string, enquiryData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-enquiries/${id}`, {
          method: 'PUT',
          body: JSON.stringify(enquiryData),
        }),
      
      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/dg-enquiries/${id}`, {
          method: 'DELETE',
        }),
    },

    // DG Purchase Orders
    purchaseOrders: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; page: number; limit: number; total: number; totalPages: number }>(`/dg-purchase-orders${params ? `?${new URLSearchParams(params)}` : ''}`),

      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-purchase-orders/${id}`),

      create: (orderData: any) =>
        this.makeRequest<{ success: boolean; data: any }>('/dg-purchase-orders', {
          method: 'POST',
          body: JSON.stringify(orderData),
        }),

      createFromQuotation: (quotationId: string, orderData?: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-purchase-orders/from-quotation/${quotationId}`, {
          method: 'POST',
          body: orderData ? JSON.stringify(orderData) : undefined,
        }),

      update: (id: string, orderData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-purchase-orders/${id}`, {
          method: 'PUT',
          body: JSON.stringify(orderData),
        }),

      updateStatus: (id: string, status: string, notes?: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-purchase-orders/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, notes }),
        }),

      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/dg-purchase-orders/${id}`, {
          method: 'DELETE',
        }),

      generateNumber: () =>
        this.makeRequest<{ success: boolean; data: { poNumber: string } }>('/dg-purchase-orders/generate-number'),

      getStats: () =>
        this.makeRequest<{ success: boolean; data: any }>('/dg-purchase-orders/stats'),

      getByQuotation: (quotationId: string) =>
        this.makeRequest<{ success: boolean; data: any[] }>(`/dg-purchase-orders/by-quotation/${quotationId}`),

      receiveItems: (id: string, receiveData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-purchase-orders/${id}/receive-items`, {
          method: 'POST',
          body: JSON.stringify(receiveData),
        }),
    },

    // Proforma Invoices
    proformaInvoices: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; page: number; limit: number; total: number; totalPages: number }>(`/proforma-invoices${params ? `?${new URLSearchParams(params)}` : ''}`),

      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/proforma-invoices/${id}`),

      create: (invoiceData: any) =>
        this.makeRequest<{ success: boolean; data: any }>('/proforma-invoices', {
          method: 'POST',
          body: JSON.stringify(invoiceData),
        }),

      createFromPO: (poId: string, invoiceData?: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/proforma-invoices/from-po/${poId}`, {
          method: 'POST',
          body: invoiceData ? JSON.stringify(invoiceData) : undefined,
        }),

      update: (id: string, invoiceData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/proforma-invoices/${id}`, {
          method: 'PUT',
          body: JSON.stringify(invoiceData),
        }),

      updateStatus: (id: string, status: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/proforma-invoices/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }),

      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/proforma-invoices/${id}`, {
          method: 'DELETE',
        }),
    },

    // DG Invoices
    invoices: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; page: number; limit: number; total: number; totalPages: number }>(`/dg-invoices${params ? `?${new URLSearchParams(params)}` : ''}`),

      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-invoices/${id}`),

      create: (invoiceData: any) =>
        this.makeRequest<{ success: boolean; data: any }>('/dg-invoices', {
          method: 'POST',
          body: JSON.stringify(invoiceData),
        }),

      createFromPO: (poId: string, invoiceData?: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-invoices/from-po/${poId}`, {
          method: 'POST',
          body: invoiceData ? JSON.stringify(invoiceData) : undefined,
        }),

      update: (id: string, invoiceData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-invoices/${id}`, {
          method: 'PUT',
          body: JSON.stringify(invoiceData),
        }),

      updateItem: (invoiceId: string, itemIndex: number, itemData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-invoices/${invoiceId}/items/${itemIndex}`, {
          method: 'PUT',
          body: JSON.stringify(itemData),
        }),

      updatePaymentStatus: (id: string, paymentStatus: string, paidAmount?: number) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-invoices/${id}/payment-status`, {
          method: 'PATCH',
          body: JSON.stringify({ paymentStatus, paidAmount }),
        }),

      updateDeliveryStatus: (id: string, deliveryStatus: string, dates?: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-invoices/${id}/delivery-status`, {
          method: 'PATCH',
          body: JSON.stringify({ deliveryStatus, ...dates }),
        }),

      getStats: () =>
        this.makeRequest<{ success: boolean; data: any }>('/dg-invoices/stats'),

      sendEmail: (id: string) =>
        this.makeRequest<{ success: boolean; message: string; data: any }>(`/dg-invoices/${id}/send-email`, {
          method: 'POST',
        }),

      sendReminder: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/dg-invoices/${id}/send-reminder`, {
          method: 'POST',
        }),

      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/dg-invoices/${id}`, {
          method: 'DELETE',
        }),
    },

    // DG Payments
    payments: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; page: number; limit: number; total: number; totalPages: number }>(`/dg-payments${params ? `?${new URLSearchParams(params)}` : ''}`),

      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-payments/${id}`),

      create: (paymentData: any) =>
        this.makeRequest<{ success: boolean; data: any }>('/dg-payments', {
          method: 'POST',
          body: JSON.stringify(paymentData),
        }),

      update: (id: string, paymentData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-payments/${id}`, {
          method: 'PUT',
          body: JSON.stringify(paymentData),
        }),

      verify: (id: string, status: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-payments/${id}/verify`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }),

      getInvoiceSummary: (invoiceId: string) =>
        this.makeRequest<{ success: boolean; data: { payments: any[]; summary: any } }>(`/dg-payments/invoice/${invoiceId}/summary`),

      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/dg-payments/${id}`, {
          method: 'DELETE',
        }),
    },

    // OEMs
    oems: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; page: number; limit: number; total: number; totalPages: number }>(`/oems${params ? `?${new URLSearchParams(params)}` : ''}`),

      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oems/${id}`),

      create: (oemData: any) =>
        this.makeRequest<{ success: boolean; data: any }>('/oems', {
          method: 'POST',
          body: JSON.stringify(oemData),
        }),

      update: (id: string, oemData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oems/${id}`, {
          method: 'PUT',
          body: JSON.stringify(oemData),
        }),

      updateStatus: (id: string, status: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oems/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }),

      // Address management
      addAddress: (id: string, addressData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oems/${id}/addresses`, {
          method: 'POST',
          body: JSON.stringify(addressData),
        }),

      updateAddress: (id: string, addressId: string, addressData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oems/${id}/addresses/${addressId}`, {
          method: 'PUT',
          body: JSON.stringify(addressData),
        }),

      removeAddress: (id: string, addressId: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oems/${id}/addresses/${addressId}`, {
          method: 'DELETE',
        }),

      // Bank details management
      addBankDetail: (id: string, bankData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oems/${id}/bank-details`, {
          method: 'POST',
          body: JSON.stringify(bankData),
        }),

      updateBankDetail: (id: string, bankDetailId: string, bankData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oems/${id}/bank-details/${bankDetailId}`, {
          method: 'PUT',
          body: JSON.stringify(bankData),
        }),

      removeBankDetail: (id: string, bankDetailId: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oems/${id}/bank-details/${bankDetailId}`, {
          method: 'DELETE',
        }),

      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/oems/${id}`, {
          method: 'DELETE',
        }),
    },

    // OEM Orders
    oemOrders: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; page: number; limit: number; total: number; totalPages: number }>(`/oem-orders${params ? `?${new URLSearchParams(params)}` : ''}`),

      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oem-orders/${id}`),

      create: (orderData: any) =>
        this.makeRequest<{ success: boolean; data: any }>('/oem-orders', {
          method: 'POST',
          body: JSON.stringify(orderData),
        }),

      createFromPO: (poId: string, orderData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oem-orders/from-po/${poId}`, {
          method: 'POST',
          body: JSON.stringify(orderData),
        }),

      update: (id: string, orderData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oem-orders/${id}`, {
          method: 'PUT',
          body: JSON.stringify(orderData),
        }),

      updateStatus: (id: string, status: string, actualDeliveryDate?: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oem-orders/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, actualDeliveryDate }),
        }),

      updateDeliveryStatus: (id: string, deliveryStatus: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/oem-orders/${id}/delivery-status`, {
          method: 'PATCH',
          body: JSON.stringify({ deliveryStatus }),
        }),

      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/oem-orders/${id}`, {
          method: 'DELETE',
        }),
    },

    // Reports
    reports: {
      getDashboard: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-reports/dashboard${params ? `?${new URLSearchParams(params)}` : ''}`),

      getSalesPerformance: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-reports/sales-performance${params ? `?${new URLSearchParams(params)}` : ''}`),

      getProfitLoss: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-reports/profit-loss${params ? `?${new URLSearchParams(params)}` : ''}`),

      getCustomerAnalysis: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-reports/customer-analysis${params ? `?${new URLSearchParams(params)}` : ''}`),

      getEnquiryConversion: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-reports/enquiry-conversion${params ? `?${new URLSearchParams(params)}` : ''}`),

      getExecutivePerformance: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-reports/executive-performance${params ? `?${new URLSearchParams(params)}` : ''}`),
    },





    // DG Sales Quotations
    quotations: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/dg-quotations${params ? `?${new URLSearchParams(params)}` : ''}`),

      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-quotations/${id}`),

      create: (quotationData: any) =>
        this.makeRequest<{ success: boolean; data: any }>('/dg-quotations', {
          method: 'POST',
          body: JSON.stringify(quotationData),
        }),

      update: (id: string, quotationData: any) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-quotations/${id}`, {
          method: 'PUT',
          body: JSON.stringify(quotationData),
        }),

      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/dg-quotations/${id}`, {
          method: 'DELETE',
        }),

      generateNumber: () =>
        this.makeRequest<{ success: boolean; data: { quotationNumber: string } }>('/dg-quotations/generate-number'),

      getStats: () =>
        this.makeRequest<{ success: boolean; data: any }>('/dg-quotations/stats'),

      getByEnquiry: (enquiryId: string) =>
        this.makeRequest<{ success: boolean; data: any[] }>(`/dg-quotations/by-enquiry/${enquiryId}`),
    },

    // DG PO From Customers
    dgPoFromCustomers: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/dg-po-from-customers${params ? `?${new URLSearchParams(params)}` : ''}`),
  
      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-po-from-customers/${id}`),
  
      create: (poData: any) =>
        this.makeRequest<{ success: boolean; data: any; message: string }>('/dg-po-from-customers', {
          method: 'POST',
          body: JSON.stringify(poData),
        }),
  
      update: (id: string, poData: any) =>
        this.makeRequest<{ success: boolean; data: any; message: string }>(`/dg-po-from-customers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(poData),
        }),
  
      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/dg-po-from-customers/${id}`, {
          method: 'DELETE',
        }),
  
      updateStatus: (id: string, statusData: any) =>
        this.makeRequest<{ success: boolean; data: any; message: string }>(`/dg-po-from-customers/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify(statusData),
        }),
  
      export: (params?: any) => {
        const queryString = params ? `?${new URLSearchParams(params)}` : '';
        return this.makeRequest<{ success: boolean; data: any[]; message: string }>(`/dg-po-from-customers/export${queryString}`);
      },
  
      getStats: () =>
        this.makeRequest<{ success: boolean; data: any }>('/dg-po-from-customers/stats'),
    },

    // DG Proformas
    dgProformas: {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/dg-proformas${params ? `?${new URLSearchParams(params)}` : ''}`),
  
      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/dg-proformas/${id}`),
  
      create: (proformaData: any) =>
        this.makeRequest<{ success: boolean; data: any; message: string }>('/dg-proformas', {
          method: 'POST',
          body: JSON.stringify(proformaData),
        }),
  
      update: (id: string, proformaData: any) =>
        this.makeRequest<{ success: boolean; data: any; message: string }>(`/dg-proformas/${id}`, {
          method: 'PUT',
          body: JSON.stringify(proformaData),
        }),
  
      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/dg-proformas/${id}`, {
          method: 'DELETE',
        }),
  
      updateStatus: (id: string, statusData: any) =>
        this.makeRequest<{ success: boolean; data: any; message: string }>(`/dg-proformas/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify(statusData),
        }),
  
      export: (params?: any) => {
        const queryString = params ? `?${new URLSearchParams(params)}` : '';
        return this.makeRequest<{ success: boolean; data: any[]; message: string }>(`/dg-proformas/export${queryString}`);
      },
  
      getStats: () =>
        this.makeRequest<{ success: boolean; data: any }>('/dg-proformas/stats'),
    },


  };

    // PO From Customer APIs
    poFromCustomers = {
      getAll: (params?: any) =>
        this.makeRequest<{ success: boolean; data: any[]; pagination: any }>(`/po-from-customers${params ? `?${new URLSearchParams(params)}` : ''}`),
  
      getById: (id: string) =>
        this.makeRequest<{ success: boolean; data: any }>(`/po-from-customers/${id}`),
  
      create: (poData: any) =>
        this.makeRequest<{ success: boolean; data: any; message: string }>('/po-from-customers', {
          method: 'POST',
          body: JSON.stringify(poData),
        }),
  
      update: (id: string, poData: any) =>
        this.makeRequest<{ success: boolean; data: any; message: string }>(`/po-from-customers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(poData),
        }),
  
      delete: (id: string) =>
        this.makeRequest<{ success: boolean; message: string }>(`/po-from-customers/${id}`, {
          method: 'DELETE',
        }),
  
      updateStatus: (id: string, statusData: any) =>
        this.makeRequest<{ success: boolean; data: any; message: string }>(`/po-from-customers/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify(statusData),
        }),
  
      export: (params?: any) => {
        const queryString = params ? `?${new URLSearchParams(params)}` : '';
        return this.makeRequest<{ success: boolean; data: any[]; message: string }>(`/po-from-customers/export${queryString}`);
      },
  
      getStats: () =>
        this.makeRequest<{ success: boolean; data: any }>('/po-from-customers/stats'),
  
      // uploadPdf: (id: string, formData: FormData) =>
      //   this.makeRequest<{ success: boolean; data: any; message: string }>(`/po-from-customers/${id}/upload-pdf`, {
      //     method: 'POST',
      //     body: formData,
      //     headers: {
      //       // Don't set Content-Type, let the browser set it with boundary for FormData
      //       Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      //     },
      //   }),
    };

  // Feedback APIs
  feedback = {
    getByToken: (token: string) =>
      this.makePublicRequest<{ success: boolean; data: { feedback: any } }>(`/feedback/${token}`),

    submit: (token: string, feedbackData: any) =>
      this.makePublicRequest<{ success: boolean; data: any }>(`/feedback/${token}`, {
        method: 'POST',
        body: JSON.stringify(feedbackData),
      }),

    sendEmail: (ticketId: string) =>
      this.makeRequest<{ success: boolean; data: any }>('/feedback/send-email', {
        method: 'POST',
        body: JSON.stringify({ ticketId }),
      }),

    getStats: () =>
      this.makeRequest<{ success: boolean; data: any }>('/feedback/stats'),

    getAll: (params?: any) =>
      this.makeRequest<{ success: boolean; data: { feedback: any[] } }>(`/feedback/all${params ? `?${new URLSearchParams(params)}` : ''}`),

    getByTicketId: (ticketId: string) =>
      this.makeRequest<{ success: boolean; data: any }>(`/feedback/ticket/${ticketId}`),
  };
}

export const apiClient = new ApiClient();
export default apiClient; 