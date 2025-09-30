import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Simple API client to avoid circular imports
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const makeNotificationRequest = async (endpoint: string, options: RequestInit = {}) => {
  // Check both localStorage and sessionStorage for token
  const persistentToken = localStorage.getItem('authToken');
  const sessionToken = sessionStorage.getItem('authToken');
  const token = persistentToken || sessionToken;
  
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const config: RequestInit = {
    headers,
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
};

const makeNotificationGetRequest = async (endpoint: string, params: Record<string, any> = {}) => {
  // Check both localStorage and sessionStorage for token
  const persistentToken = localStorage.getItem('authToken');
  const sessionToken = sessionStorage.getItem('authToken');
  const token = persistentToken || sessionToken;
  
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
};

// Types
export interface Notification {
  _id: string;
  userId: string;
  type: 'assignment' | 'status_change' | 'contact_history' | 'follow_up' | 'general' | 'low_stock' | 'out_of_stock' | 'over_stock' | 'payment_due' | 'amc_expiry' | 'service_reminder' | 'system_alert';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'inventory' | 'customer' | 'service' | 'payment' | 'system' | 'general';
  customerId?: any;
  productId?: any;
  metadata?: Record<string, any>;
  actionUrl?: string;
  createdBy?: any;
  createdAt: string;
  expiresAt?: string;
}

export interface NotificationState {
  items: Notification[];
  unreadCount: number;
  isPopupOpen: boolean;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  hasMore: boolean;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  isPopupOpen: false,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  },
  hasMore: true
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async ({ page = 1, limit = 20, isRead }: { page?: number; limit?: number; isRead?: boolean }, { rejectWithValue }) => {
    try {
      const params: any = {};
      if (page) params.page = page.toString();
      if (limit) params.limit = limit.toString();
      if (isRead !== undefined) params.isRead = isRead.toString();

      const response = await makeNotificationGetRequest('/notifications', params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      // Since getUnreadCount does not exist, use getAll with limit=1 to get unreadCount from response
      const response = await makeNotificationGetRequest('/notifications', { limit: '100' });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch unread count');
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markNotificationRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const response = await makeNotificationRequest(`/notifications/${notificationId}/read`, { method: 'PUT' });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark notification as read');
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllNotificationsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await makeNotificationRequest('/notifications/read-all', { method: 'PUT' });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark all notifications as read');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const response = await makeNotificationRequest(`/notifications/${notificationId}`, { method: 'DELETE' });
      return notificationId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete notification');
    }
  }
);

// Slice
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // UI Actions
    togglePopup: (state) => {
      state.isPopupOpen = !state.isPopupOpen;
    },
    openPopup: (state) => {
      state.isPopupOpen = true;
    },
    closePopup: (state) => {
      state.isPopupOpen = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetPagination: (state) => {
      state.pagination.page = 1;
      state.hasMore = true;
    },
    // Real-time notification actions
    addNotification: (state, action: PayloadAction<Notification>) => {
      console.log('🔔 Redux: addNotification called with:', action.payload);
      console.log('🔔 Redux: Before - items:', state.items.length, 'unread:', state.unreadCount);
      
      state.items.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
      
      console.log('🔔 Redux: After - items:', state.items.length, 'unread:', state.unreadCount);
    },
    updateNotification: (state, action: PayloadAction<{ id: string; updates: Partial<Notification> }>) => {
      const index = state.items.findIndex(n => n._id === action.payload.id);
      if (index !== -1) {
        const notification = state.items[index];
        const wasRead = notification.isRead;
        const isNowRead = action.payload.updates.isRead;
        
        state.items[index] = { ...notification, ...action.payload.updates };
        
        // Update unread count
        if (!wasRead && isNowRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        } else if (wasRead && !isNowRead) {
          state.unreadCount += 1;
        }
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.items.findIndex(n => n._id === action.payload);
      if (index !== -1) {
        const notification = state.items[index];
        if (!notification.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.items.splice(index, 1);
      }
    }
  },
  extraReducers: (builder) => {
    // Fetch notifications
    builder
      .addCase(fetchNotifications.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Reset items if it's the first page
        if (action.meta.arg.page === 1) {
          state.items = [];
        }
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const { notifications, pagination, unreadCount } = action.payload.data;
        
        // Store current real-time notifications before overwriting
        const currentRealTimeNotifications = state.items.filter(item => 
          !notifications.some((fetched: any) => fetched._id === item._id)
        );
        
        if (pagination.page === 1) {
          // Merge real-time notifications with fetched ones
          state.items = [...currentRealTimeNotifications, ...notifications];
        } else {
          state.items.push(...notifications);
        }
        
        state.pagination = pagination;
        // Calculate unread count from all notifications (real-time + fetched)
        const totalUnreadCount = state.items.filter(n => !n.isRead).length;
        state.unreadCount = Math.max(totalUnreadCount, unreadCount);
        state.hasMore = pagination.page < pagination.pages;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch unread count
    builder
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.data.unreadCount;
      });

    // Mark notification as read
    builder
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const notification = action.payload.data.notification;
        const index = state.items.findIndex(n => n._id === notification._id);
        if (index !== -1 && !state.items[index].isRead) {
          state.items[index].isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });

    // Mark all notifications as read
    builder
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach(notification => {
          notification.isRead = true;
        });
        state.unreadCount = 0;
      });

    // Delete notification
    builder
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const index = state.items.findIndex(n => n._id === notificationId);
        if (index !== -1) {
          const notification = state.items[index];
          if (!notification.isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.items.splice(index, 1);
        }
      });
  }
});

export const {
  togglePopup,
  openPopup,
  closePopup,
  clearError,
  resetPagination,
  addNotification,
  updateNotification,
  removeNotification
} = notificationSlice.actions;

export default notificationSlice.reducer; 