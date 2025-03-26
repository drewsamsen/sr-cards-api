# System Patterns

## Architecture Overview
The Card API follows a layered architecture pattern with clear separation of concerns:

```
API Request → Routes → Controllers → Services → Models → Database
```

## Key Components

### Routes Layer
- Defines API endpoints and HTTP methods
- Maps routes to appropriate controller functions
- Organized by resource type (auth, decks, cards, settings, imports)
- Located in `src/routes/`

### Controllers Layer
- Handles HTTP requests and responses
- Validates input data
- Calls appropriate service functions
- Returns formatted API responses
- Located in `src/controllers/`

### Services Layer
- Contains business logic
- Implements the FSRS algorithm
- Manages data operations through models
- Handles complex operations spanning multiple resources
- Located in `src/services/`

### Models Layer
- Defines database schema and relationships
- Provides data access methods
- Implements data validation
- Located in `src/models/`

### Middleware
- Authentication checking
- Error handling
- Request logging
- Input validation
- Located in `src/middleware/`

### Utils
- Helper functions
- Shared utilities
- Located in `src/utils/`

## Key Technical Decisions

### Authentication
- Uses Supabase for user authentication
- JWT-based authentication flow
- Auth middleware for protected routes

### Database
- PostgreSQL for data storage
- Supabase for database management
- SQL migrations for schema management

### API Design
- RESTful API principles
- Resource-based URL structure
- JSON request/response format
- Stateless API design

### Spaced Repetition
- Implements FSRS (Free Spaced Repetition System) algorithm
- Customizable algorithm parameters
- Enforceable daily review limits

## Component Relationships

### User → Decks → Cards
- Users own multiple decks
- Decks contain multiple cards
- Cards belong to a single deck
- Cards have review history and scheduling metadata

### User → Settings
- Users have customizable settings
- Settings affect FSRS parameters and daily limits

### User → Imports
- Users can create import sessions
- Import sessions process CSV data into cards

## Data Flow

### Card Review Flow
1. User requests cards due for review
2. API filters cards based on review schedule and limits
3. User submits review result
4. FSRS algorithm calculates next review date
5. Card schedule is updated
6. Review is logged

### Import Flow
1. User uploads CSV data for preview
2. API validates and processes the data
3. User confirms the import
4. API creates cards from the import data
5. Import history is updated 