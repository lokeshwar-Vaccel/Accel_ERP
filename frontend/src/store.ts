import { configureStore } from '@reduxjs/toolkit';
import authReducer from './redux/auth/authSlice';
import userSlice from './redux/auth/userSlice';
import navigationSlice from './redux/auth/navigationSlice';
import settingsReducer from './redux/settings/settingsSlice';
import notificationReducer from './redux/notifications/notificationSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    navigation: navigationSlice,
    user: userSlice,
    settings: settingsReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store; 