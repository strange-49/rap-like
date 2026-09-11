import { configureStore } from '@reduxjs/toolkit';

import riderReducer from './riderSlice';

export const store = configureStore({
  reducer: {
    rider: riderReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
