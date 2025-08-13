import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/api';

// Types
export interface Notification {
  _id: string;
  recipientId: string;
  type: 'assignment' | 'status_change' | 'contact_update' | 'follow_up' | 'payment_received' | 'invoice_created';
  content: string;
  entityId: string;
  entityType: 'customer' | 'invoice' | 'contact' | 'payment';
  createdAt: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
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

      const response = await apiClient.notifications.getAll(params);
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
      const response = await apiClient.notifications.getAll({ limit: '100' });
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
      const response = await apiClient.notifications.markAsRead(notificationId);
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
      const response = await apiClient.notifications.markAllAsRead();
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
      await apiClient.notifications.delete(notificationId);
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
      state.items.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
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
        
        if (pagination.page === 1) {
          state.items = notifications;
        } else {
          state.items.push(...notifications);
        }
        
        state.pagination = pagination;
        state.unreadCount = unreadCount;
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