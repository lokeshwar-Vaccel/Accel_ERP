// features/auth/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  address?: string;
moduleAccess: {
    module: string;
    access: boolean;
    permission: 'read' | 'write' | 'admin';
  }[];
  profileImage?: string;
  lastLoginAt?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: User | null;
  token: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  user: null,
  token: localStorage.getItem('authToken'),
};

// Check if user is already authenticated on app start
export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        return rejectWithValue('No token found');
      }
      
      const response = await api.auth.getProfile();
      return response.data;
    } catch (error: any) {
      // Don't clear token immediately on rate limiting
      if (error.response?.status === 429) {
        return rejectWithValue('Server is busy. Please try again in a moment.');
      }
      
      localStorage.removeItem('authToken');
      return rejectWithValue(error.message || 'Failed to verify authentication');
    }
  }
);

// Login async thunk
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.auth.login(credentials);
      
      // Store token in localStorage
      localStorage.setItem('authToken', response.data.token);
      
      return response.data;
    } catch (error: any) {
      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        return rejectWithValue('Too many login attempts. Please wait a moment and try again.');
      }
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

// Logout async thunk
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Always clear localStorage first to ensure logout happens
      localStorage.removeItem('authToken');
      
      // Try to notify the server about logout, but don't fail if it doesn't work
      try {
        await api.auth.logout();
      } catch (serverError) {
        // Server logout failed, but we've already cleared local storage
        console.warn('Server logout failed, but local logout successful:', serverError);
      }
      
      return null;
    } catch (error: any) {
      // This should rarely happen since we're handling server errors above
      localStorage.removeItem('authToken');
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

// Update profile async thunk
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await api.auth.updateProfile(profileData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Profile update failed');
    }
  }
);

// Change password async thunk
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    try {
      await api.auth.changePassword(passwordData);
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Password change failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    forceLogout: (state) => {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.user = null;
      state.token = null;
      localStorage.removeItem('authToken');
    },
  },
  extraReducers: (builder) => {
    // Check auth status
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload as string;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        // Even if logout fails on server, clear local state
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload as string;
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user) {
          state.user = { ...state.user, ...action.payload.user };
        }
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Change password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setAuthenticated, forceLogout } = authSlice.actions;
export default authSlice.reducer;
