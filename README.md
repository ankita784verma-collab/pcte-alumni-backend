# PCTE Alumni Platform — Node.js Backend

Stack: **HTML/CSS/JavaScript frontend → Node.js + Express backend → MySQL database**.

## Folder structure

| File / Folder | Purpose |
|---|---|
| `server.js` | Entry point — starts Express, wires middleware and routes |
| `db.js` | MySQL connection pool (supports local XAMPP and cloud URLs) |
| `routes/api.js` | All API endpoints: auth, alumni directory, events, admin stats |
| `middleware/auth.js` | JWT verification (`auth`) and role guard (`adminOnly`) |
| `pcte_alumni_db.sql` | Full DB schema + seed data — import once into phpMyAdmin |
| `.env.example` | Template for your local `.env` — copy and fill in |
| `package.json` | Node.js dependencies and scripts |

---

## Run locally on Windows

### Prerequisites
- [Node.js LTS](https://nodejs.org/) (≥ 18)
- XAMPP with MySQL / MariaDB running

### Steps

1. **Import the database**
   Open phpMyAdmin → create database `pcte_alumni_db` → Import `pcte_alumni_db.sql`.

2. **Configure environment**
   ```powershell
   Copy-Item .env.example .env
   ```
   Open `.env` and set your MySQL credentials. Change `JWT_SECRET` to a long random string.

3. **Install dependencies**
   ```powershell
   npm install
   ```

4. **Start the server**
   ```powershell
   npm start          # production-style
   npm run dev        # auto-restarts on file changes (uses nodemon)
   ```

5. **Verify**
   Open `http://localhost:5000/api/health` in your browser.
   A JSON response with `"success": true` means the API and database are connected.

---

## API endpoints

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| GET | `/api/health` | — | API + DB health check |
| POST | `/api/register` | — | Create student/alumni account |
| POST | `/api/login` | — | Login, returns JWT token |
| GET | `/api/me` | Bearer token | Current user profile |
| GET | `/api/alumni` | — | List alumni directory |
| POST | `/api/alumni` | Admin token | Add alumni record |
| DELETE | `/api/alumni/:id` | Admin token | Remove alumni record |
| GET | `/api/events` | — | List upcoming events |
| POST | `/api/events/:id/rsvp` | Bearer token | RSVP for an event |
| POST | `/api/contact` | — | Submit contact/enquiry form |
| POST | `/api/leads` | — | Save "Get Started" email |
| GET | `/api/admin/stats` | Admin token | Dashboard counts |

---

## Promote a user to Admin

After registering through the website, run this in phpMyAdmin (SQL tab):

```sql
UPDATE users SET role = 'Admin' WHERE email = 'your-email@example.com';
```

Log in again to receive a fresh token with the Admin role.

---

## Deployment notes (Render / Railway)

- Set all `.env` values as **Environment Variables** in the hosting dashboard. Do **not** upload `.env` to GitHub.
- Your MySQL database must be remotely accessible. A local XAMPP instance is **not** reachable from cloud hosts.
- Use a cloud MySQL service such as [PlanetScale](https://planetscale.com/), [Railway MySQL](https://railway.app/), or [Aiven](https://aiven.io/) and set `DATABASE_URL` (or individual `DB_*` vars).
- The `engines` field in `package.json` tells Render which Node version to use (`>=18`).
