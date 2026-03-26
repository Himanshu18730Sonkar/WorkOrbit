# WorkOrbit - Freelance Business Management Desktop App

WorkOrbit is a Windows-focused Electron desktop application for independent freelancers to manage clients, leads/outreach, projects, tasks, invoices, payments, income, and follow-ups in one fast local workflow.

## Core Features

- Information-dense dashboard with:
  - Active projects
  - Pending payments
  - Overdue invoices
  - Upcoming deadlines
  - Follow-up reminders
  - Recent activity
- Full CRUD management for:
  - Clients
  - Leads / Outreach
  - Projects
  - Tasks
  - Invoices
  - Payments
- Invoice tools:
  - Auto-generated invoice numbers
  - Mark paid/unpaid + overdue flagging
  - PDF export to Documents/WorkOrbit Invoices
- Reminder system:
  - Invoice due alerts
  - Project deadline alerts
  - Lead follow-up alerts
- Local persistence with SQLite (no cloud required)
- Optional productivity features:
  - Dark/Light mode toggle
  - SQLite backup export to Documents/WorkOrbit Backups
  - Monthly income summary panel

## Technology Stack

- Electron (desktop shell)
- React + TypeScript + Vite (renderer UI)
- better-sqlite3 (persistent local database)
- PDFKit (invoice PDF generation)

## Project Structure

- electron/main.cjs: Electron app lifecycle and IPC handlers
- electron/preload.cjs: Secure API bridge for renderer
- electron/db.cjs: SQLite schema and business data operations
- electron/pdf.cjs: Invoice PDF export logic
- src/App.tsx: Main workspace shell and module routing
- src/components/*: Module-level reusable UI components
- src/types.ts: Shared domain types
- src/api.ts: Renderer-side API contracts

## Run in Development

1. Install dependencies:

```bash
npm install
```

2. Start desktop app with hot reload:

```bash
npm run dev
```

## Build

Build web renderer only:

```bash
npm run build:web
```

Build production desktop package:

```bash
npm run build
```

Equivalent command (unsigned installer):

```bash
npm run build:unsigned
```

This uses a standard Windows installer wizard experience (choose folder, Start Menu/Desktop shortcuts, finish-and-run).

This creates a downloadable Windows installer at:

- `release/WorkOrbit-Setup-<version>.exe`

Optional portable (no installer) build:

```bash
npm run build:portable
```

Portable output folder:

- `release-portable/WorkOrbit-win32-x64/`

## Safe Version Upgrades (No Data Loss)

- Your app data is stored in Electron `userData` as `appmana.db`, not inside the install directory.
- Installing a newer version replaces the old app binaries while keeping the same data folder.
- Uninstall is configured to **not delete app data** (`deleteAppDataOnUninstall: false`).

Upgrade flow for users:

1. Download the new installer from `release/WorkOrbit-Setup-<version>.exe`.
2. Run installer (same app ID/product), and let it complete.
3. Open app normally; previous data remains.

Important: keep `build.appId` and `build.productName` unchanged between releases to preserve upgrade continuity.

Maintainer release commands:

- Patch release: `npm run release:patch`
- Minor release: `npm run release:minor`
- Major release: `npm run release:major`
- Signed patch release (recommended for public distribution): `npm run release:signed:patch`
- Signed minor release: `npm run release:signed:minor`
- Signed major release: `npm run release:signed:major`

Each command bumps `package.json` version and outputs a new installer file in `release/`.

## Avoid Windows Blocking / SmartScreen Warnings

For behavior like other trusted apps, publish **signed installers**.

Unsigned installers may show SmartScreen warnings on some Windows systems.

To sign builds with `electron-builder`, configure these environment variables before running signed release commands:

- `CSC_LINK`: path or URL to your `.pfx` certificate
- `CSC_KEY_PASSWORD`: certificate password

Then run:

```bash
npm run release:signed:patch
```

Note: without a purchased trusted certificate, SmartScreen warnings can still appear for some users.

For best trust results over time, use a reputable code-signing certificate (EV certificate is strongest for SmartScreen reputation).

If signed build tooling fails with symbolic-link permission errors on Windows, run terminal as Administrator or enable Windows Developer Mode and try the signed command again.

Note: On some Windows setups, `electron-builder` may fail during code-sign helper extraction due to symbolic-link permissions. If that happens, run terminal as Administrator or enable Developer Mode in Windows.

## Keyboard-Friendly Workflow

- Alt+1: Clients
- Alt+2: Leads
- Alt+3: Projects
- Alt+4: Tasks
- Alt+5: Invoices
- Alt+6: Payments
- Ctrl+K: Dashboard

## Data Location

- Primary DB: Electron userData folder (`appmana.db`)
- Invoice PDFs: Documents/WorkOrbit Invoices
- DB Backups: Documents/WorkOrbit Backups
