import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Ride = {
  id: string;
  pickup: string;
  drop: string;
  amount: string;
  time: string;
};

type RiderState = {
  isOnline: boolean;
  activeRide: Ride | null;
  rideHistory: Ride[];
};

const initialState: RiderState = {
  isOnline: false,
  activeRide: null,
  rideHistory: [],
};

const riderSlice = createSlice({
  name: 'rider',
  initialState,
  reducers: {
    toggleOnline: (state) => {
      state.isOnline = !state.isOnline;
    },
    acceptRide: (state, action: PayloadAction<Ride>) => {
      state.activeRide = action.payload;
    },
    completeRide: (state) => {
      if (state.activeRide) {
        state.rideHistory.unshift(state.activeRide);
        state.activeRide = null;
      }
    },
  },
});

export const { toggleOnline, acceptRide, completeRide } = riderSlice.actions;
export default riderSlice.reducer;
