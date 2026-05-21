import { configureStore } from '@reduxjs/toolkit';
import alertsReducer from './slices/alertsSlice';
import packetsReducer from './slices/packetsSlice';
import firewallReducer from './slices/firewallSlice';
import ipsReducer from './slices/ipsSlice';
import rulesReducer from './slices/rulesSlice';

export const store = configureStore({
  reducer: {
    alerts: alertsReducer,
    packets: packetsReducer,
    firewall: firewallReducer,
    ips: ipsReducer,
    rules: rulesReducer,
  },
});
