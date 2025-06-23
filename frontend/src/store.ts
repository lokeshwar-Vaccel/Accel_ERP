import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
// Import slices here when created

const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store; 