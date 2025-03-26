# Card API

A RESTful API built with TypeScript, Node.js, Express.js, PostgreSQL, and Supabase authentication for a flashcard review application with spaced repetition.

## Features

- TypeScript for type safety
- Express.js for API routing
- PostgreSQL database integration
- Supabase authentication
- Environment-based configuration
- Error handling middleware
- Clean project structure
- Local Supabase development environment
- Free Spaced Repetition System (FSRS) algorithm for optimal learning
- Daily review limits for balanced study sessions
- Detailed review metrics and progress tracking
- User-specific settings and preferences
- CSV import for bulk card creation
- AI-powered content explanation and enhancement

## Documentation

Detailed documentation is available in the [docs](./docs) directory:

- [API Overview](./docs/api-overview.md)
- [Project Structure](./docs/project-structure.md)
- [Authentication](./docs/authentication.md)
- [Decks](./docs/decks.md)
- [Cards](./docs/cards.md)
- [Logs](./docs/logs.md)
- [User Settings](./docs/user-settings.md)
- [CSV Import](./docs/imports.md)

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
├── scripts/
│   ├── shared/         # Shared utilities for scripts
│   └── ...             # Various setup and utility scripts
├── docs/               # Documentation
├── .env                # Environment variables
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Shared Utilities

The project includes shared utilities in the `scripts/shared/` directory to reduce code duplication between scripts:

- `api-utils.js` - Common functions for API interactions (deck creation, card creation, etc.)
- `demo-content.js` - Shared demo user content (decks, cards, and user configuration)
- `supabase-utils.js` - Utilities for working directly with the Supabase client

These shared modules are used by:
- `ensure-demo-user.js` - For ensuring the demo user exists in production
- `seed-data.js` - For creating test data in the development environment

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
- `npm run start:dev`: Start the server in development mode
- `npm run start:prod`: Start the server in production mode
- `npm run build:dev`: Build the project for development
- `npm run build:prod`: Build the project for production
- `npm run lint`: Run the linter
- `npm test`: Run the test suite
- `npm run supabase:start`: Start the local Supabase instance
- `npm run supabase:stop`: Stop the local Supabase instance
- `npm run supabase:status`: Check the status of the local Supabase instance
- `npm run supabase:studio`: Open the Supabase Studio in your browser

### Environment Configuration

The application supports different environment configurations for development and production:

#### Environment Files
- `.env.development`: Configuration for local development with local Supabase
- `.env.production`: Configuration for production deployment with Supabase cloud

#### Setting Up Environment Files

1. Development Environment (`.env.development`):
   ```
   PORT=3000
   NODE_ENV=development
   
   # PostgreSQL Connection
   DB_HOST=localhost
   DB_PORT=54322
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=postgres
   
   # Supabase - Local Development
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=<your-local-anon-key>
   SUPABASE_SERVICE_KEY=<your-local-service-role-key>

   # OpenAI
   OPENAI_API_KEY=<your-development-openai-api-key>
   ```

2. Production Environment (`.env.production`):
   ```
   PORT=3000
   NODE_ENV=production
   
   # Supabase - Production Cloud Instance
   SUPABASE_URL=<your-supabase-cloud-url>
   SUPABASE_ANON_KEY=<your-production-anon-key>
   SUPABASE_SERVICE_KEY=<your-production-service-key>

   # OpenAI
   OPENAI_API_KEY=<your-production-openai-api-key>
   ```

#### Switching Environments

The application automatically loads the appropriate environment file based on the `NODE_ENV` variable:
- For development: `NODE_ENV=development` (default if not specified)
- For production: `NODE_ENV=production`

You can use the environment-specific scripts to run the application in different environments:
- Development: `npm run dev` or `npm run start:dev`
- Production: `npm run start:prod`

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login a user
- `POST /api/auth/logout`: Logout a user
- `GET /api/auth/me`: Get the current user (requires authentication)

### Decks
- `GET /api/decks`: Get all decks for the current user
- `GET /api/decks/:id`: Get a specific deck by ID
- `GET /api/decks/slug/:slug`: Get a specific deck by slug
- `GET /api/decks/slug/:slug/review`: Get all cards from a deck for review
- `POST /api/decks`: Create a new deck
- `PATCH /api/decks/:id`: Update a deck
- `DELETE /api/decks/:id`: Delete a deck

### Cards
- `GET /api/cards`: Get all cards for the current user
- `GET /api/cards/:id`: Get a specific card by ID
- `GET /api/cards/review`: Get cards due for review
- `POST /api/cards`: Create a new card
- `POST /api/cards/:cardId/review`: Submit a review for a card
- `PATCH /api/cards/:id`: Update a card
- `DELETE /api/cards/:id`: Delete a card
- `POST /api/cards/:cardId/expound`: Get a detailed explanation of a card's content

### User Settings
- `GET /api/settings`: Get user settings
- `PATCH /api/settings`: Update user settings

### CSV Import
- `POST /api/imports/preview`: Create an import preview from CSV data
- `POST /api/imports/confirm`: Confirm and process an import
- `POST /api/imports/cancel`: Cancel a pending import
- `GET /api/imports/history`: Get recent import history

## Key Features

### Spaced Repetition System

The API implements the Free Spaced Repetition System (FSRS) algorithm, which optimizes the timing of card reviews based on user performance. This scientifically-backed approach helps users learn more efficiently by showing cards at the optimal time for memory retention.

### Daily Review Limits

To prevent burnout and encourage consistent study habits, the API enforces daily limits on:
- New cards per day
- Review cards per day

These limits are customizable through user settings and are applied on a per-deck basis using a rolling 24-hour window.

### Remaining Reviews Tracking

The API tracks and provides information about:
- How many cards are ready for review in each deck
- How many more reviews a user can complete today based on:
  - Their daily limit settings
  - The actual availability of cards in each deck
  - Their review history in the last 24 hours

### User Settings

Users can customize their learning experience through settings:
- Theme preferences
- Daily card limits
- FSRS algorithm parameters
- Notification preferences

### CSV Import

The API provides a two-step process for importing cards in bulk from CSV data:

1. **Preview Step**: Users submit CSV data and receive a preview of what will be imported, including validation results
2. **Confirmation Step**: After reviewing the preview, users can confirm or cancel the import

This approach allows users to validate their data before committing to the import, reducing errors and improving the user experience. The CSV import feature supports:

- Required columns: front, back
- Optional columns: tags, state, due
- Detailed validation with specific error messages
- Preview of the first 10 rows
- Automatic expiration of pending imports after 30 minutes

## Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## License

This project is licensed under the ISC License. 