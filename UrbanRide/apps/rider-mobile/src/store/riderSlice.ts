import { createSlice } from '@reduxjs/toolkit';

type RiderState = {
  isOnline: boolean;
};

const initialState: RiderState = {
  isOnline: false,
};

const riderSlice = createSlice({
  name: 'rider',
  initialState,
  reducers: {
    toggleOnline: (state) => {
      state.isOnline = !state.isOnline;
    },
  },
});

export const { toggleOnline } = riderSlice.actions;
export default riderSlice.reducer;
