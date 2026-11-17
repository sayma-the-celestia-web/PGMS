# PGMS — Presentation Group Management System
### Department of Software Engineering — Daffodil International University (DIU)

**PGMS** is an institutional-grade, full-stack web application designed for the Department of Software Engineering at Daffodil International University. It streamlines presentation team formation, section registrations, team capacity compliance, and multi-sheet Excel reporting across courses and academic semesters.

---

## 1. Key Features & Architectural Highlights

- **Next.js 14 App Router + TypeScript + Tailwind CSS**: Unified modern full-stack architecture with Server Actions, Route Handlers, and React Server Components.
- **Accountless Student Experience**: Students do not need to register accounts or manage passwords. Group creation and joining are immediate and transparent.
- **Private Reference Token Security**:
  - High-entropy cryptographic reference tokens (`pgms_tm_...` for leaders, `pgms_mem_...` for members).
  - Only cryptographic hashes (SHA-256 with pepper) are stored in the database.
  - Raw credentials are shown only once at creation time with one-click copy functionality.
- **Privacy By Design**:
  - Student IDs and reference tokens are **never** rendered in public rosters or public URLs.
  - Public directory displays only full names, active member counts, capacity, and vacancy.
- **Atomic Operations & Concurrency Protection**:
  - Race condition protection on the last available slot (PostgreSQL row locking `FOR UPDATE`).
  - Database-enforced uniqueness: One active student membership per course section.
  - Auto-updating team status transitions (`OPEN` $\leftrightarrow$ `FULL`, manual `CLOSED` overrides).
  - Leadership rules: Leaders with other active members must transfer leadership before withdrawing.
- **Superadmin Dashboard**:
  - Overview metrics: Semesters, courses, active offerings, teams, students, and available slots.
  - Academic configuration: Create/edit semesters and courses.
  - Section offerings: Configure registration windows (start/deadline), min/max capacity, and status (`OPEN`, `PAUSED`, `UPCOMING`, `CLOSED`).
  - Team & Student oversight: Capacity adjustments, leadership transfer, member removal, and audit logging.
- **ExcelJS Multi-Sheet Workbooks (`.xlsx`)**:
  - **Sheet 1 — Team Summary**: Serial, Team Name, Course, Section, Leader, Capacity, Active Members, Available Slots, Status.
  - **Sheet 2 — Student Details**: Serial, Student Name, Student ID, Course Code, Name, Semester, Section, Team, Role, Registration Date.
  - **Sheet 3 — Registration Overview**: Summary statistics by course section and export timestamp.
  - Formatted with frozen header rows, DIU Brand colors (`#0066B3`), and zero leaked tokens.

---

## 2. Technology Stack

- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript 5.6
- **Database**: Supabase PostgreSQL (with complete SQL migration script, triggers, and RPC functions)
- **Authentication**: Supabase Auth / Session cookie for Superadmin only
- **Styling**: Tailwind CSS with DIU Brand Palette
- **Icons**: Lucide React
- **Validation**: Zod + React Hook Form
- **Excel Export**: ExcelJS

---

## 3. Brand Identity & Visual Design

Conforms to the Department of Software Engineering & DIU Official Identity:
- **Primary Blue**: `#0066B3`
- **Dark Navy**: `#073763`
- **Surface / Background**: `#F5F8FC`
- **Main Text**: `#172B4D`
- **Slate Text**: `#64748B`
- **Status Indicators**: Emerald (`OPEN`), Amber (`FULL` / `PAUSED`), Red (`CLOSED`)

---

## 4. Routes & Site Architecture

```text
Public Experience:
├── /                                    # DIU Department Homepage & Hero
├── /courses                             # Course Offerings Directory with Search & Filters
├── /courses/[slug]                      # Course Details, Section Switcher & Public Team Roster
├── /courses/[slug]/create-team          # Atomic Team Creation & Reference Generator
├── /teams/[id]                          # Public Team Overview
├── /teams/[id]/join                     # Atomic Team Join & Member Token Generator
└── /manage                              # Private Reference Self-Service Console

Superadmin Area:
├── /superadmin/login                    # Admin Authentication
├── /superadmin                          # Real-Time Overview & Stats
├── /superadmin/semesters                # Semester Management
├── /superadmin/courses                  # Course Catalog
├── /superadmin/registrations            # Course Offerings & Capacity Limits
├── /superadmin/teams                    # Team Records & Leadership Management
├── /superadmin/students                 # Student Registry
├── /superadmin/exports                  # Filtered Excel (.xlsx) Export Generator
└── /superadmin/audit-logs               # Immutable Administrative Audit History

API:
└── /api/export                          # Dynamic ExcelJS .xlsx Stream Endpoint
```

---

## 5. Getting Started & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your Supabase connection strings:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPERADMIN_PASSWORD=diu2026
```
*(Note: PGMS includes a built-in memory/state provider, meaning the application runs and tests out-of-the-box even before remote Supabase credentials are provided!)*

### 3. Database Migration
When connecting to a live Supabase project, execute the SQL migration located at:
`supabase/migrations/20261117000000_initial_schema.sql`

This sets up:
- Foreign keys, check constraints, and unique partial indexes
- Atomic stored functions (`rpc_create_team_with_leader`, `rpc_join_team_atomic`, `rpc_member_leave_team`, `rpc_transfer_team_leadership`)
- Row Level Security (RLS) policies

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Verification & Integrity Tests
```bash
npx tsx tests/test-registration.ts
```

### 6. Production Build
```bash
npm run build
```

---

## 6. Superadmin Credentials (Demo)

- **Login URL**: `/superadmin/login`
- **Default Email**: `sweadmin@daffodilvarsity.edu.bd`
- **Password**: `diu2026`
