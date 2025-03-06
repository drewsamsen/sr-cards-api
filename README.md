# Card API

A RESTful API built with TypeScript, Node.js, Express.js, PostgreSQL, and Supabase authentication.

## Features

- TypeScript for type safety
- Express.js for API routing
- PostgreSQL database integration
- Supabase authentication
- Environment-based configuration
- Error handling middleware
- Clean project structure
- Local Supabase development environment

## Documentation

Detailed documentation is available in the [docs](./docs) directory:

- [API Overview](./docs/api-overview.md)
- [Project Structure](./docs/project-structure.md)
- [Authentication](./docs/authentication.md)
- [Decks](./docs/decks.md)
- [Cards](./docs/cards.md)
- [Logs](./docs/logs.md)

## Project Structure

```
card-api/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Middleware functions
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── index.ts        # Application entry point
├── supabase/
│   └── migrations/     # Database migrations
├── docs/               # Documentation
├── .env                # Environment variables
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Docker (for local Supabase)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd card-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local Supabase instance:
   ```bash
   npm run supabase:start
   ```

4. Create a `.env` file in the root directory and add your environment variables (use the values from the Supabase start output):
   ```
   PORT=3000
   NODE_ENV=development
   
   # PostgreSQL Connection
   DB_HOST=localhost
   DB_PORT=54322
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=postgres
   
   # Supabase
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_KEY=<your-service-role-key>
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open the Supabase Studio:
   ```bash
   npm run supabase:studio
   ```

### Available Scripts

- `npm run dev`: Start the development server with hot-reloading
- `npm run build`: Build the project for production
- `npm start`: Start the production server
- `npm run lint`: Run the linter
- `npm run supabase:start`: Start the local Supabase instance
- `npm run supabase:stop`: Stop the local Supabase instance
- `npm run supabase:status`: Check the status of the local Supabase instance
- `npm run supabase:studio`: Open the Supabase Studio in your browser

## API Endpoints

- `GET /api/health`: Health check endpoint
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login a user
- `POST /api/auth/logout`: Logout a user
- `GET /api/auth/me`: Get the current user (requires authentication)

## License

This project is licensed under the ISC License. 