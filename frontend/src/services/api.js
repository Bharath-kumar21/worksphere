// Centralized API Service for WorkSphere SaaS
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

function getHeaders(isMultipart = false) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const isMultipart = options.body instanceof FormData;
  const config = {
    ...options,
    headers: {
      ...getHeaders(isMultipart),
      ...options.headers,
    },
  };

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  auth: {
    login: (credentials) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (userData) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    me: () => request('/auth/me'),
    updateProfile: (profileData) =>
      request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      }),
    forgotPassword: (email) =>
      request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (payload) =>
      request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Organization
  organizations: {
    getCurrent: () => request('/organizations/current'),
    updateCurrent: (data) =>
      request('/organizations/current', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Users
  users: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/users${qs ? '?' + qs : ''}`);
    },
    create: (userData) =>
      request('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    get: (id) => request(`/users/${id}`),
    update: (id, userData) =>
      request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      }),
    delete: (id) =>
      request(`/users/${id}`, {
        method: 'DELETE',
      }),
  },

  // Teams
  teams: {
    list: () => request('/teams'),
    create: (data) =>
      request('/teams', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id) => request(`/teams/${id}`),
    update: (id, data) =>
      request(`/teams/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      request(`/teams/${id}`, {
        method: 'DELETE',
      }),
    addMember: (teamId, memberData) =>
      request(`/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify(memberData),
      }),
    removeMember: (teamId, userId) =>
      request(`/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      }),
    getDashboard: (teamId) => request(`/teams/${teamId}/dashboard`),
  },

  // Projects
  projects: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/projects${qs ? '?' + qs : ''}`);
    },
    myProjects: () => request('/projects/my-projects'),
    create: (data) =>
      request('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id) => request(`/projects/${id}`),
    update: (id, data) =>
      request(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      request(`/projects/${id}`, {
        method: 'DELETE',
      }),
    getDashboard: (id) => request(`/projects/${id}/dashboard`),
  },

  // Tasks
  tasks: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/tasks${qs ? '?' + qs : ''}`);
    },
    create: (data) =>
      request('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id) => request(`/tasks/${id}`),
    update: (id, data) =>
      request(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateStatus: (id, status) =>
      request(`/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    delete: (id) =>
      request(`/tasks/${id}`, {
        method: 'DELETE',
      }),
  },

  // Comments
  comments: {
    list: (taskId) => request(`/tasks/${taskId}/comments`),
    create: (taskId, comment) =>
      request(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),
    delete: (commentId) =>
      request(`/comments/${commentId}`, {
        method: 'DELETE',
      }),
  },

  // Attachments
  attachments: {
    list: (taskId) => request(`/tasks/${taskId}/attachments`),
    upload: (taskId, file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request(`/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });
    },
    delete: (attachmentId) =>
      request(`/attachments/${attachmentId}`, {
        method: 'DELETE',
      }),
    getDownloadUrl: (attachmentId) => `${BASE_URL}/attachments/${attachmentId}/download`,
  },

  // Dashboard
  dashboard: {
    getOverview: () => request('/dashboard/overview'),
    getMemberOverview: () => request('/dashboard/member-overview'),
  },

  // Calendar
  calendar: {
    getMyDeadlines: () => request('/calendar/my-deadlines'),
  },

  // Profile
  profile: {
    get: () => request('/profile'),
    update: (data) =>
      request('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Search
  search: {
    query: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  },

  // Reports
  reports: {
    getProjectsReport: () => request('/reports/projects'),
    getTeamWorkloadReport: () => request('/reports/team-workload'),
    downloadCsvUrl: (projectId = '') =>
      `/api/reports/export/csv${projectId ? '?project_id=' + projectId : ''}`,
  },

  // Activity Log
  activity: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/activity${qs ? '?' + qs : ''}`);
    },
  },

  // Notifications
  notifications: {
    list: () => request('/notifications'),
    getUnreadCount: () => request('/notifications/unread-count'),
    markRead: (id) =>
      request(`/notifications/${id}/read`, {
        method: 'PUT',
      }),
    markAllRead: () =>
      request('/notifications/read-all', {
        method: 'PUT',
      }),
  },

  // Project Chat
  chat: {
    getMessages: (projectId) => request(`/projects/${projectId}/messages`),
    sendMessage: (projectId, message) =>
      request(`/projects/${projectId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
  },
};
