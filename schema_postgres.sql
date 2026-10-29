-- PCTE Alumni Platform — PostgreSQL Schema
-- Run this once in your cloud PostgreSQL database to set up all tables.
-- Render free PostgreSQL: use the PSQL Command from the database dashboard.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  user_id       SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30)  NOT NULL DEFAULT 'Student / Alumnus',
  batch_program VARCHAR(100),
  job_title     VARCHAR(150),
  bio           TEXT,
  photo_url     VARCHAR(255),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni_directory (
  alumni_id    SERIAL PRIMARY KEY,
  user_id      INT REFERENCES users(user_id) ON DELETE SET NULL,
  name         VARCHAR(100) NOT NULL,
  role_company VARCHAR(200) NOT NULL,
  batch_degree VARCHAR(100) NOT NULL,
  photo_url    VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  event_id     SERIAL PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  event_date   TIMESTAMP NOT NULL,
  speaker_name VARCHAR(100),
  location     VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS event_rsvps (
  rsvp_id       SERIAL PRIMARY KEY,
  event_id      INT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS contact_requests (
  request_id    SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  mobile_number VARCHAR(20)  NOT NULL,
  batch_program VARCHAR(100) NOT NULL,
  status        VARCHAR(20)  DEFAULT 'Pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS get_started_leads (
  lead_id      SERIAL PRIMARY KEY,
  email        VARCHAR(150) NOT NULL UNIQUE,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default users (bcrypt hashed: admin123 and user123)
INSERT INTO users (full_name, email, password_hash, role, batch_program, job_title)
VALUES
  ('Administrator', 'admin@pcte.edu.in',
   '$2b$10$Qn3VU168xnMlxu.M8UZv5erIg7VUDtQVN4e5fVQlkSdI.3j5Lhe0e',
   'Admin', 'Administration', 'System Administrator'),
  ('Ankita', 'ankita@pcte.edu.in',
   '$2b$10$YHekTLW2vO/nAiYxqjslGu4OzlEOnU6BpO0tCHrnOR8aOlbKIFf76',
   'Student / Alumnus', 'Batch 2026 · B.Tech CSE', 'Full-Stack Developer Student')
ON CONFLICT (email) DO NOTHING;

-- Alumni directory seed
INSERT INTO alumni_directory (name, role_company, batch_degree, photo_url) VALUES
  ('Rahul Sharma',    'Software Architect at TechCorp',   'Batch 2018 · B.Tech CSE', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'),
  ('Priya Verma',     'Financial Analyst, Global Bank',    'Batch 2020 · MBA Finance', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop'),
  ('Amanpreet Singh', 'Product Manager, SaaS Solutions',  'Batch 2019 · BBA',         'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'),
  ('Neha Kapoor',     'UI/UX Lead Designer',              'Batch 2021 · BCA',         'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop')
ON CONFLICT DO NOTHING;

-- Event seed
INSERT INTO events (title, description, event_date, speaker_name, location) VALUES
  ('Navigating Enterprise Cloud & System Architecture',
   'Keynote session discussing modern microservices, Docker, and cloud deployments.',
   '2026-11-15 10:00:00', 'Rahul Sharma', 'PCTE Main Auditorium')
ON CONFLICT DO NOTHING;
