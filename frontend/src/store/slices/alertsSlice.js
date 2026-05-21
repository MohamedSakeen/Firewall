import { createSlice } from '@reduxjs/toolkit';
const initialState = { alerts: [], loading: false, error: null };
export const alertsSlice = createSlice({
  name: 'alerts', initialState, reducers: {
    setAlerts: (state, action) => { state.alerts = action.payload; }
  }
});
export const { setAlerts } = alertsSlice.actions;
export default alertsSlice.reducer;
