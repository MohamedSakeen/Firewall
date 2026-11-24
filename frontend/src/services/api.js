import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api' });

export const fetchAlerts = () => api.get('/alerts').then(r => r.data);
export const fetchRecentAlerts = () => api.get('/dashboard/alerts/recent').then(r => r.data);
export const fetchDashboardStats = () => api.get('/dashboard/stats').then(r => r.data);
export const fetchBlocked = () => api.get('/blocked').then(r => r.data);
export const blockIp = (payload) => api.post('/block', payload).then(r => r.data);
export const unblockIp = (payload) => api.post('/unblock', typeof payload === 'string' ? { ip: payload } : payload).then(r => r.data);
export const fetchTraffic = () => api.get('/traffic').then(r => r.data);
export const fetchTrafficSummary = () => api.get('/traffic/summary').then(r => r.data);
export const fetchLiveTraffic = () => api.get('/traffic/live').then(r => r.data);
export const fetchFirewallRules = () => api.get('/firewall/rules').then(r => r.data);
export const addFirewallRule = (ruleData) => api.post('/firewall/rules', ruleData).then(r => r.data);
export const deleteFirewallRule = (ruleData) => api.post('/firewall/rules/delete', ruleData).then(r => r.data);
export const fetchRules = (type) => api.get(`/rules/${type}`).then(r => r.data);
export const saveRule = (type, filename, data) => api.put(`/rules/${type}/${filename}`, data).then(r => r.data);
export const fetchLogs = () => api.get('/logs').then(r => r.data);
export const fetchHealth = () => api.get('/health').then(r => r.data);

export const fetchSecurityEvents = (filters = {}) => api.get('/security-events', { params: filters }).then(r => r.data);
export const fetchSecurityEvent = (eventId) => api.get(`/security-events/${eventId}`).then(r => r.data);

export const fetchBaselines = () => api.get('/learning/baselines').then(r => r.data);
export const fetchDrift = () => api.get('/learning/drift').then(r => r.data);
export const fetchModels = () => api.get('/learning/models').then(r => r.data);
export const evaluateTrustGate = (payload) => api.post('/learning/trust-gate', payload).then(r => r.data);
export const postFeedback = (feedbackData) => api.post('/learning/feedback', feedbackData).then(r => r.data);

export const fetchIncidents = () => api.get('/incidents').then(r => r.data);
export const fetchIncidentGraph = (id) => api.get(`/incidents/${id}/graph`).then(r => r.data);
export const fetchIncidentTimeline = (id) => api.get(`/incidents/${id}/timeline`).then(r => r.data);
export const fetchIncidentPriorities = () => api.get('/incidents/priority').then(r => r.data);
export const predictIncidentNextStage = (id, payload) => api.post(`/incidents/${id}/predict`, payload).then(r => r.data);

export const simulatePolicy = (payload) => api.post('/simulation/simulate', payload).then(r => r.data);
export const counterfactualAnalysis = (payload) => api.post('/simulation/counterfactual', payload).then(r => r.data);
export const fetchResponseRecommendations = (payload) => api.post('/responses/recommendations', payload).then(r => r.data);
export const fetchShadowRules = () => api.get('/responses/shadow').then(r => r.data);
export const addShadowRule = (payload) => api.post('/responses/shadow', payload).then(r => r.data);
export const promoteShadowRule = (payload) => api.post('/responses/shadow/promote', payload).then(r => r.data);
export const verifyResponse = (payload) => api.post('/responses/verify', payload).then(r => r.data);
export const fetchDeception = () => api.get('/responses/deception').then(r => r.data);
export const fetchResponseCounterfactual = (payload) => api.post('/responses/counterfactual', payload).then(r => r.data);

export const fetchAutonomyStatus = () => api.get('/autonomy/status').then(r => r.data);
export const setAutonomyLevel = (payload) => api.post('/autonomy/level', payload).then(r => r.data);
export const triggerKillSwitch = (payload) => api.post('/autonomy/kill-switch', payload).then(r => r.data);
export const resetKillSwitch = (payload) => api.post('/autonomy/reset', payload).then(r => r.data);
export const rollbackAction = (payload) => api.post('/autonomy/rollback', payload).then(r => r.data);

export const fetchPostureScore = () => api.get('/posture/score').then(r => r.data);
export const runReplayScenario = (payload) => api.post('/posture/replay', payload).then(r => r.data);

export const fetchAssets = () => api.get('/assets').then(r => r.data);
export const registerAsset = (payload) => api.post('/assets', payload).then(r => r.data);
export const fetchAssetRelationships = () => api.get('/assets/relationships').then(r => r.data);
export const registerAssetRelationship = (payload) => api.post('/assets/relationships', payload).then(r => r.data);

export const queryThreatHunt = (payload) => api.post('/threat-hunt/query', payload).then(r => r.data);

export default api;
