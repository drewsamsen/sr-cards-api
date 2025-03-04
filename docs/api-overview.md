# API Overview

This document provides an overview of the Card API.

## Introduction

The Card API is a RESTful API built with TypeScript, Node.js, Express.js, PostgreSQL, and Supabase authentication. It follows REST principles and uses JSON for request and response bodies.

## Base URL

When running locally, the API is accessible at:

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication. To authenticate, include the JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

For more details on authentication, see [Authentication Documentation](./authentication.md).

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "status": "success",
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error message",
  "statusCode": 400,
  "stack": "Error stack trace (only in development mode)"
}
```

## HTTP Status Codes

The API uses standard HTTP status codes:

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

## Rate Limiting

Currently, the API does not implement rate limiting.

## Versioning

The API does not currently implement versioning. Future versions may be accessed via URL path (e.g., `/api/v2/`) or content negotiation.

## Available Endpoints

### Health Check

- `GET /api/health`: Check if the API is running

### Authentication

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login a user
- `POST /api/auth/logout`: Logout a user
- `GET /api/auth/me`: Get the current user's information

## Error Handling

The API uses a centralized error handling middleware that catches all errors and returns appropriate responses. In development mode, error stack traces are included in the response.

## Local Development

For local development, the API uses a local Supabase instance for authentication and database services. See the main [README.md](../README.md) for setup instructions. 