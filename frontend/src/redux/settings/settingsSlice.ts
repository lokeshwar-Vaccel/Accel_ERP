import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../utils/api';

// Types
export interface SystemSetting {
  id: string;
  category: 'general' | 'email' | 'sms' | 'whatsapp' | 'notifications' | 'security' | 'business';
  key: string;
  value: any;
  displayName: string;
  description?: string;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'password' | 'textarea' | 'email';
  isPublic: boolean;
  updatedBy: string;
  updatedAt: Date;
}

// Company data interface matching backend model
export interface CompanyData {
  _id?: string;
  companyName: string;
  companyAddress: string;
  contactPhone: string;
  contactEmail: string;
  companyPan: string;
  companyBankDetails: {
    accNo: string;
    bankName: string;
    ifscCode: string;
    branch: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

interface SettingsState {
  settings: SystemSetting[];
  companyData: CompanyData | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
}

const initialState: SettingsState = {
  settings: [],
  companyData: null,
  loading: false,
  saving: false,
  error: null,
  success: null,
};

// Async thunks
export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.admin.getSettings();
      return response.data?.settings || [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch settings');
    }
  }
);

// Fetch company data
export const fetchCompanyData = createAsyncThunk(
  'settings/fetchCompanyData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.generalSettings.getAll();
      return response.data?.companies?.[0] || null; // Get first company
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch company data');
    }
  }
);

// Create company data
export const createCompanyData = createAsyncThunk(
  'settings/createCompanyData',
  async (companyData: Omit<CompanyData, '_id'>, { rejectWithValue }) => {
    try {
      const response = await apiClient.generalSettings.create(companyData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create company data');
    }
  }
);

// Update company data
export const updateCompanyData = createAsyncThunk(
  'settings/updateCompanyData',
  async ({ id, companyData }: { id: string; companyData: Partial<CompanyData> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.generalSettings.update(id, companyData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update company data');
    }
  }
);

export const updateSetting = createAsyncThunk(
  'settings/updateSetting',
  async ({ key, value }: { key: string; value: any }, { rejectWithValue }) => {
    try {
      const response = await apiClient.admin.updateSetting(key, value);
      return { key, value, setting: response.data?.setting };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update setting');
    }
  }
);

export const updateMultipleSettings = createAsyncThunk(
  'settings/updateMultipleSettings',
  async (settings: { key: string; value: any }[], { rejectWithValue }) => {
    try {
      const promises = settings.map(({ key, value }) => 
        apiClient.admin.updateSetting(key, value)
      );
      await Promise.all(promises);
      return settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update settings');
    }
  }
);

// Slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
    setFormData: (state, action: PayloadAction<{ [key: string]: any }>) => {
      // Update settings with new form data
      state.settings = state.settings.map(setting => ({
        ...setting,
        value: action.payload[setting.key] !== undefined ? action.payload[setting.key] : setting.value
      }));
    },
    setCompanyFormData: (state, action: PayloadAction<Partial<CompanyData>>) => {
      if (state.companyData) {
        state.companyData = { ...state.companyData, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch settings
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
        state.error = null;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch company data
      .addCase(fetchCompanyData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyData.fulfilled, (state, action) => {
        state.loading = false;
        state.companyData = action.payload;
        state.error = null;
      })
      .addCase(fetchCompanyData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create company data
      .addCase(createCompanyData.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createCompanyData.fulfilled, (state, action) => {
        state.saving = false;
        state.companyData = action.payload;
        state.success = 'Company data created successfully';
      })
      .addCase(createCompanyData.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      // Update company data
      .addCase(updateCompanyData.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateCompanyData.fulfilled, (state, action) => {
        state.saving = false;
        state.companyData = action.payload;
        state.success = 'Company data updated successfully';
      })
      .addCase(updateCompanyData.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      // Update single setting
      .addCase(updateSetting.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateSetting.fulfilled, (state, action) => {
        state.saving = false;
        state.success = 'Setting updated successfully';
        // Update the specific setting in the state
        const index = state.settings.findIndex(s => s.key === action.payload.key);
        if (index !== -1) {
          state.settings[index].value = action.payload.value;
        }
      })
      .addCase(updateSetting.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      // Update multiple settings
      .addCase(updateMultipleSettings.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateMultipleSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.success = 'Settings updated successfully';
        // Update multiple settings in the state
        action.payload.forEach(({ key, value }) => {
          const index = state.settings.findIndex(s => s.key === key);
          if (index !== -1) {
            state.settings[index].value = value;
          }
        });
      })
      .addCase(updateMultipleSettings.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSuccess, setFormData, setCompanyFormData } = settingsSlice.actions;
export default settingsSlice.reducer; 