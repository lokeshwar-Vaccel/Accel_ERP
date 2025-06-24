import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  lastLogin: string;
}

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  users: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@sunpowerservices.com',
      role: 'Super Admin',
      department: 'IT',
      status: 'active',
      lastLogin: '2024-01-15 10:30 AM'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@sunpowerservices.com',
      role: 'Manager',
      department: 'Operations',
      status: 'active',
      lastLogin: '2024-01-15 09:15 AM'
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike.chen@sunpowerservices.com',
      role: 'HR',
      department: 'Human Resources',
      status: 'active',
      lastLogin: '2024-01-14 04:45 PM'
    }
  ],
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<User[]>) => {
      state.users = action.payload;
    },
    addUser: (state, action: PayloadAction<User>) => {
      state.users.push(action.payload);
    },
    updateUser: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
    deleteUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(user => user.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setUsers, addUser, updateUser, deleteUser, setLoading, setError } = userSlice.actions;
export default userSlice.reducer;