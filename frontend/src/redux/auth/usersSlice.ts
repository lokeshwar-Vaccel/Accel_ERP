import { createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit';
import { User } from '../../types';

interface UsersState {
  users: User[];
}

const initialState: UsersState = {
  users: [], // You could preload dummy users here
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUsers(state, action: PayloadAction<User[]>) {
      state.users = action.payload;
    },
    addUser(state, action: PayloadAction<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>) {
      const newUser: User = {
        ...action.payload,
        id: nanoid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: '',
        avatar: '',
      };
      state.users.push(newUser);
    },
    updateUser(state, action: PayloadAction<{ id: string; data: Partial<User> }>) {
      const user = state.users.find(u => u.id === action.payload.id);
      if (user) {
        Object.assign(user, action.payload.data);
        user.updatedAt = new Date().toISOString();
      }
    },
    deleteUser(state, action: PayloadAction<string>) {
      state.users = state.users.filter(u => u.id !== action.payload);
    },
  },
});

export const { setUsers, addUser, updateUser, deleteUser } = usersSlice.actions;
export default usersSlice.reducer;
