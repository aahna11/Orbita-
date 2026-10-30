# ORBITA (backend core, phases 1–3 partial)
## Run
    docker compose up -d
    cd server && cp ../.env.example .env && npm install
    npm run dev        # API on :4000
    npm test           # needs the MySQL container running
## Permission matrix
| Action | Owner | Admin | Member | Viewer |
|---|---|---|---|---|
| Read | ✓ | ✓ | ✓ | ✓ |
| Create/edit tasks | ✓ | ✓ | ✓ | – |
| Manage projects | ✓ | ✓ | – | – |
| Rename org | ✓ | ✓ | – | – |
| Delete org | ✓ | – | – | – |
## Not built yet (honest list)
React/3D client, invites + email, comments, MongoDB activity/notifications, Socket.io, refresh tokens, password reset, CSRF, Swagger/Postman, seed script, CI, org switching/rename/delete endpoints, admin area.

## Update 2: invites, members, comments, activity, seed
    cd server && npm install && npm run migrate && npm run seed && npm run dev
Demo logins (password `Demo12345`): `owner1@demo.orbita.io`, `admin1@…`, `member1@…`, `viewer1@…` (also …2 and …3 for the other two orgs).
Invite emails appear in Mailpit at http://localhost:8025. Activity is currently stored in MySQL `audit_log` (MongoDB move is still pending).

## Update 3: client (React + Vite)
    cd client && npm install && npm run dev     # http://localhost:5173 (proxies /api to :4000)
Landing, signup/login (redirects back to the page you asked for), projects, drag-and-drop board with comments, team + invites, activity, Pearl/Nebula themes, Simple view.

## Update 4: backend complete (except items below)
    cd server && npm install && npm run migrate && npm test      # needs docker compose up -d
    npm run docs                                                   # regenerates docs/openapi.json + postman_collection.json
- Swagger UI: http://localhost:4000/api/docs (or /docs). Postman: `docs/postman_collection.json`.
- Refresh tokens (rotating, httpOnly cookie + `X-Requested-With: orbita` CSRF header), password reset, 5-attempt lockout.
- Notifications (assigned, @mentioned, due-soon hourly job) live in MongoDB; Socket.io rooms `org:<id>:project:<id>` with DB-verified join and presence.
- Rate limits per IP, per user and per organization. CORS allowlist, request ids, graceful shutdown.
- Platform admin: set `ADMIN_EMAILS` in `.env`. `GET /search` supports q, priority, assignee_id, project_id.
Still not built: Redis adapter/cache, labels, project members, column editing, SSO.
