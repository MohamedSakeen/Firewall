import { createSlice } from '@reduxjs/toolkit';
export const rulesSlice = createSlice({
  name: 'rules', initialState: { configurations: {} }, reducers: {
    setConfigurations: (state, action) => { state.configurations = action.payload; }
  }
});
export const { setConfigurations } = rulesSlice.actions;
export default rulesSlice.reducer;
