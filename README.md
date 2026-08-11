# AUTH-SYSTEM

## Overview

A small MVC-based authentication system built with Express, MongoDB, and EJS.
It includes signup, login, password reset, JWT-protected pages, and email reset link delivery.

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
2. Copy `config.env.example` to `config.env` and fill in the required values.
3. Start MongoDB locally or use a hosted MongoDB URI.
4. Run the server:
   ```bash
   npm start
   ```
5. Open the app at `http://localhost:3000`.

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

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_RESET_SECRET`
- `PASSWORD_RESET_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`

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
