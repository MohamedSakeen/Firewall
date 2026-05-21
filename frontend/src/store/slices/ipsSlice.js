import { createSlice } from '@reduxjs/toolkit';
export const ipsSlice = createSlice({
  name: 'ips', initialState: { actions: [], currentlyBlocked: [] }, reducers: {
    setActions: (state, action) => { state.actions = action.payload; },
    setBlocked: (state, action) => { state.currentlyBlocked = action.payload; }
  }
});
export const { setActions, setBlocked } = ipsSlice.actions;
export default ipsSlice.reducer;
