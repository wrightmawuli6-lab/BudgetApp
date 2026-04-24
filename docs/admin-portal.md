# Admin Portal + RBAC

## How To Run Locally

1. Ensure backend schema is applied:

```bash
psql -U postgres -d student_budgeting -f backend/db/schema.sql
```

2. Set backend env values (`backend/.env`):

```bash
ADMIN_JWT_SECRET=change_this_to_a_different_strong_secret
ADMIN_JWT_EXPIRES_IN=12h
ADMIN_SUPER_EMAIL=admin@example.com
ADMIN_SUPER_PASSWORD=ChangeMe123!
ADMIN_SUPER_NAME=Platform Super Admin
```

3. Seed permissions, SUPER_ADMIN role, and first super admin user:

```bash
npm run seed:admin
```

This seed is idempotent and safe to run multiple times.

4. Start backend and frontend:

```bash
npm --prefix backend run dev
npm run dev
```

5. Log in to admin portal:

- `/#/admin/login`
- Use `ADMIN_SUPER_EMAIL` + `ADMIN_SUPER_PASSWORD`

## Admin API Endpoints

- `POST /admin/api/auth/login`
- `GET /admin/api/auth/me`
- `POST /admin/api/auth/logout`
- `POST /admin/api/users` (`users.write`)
- `GET /admin/api/users` (`users.read`)
- `PATCH /admin/api/users/:id` (`users.write`)
- `POST /admin/api/users/:id/roles` (`users.write`)
- `POST /admin/api/roles` (`roles.write`)
- `GET /admin/api/roles` (`roles.read`)
- `POST /admin/api/roles/:id/permissions` (`roles.write`)
- `GET /admin/api/audit-logs` (`audit.read`)

## Permissions

- `users.read`
- `users.write`
- `roles.read`
- `roles.write`
- `audit.read`
- `settings.read`
- `settings.write`
- `transactions.read`

`SUPER_ADMIN` is treated as full-access by middleware.

## Extending Permissions

1. Add the permission key and description in `backend/src/constants/adminPermissions.js`.
2. Run `npm run seed:admin` to upsert the new permission.
3. Assign it to roles from `/admin/roles` or through `POST /admin/api/roles/:id/permissions`.
