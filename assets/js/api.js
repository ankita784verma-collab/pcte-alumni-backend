/**
 * PCTE Alumni Talks — Enterprise API Client
 * Connects frontend UI components to the Express + PostgreSQL Backend.
 */

(function (window) {
  // Determine API base URL:
  // 1. Explicit window.PCTE_API_URL or localStorage override
  // 2. If running directly on the Render backend domain, use relative '/api'
  // 3. If running locally (localhost / 127.0.0.1) -> http://localhost:5000/api
  // 4. Cloud production fallback -> Render backend URL
  const isRenderHost = window.location.hostname.includes('onrender.com');
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  let defaultBase = 'https://pcte-alumni-backendpcte-alumni-backend.onrender.com/api';
  if (isRenderHost) {
    defaultBase = '/api';
  } else if (isLocal) {
    defaultBase = 'http://localhost:5000/api';
  }

  const BASE_URL = (
    window.PCTE_API_URL || window.PCTE_API_BASE ||
    localStorage.getItem('pcte_api_url') ||
    defaultBase
  ).replace(/\/$/, '');

  // Default seed fallback for offline / demo mode
  const FALLBACK_ALUMNI = [
    { id: 1, alumni_id: 1, name: "Rahul Sharma", role: "Software Architect at TechCorp", batch: "Batch 2018 · B.Tech CSE", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop" },
    { id: 2, alumni_id: 2, name: "Priya Verma", role: "Financial Analyst, Global Bank", batch: "Batch 2020 · MBA Finance", photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop" },
    { id: 3, alumni_id: 3, name: "Amanpreet Singh", role: "Product Manager, SaaS Solutions", batch: "Batch 2019 · BBA", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop" },
    { id: 4, alumni_id: 4, name: "Neha Kapoor", role: "UI/UX Lead Designer", batch: "Batch 2021 · BCA", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop" }
  ];

  const API = {
    BASE_URL,

    getToken() {
      return localStorage.getItem('pcte_token');
    },

    setToken(token) {
      if (token) localStorage.setItem('pcte_token', token);
      else localStorage.removeItem('pcte_token');
    },

    getCurrentUser() {
      const session = localStorage.getItem('pcte_logged_user');
      try {
        return session ? JSON.parse(session) : null;
      } catch (e) {
        return null;
      }
    },

    setCurrentUser(user) {
      if (user) localStorage.setItem('pcte_logged_user', JSON.stringify(user));
      else localStorage.removeItem('pcte_logged_user');
    },

    isLoggedIn() {
      return Boolean(this.getCurrentUser() && this.getToken());
    },

    isAdmin() {
      const user = this.getCurrentUser();
      return Boolean(user && user.role === 'Admin');
    },

    logout() {
      this.setToken(null);
      this.setCurrentUser(null);
      window.location.href = 'index.html';
    },

    async request(endpoint, options = {}) {
      const url = `${this.BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await fetch(url, { ...options, headers });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || `Request failed with status ${response.status}`);
        }
        return data;
      } catch (err) {
        console.warn(`[PCTE API] Request to ${url} failed:`, err.message);
        throw err;
      }
    },

    async checkHealth() {
      return this.request('/health');
    },

    async register({ name, full_name, email, password, role, batch_program, job_title }) {
      const payload = {
        name: full_name || name,
        full_name: full_name || name,
        email,
        password,
        role: role || 'Student / Alumnus',
        batch_program,
        job_title
      };
      const res = await this.request('/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.token && res.user) {
        this.setToken(res.token);
        this.setCurrentUser(res.user);
      }
      return res;
    },

    async login({ email, password }) {
      const res = await this.request('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.token && res.user) {
        this.setToken(res.token);
        this.setCurrentUser(res.user);
      }
      return res;
    },

    async getProfile() {
      const res = await this.request('/me');
      if (res.user) {
        this.setCurrentUser(res.user);
      }
      return res.user;
    },

    async updateProfile(profileData) {
      const res = await this.request('/me', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
      if (res.user) {
        this.setCurrentUser(res.user);
      }
      return res;
    },

    async getAlumni() {
      try {
        const res = await this.request('/alumni');
        if (res.data && res.data.length > 0) {
          localStorage.setItem('pcte_alumni_data', JSON.stringify(res.data));
          return res.data;
        }
      } catch (err) {
        console.warn('Backend unavailable, falling back to cached/seed alumni directory.');
      }
      const cached = localStorage.getItem('pcte_alumni_data');
      return cached ? JSON.parse(cached) : FALLBACK_ALUMNI;
    },

    async addAlumni({ name, role, role_company, batch, batch_degree, photo, photo_url }) {
      const payload = {
        name,
        role_company: role_company || role,
        batch_degree: batch_degree || batch,
        photo_url: photo_url || photo
      };
      return this.request('/alumni', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    async updateAlumni(id, { name, role, role_company, batch, batch_degree, photo, photo_url }) {
      const payload = {
        name,
        role_company: role_company || role,
        batch_degree: batch_degree || batch,
        photo_url: photo_url || photo
      };
      return this.request(`/alumni/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },

    async deleteAlumni(id) {
      return this.request(`/alumni/${id}`, {
        method: 'DELETE'
      });
    },

    async getEvents() {
      try {
        const res = await this.request('/events');
        return res.data || [];
      } catch (err) {
        return [];
      }
    },

    async rsvpEvent(eventId) {
      return this.request(`/events/${eventId}/rsvp`, {
        method: 'POST'
      });
    },

    async getUserRsvps() {
      try {
        const res = await this.request('/user/rsvps');
        return res.data || [];
      } catch (err) {
        return [];
      }
    },

    async submitContact(data) {
      return this.request('/contact', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async submitLead(email) {
      return this.request('/leads', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    },

    async getAdminStats() {
      return this.request('/admin/stats');
    }
  };

  window.API = API;
})(window);
