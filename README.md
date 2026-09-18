# Appointment Booking System — Developer Knowledge Test

Two-portal appointment booking system: **Admin Portal** (manage doctors +
availability + breaks) and **Patient Portal** (register/login, book & cancel
appointments), backed by a single Node/Express API and MySQL (XAMPP MariaDB).

## v2 — Change Request (split hours, breaks, custom slot length)

- **Multiple availability periods per day.** `doctor_availability` no longer
  has one row per (doctor, day) — a doctor can have several periods on the
  same day (e.g. Mon 9–1 and 2–5). Managed via `POST/DELETE
  /doctors/:id/availability(/:periodId)`, overlap-checked server-side.
- **Doctor breaks.** New `doctor_breaks` table — one-off, tied to a specific
  date (not recurring weekly, per the spec's example). `POST
  /doctors/:id/breaks` inserts the break and, in the same transaction, finds
  every booked appointment that now overlaps it and moves each to the
  nearest still-free slot that day (ties go to the earlier slot); if no slot
  is free that day, the appointment is cancelled instead. Both outcomes come
  back in the response so the admin UI can show what happened.
- **Custom slot length.** `doctors.slot_duration_minutes` (5–120, default
  30) replaces the old fixed 30-minute grid. Slot generation, booking
  validation, and the reschedule search all read this per doctor.
- `backend/src/services/slots.ts` is the single source of truth for "what
  slots exist right now" (periods − breaks − booked) and "what's the
  nearest one" — both `GET /doctors/:id/slots`, `POST /appointments`, and
  the break-reschedule logic call into it, so there's one place this rule
  lives instead of three.
- Migration: `backend/migrations/002_multi_period_breaks_duration.sql`
  (applied in place, no data loss). `schema.sql` reflects the v2 schema for
  fresh installs.

## Stack

| Part            | Tech                                             | Port |
| ---------------- | ------------------------------------------------- | ---- |
| Backend API      | Node.js, Express 5, TypeScript, mysql2, JWT, bcrypt | 5000 |
| Admin Portal     | React 19 + Vite + TypeScript + React Router        | 5173 |
| Patient Portal   | React 19 + Vite + TypeScript + React Router        | 5174 |
| Database         | MySQL (MariaDB 10.4 via XAMPP), db name `my_project`| 3306 |

## Folder Structure

```
my_project/
├── backend/           Express API (TypeScript, tsx for dev)
│   ├── schema.sql      DB schema (run once against my_project)
│   ├── .env             DB creds / JWT secret / CORS origins
│   └── src/
│       ├── server.ts
│       ├── config/db.ts
│       ├── middleware/auth.ts     JWT check for patient routes
│       └── routes/
│           ├── doctors.ts    doctors, availability, slots (admin+patient)
│           ├── auth.ts       patient register/login
│           └── appointments.ts  book / list / cancel (patient, auth required)
├── admin-portal/      React app — Doctors page + All Availability page
└── patient-portal/    React app — Register/Login, Doctors, Slots, My Appointments
```

## Running it

1. Start MySQL (XAMPP Manager → Manage Servers → MySQL Database → Start),
   or `sudo /Applications/XAMPP/xamppfiles/xampp startmysql`.
2. Backend: `cd backend && npm run dev` → http://localhost:5000
3. Admin portal: `cd admin-portal && npm run dev` → http://localhost:5173
4. Patient portal: `cd patient-portal && npm run dev` → http://localhost:5174

All three must be running at the same time. Both frontends call the API via
`VITE_API_URL=http://localhost:5000/api` (set in each app's `.env`).

## Data model

- `doctors` — id, name, specialization
- `doctor_availability` — one row per (doctor, day_of_week 0-6), start_time,
  end_time. Matches the "one availability period per day" rule.
- `patients` — id, name, email (unique), password_hash (bcrypt)
- `appointments` — doctor_id, patient_id, appointment_date, slot_time,
  status (`booked` / `cancelled`). A DB unique key on
  `(doctor_id, appointment_date, slot_time, status)` prevents two patients
  double-booking the same slot even under concurrent requests.

Slots are generated in 30-minute increments from the doctor's availability
window for the requested date's day-of-week, minus any slot already
`booked` for that exact date. Cancelling sets status to `cancelled`, which
immediately frees the slot again (no separate "restore" step needed).

## API summary

**Doctors / availability** (`/api`, no auth — matches scope, admin portal
has no login requirement per the test spec):
- `POST /doctors` — add doctor `{name, specialization, availability?: [{day_of_week, start_time, end_time}]}`.
  `availability` is optional — the "Add Doctor" modal sends it in the same
  request, inserted transactionally (doctor + all days, or nothing).
- `GET /doctors?search=&specialization=&page=&limit=` — paginated, with
  search (name/specialization) and an exact specialization filter →
  `{data, meta}`
- `GET /doctors/specializations` — distinct specializations, for the filter dropdown
- `PUT /doctors/:id` / `DELETE /doctors/:id`
- `POST /doctors/:id/availability` — upsert one day `{day_of_week, start_time, end_time}`
- `GET /doctors/:id/availability` — one doctor's week
- `GET /availability?search=&specialization=&page=&limit=` — all doctors'
  availability, paginated at the doctor level → `{data: [{doctor_id, name,
  specialization, slots: [...]}], meta}`
- `GET /doctors/:id/slots?date=YYYY-MM-DD` — free slots for a date

**Auth** (`/api/auth`):
- `POST /register` `{name, email, password}` → `{token, patient}`
- `POST /login` `{email, password}` → `{token, patient}`

**Appointments** (`/api/appointments`, requires `Authorization: Bearer <token>`):
- `POST /` `{doctorId, date, slotTime}` — book
- `GET /?status=&page=&limit=` — my appointments, optional status filter
  (`booked`/`cancelled`), paginated → `{data, meta}`
- `DELETE /:id` — cancel (must belong to the logged-in patient)

All list endpoints share the same pagination shape: `meta: {total, page,
limit, totalPages}` (`backend/src/utils/pagination.ts`), default limit 10,
max 50.

## UI/UX

Both portals share the same small hand-rolled UI kit (`components/ui/`):
`Modal`, `ConfirmDialog`, `Skeleton` (+ page-specific skeleton variants),
`SearchInput` (debounced 350ms), `Select`, `Pagination`, `Button` (has a
`loading` state used on every API-triggered button), `Card`, `Input`. The
patient portal also has `PasswordInput` (show/hide eye toggle).

- **Admin — Doctors**: search + specialization filter + pagination (6/page).
  "Add Doctor" opens a modal collecting name, specialization, and initial
  weekly availability (day toggles + one shared time range) in one submit.
  Delete goes through a `ConfirmDialog`. Per-doctor "Set availability"
  expands the day-by-day editor (skeleton while it loads).
- **Admin — All Availability**: same search/filter/pagination, read-only
  cards grouped by doctor.
- **Patient — Doctors**: search + specialization filter + pagination.
- **Patient — Doctor slots**: date picker, skeleton slot grid while loading.
- **Patient — My Appointments**: status filter (booked/cancelled) +
  pagination + skeleton rows. Cancel goes through a `ConfirmDialog`.
- **Patient — Logout**: also behind a `ConfirmDialog`.
- **Login / Register**: client-side validation (email format, password ≥ 6
  chars, name required, confirm-password match on register) before hitting
  the API, plus the server's own validation as a second layer. Password
  fields have a show/hide toggle.
- Custom favicon per portal (`public/favicon.svg`) instead of the default
  Vite logo; proper `<title>` per portal.

## Demo data already seeded

- Dr. Asha Mehta (Cardiology) — Mon–Fri 9:00–17:00
- Dr. Raj Verma (Dermatology) — Mon–Sat 10:00–18:00

No patient accounts are pre-created — register one from the Patient Portal.

## Notes / decisions

- Admin portal has no login (not required by the test spec); patient portal
  has full register/login with JWT + bcrypt, as explicitly required.
- `dateStrings: true` on the mysql2 pool avoids a timezone off-by-one bug
  where MySQL `DATE` columns were serialized through JS `Date` (caught and
  fixed during testing).
- Express 5 auto-forwards async route errors to the error handler, so no
  try/catch boilerplate was needed per route.
