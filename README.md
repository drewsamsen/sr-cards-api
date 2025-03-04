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
- PostgreSQL database
- Supabase account

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

3. Create a `.env` file in the root directory and add your environment variables:
   ```
   PORT=3000
   NODE_ENV=development
   
   # PostgreSQL Connection
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=card_api_db
   
   # Supabase
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev`: Start the development server with hot-reloading
- `npm run build`: Build the project for production
- `npm start`: Start the production server
- `npm run lint`: Run the linter

## API Endpoints

- `GET /api/health`: Health check endpoint

## License

This project is licensed under the ISC License. 