# Development Guide

This guide provides instructions for setting up and working with the Card API in a local development environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Quick Setup](#quick-setup)
  - [Manual Setup](#manual-setup)
- [Development Workflow](#development-workflow)
  - [Running the API](#running-the-api)
  - [Testing Endpoints](#testing-endpoints)
  - [Database Management](#database-management)
- [Test Data](#test-data)
  - [Test Users](#test-users)
  - [Sample Decks](#sample-decks)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

## Prerequisites

- **Node.js** (v16 or higher)
- **Docker Desktop** (required for Supabase local development)
- **Supabase CLI** (for managing local Supabase instance)

## Getting Started

### Quick Setup

For a complete setup with a two-phase process:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local Supabase instance:
   ```bash
   npm run supabase:start
   ```
4. Run Phase 1 setup (database initialization):
   ```bash
   npm run setup
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. In a new terminal, run Phase 2 setup (data seeding):
   ```bash
   npm run seed:data
   ```

### Manual Setup

If you prefer to set up components individually:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local Supabase instance:
   ```bash
   npm run supabase:start
   ```
4. Reset the database (apply migrations):
   ```bash
   npx supabase db reset
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Create a test user:
   ```bash
   npm run create:user
   ```
7. Create sample decks:
   ```bash
   npm run create:decks
   ```

## Development Workflow

### Running the API

Start the development server with hot reloading:

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`.

### Testing Endpoints

You can test the API endpoints using:

- The included test scripts
- Postman or similar API testing tools
- curl commands

Example curl command to test the health endpoint:

```bash
curl http://localhost:3000/api/health
```

### Database Management

#### Reset Database

To reset the database to a clean state:

```bash
npx supabase db reset
```

This will apply all migrations and seed files.

#### View Database in Studio

Access the Supabase Studio to view and manage your database:

```bash
npm run supabase:studio
```

This will open the Supabase Studio in your browser.

## Test Data

### Setup Process

The setup process is split into two phases:

1. **Phase 1 (Database Setup)**:
   - Initializes the database schema
   - Applies all migrations
   - Run with `npm run setup`
   - Does not require the API server to be running

2. **Phase 2 (Data Seeding)**:
   - Creates test users and sample data
   - Requires the API server to be running
   - Run with `npm run seed:data` after starting the server
   - Creates two test users, each with their own decks
   - Adds sample flashcards to each deck

This two-phase approach ensures that the API server is available when creating test data through the API endpoints.

### Test Users

The seed data script creates two test users with the following credentials:

- **User 1**:
  - Email: testuser1@example.com
  - Password: password123
  - Decks: JavaScript Fundamentals, React Hooks, CSS Grid & Flexbox
  - Each deck contains 3 sample flashcards

- **User 2**:
  - Email: testuser2@example.com
  - Password: password123
  - Decks: TypeScript Basics, SQL Queries, Git Commands
  - Each deck contains 3 sample flashcards

To create test users manually:

```bash
npm run create:user
```

To test logging in with a test user:

```bash
npm run test:login
```

To create multiple test users with sample decks:

```bash
npm run seed:users
```

This will create two test users (user1@example.com and user2@example.com) with different sample decks.

### Sample Decks

To create sample decks for the test user:

```bash
npm run create:decks
```

This will create several flashcard decks with different topics.

### Sample Cards

The seed data script automatically creates sample flashcards for each deck. Each deck will have 3 cards related to the deck's topic. For example:

- JavaScript Fundamentals deck includes cards about closures, let vs var, and Promises
- React Hooks deck includes cards about useState, useEffect, and useContext
- SQL Queries deck includes cards about JOINs, WHERE vs HAVING, and INDEXes

This provides a complete testing environment with realistic data for development.

## Troubleshooting

### Invalid Login Credentials

If you're getting "Invalid login credentials" when trying to log in with a user created through SQL inserts, it's likely because the password hash is not in the correct format expected by Supabase. Use the API to create users instead.

### Docker Issues

If you encounter Docker-related issues:

1. Ensure Docker Desktop is running
2. Try restarting Docker Desktop
3. Check if the Supabase containers are running with `docker ps`

### Database Connection Issues

If you have issues connecting to the database:

1. Ensure Supabase is running with `npm run supabase:status`
2. Check the database connection settings in your `.env` file
3. Try resetting the database with `npx supabase db reset`

## Documentation

API documentation is available in the `docs` directory:

- [API Overview](docs/api-overview.md)
- [Authentication](docs/authentication.md)
- [Decks](docs/decks.md)
- [Project Structure](docs/project-structure.md) 