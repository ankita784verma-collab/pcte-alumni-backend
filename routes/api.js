const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = require('../secret');

// ----------------------------------------------------
// 0. HEALTH CHECK
// ----------------------------------------------------
router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ success: true, message: 'PCTE Alumni API & PostgreSQL database connected successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'API is running, but database connection failed.', error: error.message });
  }
});

// ----------------------------------------------------
// 1. AUTH: REGISTER
// ----------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { name, full_name, email, password, batch_program, job_title } = req.body;
    const userName = (full_name || name || '').trim();
    const userEmail = (email || '').trim().toLowerCase();
    // Admin accounts can never be self-registered; promote via SQL (see README).
    const userRole = 'Student / Alumnus';

    if (!userName || !userEmail || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check existing email
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [userEmail]);
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, batch_program, job_title)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userName, userEmail, passwordHash, userRole, batch_program || null, job_title || null]
    );

    const insertedId = result.insertId || (result[0] && result[0].user_id);
    const newUser = {
      id: insertedId,
      name: userName,
      email: userEmail,
      role: userRole
    };

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Database error occurred during registration.' });
  }
});

// ----------------------------------------------------
// 2. AUTH: LOGIN
// ----------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userEmail = (email || '').trim().toLowerCase();

    if (!userEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const [rows] = await db.query(
      `SELECT user_id, full_name, email, password_hash, role, batch_program, job_title, bio, photo_url
       FROM users WHERE email = ? LIMIT 1`,
      [userEmail]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found! Please register first.' });
    }

    const user = rows[0];
    const passwordValid = await bcrypt.compare(String(password), user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        batch_program: user.batch_program,
        job_title: user.job_title,
        bio: user.bio,
        photo_url: user.photo_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Database error occurred during login.' });
  }
});

// ----------------------------------------------------
// 3. CURRENT USER PROFILE
// ----------------------------------------------------
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT user_id, full_name, email, role, batch_program, job_title, bio, photo_url, created_at
       FROM users WHERE user_id = ?`,
      [req.user.id]
    );
    if (!rows || !rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const u = rows[0];
    res.json({
      success: true,
      user: {
        id: u.user_id,
        name: u.full_name,
        email: u.email,
        role: u.role,
        batch_program: u.batch_program,
        job_title: u.job_title,
        bio: u.bio,
        photo_url: u.photo_url,
        created_at: u.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not retrieve profile.' });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const { name, full_name, job_title, batch_program, bio, photo_url } = req.body;
    const updateName = (full_name || name || '').trim();

    await db.query(
      `UPDATE users
       SET full_name = COALESCE(NULLIF(?, ''), full_name),
           job_title = COALESCE(?, job_title),
           batch_program = COALESCE(?, batch_program),
           bio = COALESCE(?, bio),
           photo_url = COALESCE(?, photo_url)
       WHERE user_id = ?`,
      [updateName, job_title || null, batch_program || null, bio || null, photo_url || null, req.user.id]
    );

    const [rows] = await db.query(
      `SELECT user_id, full_name, email, role, batch_program, job_title, bio, photo_url, created_at
       FROM users WHERE user_id = ?`,
      [req.user.id]
    );

    const u = rows[0];
    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: u.user_id,
        name: u.full_name,
        email: u.email,
        role: u.role,
        batch_program: u.batch_program,
        job_title: u.job_title,
        bio: u.bio,
        photo_url: u.photo_url
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
});

// ----------------------------------------------------
// 4. ALUMNI DIRECTORY
// ----------------------------------------------------
router.get('/alumni', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT alumni_id, user_id, name, role_company, batch_degree, photo_url, created_at
       FROM alumni_directory ORDER BY alumni_id ASC`
    );
    // Format to match both { id, name, role, batch, photo } and { alumni_id, ... }
    const formatted = (rows || []).map(r => ({
      id: r.alumni_id,
      alumni_id: r.alumni_id,
      user_id: r.user_id,
      name: r.name,
      role: r.role_company,
      role_company: r.role_company,
      batch: r.batch_degree,
      batch_degree: r.batch_degree,
      photo: r.photo_url,
      photo_url: r.photo_url,
      created_at: r.created_at
    }));
    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Alumni directory error:', error);
    res.status(500).json({ success: false, message: 'Could not load alumni directory.' });
  }
});

router.post('/alumni', auth, adminOnly, async (req, res) => {
  try {
    const { name, role_company, role, batch_degree, batch, photo_url, photo } = req.body;
    const alName = name;
    const alRole = role_company || role;
    const alBatch = batch_degree || batch;
    const alPhoto = photo_url || photo || null;

    if (!alName || !alRole || !alBatch) {
      return res.status(400).json({ success: false, message: 'Name, role/company, and batch/degree are required.' });
    }

    const [result] = await db.query(
      `INSERT INTO alumni_directory (name, role_company, batch_degree, photo_url)
       VALUES (?, ?, ?, ?)`,
      [alName, alRole, alBatch, alPhoto]
    );

    const insertedId = result.insertId || (result[0] && result[0].alumni_id);

    res.status(201).json({
      success: true,
      message: 'Alumnus added to directory.',
      id: insertedId,
      data: {
        id: insertedId,
        alumni_id: insertedId,
        name: alName,
        role: alRole,
        role_company: alRole,
        batch: alBatch,
        batch_degree: alBatch,
        photo: alPhoto,
        photo_url: alPhoto
      }
    });
  } catch (error) {
    console.error('Add alumni error:', error);
    res.status(500).json({ success: false, message: 'Could not add alumni record.' });
  }
});

router.put('/alumni/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, role_company, batch_degree, photo_url } = req.body;
    if (!name || !role_company || !batch_degree) {
      return res.status(400).json({ success: false, message: 'Name, role/company, and batch/degree are required.' });
    }
    await db.query(
      `UPDATE alumni_directory SET name = ?, role_company = ?, batch_degree = ?, photo_url = ? WHERE alumni_id = ?`,
      [name, role_company, batch_degree, photo_url || null, Number(req.params.id)]
    );
    res.json({ success: true, message: 'Alumni record updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not update alumni record.' });
  }
});

router.delete('/alumni/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM alumni_directory WHERE alumni_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Alumni record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not delete alumni record.' });
  }
});

// ----------------------------------------------------
// 5. EVENTS & RSVPs
// ----------------------------------------------------
router.get('/events', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT event_id, title, description, event_date, speaker_name, location
       FROM events ORDER BY event_date ASC`
    );
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load events.' });
  }
});

router.post('/events/:id/rsvp', auth, async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const [existing] = await db.query(
      'SELECT rsvp_id FROM event_rsvps WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.id]
    );
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, message: 'You have already registered for this event.' });
    }

    await db.query(
      'INSERT INTO event_rsvps (event_id, user_id) VALUES (?, ?)',
      [eventId, req.user.id]
    );
    res.status(201).json({ success: true, message: 'RSVP confirmed for this event!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not complete RSVP.' });
  }
});

router.get('/user/rsvps', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.event_id, e.title, e.description, e.event_date, e.speaker_name, e.location, r.registered_at
       FROM event_rsvps r
       JOIN events e ON r.event_id = e.event_id
       WHERE r.user_id = ?
       ORDER BY e.event_date ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load your RSVPs.' });
  }
});

// ----------------------------------------------------
// 6. CONTACT REQUESTS & LEADS
// ----------------------------------------------------
router.post('/contact', async (req, res) => {
  try {
    const { full_name, name, email, mobile_number, mobile, phone, batch_program, batch } = req.body;
    const cName = (full_name || name || '').trim();
    const cEmail = (email || '').trim().toLowerCase();
    const cPhone = (mobile_number || mobile || phone || '').trim();
    const cBatch = (batch_program || batch || '').trim();

    if (!cName || !cEmail || !cPhone || !cBatch) {
      return res.status(400).json({ success: false, message: 'All contact fields are required.' });
    }

    await db.query(
      `INSERT INTO contact_requests (full_name, email, mobile_number, batch_program)
       VALUES (?, ?, ?, ?)`,
      [cName, cEmail, cPhone, cBatch]
    );
    res.status(201).json({ success: true, message: 'Thank you! Your request has been received by the PCTE Alumni Relations Office.' });
  } catch (error) {
    console.error('Contact submit error:', error);
    res.status(500).json({ success: false, message: 'Could not submit contact request.' });
  }
});

router.post('/leads', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await db.query('SELECT lead_id FROM get_started_leads WHERE email = ?', [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(200).json({ success: true, message: 'You are already on our community list!' });
    }
    await db.query('INSERT INTO get_started_leads (email) VALUES (?)', [cleanEmail]);
    res.status(201).json({ success: true, message: 'Welcome to PCTE Alumni Talks! Thank you for your interest.' });
  } catch (error) {
    console.error('Lead submit error:', error);
    res.status(500).json({ success: false, message: 'Could not save lead.' });
  }
});

// ----------------------------------------------------
// 7. ADMIN DASHBOARD STATS
// ----------------------------------------------------
router.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const [usersRows]    = await db.query('SELECT COUNT(*) AS count FROM users');
    const [alumniRows]   = await db.query('SELECT COUNT(*) AS count FROM alumni_directory');
    const [eventsRows]   = await db.query('SELECT COUNT(*) AS count FROM events');
    const [rsvpsRows]    = await db.query('SELECT COUNT(*) AS count FROM event_rsvps');
    const [contactsRows] = await db.query('SELECT COUNT(*) AS count FROM contact_requests');

    res.json({
      success: true,
      stats: {
        totalUsers:           Number((usersRows && usersRows[0] && usersRows[0].count) || 0),
        totalAlumni:          Number((alumniRows && alumniRows[0] && alumniRows[0].count) || 0),
        totalEvents:          Number((eventsRows && eventsRows[0] && eventsRows[0].count) || 0),
        totalRsvps:           Number((rsvpsRows && rsvpsRows[0] && rsvpsRows[0].count) || 0),
        totalContactRequests: Number((contactsRows && contactsRows[0] && contactsRows[0].count) || 0)
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Could not load admin stats.' });
  }
});

module.exports = router;
