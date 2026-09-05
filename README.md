# SMSFlow Hub

Facebook/OTP verification panel built with Next.js 16 (App Router) and MongoDB.

## Quick start (local)

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Create the first admin by visiting <http://localhost:3000/api/setup> (or just
signing in — the admin account is bootstrapped automatically on first login).

Default admin credentials come from `ADMIN_USERNAME` / `ADMIN_PASSWORD`
(`admin` / `admin123` unless overridden). **Change them after the first login.**

## Required environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | Atlas connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/smsflow?retryWrites=true&w=majority` |
| `JWT_SECRET` | ✅ | Long random string used to sign session cookies (`openssl rand -base64 32`) |
| `MONGODB_DB` | optional | Defaults to the database in the URI, then `smsflow` |
| `SMSBOWER_API_KEY` | optional | Needed only for buying numbers / live prices |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | optional | Initial admin bootstrap (`admin` / `admin123`) |

On Vercel/Netlify/Render these must be set in the project's **Environment
Variables** settings — a local `.env` file is never uploaded.

## Deploying (Vercel)

1. Import the repository.
2. Add the environment variables above (all environments).
3. In **MongoDB Atlas → Network Access**, allow the host. Serverless platforms
   use dynamic outbound IPs, so the access list entry must be `0.0.0.0/0`
   (with a strong database user password), otherwise every request hangs until
   the platform's execution limit and the site shows a generic "server error".
4. Deploy, then open `https://<your-domain>/api/setup` once to create the admin.

## Troubleshooting "This page couldn't load / A server error occurred"

Open `https://<your-domain>/api/health`. It answers with JSON describing exactly
what is wrong:

```jsonc
{
  "ok": false,
  "env": { "MONGODB_URI": true, "JWT_SECRET": false, ... },
  "database": "MONGODB_URI is not configured...",
  "missingEnv": ["JWT_SECRET"]
}
```

| What `/api/health` says | Fix |
| --- | --- |
| `missingEnv` lists variables | Add them in the host's Environment Variables settings and redeploy |
| `database: "Server selection timed out after 8000 ms"` | Atlas IP allowlist (`0.0.0.0/0`), paused cluster, or wrong `MONGODB_URI` |
| `database: "Authentication failed"` | Wrong database user/password in the URI |
| `database: "MONGODB_URI is not configured..."` | `MONGODB_URI` missing from the deployment environment |

Notes on what the app does to stay up:

- A missing `JWT_SECRET` no longer aborts `next build`/cold start — it fails
  only the request that needs it, with a readable error.
- MongoDB connections fail after **8s** (not the driver default 30s) so the app
  answers with a real error instead of being killed by the platform timeout.
- A failed connection is never cached permanently: the driver retries after a
  short 5s cooldown, so a blip heals itself without a redeploy.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
