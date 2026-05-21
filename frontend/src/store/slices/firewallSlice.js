import { createSlice } from '@reduxjs/toolkit';
export const firewallSlice = createSlice({
  name: 'firewall', initialState: { rules: [] }, reducers: {
    setRules: (state, action) => { state.rules = action.payload; }
  }
});
export const { setRules } = firewallSlice.actions;
export default firewallSlice.reducer;
