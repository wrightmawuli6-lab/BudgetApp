# Railway Deployment

Deploy this repo to Railway as two services:

1. `frontend` service rooted at the repository root.
2. `backend` service rooted at `backend/`.

## Frontend Service

- Root directory: `/`
- Install command: `npm install`
- Build command: `npm run build`
- Start command: leave empty if using Railway static hosting, or serve `dist` with your preferred static host

Required variables:

```env
VITE_API_BASE_URL=https://budgetapp-production-5add.up.railway.app/api
VITE_ADMIN_API_BASE_URL=https://budgetapp-production-5add.up.railway.app/admin/api
```

## Backend Service

- Root directory: `/backend`
- Install command: `npm install`
- Start command: `npm start`

Required variables:

```env
NODE_ENV=production
DATABASE_URL=<Railway Postgres URL>
JWT_SECRET=<long random secret>
ADMIN_JWT_SECRET=<second long random secret>
CLIENT_ORIGIN=https://frontend-production-4fc4.up.railway.app
JWT_EXPIRES_IN=1d
ADMIN_JWT_EXPIRES_IN=12h
CRON_TIMEZONE=UTC
```

Optional variables:

```env
OPENAI_API_KEY=<only if AI endpoints should call a model provider>
OPENAI_MODEL=gpt-4.1-mini
ADMIN_SUPER_EMAIL=admin@example.com
ADMIN_SUPER_PASSWORD=<temporary bootstrap password>
ADMIN_SUPER_NAME=Platform Super Admin
```

## Database

Railway Postgres provides `DATABASE_URL`, but you still need to apply `backend/db/schema.sql`.

Minimum bootstrap flow:

1. Create the backend service.
2. Attach a Railway Postgres database.
3. Run the schema against that database.
4. Run `npm run seed:admin` with the backend service variables loaded if you want the admin portal available immediately.

## Notes

- The frontend no longer falls back to localhost API URLs. Railway env must be set before building.
- Client-side AI secrets should not be used. Keep provider keys on the backend only.
- `HashRouter` is already in use, so the frontend does not need SPA rewrite rules.
