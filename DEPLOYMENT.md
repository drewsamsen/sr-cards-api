# Deployment Guide

This document outlines the deployment process for the Card API application.

## Deployment Process

The application is set up for deployment on platforms like Vercel or similar services that support Node.js applications.

### Deployment Steps

1. The application code is pushed to the repository
2. The deployment platform runs the `vercel-build` script from package.json
3. This script:
   - Builds the TypeScript application (`npm run build`)
   - Verifies the deployment environment (`node scripts/verify-deployment-env.js`)

### Demo User in Production

The application includes a special "demo user" that is automatically managed by the application's `DemoService`. This service:

- Creates a demo user if it doesn't exist (with email `demo@example.com` and password `demopassword`)
- Pre-populates the demo user with flashcard decks and cards defined in template files
- Identifies demo users via metadata flags in user settings
- Automatically resets demo user content at regular intervals (default: 30 minutes)

The `DemoService` is automatically initialized when the application starts, and it runs a polling process that:

1. Periodically checks for demo users in the database
2. Determines if any demo users need their content reset based on the reset interval
3. Resets demo user content when needed by clearing existing decks/cards and recreating fresh ones

This ensures that the demo user is always available in production without requiring manual setup or maintenance scripts.

### Environment Variables

Make sure the following environment variables are properly set in your deployment environment:

- `SUPABASE_URL`: The URL of your Supabase instance
- `SUPABASE_KEY`: The service role key for your Supabase instance
- `SUPABASE_ANON_KEY`: The anonymous key for your Supabase instance
- `NODE_ENV`: Set to "production" for production deployments

### Database Migrations

Database migrations are managed through Supabase. When deploying, ensure that all migration files in `supabase/migrations/` are applied to the production database.

## Verifying the Deployment

After deployment, you can verify that everything is working correctly by:

1. Accessing the API endpoints to ensure the service is responsive
2. Logging in with the demo user credentials to verify the demo user exists
3. Checking that the demo user has the expected decks and cards

If you encounter any issues, check the application logs for error messages from the `DemoService`. 