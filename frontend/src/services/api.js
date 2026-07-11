import axios from 'axios';

// Use Render backend URL in production, proxy in development
const API_URL = import.meta.env.PROD 
  ? 'https://love-x9y7.onrender.com/api'
  : '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const proposalAPI = {
  create: (data) => api.post('/proposals', data),
  getByLink: (link) => api.get(`/proposals/${link}`),
  getMy: () => api.get('/proposals/my'),
  update: (id, data) => api.put(`/proposals/${id}`, data),
  delete: (id) => api.delete(`/proposals/${id}`),
  respond: (link, response) => api.post(`/proposals/${link}/respond`, { response }),
};

export const galleryAPI = {
  upload: (proposalId, file) => {
    const formData = new FormData();
    formData.append('media', file);
    formData.append('proposalId', proposalId);
    return api.post('/gallery/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadVoice: (proposalId, audio, duration) => {
    const formData = new FormData();
    formData.append('audio', audio);
    formData.append('proposalId', proposalId);
    formData.append('duration', duration);
    return api.post('/gallery/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  get: (proposalId) => api.get(`/gallery/${proposalId}`),
  unlock: (proposalId, password) => api.post('/gallery/unlock', { proposalId, password }),
  delete: (mediaId) => api.delete(`/gallery/${mediaId}`),
  changePassword: (proposalId, currentPassword, newPassword) =>
    api.put('/gallery/password', { proposalId, currentPassword, newPassword }),
};

export default api;
