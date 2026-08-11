# AUTH-SYSTEM

## Overview

This repository is structured as an MVC-based authentication system. It includes placeholder files for authentication controllers, models, services, routes, middleware, and views.

## Project Structure

- `controllers/` - request handlers and controller logic
- `models/` - data models and schema definitions
- `services/` - business logic and reusable authentication services
- `routes/` - Express routing for authentication endpoints
- `middleware/` - middleware such as JWT validation
- `config/` - configuration files (database, environment, etc.)
- `views/` - server-rendered templates for login, signup, and forgot-password pages
- `public/` - static assets
  - `public/css/`
  - `public/js/`
  - `public/assets/`
- `tests/` - unit or integration tests
- `server.js` - application entry point


## Running the App

1. Install dependencies (if using Node.js/Express):
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   node server.js
   ```
3. Open the app in your browser at the configured server URL.

## Backend setup

Copy `config.env.example` to `config.env`, replace every placeholder secret/SMTP value, and
install the dependencies before starting the server. The application requires a
running MongoDB instance configured through `MONGODB_URI`.

```bash
npm install
npm start
```

The API exposes:

- `GET /health`
- `POST /api/auth/forgot-password` with `{ "email": "user@example.com" }`
- `POST /api/auth/reset-password` with
  `{ "token": "...", "newPassword": "Password1!", "confirmPassword": "Password1!" }`

Password-reset links expire after 15 minutes. They intentionally remain reusable
until expiry; every successful reset increments `passwordVersion` and therefore
revokes all previously issued access tokens.

## JWT contract for the login ticket

The login endpoint must sign access tokens with `JWT_ACCESS_SECRET` using HS256
and these claims:

```json
{
  "sub": "<MongoDB user id>",
  "type": "access",
  "ver": 0
}
```

`ver` must equal the user's current `passwordVersion`. Protected routes use
`authenticateAccessToken` from `middleware/jwtMiddleware.js`, which exposes
`req.auth = { userId, claims }` after verification.

Run the focused backend tests with:

```bash
npm test
```
