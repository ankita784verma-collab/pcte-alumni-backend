# PCTE Alumni Talks — Node.js backend

Simple stack for explaining the project: **HTML/CSS/JavaScript frontend → Node.js + Express backend → MySQL database**.

## Folder structure
- `server.js`: starts the server and defines the main app
- `db.js`: connects to MySQL
- `routes/api.js`: API endpoints for login, registration, alumni, talks and admin stats
- `middleware/auth.js`: checks login token and admin role
- `schema.sql`: creates the database tables
- `.env.example`: local database settings and secret
- `package.json`: lists Node.js packages

## Run locally on Windows
1. Install Node.js LTS.
2. Start MySQL in XAMPP.
3. In phpMyAdmin, import `schema.sql`. This schema uses `CREATE TABLE IF NOT EXISTS`; it does not delete existing tables.
4. Copy `.env.example` to a new file named `.env`. Set your MySQL credentials. Change `JWT_SECRET` to a long random secret.
5. Open VS Code terminal inside the `backend` folder and run:

   ```powershell
   npm install
   npm start
   ```

6. Open `http://localhost:5000/api/v1/health`. Success means the API and database are connected.

## API endpoints
- `GET /api/v1/health` — test API and database
- `POST /api/v1/register` — create student/alumni account
- `POST /api/v1/login` — login
- `GET /api/v1/me` — current user; send `Authorization: Bearer TOKEN`
- `GET /api/v1/alumni` — alumni directory
- `GET /api/v1/talks` — events/talks
- `POST /api/v1/talks/:id/register` — register for a talk; token required
- `GET /api/v1/my-registrations` — your registered talks; token required
- `GET /api/v1/admin/stats` — counts; admin token required

## Promote an admin
Register an account from the website, then in phpMyAdmin run this SQL using that account's email:
`UPDATE users SET role='admin' WHERE email='your-email@example.com';`
Log in again to receive an admin token.

## Connect existing frontend
In `frontend/assets/js/api.js`, set the API base URL to the deployed backend address, ending in `/api/v1`. For local development it is:
`http://localhost:5000/api/v1`
Your current `api.js` only loads the alumni directory; the login and registration HTML forms still need `name` attributes and submit handlers to call `/login` and `/register`. This backend ZIP deliberately does not overwrite your website's design.

## Render note
Render can run Node.js. Your MySQL database must be reachable from the deployed service; a MySQL server running on your own PC or inside XAMPP is not reachable by Render. Use a separately hosted MySQL database that allows remote connections, or change the database layer to a hosted PostgreSQL service. Set the `.env` values as Render Environment Variables; do not upload `.env` to GitHub.
