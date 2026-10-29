require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;
let usePostgres = false;

// If DATABASE_URL is set (Render / Railway / Neon etc.)
if (process.env.DATABASE_URL) {
  const needsSsl = process.env.DB_SSL === 'true' ||
    /render\.com|neon\.tech|supabase\.co|sslmode=require/.test(process.env.DATABASE_URL);
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000
  });
  usePostgres = true;
} else if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') {
  pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pcte_alumni_db',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000
  });
  usePostgres = true;
}

// ------------------------------------------------------------------
// In-Memory Fallback Store (Active when cloud DB is not yet provisioned)
// Guarantees zero downtime & full functional demo on Render/cloud hosts.
// ------------------------------------------------------------------
const memStore = {
  users: [
    {
      user_id: 1,
      full_name: 'Administrator',
      email: 'admin@pcte.edu.in',
      password_hash: '$2b$10$Qn3VU168xnMlxu.M8UZv5erIg7VUDtQVN4e5fVQlkSdI.3j5Lhe0e', // admin123
      role: 'Admin',
      batch_program: 'Administration',
      job_title: 'System Administrator',
      bio: 'Head of PCTE Alumni Relations Office.',
      photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
      created_at: new Date()
    },
    {
      user_id: 2,
      full_name: 'Ankita',
      email: 'ankita@pcte.edu.in',
      password_hash: '$2b$10$YHekTLW2vO/nAiYxqjslGu4OzlEOnU6BpO0tCHrnOR8aOlbKIFf76', // user123
      role: 'Student / Alumnus',
      batch_program: 'Batch 2026 · B.Tech CSE',
      job_title: 'Full-Stack Developer Student',
      bio: 'Passionate about distributed web platforms and enterprise system design.',
      photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      created_at: new Date()
    }
  ],
  alumni_directory: [
    { alumni_id: 1, user_id: 1, name: 'Rahul Sharma', role_company: 'Software Architect at TechCorp', batch_degree: 'Batch 2018 · B.Tech CSE', photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop', created_at: new Date() },
    { alumni_id: 2, user_id: null, name: 'Priya Verma', role_company: 'Financial Analyst, Global Bank', batch_degree: 'Batch 2020 · MBA Finance', photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop', created_at: new Date() },
    { alumni_id: 3, user_id: null, name: 'Amanpreet Singh', role_company: 'Product Manager, SaaS Solutions', batch_degree: 'Batch 2019 · BBA', photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', created_at: new Date() },
    { alumni_id: 4, user_id: 2, name: 'Neha Kapoor', role_company: 'UI/UX Lead Designer', batch_degree: 'Batch 2021 · BCA', photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', created_at: new Date() }
  ],
  events: [
    { event_id: 1, title: 'Navigating Enterprise Cloud & System Architecture', description: 'Keynote session discussing modern microservices, Docker, and cloud deployments.', event_date: new Date('2026-11-15T10:00:00Z'), speaker_name: 'Rahul Sharma', location: 'PCTE Main Auditorium' },
    { event_id: 2, title: 'Financial Modeling & Investment Strategies', description: 'Practical guidance on global markets and corporate finance.', event_date: new Date('2026-11-22T09:30:00Z'), speaker_name: 'Priya Verma', location: 'PCTE Seminar Hall' }
  ],
  event_rsvps: [
    { rsvp_id: 1, event_id: 1, user_id: 2, registered_at: new Date() }
  ],
  contact_requests: [],
  get_started_leads: []
};

let userSeq = 10;
let alumniSeq = 10;
let rsvpSeq = 10;
let contactSeq = 10;
let leadSeq = 10;

function executeMemoryQuery(sql, params) {
  const norm = sql.trim().toLowerCase();

  // Health check: SELECT 1
  if (norm.startsWith('select 1')) {
    return [[{ '?column?': 1 }]];
  }

  // COUNT queries for admin stats
  if (norm.includes('count(*)')) {
    if (norm.includes('from users')) return [[{ count: memStore.users.length }]];
    if (norm.includes('from alumni_directory')) return [[{ count: memStore.alumni_directory.length }]];
    if (norm.includes('from events')) return [[{ count: memStore.events.length }]];
    if (norm.includes('from event_rsvps')) return [[{ count: memStore.event_rsvps.length }]];
    if (norm.includes('from contact_requests')) return [[{ count: memStore.contact_requests.length }]];
    return [[{ count: 0 }]];
  }

  // SELECT ... FROM users WHERE email = ? LIMIT 1 (Login check)
  if (norm.includes('from users where email') && (norm.includes('limit 1') || norm.includes('password_hash'))) {
    const email = String(params[0] || '').toLowerCase();
    const user = memStore.users.find(u => u.email.toLowerCase() === email);
    return [user ? [{ ...user }] : []];
  }

  // SELECT user_id FROM users WHERE email = ? (Registration duplicate check)
  if (norm.includes('from users where email')) {
    const email = String(params[0] || '').toLowerCase();
    const found = memStore.users.filter(u => u.email.toLowerCase() === email);
    return [found.map(u => ({ user_id: u.user_id }))];
  }

  // INSERT INTO users
  if (norm.startsWith('insert into users')) {
    const [name, email, password_hash, role, batch_program, job_title] = params;
    const newId = ++userSeq;
    const newUser = {
      user_id: newId,
      full_name: name,
      email: email.toLowerCase(),
      password_hash,
      role: role || 'Student / Alumnus',
      batch_program: batch_program || null,
      job_title: job_title || null,
      bio: null,
      photo_url: null,
      created_at: new Date()
    };
    memStore.users.push(newUser);
    const rows = [newUser];
    rows.insertId = newId;
    return [rows];
  }

  // SELECT ... FROM users WHERE user_id = ?
  if (norm.includes('from users where user_id =')) {
    const id = Number(params[0]);
    const user = memStore.users.find(u => u.user_id === id);
    return [user ? [user] : []];
  }

  // UPDATE users SET ... WHERE user_id = ?
  if (norm.startsWith('update users')) {
    const id = Number(params[params.length - 1]);
    const user = memStore.users.find(u => u.user_id === id);
    if (user) {
      if (params[0]) user.full_name = params[0];
      if (params[1]) user.job_title = params[1];
      if (params[2]) user.batch_program = params[2];
      if (params[3]) user.bio = params[3];
      if (params[4]) user.photo_url = params[4];
    }
    const rows = user ? [user] : [];
    rows.rowCount = 1;
    return [rows];
  }

  // SELECT ... FROM alumni_directory
  if (norm.startsWith('select') && norm.includes('from alumni_directory')) {
    return [[...memStore.alumni_directory]];
  }

  // INSERT INTO alumni_directory
  if (norm.startsWith('insert into alumni_directory')) {
    const [name, role_company, batch_degree, photo_url] = params;
    const newId = ++alumniSeq;
    const newAlumnus = {
      alumni_id: newId,
      user_id: null,
      name,
      role_company,
      batch_degree,
      photo_url: photo_url || null,
      created_at: new Date()
    };
    memStore.alumni_directory.push(newAlumnus);
    const rows = [newAlumnus];
    rows.insertId = newId;
    return [rows];
  }

  // UPDATE alumni_directory
  if (norm.startsWith('update alumni_directory')) {
    const id = Number(params[params.length - 1]);
    const item = memStore.alumni_directory.find(a => a.alumni_id === id);
    if (item) {
      item.name = params[0];
      item.role_company = params[1];
      item.batch_degree = params[2];
      item.photo_url = params[3] || null;
    }
    const rows = item ? [item] : [];
    rows.rowCount = 1;
    return [rows];
  }

  // DELETE FROM alumni_directory
  if (norm.startsWith('delete from alumni_directory')) {
    const id = Number(params[0]);
    memStore.alumni_directory = memStore.alumni_directory.filter(a => a.alumni_id !== id);
    const rows = [];
    rows.rowCount = 1;
    return [rows];
  }

  // SELECT ... FROM events
  if (norm.startsWith('select') && norm.includes('from events') && !norm.includes('event_rsvps')) {
    return [[...memStore.events]];
  }

  // SELECT rsvp_id FROM event_rsvps WHERE event_id = ? AND user_id = ?
  if (norm.includes('from event_rsvps where event_id =')) {
    const [eId, uId] = params.map(Number);
    const found = memStore.event_rsvps.filter(r => r.event_id === eId && r.user_id === uId);
    return [found];
  }

  // INSERT INTO event_rsvps
  if (norm.startsWith('insert into event_rsvps')) {
    const [eId, uId] = params.map(Number);
    const newId = ++rsvpSeq;
    const rsvp = { rsvp_id: newId, event_id: eId, user_id: uId, registered_at: new Date() };
    memStore.event_rsvps.push(rsvp);
    const rows = [rsvp];
    rows.insertId = newId;
    return [rows];
  }

  // SELECT ... FROM event_rsvps r JOIN events e ...
  if (norm.includes('from event_rsvps') && norm.includes('join events')) {
    const uId = Number(params[0]);
    const userRsvps = memStore.event_rsvps.filter(r => r.user_id === uId);
    const result = userRsvps.map(r => {
      const ev = memStore.events.find(e => e.event_id === r.event_id) || {};
      return {
        event_id: ev.event_id,
        title: ev.title,
        description: ev.description,
        event_date: ev.event_date,
        speaker_name: ev.speaker_name,
        location: ev.location,
        registered_at: r.registered_at
      };
    });
    return [result];
  }

  // INSERT INTO contact_requests
  if (norm.startsWith('insert into contact_requests')) {
    const [full_name, email, mobile_number, batch_program] = params;
    const newId = ++contactSeq;
    const item = { request_id: newId, full_name, email, mobile_number, batch_program, created_at: new Date() };
    memStore.contact_requests.push(item);
    const rows = [item];
    rows.insertId = newId;
    return [rows];
  }

  // SELECT lead_id FROM get_started_leads WHERE email = ?
  if (norm.includes('from get_started_leads where email =')) {
    const email = String(params[0] || '').toLowerCase();
    const found = memStore.get_started_leads.filter(l => l.email === email);
    return [found];
  }

  // INSERT INTO get_started_leads
  if (norm.startsWith('insert into get_started_leads')) {
    const email = String(params[0] || '').toLowerCase();
    const newId = ++leadSeq;
    const item = { lead_id: newId, email, submitted_at: new Date() };
    memStore.get_started_leads.push(item);
    const rows = [item];
    rows.insertId = newId;
    return [rows];
  }

  return [[]];
}

const db = {
  pool,
  isPostgresActive: false,

  query: async (sql, params = []) => {
    if (usePostgres && pool) {
      try {
        let text = sql.trim().replace(/;$/, '');
        const isInsert = /^insert\s/i.test(text);
        if (isInsert && !/\breturning\b/i.test(text)) text += ' RETURNING *';
        let i = 0;
        text = text.replace(/\?/g, () => `$${++i}`);
        const result = await pool.query(text, params);
        const rows = result.rows;
        if (isInsert && rows[0]) rows.insertId = Object.values(rows[0])[0];
        return [rows];
      } catch (err) {
        console.warn(`[DB] Query on PostgreSQL failed: ${err.message}. Falling back to memory store.`);
        usePostgres = false;
      }
    }
    return executeMemoryQuery(sql, params);
  },

  initSchema: async () => {
    if (usePostgres && pool) {
      try {
        const schemaPath = path.join(__dirname, 'schema_postgres.sql');
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await pool.query(schemaSql);
          db.isPostgresActive = true;
          console.log('✅ PostgreSQL Database schema & seed verified successfully.');
          return;
        }
      } catch (err) {
        console.warn(`⚠️ Cloud PostgreSQL schema init failed: ${err.message}. Running in self-contained demo mode.`);
        usePostgres = false;
      }
    }
    console.log('⚡ Running in self-contained in-memory database mode (Seed data active).');
  }
};

module.exports = db;
