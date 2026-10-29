/**
 * PCTE Alumni Talks - API client (talks to the Express/PostgreSQL backend)
 * Requires assets/js/config.js to be loaded first.
 */
const API = {
  SESSION_KEY: 'pcte_logged_user',

  // ---- session -------------------------------------------------------
  getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY)); } catch (e) { return null; }
  },
  setCurrentUser(user) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
  },
  isAdmin() {
    const u = this.getCurrentUser();
    return !!(u && u.token && String(u.role).toLowerCase() === 'admin');
  },
  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    window.location.href = 'index.html';
  },
  /** Redirect to login unless signed in (and, optionally, an admin). */
  requireLogin(adminOnly) {
    const u = this.getCurrentUser();
    if (!u || !u.token || (adminOnly && !this.isAdmin())) {
      window.location.href = 'login.html';
      return null;
    }
    return u;
  },

  // ---- http ----------------------------------------------------------
  async request(method, path, body) {
    const u = this.getCurrentUser();
    const headers = { 'Content-Type': 'application/json' };
    if (u && u.token) headers.Authorization = 'Bearer ' + u.token;
    let res;
    try {
      res = await fetch(window.PCTE_API_BASE + path, {
        method, headers, body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new Error('Cannot reach the server. If it was idle, wait ~30s and try again.');
    }
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && u && u.token) {          // token expired / invalid
      localStorage.removeItem(this.SESSION_KEY);
    }
    if (!res.ok || data.success === false) {
      throw new Error(data.message || ('Request failed (' + res.status + ')'));
    }
    return data;
  },
  get(p)        { return this.request('GET', p); },
  post(p, b)    { return this.request('POST', p, b); },
  put(p, b)     { return this.request('PUT', p, b); },
  del(p)        { return this.request('DELETE', p); },

  // ---- auth ----------------------------------------------------------
  _store(data) {
    this.setCurrentUser({ ...data.user, token: data.token });
    return data.user;
  },
  async login(email, password) {
    return this._store(await this.post('/login', { email, password }));
  },
  async register(payload) {
    return this._store(await this.post('/register', payload));
  },

  // ---- alumni directory ---------------------------------------------
  /** Returns [{id, name, role, batch, photo}] */
  async getAlumni() {
    const r = await this.get('/alumni');
    return r.data.map(a => ({
      id: a.alumni_id, name: a.name, role: a.role_company, batch: a.batch_degree, photo: a.photo_url
    }));
  },
  _alumniBody(a) {
    return { name: a.name, role_company: a.role, batch_degree: a.batch, photo_url: a.photo || null };
  },
  addAlumnus(a)        { return this.post('/alumni', this._alumniBody(a)); },
  updateAlumnus(id, a) { return this.put('/alumni/' + id, this._alumniBody(a)); },
  deleteAlumnus(id)    { return this.del('/alumni/' + id); },

  // ---- events / forms -----------------------------------------------
  getEvents()          { return this.get('/events').then(r => r.data); },
  rsvp(eventId)        { return this.post('/events/' + eventId + '/rsvp'); },
  submitContact(p)     { return this.post('/contact', p); },
  submitLead(email)    { return this.post('/leads', { email }); },
  getAdminStats()      { return this.get('/admin/stats').then(r => r.stats); }
};

/** Escape text before putting it into innerHTML. */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
