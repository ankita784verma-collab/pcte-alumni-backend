# Deploy (one Render service = website + API + database)

This backend folder now contains the website in `public/` and serves it itself,
so you only deploy THIS folder. No CORS or URL settings needed.

## 1. Push this folder to GitHub (replace repo contents)
    git add -A && git commit -m "Full-stack deploy" && git push origin main

## 2. Render
Web Service settings: Root Directory = (empty), Build = `npm install`, Start = `npm start`.
Environment variables:
- `DATABASE_URL` = Internal Database URL of your Render PostgreSQL
- `JWT_SECRET`   = any long random string
- `NODE_ENV`     = production
(Or use New -> Blueprint with render.yaml, which sets all of this.)

## 3. Create tables (once)
    psql "<External Database URL>" -f schema_postgres.sql
(or paste the file's contents into any SQL console connected to that database)

## 4. Open https://<your-service>.onrender.com
Register / log in. Admin: admin@pcte.edu.in / admin123 (change it!).
Free tier sleeps after ~15 min: open the URL 1-2 min before your demo to wake it.

## Optional: keep the Vercel site
Set PRODUCTION_API in public/assets/js/config.js to https://<your-service>.onrender.com/api
and put your Vercel URL(s) in FRONTEND_ORIGIN (comma separated).
