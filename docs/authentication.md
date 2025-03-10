# Authentication

This document outlines the authentication features available in the Card API.

## Overview

The Card API uses Supabase for authentication. It provides endpoints for user registration, login, logout, refreshing tokens, and retrieving the current user's information.

Authentication is implemented using JWT (JSON Web Tokens). When a user logs in, they receive an access token that must be included in the `Authorization` header for protected routes.

## Setup

Authentication is powered by Supabase, which is configured in the `src/config/supabase.ts` file. The API uses two Supabase clients:

- `supabaseAnon`: Uses the anon key for client-side operations
- `supabaseAdmin`: Uses the service role key for server-side operations

The Supabase clients are configured with enhanced session persistence options to maintain longer authentication sessions in serverless environments:

```typescript
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
};
```

## Database Schema

User profiles are stored in the `profiles` table, which extends Supabase's built-in `auth.users` table:

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

When a new user registers, a trigger automatically creates a profile for them:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## API Endpoints

### Register a New User

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "fullName": "John Doe"
    }
  }
}
```

### Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "fullName": "John Doe"
    },
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

### Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Refreshes an expired access token using a refresh token. This endpoint is particularly useful in serverless environments where maintaining long-lived authentication sessions can be challenging.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "fullName": "John Doe"
    },
    "token": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing refresh token
- `401 Unauthorized`: Invalid or expired refresh token

### Logout

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <jwt-access-token>
```

**Response:**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### Get Current User

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <jwt-access-token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "fullName": "John Doe"
    }
  }
}
```

## Authentication Middleware

Protected routes use the `authenticate` middleware, which verifies the JWT token in the `Authorization` header:

```typescript
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        status: 'error', 
        message: 'Authentication required' 
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data, error } = await supabaseAnon.auth.getUser(token);
    
    if (error || !data.user) {
      res.status(401).json({ 
        status: 'error', 
        message: 'Invalid or expired token' 
      });
      return;
    }
    
    // Attach the user to the request
    (req as AuthenticatedRequest).user = data.user;
    
    next();
  } catch (error) {
    next(error);
  }
};
```

## Token Refresh Flow

When using the API with a frontend application, the recommended token refresh flow is:

1. Frontend makes a request to a protected endpoint with the access token
2. If the access token is expired, the API returns a 401 Unauthorized response
3. Frontend detects the 401 response and calls the `/api/auth/refresh` endpoint with the refresh token
4. If the refresh token is valid, the API returns new access and refresh tokens
5. Frontend updates its stored tokens and retries the original request
6. If the refresh token is also expired, the user must log in again

This flow ensures that users can maintain long-lived sessions without needing to log in frequently, while still maintaining security.

## Error Handling

Authentication errors return appropriate HTTP status codes:

- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Server-side errors

## Testing Authentication

You can test the authentication endpoints using curl:

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Refresh token (replace REFRESH_TOKEN with the refresh token from login response)
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"REFRESH_TOKEN"}'

# Get current user (replace TOKEN with the token from login response)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Logout (replace TOKEN with the token from login response)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer TOKEN"
```

## Security Considerations

- Passwords are securely hashed by Supabase
- JWT tokens have an expiration time
- Refresh tokens provide a secure way to maintain long-lived sessions
- Row Level Security (RLS) is enabled on the profiles table
- Service role operations are only performed server-side 