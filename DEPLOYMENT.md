# Deployment Guide

This document outlines the deployment process for the Card API application.

## Deployment Process

The application is set up for deployment on platforms like Vercel or similar services that support Node.js applications.

### Deployment Steps

1. The application code is pushed to the repository
2. The deployment platform runs the `vercel-build` script from package.json
3. This script:
   - Builds the TypeScript application (`npm run build`)
   - Ensures the demo user exists (`node scripts/ensure-demo-user.js`)

### Demo User in Production

The application includes a special "demo user" that is automatically created in production if it doesn't exist. This demo user:

- Has the email `demo@example.com` and password `demopassword`
- Is pre-populated with flashcard decks and cards
- Has a flag in the database marking it as a demo user
- Is automatically reset at regular intervals (as specified in the user metadata)

The demo user is created during the deployment process using the `scripts/ensure-demo-user.js` script. This script:

1. Checks if the demo user already exists in the database
2. If the demo user doesn't exist, creates it with the appropriate metadata
3. Logs in as the demo user to obtain an authentication token
4. Creates pre-defined decks and cards for the demo user

This ensures that the demo user is always available in production without requiring manual setup.

### Environment Variables

Make sure the following environment variables are properly set in your deployment environment:

- `SUPABASE_URL`: The URL of your Supabase instance
- `SUPABASE_KEY`: The service role key for your Supabase instance
- `SUPABASE_ANON_KEY`: The anonymous key for your Supabase instance
- `NODE_ENV`: Set to "production" for production deployments

### Database Migrations

Database migrations are managed through Supabase. When deploying, ensure that:

1. All migration files in `supabase/migrations/` are applied to the production database
2. The `reset_demo_user` function is properly created in the production database

## Verifying the Deployment

After deployment, you can verify that everything is working correctly by:

1. Accessing the API endpoints to ensure the service is responsive
2. Logging in with the demo user credentials to verify the demo user exists
3. Checking that the demo user has the expected decks and cards

If you encounter any issues, check the deployment logs for error messages. 