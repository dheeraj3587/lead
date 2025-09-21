# Lead Management System

An end-to-end leads CRM featuring JWT auth, an Express/Mongo backend, and a React + AG Grid frontend with infinite scrolling and advanced filtering.

## Features

- JWT authentication with httpOnly cookies
- CRUD for leads with server-side pagination and filtering
- AG Grid Infinite Row Model for fast, scalable lists
- Custom filter panel with text, select, number, and date filters
- Responsive UI with Tailwind CSS

## Test User

- Email: `test@leadmanagement.com`
- Password: `TestUser123!`

This user is populated via the seed script with 150+ realistic leads.

## Setup

### Backend

1. Copy `.env.example` to `.env` and set MongoDB connection string and JWT secrets.
2. Install deps:
   - `npm install` (in `backend/`)
3. Seed data:
   - `npm run seed` (in `backend/`)
   - Clean only: `npm run seed:clean`
4. Start server:
   - `npm run dev`

### Frontend

1. Install deps:
   - `npm install` (in `frontend/`)
2. Run dev server:
   - `npm run dev`

## Filtering API

Backend supports operators across field types:

- Text: `field` (equals), `field_contains`
- Enums/sets: `field_in=value1,value2`
- Numbers: `field_gt`, `field_lt`, `field_between=min,max`
- Dates: `field_on=date`, `field_between=start,end`, `field_before`, `field_after`
- Boolean: `field=true|false`

Frontend combines AG Grid filters with custom filter panel state and converts them to the API query format.

## Troubleshooting

- If no data appears, ensure the backend is running and `.env` is configured.
- Run `npm run seed` in `backend/` to populate sample data for the test user.
