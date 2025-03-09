# Testing Vercel Deployment

This guide explains how to verify that your production deployment on Vercel is working correctly.

## Quick Health Check

The simplest way to verify your Vercel deployment is working is to run the health check script:

```bash
# Run with default Vercel URL (edit in the script)
npm run test:vercel

# Or specify a custom URL
npm run test:vercel https://your-vercel-deployment-url.vercel.app
```

This script will:
1. Check the API health endpoint (`/api/health`)
2. If that fails, try the root API endpoint (`/api`)
3. Report whether the deployment is up and running

## What's Being Tested

The health check verifies:
- The API is accessible
- The server is responding with the expected health status
- The deployment is properly configured

## Manual Testing

You can also manually test the API using tools like Postman, cURL, or any HTTP client:

```bash
# Using curl
curl https://your-vercel-deployment-url.vercel.app/api/health

# Using browser
# Simply open https://your-vercel-deployment-url.vercel.app/api/health in your browser
```

## Troubleshooting

If the health check fails, check:

1. **Environment Variables**: Ensure all required environment variables are set in the Vercel dashboard.
2. **Logs**: Check the Vercel deployment logs for any errors.
3. **Build Configuration**: Verify your `vercel.json` file is correctly configured.
4. **Database Connection**: Verify that your API can connect to your Supabase instance.

## Future Testing Enhancements

As your application grows, you may want to add more comprehensive tests:

1. **Authentication Tests**: Verify login and registration
2. **API Endpoint Tests**: Test key API endpoints
3. **Performance Tests**: Measure response times
4. **Load Tests**: Test how the API handles multiple concurrent requests

These can be added incrementally as needed. 