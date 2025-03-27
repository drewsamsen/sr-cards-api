# System Patterns

## Architecture Overview

The Card API follows a layered architecture with clear separation of concerns:

1. **API Layer** - Express.js routes and controllers
2. **Service Layer** - Business logic and data processing
3. **Data Access Layer** - Supabase client interactions
4. **Utils** - Shared utilities and helper functions

## Core Components

### Authentication
- Supabase Auth for user management
- JWT tokens for API authorization
- Middleware for protected routes
- User-specific data access controls

### Data Management
- Decks and cards organization
- User settings storage
- CSV import/export functionality
- Data validation and sanitization

### Spaced Repetition System
- Free Spaced Repetition System (FSRS) algorithm
- Card scheduling based on user performance
- Daily review limits and tracking
- Learning metrics and progress tracking

### Demo User System
- Automated demo user management via DemoService
- Periodic content refreshing based on configurable intervals
- JSON template-based approach for demo content
- Multi-level detection for demo users (metadata + settings)
- Self-healing mechanisms with retry logic and SQL-level backup functions
- In-memory caching for efficiency with automatic invalidation

## Design Patterns

### Singleton Services
The application uses singleton service instances for managing different aspects of the application:

- `cardService` - Card CRUD operations and reviews
- `deckService` - Deck management and card organization
- `userSettingsService` - User preferences and settings
- `fsrsService` - FSRS algorithm implementation
- `demoService` - Demo user management and content resetting

### Repository Pattern
Data access is abstracted through service modules that interact with the Supabase client, providing a clean separation between business logic and data access.

### DTO Pattern
Data Transfer Objects (DTOs) are used to define the structure of data being transferred between API and services, ensuring type safety and validation.

### Error Handling Pattern
Centralized error handling with detailed logging and custom error classes for different types of errors.

### Polling Pattern
The DemoService implements a polling pattern to periodically check for demo users needing a content reset, running on a configurable interval to minimize resource usage while maintaining fresh demo content.

## API Design

### RESTful Endpoints
- Resource-based URL structure
- HTTP methods for CRUD operations
- JSON response format
- Pagination for large collections
- Consistent error responses

### Authentication Flow
1. User registers or logs in
2. Server generates JWT token
3. Client includes token in subsequent requests
4. Server validates token and authorizes requests

### Card Review Flow
1. Client requests cards due for review
2. User submits review rating (1-4)
3. Server applies FSRS algorithm to calculate next review date
4. Card state and scheduling are updated
5. Review history is logged

### Demo User Reset Flow
1. DemoService polls for demo users periodically
2. System checks if reset interval has passed for each demo user
3. If reset is needed, all user content is deleted
4. Fresh content is created from JSON templates
5. User settings are restored to default values
6. Reset timestamp is updated to restart the interval

## Database Schema

### User Tables
- `auth.users` - Supabase Auth user records with metadata
- `profiles` - Extended user information
- `user_settings` - User preferences and application settings

### Content Tables
- `decks` - Collections of flashcards
- `cards` - Individual flashcards with learning parameters
- `logs` - Review history and learning data

### FSRS Fields
- `difficulty` - Card difficulty rating
- `stability` - Memory stability factor
- `elapsed_days` - Days since last review
- `scheduled_days` - Days scheduled for next review
- `reps` - Number of repetitions
- `lapses` - Number of times card was forgotten

## Deployment Architecture

### Development Environment
- Local Supabase instance
- Node.js Express server
- Automatic database migrations
- Development-specific environment variables

### Production Environment
- Supabase Cloud
- Serverless deployment on Vercel
- Production environment variables
- Automated database backups 