# Deploy the backend on Render (free) and connect it to the Vercel frontend

## 1. Push the backend to GitHub
The `backend/` folder is already a git repo pointing at
`github.com/ankita784verma-collab/pcte-alumni-backend`.
```
cd backend
git add -A && git commit -m "Postgres fixes + deploy config" && git push origin main
```

## 2. Create it on Render
Easiest: Render dashboard -> **New -> Blueprint** -> pick `pcte-alumni-backend`.
`render.yaml` creates the web service + a free PostgreSQL database and wires
`DATABASE_URL` and a random `JWT_SECRET` for you.
When asked, set **FRONTEND_ORIGIN** = your Vercel URL (e.g. `https://your-app.vercel.app`, no trailing slash).

(Manual alternative: New Postgres -> New Web Service, build `npm install`, start `npm start`,
env vars `DATABASE_URL` (Internal URL), `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_ORIGIN`.)

## 3. Create the tables (once)
Render -> your database -> **Connect -> External** -> copy the PSQL command, then:
```
psql "<external connection string>" -f schema_postgres.sql
```
Check `https://<your-service>.onrender.com/api/health` -> `"success": true`.

## 4. Point the frontend at the backend
Edit `frontend/assets/js/config.js`: set `PRODUCTION_API` to
`https://<your-service>.onrender.com/api`, commit and push the frontend (Vercel redeploys).

## 5. Admin login
Seed admin: `admin@pcte.edu.in` / `admin123`. **Change this password right away** (or create your own admin):
```sql
UPDATE users SET role = 'Admin' WHERE email = 'you@example.com';
```
Admins cannot be created from the public register form (by design).

Note: Render's free web service sleeps after ~15 min idle; the first request can take ~30 s.
