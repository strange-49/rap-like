import {
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';

export type RideStatus =
  | 'REQUESTED'
  | 'SEARCHING'
  | 'ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'UNKNOWN';

export function rideStatusFromApi(status: string): RideStatus {
  switch (status) {
    case 'REQUESTED':
    case 'SEARCHING':
    case 'ASSIGNED':
    case 'DRIVER_ARRIVING':
    case 'IN_PROGRESS':
    case 'COMPLETED':
    case 'CANCELLED':
      return status;
    default:
      return 'UNKNOWN';
  }
}

export type Ride = {
  id: string;
  customerId: string;

  pickup: string;
  pickupLatitude: number;
  pickupLongitude: number;

  drop: string;
  dropLatitude: number;
  dropLongitude: number;

  amount: number | null;
  distance: number | null;
  time: string;
  riderCompletedAt?: string | null;
  customerCompletedAt?: string | null;
  startOtpRequired?: boolean;
  payment?: {
    status: string;
    amount: number | null;
    mode: string;
  } | null;

  status: RideStatus;
};

type RiderState = {
  isOnline: boolean;
  requestedRides: Ride[];
  activeRide: Ride | null;
  rideHistory: Ride[];
};

const initialState: RiderState = {
  isOnline: false,
  requestedRides: [],
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

    setRequestedRides: (
      state,
      action: PayloadAction<Ride[]>,
    ) => {
      state.requestedRides = action.payload;
    },

    clearRequestedRides: (state) => {
      state.requestedRides = [];
    },

    setRideHistory: (state, action: PayloadAction<Ride[]>) => {
      state.rideHistory = action.payload;
    },

    setActiveRide: (
      state,
      action: PayloadAction<Ride | null>,
    ) => {
      state.activeRide = action.payload;

      if (action.payload) {
        state.requestedRides =
          state.requestedRides.filter(
            (ride) => ride.id !== action.payload?.id,
          );
      }
    },

    acceptRide: (
      state,
      action: PayloadAction<Ride>,
    ) => {
      state.activeRide = {
        ...action.payload,
        status: action.payload.status,
      };

      state.requestedRides =
        state.requestedRides.filter(
          (ride) => ride.id !== action.payload.id,
        );
    },

    updateActiveRideStatus: (
      state,
      action: PayloadAction<RideStatus>,
    ) => {
      if (state.activeRide) {
        state.activeRide.status = action.payload;
      }
    },

    completeRide: (state) => {
      if (state.activeRide) {
        state.rideHistory.unshift({
          ...state.activeRide,
          status: 'COMPLETED',
        });

        state.activeRide = null;
      }
    },
  },
});

export const {
  toggleOnline,
  setRequestedRides,
  clearRequestedRides,
  setRideHistory,
  setActiveRide,
  acceptRide,
  updateActiveRideStatus,
  completeRide,
} = riderSlice.actions;

export default riderSlice.reducer;
