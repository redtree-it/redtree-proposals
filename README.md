# Redtree Proposal Builder

A tool for Redtree IT to assemble client proposals from a shared library of reusable content blocks and a price book, then export a branded, editable Word document — replacing the old process of editing a Word proposal in place for each client.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript, Tailwind CSS 4
- SQLite via Prisma (driver adapter: `@prisma/adapter-better-sqlite3`)
- Word generation with the [`docx`](https://github.com/dolanmiu/docx) npm library
- Email/password auth with server-side sessions (`jose`-signed cookies) — roles: Admin and User

## Local development

Copy `.env.local.example` to `.env.local`, fill in `AUTH_SECRET` (any long random string), then:

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo logins (from the seed script):

- `admin@redtree-it.co.uk` / `password123` (Admin)
- `user@redtree-it.co.uk` / `password123` (User)

## Running with Docker

```bash
echo "AUTH_SECRET=$(openssl rand -hex 32)" > .env
docker compose up --build
```

This builds the app, runs pending migrations and the (idempotent) seed script on every start, and serves it on [http://localhost:3000](http://localhost:3000). The SQLite database, uploaded logo, and generated exports persist in the `redtree_data` Docker volume.

> Note: the Dockerfile and compose file haven't been build-tested against a real Docker daemon in this environment (none was available) — `npm run build` and the migrate/seed steps it runs on startup have been verified directly, but do a first `docker compose up --build` yourself and watch the logs before relying on it.

## Project layout

- `app/` — routes and pages (App Router); `app/(app)/` is the authenticated shell, `app/api/` is route handlers
- `lib/` — shared server logic: auth/sessions, merge-field resolution & validation, pricing math, the Word export builder, the shared markdown-subset renderer (used by both the on-screen preview and the export, so they stay in sync)
- `prisma/` — schema, migrations, and the seed script (content sourced from the real `Managed Service Proposal Template.docx` reference file)
- `data/` — local persistent storage (SQLite db, uploaded logo, generated exports) — gitignored

## Tests

```bash
npm test
```

Covers pricing math, merge-field resolution/validation (including the cross-client name-mismatch check), and a structural check that generated `.docx` files are well-formed with no leftover unresolved merge tokens.
