# Supabase Integration Guide

This guide walks you through setting up Supabase for user authentication in your AUTH-SYSTEM.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Create a new project
4. Save your project credentials:
   - **Project URL** (Example: `https://your-project.supabase.co`)
   - **Service Role Key** (available in Settings → API → Service Role Secret)
   - **Anon Public Key** (optional, for client-side use)

## Step 2: Create the Users Table

In your Supabase dashboard, open the SQL Editor and run this query:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  password_version INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows service role to access all users
CREATE POLICY "Service role can access all users" ON users
  FOR ALL USING (true) WITH CHECK (true)
  AS PERMISSIVE
  FOR ROLE service_role;
```

## Step 3: Configure Environment Variables

Update your `config.env` file with your Supabase credentials:

```env
# Enable Supabase for user storage
USE_SUPABASE=true

# Supabase Configuration
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_API_KEY=your-anon-key-here

# Other existing configurations
NODE_ENV=development
PORT=3000
JWT_ACCESS_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_RESET_SECRET=your-reset-secret
JWT_RESET_EXPIRES_IN=15m
PASSWORD_RESET_URL=http://localhost:3000/reset-password

# Email configuration (unchanged)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=AetherFlow <no-reply@example.com>
```

## Step 4: Install Dependencies

Run the following command to install the Supabase SDK:

```bash
npm install
```

This will install `@supabase/supabase-js` along with other dependencies.

## Step 5: Start Your Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will now use Supabase for user authentication instead of MongoDB.

## Step 6: Test the Integration

### Create a new user (Signup)
```bash
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

## Switching Back to MongoDB

To switch back to MongoDB, simply update your `config.env`:

```env
USE_SUPABASE=false
MONGODB_URI=mongodb://127.0.0.1:27017/auth-system
```

Then restart your server.

## Troubleshooting

### "Supabase not initialized" error
- Ensure `SUPABASE_PROJECT_URL` and `SUPABASE_SERVICE_KEY` are set in `config.env`
- Verify `USE_SUPABASE=true` is set
- Restart the server

### "Invalid email or password" during login
- Verify the user exists in the Supabase `users` table
- Check that the password was hashed correctly (it should start with `$2a$` or `$2b$`)

### "A user with that email already exists" error
- This is the expected behavior when trying to create a duplicate account
- Use a different email address to create a new account

### Database connection issues
- Verify your `SUPABASE_PROJECT_URL` is correct
- Ensure your `SUPABASE_SERVICE_KEY` has the correct permissions
- Check that Row Level Security policies are properly configured

## Architecture Notes

The integration works by:

1. **supabaseConfig.js** - Initializes the Supabase client
2. **supabaseUserModel.js** - Adapter that implements the same interface as the MongoDB/in-memory models
3. **userModel.js** - Router that selects which backend to use based on `USE_SUPABASE` flag
4. **authService.js** - Unchanged; works with any model implementing the required interface
5. **authController.js** - Unchanged; works with any model via the service

This means the authentication logic remains the same regardless of which backend you use.

## Next Steps

- Configure Row Level Security (RLS) policies for production
- Set up database backups in Supabase dashboard
- Consider storing additional user metadata if needed
- Implement password reset functionality with Supabase
