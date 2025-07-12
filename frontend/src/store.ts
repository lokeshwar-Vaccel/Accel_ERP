import { configureStore } from '@reduxjs/toolkit';
import authReducer from './redux/auth/authSlice';
import settingsReducer from './redux/settings/settingsSlice';
// Import slices here when created

const store = configureStore({
  reducer: {
    auth: authReducer,
    settings: settingsReducer,
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