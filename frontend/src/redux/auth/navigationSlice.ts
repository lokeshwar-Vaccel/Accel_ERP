import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface NavigationState {
  breadcrumbs: BreadcrumbItem[];
  sidebarCollapsed: boolean;
  currentModule: string;
}

const initialState: NavigationState = {
  breadcrumbs: [{ label: 'Dashboard', path: '/' }],
  sidebarCollapsed: false,
  currentModule: 'dashboard',
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setBreadcrumbs: (state, action: PayloadAction<BreadcrumbItem[]>) => {
      state.breadcrumbs = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setCurrentModule: (state, action: PayloadAction<string>) => {
      state.currentModule = action.payload;
    },
  },
});

export const { setBreadcrumbs, toggleSidebar, setSidebarCollapsed, setCurrentModule } = navigationSlice.actions;
export default navigationSlice.reducer;