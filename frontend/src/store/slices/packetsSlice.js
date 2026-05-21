import { createSlice } from '@reduxjs/toolkit';
export const packetsSlice = createSlice({
  name: 'packets', initialState: { stream: [], isPaused: false }, reducers: {
    addPacket: (state, action) => { if (!state.isPaused) state.stream.unshift(action.payload); },
    togglePause: (state) => { state.isPaused = !state.isPaused; }
  }
});
export const { addPacket, togglePause } = packetsSlice.actions;
export default packetsSlice.reducer;
