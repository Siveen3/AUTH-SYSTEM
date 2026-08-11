# AUTH-SYSTEM

## Overview

A small MVC-based authentication system built with Express, MongoDB, and EJS.
It includes signup, login, password reset, JWT-protected pages, and email reset link delivery.

This fork includes a refreshed, modern UI for the auth views (login, signup, forgot/reset password, dashboard), a theme toggle (light/dark), and a developer-friendly in-memory database option for running the app without installing MongoDB.

## Project Structure

- `controllers/` - request handlers and controller logic
- `models/` - data models and schema definitions
- `services/` - business logic and reusable authentication services
- `routes/` - Express routing for authentication and page endpoints
- `middleware/` - middleware such as JWT validation and error handling
- `config/` - configuration files for environment and database setup
- `views/` - server-rendered EJS templates for login, signup, forgot-password, reset-password, and dashboard pages
- `public/` - static assets for CSS and client-side JavaScript
- `tests/` - Jest/Supertest tests for backend routes and middleware
- `server.js` - application entry point

## Running the App

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `config.env.example` to `config.env` and edit values as needed.

   For local development without MongoDB, enable the in-memory adapter by setting:
   ```text
   USE_IN_MEMORY_DB=true
   ```

   Required secrets (set to any long random strings for dev):
   ```text
   JWT_ACCESS_SECRET=your_long_random_secret
   JWT_RESET_SECRET=your_long_random_secret
   PASSWORD_RESET_URL=http://localhost:3000/reset-password
   ```

   SMTP settings are optional. If SMTP is not configured, password-reset links will be printed to the server console for easy local testing. To silence console logging in CI, set `SUPPRESS_RESET_LINK_CONSOLE=true`.

3. Start the server:
   ```bash
   npm start
   ```

4. Open the app at `http://localhost:3000`.

## Available Pages

- `GET /login` - sign in page
- `GET /signup` - create a new account
- `GET /forgot-password` - request a password reset link
- `GET /reset-password?token=<token>` - reset your password with a valid token
- `GET /dashboard` - protected dashboard page after login

## API Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Environment Variables

Copy `config.env.example` to `config.env` and provide values for:

- `MONGODB_URI` (optional if `USE_IN_MEMORY_DB=true`)
- `USE_IN_MEMORY_DB` (set to `true` to run without MongoDB)
- `JWT_ACCESS_SECRET`
- `JWT_RESET_SECRET`
- `PASSWORD_RESET_URL`
- `SMTP_HOST` (optional)
- `SMTP_PORT` (optional)
- `SMTP_FROM` (optional)

Optional dev flags:
- `SUPPRESS_RESET_LINK_CONSOLE=true` (disables console logging of reset links)

Optional:
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_RESET_EXPIRES_IN`
- `SMTP_USER`
- `SMTP_PASS`

## Authentication Behavior

- Passwords are hashed with bcrypt before storage.
- Login returns a JWT access token stored in a cookie.
- Dashboard access is protected by `middleware/jwtMiddleware.js`.
- Password reset sends an email with a tokenized link and updates `passwordVersion`.

## Testing

Run backend tests with:

```bash
npm test
```
