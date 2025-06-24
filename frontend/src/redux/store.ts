import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import userSlice from './auth/userSlice';
import navigationSlice from './auth/navigationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
     navigation: navigationSlice,
    user: userSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
