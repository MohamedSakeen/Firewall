import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

export const fetchAlerts = () => api.get('/alerts').then(r => r.data);
export const fetchRecentAlerts = () => api.get('/dashboard/alerts/recent').then(r => r.data);
export const fetchDashboardStats = () => api.get('/dashboard/stats').then(r => r.data);
export const fetchBlocked = () => api.get('/blocked').then(r => r.data);
export const blockIp = (ip, reason = 'Manual Block') => api.post('/block', { ip, reason }).then(r => r.data);
export const unblockIp = (ip) => api.post('/unblock', { ip }).then(r => r.data);
export const fetchTraffic = () => api.get('/traffic').then(r => r.data);
export const fetchTrafficSummary = () => api.get('/traffic/summary').then(r => r.data);
export const fetchLiveTraffic = () => api.get('/traffic/live').then(r => r.data);
export const fetchFirewallRules = () => api.get('/firewall/rules').then(r => r.data);
export const addFirewallRule = (ruleData) => api.post('/firewall/rules', ruleData).then(r => r.data);
export const deleteFirewallRule = (ruleData) => api.post('/firewall/rules/delete', ruleData).then(r => r.data);
export const fetchRules = (type) => api.get(`/rules/${type}`).then(r => r.data);
export const saveRule = (type, filename, data) => api.put(`/rules/${type}/${filename}`, data).then(r => r.data);
export const fetchLogs = () => api.get('/logs').then(r => r.data);

export default api;

