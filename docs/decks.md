# Decks

This document outlines the flashcard deck functionality in the Card API.

## Database Schema

### Decks Table

The `decks` table stores collections of flashcards:

```sql
CREATE TABLE IF NOT EXISTS public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);
```

Key features:
- Each deck has a unique ID
- Decks belong to a user (referenced by `user_id`)
- Deck names must be unique per user (enforced by the `UNIQUE(user_id, name)` constraint)
- Slugs are automatically generated for URL-friendly access
- Timestamps track creation and update times

## Automatic Slug Generation

When a deck is created, a slug is automatically generated if not provided:

1. The slug is derived from the deck name
2. Special characters are removed
3. Spaces are replaced with hyphens
4. The text is converted to lowercase
5. If a slug already exists, a number is appended to ensure uniqueness

This is handled by the following trigger and functions:

```sql
-- Function to generate a slug from the deck name
CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special characters
  base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  
  -- Initial attempt with the base slug
  final_slug := base_slug;
  
  -- Check if slug exists and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.decks WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set the slug before insert
CREATE TRIGGER set_deck_slug_trigger
  BEFORE INSERT ON public.decks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_deck_slug();
```

## Security

Row Level Security (RLS) is enabled on the decks table with the following policies:

- Users can only view their own decks
- Users can only insert decks where they are the owner
- Users can only update their own decks
- Users can only delete their own decks

## Performance Optimizations

The following indexes are created for better performance:

- Index on `user_id` for faster queries when retrieving a user's decks
- Index on `slug` for faster lookups when accessing decks by slug

## API Endpoints

### Decks

- `GET /api/decks`: Get all decks for the current user
- `GET /api/decks/:id`: Get a specific deck by ID
- `GET /api/decks/slug/:slug`: Get a specific deck by slug
- `GET /api/decks/slug/:slug/review`: Get a random card from a deck for review with additional metrics
- `POST /api/decks`: Create a new deck
- `PUT /api/decks/:id`: Update a deck
- `DELETE /api/decks/:id`: Delete a deck

## Request and Response Examples

### Get All Decks

**Request:**
```http
GET /api/decks
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "decks": [
      {
        "id": "uuid-1",
        "userId": "user-uuid",
        "name": "JavaScript Basics",
        "slug": "javascript-basics",
        "description": "Flashcards for JavaScript fundamentals",
        "createdAt": "2023-03-04T12:00:00Z",
        "updatedAt": "2023-03-04T12:00:00Z",
        "reviewCount": 5
      },
      {
        "id": "uuid-2",
        "userId": "user-uuid",
        "name": "React Hooks",
        "slug": "react-hooks",
        "description": "All about React hooks and their usage",
        "createdAt": "2023-03-05T10:30:00Z",
        "updatedAt": "2023-03-05T10:30:00Z",
        "reviewCount": 0
      }
    ]
  }
}
```

The `reviewCount` property indicates how many cards in the deck are ready for review (either new cards or cards with a due date in the past).

### Get Deck by ID

**Request:**
```http
GET /api/decks/uuid-1
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "deck": {
      "id": "uuid-1",
      "userId": "user-uuid",
      "name": "JavaScript Basics",
      "slug": "javascript-basics",
      "description": "Flashcards for JavaScript fundamentals",
      "createdAt": "2023-03-04T12:00:00Z",
      "updatedAt": "2023-03-04T12:00:00Z"
    }
  }
}
```

### Get Deck by Slug

**Request:**
```http
GET /api/decks/slug/javascript-basics
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "deck": {
      "id": "uuid-1",
      "userId": "user-uuid",
      "name": "JavaScript Basics",
      "slug": "javascript-basics",
      "description": "Flashcards for JavaScript fundamentals",
      "createdAt": "2023-03-04T12:00:00Z",
      "updatedAt": "2023-03-04T12:00:00Z"
    }
  }
}
```

### Get Random Card for Review

This endpoint retrieves a random card from a deck that is either new (state=0) or due for review (due date in the past).

**Request:**
```http
GET /api/decks/slug/javascript-basics/review
Authorization: Bearer <jwt-token>
```

**Response (Card Available):**
```json
{
  "status": "success",
  "data": {
    "deck": {
      "id": "uuid-1",
      "userId": "user-uuid",
      "name": "JavaScript Basics",
      "slug": "javascript-basics",
      "description": "Flashcards for JavaScript fundamentals",
      "createdAt": "2023-03-04T12:00:00Z",
      "updatedAt": "2023-03-04T12:00:00Z"
    },
    "card": {
      "id": "card-uuid-1",
      "userId": "user-uuid",
      "deckId": "uuid-1",
      "front": "What is a closure in JavaScript?",
      "back": "A closure is a function that has access to its own scope, the scope of the outer function, and the global scope.",
      "state": 0,
      "due": null,
      "stability": 0,
      "difficulty": 0,
      "elapsedDays": 0,
      "scheduledDays": 0,
      "reps": 0,
      "lapses": 0,
      "lastReview": null,
      "createdAt": "2023-03-04T12:30:00Z",
      "updatedAt": "2023-03-04T12:30:00Z",
      "deckName": "JavaScript Basics"
    },
    "reviewMetrics": {
      "again": "2023-03-05T12:30:00Z",
      "hard": "2023-03-07T12:30:00Z",
      "good": "2023-03-11T12:30:00Z",
      "easy": "2023-03-18T12:30:00Z"
    }
  }
}
```

**Response (All Caught Up):**
```json
{
  "status": "success",
  "data": {
    "deck": {
      "id": "uuid-1",
      "userId": "user-uuid",
      "name": "JavaScript Basics",
      "slug": "javascript-basics",
      "description": "Flashcards for JavaScript fundamentals",
      "createdAt": "2023-03-04T12:00:00Z",
      "updatedAt": "2023-03-04T12:00:00Z"
    },
    "allCaughtUp": true,
    "message": "You're all caught up! No cards due for review at this time.",
    "totalCards": 25
  }
}
```

**Response (Empty Deck):**
```json
{
  "status": "success",
  "data": {
    "deck": {
      "id": "uuid-1",
      "userId": "user-uuid",
      "name": "JavaScript Basics",
      "slug": "javascript-basics",
      "description": "Flashcards for JavaScript fundamentals",
      "createdAt": "2023-03-04T12:00:00Z",
      "updatedAt": "2023-03-04T12:00:00Z"
    },
    "emptyDeck": true,
    "message": "This deck doesn't have any cards yet. Add some cards to start reviewing!"
  }
}
```

The `reviewMetrics` object provides predicted due dates for the card based on different review ratings:

- `again`: When the card should be reviewed if rated "Again" (typically the next day)
- `hard`: When the card should be reviewed if rated "Hard" (typically a few days later)
- `good`: When the card should be reviewed if rated "Good" (typically a week later)
- `easy`: When the card should be reviewed if rated "Easy" (typically two weeks later)

These dates follow spaced repetition principles, with longer intervals for better-remembered cards.

### Create a Deck

**Request:**
```http
POST /api/decks
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "JavaScript Basics",
  "description": "Flashcards for JavaScript fundamentals"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "deck": {
      "id": "uuid",
      "userId": "user-uuid",
      "name": "JavaScript Basics",
      "slug": "javascript-basics",
      "description": "Flashcards for JavaScript fundamentals",
      "createdAt": "2023-03-04T12:00:00Z",
      "updatedAt": "2023-03-04T12:00:00Z"
    }
  }
}
```

### Update a Deck

**Request:**
```http
PUT /api/decks/uuid-1
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "JavaScript Fundamentals",
  "description": "Updated description for JavaScript fundamentals"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "deck": {
      "id": "uuid-1",
      "userId": "user-uuid",
      "name": "JavaScript Fundamentals",
      "slug": "javascript-fundamentals",
      "description": "Updated description for JavaScript fundamentals",
      "createdAt": "2023-03-04T12:00:00Z",
      "updatedAt": "2023-03-06T09:15:00Z"
    }
  }
}
```

### Delete a Deck

**Request:**
```http
DELETE /api/decks/uuid-1
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Deck deleted successfully"
  }
}
```

## Implementation Notes

- Deck names must be unique per user
- Slugs are automatically generated from the deck name
- The `updated_at` timestamp is automatically updated when a deck is modified
- API responses use camelCase for property names (JavaScript convention)
- Database uses snake_case for column names (PostgreSQL convention) 