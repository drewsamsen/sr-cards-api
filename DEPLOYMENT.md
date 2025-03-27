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

### Demo User Support

The application includes support for a demo user:

- Pre-configured demo user account with email `demo@example.com` and password `demopassword`
- Sample flashcard decks and cards are created during setup
- Demo user's content can be manually reset using the API if needed
- No automatic content refreshing in the serverless environment

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
2. Checking the health endpoint at `/api/health`
3. Logging in with the demo user credentials to verify functionality 