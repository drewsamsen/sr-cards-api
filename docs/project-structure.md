# Project Structure

This document outlines the structure of the Card API project.

## Directory Structure

```
card-api/
├── src/                  # Source code
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Middleware functions
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   └── index.ts          # Application entry point
├── supabase/             # Supabase configuration
│   └── migrations/       # Database migrations
├── docs/                 # Documentation
├── dist/                 # Compiled JavaScript (generated)
├── .env                  # Environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project documentation
```

## Key Files and Directories

### Source Code (`src/`)

#### Entry Point (`src/index.ts`)

The main application file that sets up the Express server, middleware, and routes.

#### Configuration (`src/config/`)

- `database.ts`: PostgreSQL database connection configuration
- `supabase.ts`: Supabase client configuration

#### Controllers (`src/controllers/`)

Controllers handle the request/response cycle and call the appropriate services:

- `auth.controller.ts`: Authentication controller for user registration, login, etc.

#### Middleware (`src/middleware/`)

Middleware functions that process requests before they reach the route handlers:

- `auth.ts`: Authentication middleware to protect routes
- `errorHandler.ts`: Global error handling middleware

#### Models (`src/models/`)

Database models and types (currently empty, will be populated as needed).

#### Routes (`src/routes/`)

API route definitions:

- `index.ts`: Main router that combines all route modules
- `auth.routes.ts`: Authentication routes

#### Services (`src/services/`)

Business logic and data access:

- `auth.service.ts`: Authentication service for interacting with Supabase auth

#### Utils (`src/utils/`)

Utility functions:

- `index.ts`: Common utility functions like UUID validation and async handler

### Supabase (`supabase/`)

#### Migrations (`supabase/migrations/`)

SQL migration files for the Supabase database:

- `00000000000000_initial_schema.sql`: Initial database schema with user profiles

### Documentation (`docs/`)

Project documentation:

- `api-overview.md`: General API documentation
- `authentication.md`: Authentication documentation
- `project-structure.md`: This file

## Code Organization Principles

The project follows these organizational principles:

1. **Separation of Concerns**: Each component has a single responsibility
2. **Layered Architecture**:
   - Routes define API endpoints
   - Controllers handle HTTP requests/responses
   - Services contain business logic
   - Models define data structures

3. **Dependency Injection**: Dependencies are passed to components rather than created inside them

4. **Error Handling**: Centralized error handling through middleware

5. **Type Safety**: TypeScript interfaces and types for all components

## Adding New Features

When adding new features:

1. Create or update database migrations in `supabase/migrations/`
2. Add models in `src/models/`
3. Implement business logic in `src/services/`
4. Create controllers in `src/controllers/`
5. Define routes in `src/routes/`
6. Update the main router in `src/routes/index.ts`
7. Add documentation in `docs/` 