const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pcte_alumni_enterprise_secret_key_2026';

// ----------------------------------------------------
// 0. HEALTH CHECK
// ----------------------------------------------------
router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ success: true, message: 'PCTE Alumni API & MySQL Database connected successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'API is running, but MySQL connection failed.', error: error.message });
  }
});

// ----------------------------------------------------
// 1. AUTH: REGISTER
// ----------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { name, full_name, email, password, role, batch_program, job_title } = req.body;
    const userName = (full_name || name || '').trim();
    const userEmail = (email || '').trim().toLowerCase();
    const userRole = role === 'Admin' ? 'Admin' : 'Student / Alumnus';

    if (!userName || !userEmail || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check existing email
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [userEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, batch_program, job_title)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userName, userEmail, passwordHash, userRole, batch_program || null, job_title || null]
    );

    const newUser = {
      id: result.insertId,
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
      `SELECT user_id, full_name, email, password_hash, role, batch_program, job_title, photo_url
       FROM users WHERE email = ? LIMIT 1`,
      [userEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found! Please register first.' });
    }

    const user = rows[0];

    // Support both bcrypt-hashed passwords and original seed plain-text passwords (e.g. admin123, user123)
    let passwordValid = false;
    if (user.password_hash === password) {
      passwordValid = true;
    } else {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    }

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
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not retrieve profile.' });
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
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Alumni directory error:', error);
    res.status(500).json({ success: false, message: 'Could not load alumni directory.' });
  }
});

router.post('/alumni', auth, adminOnly, async (req, res) => {
  try {
    const { name, role_company, batch_degree, photo_url } = req.body;
    if (!name || !role_company || !batch_degree) {
      return res.status(400).json({ success: false, message: 'Name, role/company, and batch/degree are required.' });
    }
    const [result] = await db.query(
      `INSERT INTO alumni_directory (name, role_company, batch_degree, photo_url)
       VALUES (?, ?, ?, ?)`,
      [name, role_company, batch_degree, photo_url || null]
    );
    res.status(201).json({ success: true, message: 'Alumnus added to directory.', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not add alumni record.' });
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
    res.json({ success: true, data: rows });
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
    if (existing.length > 0) {
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

// ----------------------------------------------------
// 6. CONTACT REQUESTS & LEADS
// ----------------------------------------------------
router.post('/contact', async (req, res) => {
  try {
    const { full_name, email, mobile_number, batch_program } = req.body;
    if (!full_name || !email || !mobile_number || !batch_program) {
      return res.status(400).json({ success: false, message: 'All contact fields are required.' });
    }
    await db.query(
      `INSERT INTO contact_requests (full_name, email, mobile_number, batch_program)
       VALUES (?, ?, ?, ?)`,
      [full_name, email, mobile_number, batch_program]
    );
    res.status(201).json({ success: true, message: 'Thank you! Your request has been received.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not submit contact request.' });
  }
});

router.post('/leads', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }
    await db.query('INSERT INTO get_started_leads (email) VALUES (?)', [email]);
    res.status(201).json({ success: true, message: 'Thank you for your interest!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not save lead.' });
  }
});

// ----------------------------------------------------
// 7. ADMIN DASHBOARD STATS
// ----------------------------------------------------
router.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const [[users]] = await db.query('SELECT COUNT(*) AS count FROM users');
    const [[alumni]] = await db.query('SELECT COUNT(*) AS count FROM alumni_directory');
    const [[events]] = await db.query('SELECT COUNT(*) AS count FROM events');
    const [[rsvps]] = await db.query('SELECT COUNT(*) AS count FROM event_rsvps');
    const [[contacts]] = await db.query('SELECT COUNT(*) AS count FROM contact_requests');

    res.json({
      success: true,
      stats: {
        totalUsers: users.count,
        totalAlumni: alumni.count,
        totalEvents: events.count,
        totalRsvps: rsvps.count,
        totalContactRequests: contacts.count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load admin stats.' });
  }
});

module.exports = router;
