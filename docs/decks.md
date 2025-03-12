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
  slug TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name),
  UNIQUE(user_id, slug)
);
```

Key features:
- Each deck has a unique ID
- Decks belong to a user (referenced by `user_id`)
- Deck names must be unique per user (enforced by the `UNIQUE(user_id, name)` constraint)
- Deck slugs must be unique per user (enforced by the `UNIQUE(user_id, slug)` constraint)
- Slugs are automatically generated for URL-friendly access
- Timestamps track creation and update times

## Automatic Slug Generation

When a deck is created, a slug is automatically generated if not provided:

1. The slug is derived from the deck name
2. Special characters are removed
3. Spaces are replaced with hyphens
4. The text is converted to lowercase
5. If a slug already exists for the same user, a number is appended to ensure uniqueness per user

This is handled by the following trigger and functions:

```sql
-- Function to generate a slug from the deck name
CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT, user_id UUID)
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
  
  -- Check if slug exists for this user and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.decks WHERE slug = final_slug AND user_id = user_id) LOOP
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
- Composite index on `(user_id, slug)` for faster lookups when accessing decks by slug

## API Endpoints

### Decks

- `GET /api/decks`: Get all decks for the current user
- `GET /api/decks/:id`: Get a specific deck by ID
- `GET /api/decks/slug/:slug`: Get a specific deck by slug
- `GET /api/decks/slug/:slug/review`: Get all cards from a deck for review with additional metrics
- `POST /api/decks`: Create a new deck
- `PATCH /api/decks/:id`: Update a deck
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
        "newCards": 2,
        "dueCards": 3,
        "totalCards": 20,
        "remainingReviews": 3
      },
      {
        "id": "uuid-2",
        "userId": "user-uuid",
        "name": "React Hooks",
        "slug": "react-hooks",
        "description": "All about React hooks and their usage",
        "createdAt": "2023-03-05T10:30:00Z",
        "updatedAt": "2023-03-05T10:30:00Z",
        "newCards": 0,
        "dueCards": 0,
        "totalCards": 15,
        "remainingReviews": 0
      }
    ]
  }
}
```

The `remainingReviews` property shows how many more cards the user can review today, taking into account both the user's daily limits and the actual availability of cards in the deck.

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
      "updatedAt": "2023-03-04T12:00:00Z",
      "newCards": 2,
      "dueCards": 3,
      "totalCards": 20,
      "remainingReviews": 3
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
      "updatedAt": "2023-03-04T12:00:00Z",
      "newCards": 2,
      "dueCards": 3,
      "totalCards": 20,
      "remainingReviews": 3
    }
  }
}
```

### Get Cards for Review

This endpoint retrieves cards from a deck that are either new (state=0) or due for review (due date in the past). It strictly respects the user's daily limits for new cards and reviews per deck.

For example, if a user has set their daily limits to 5 new cards and 10 review cards:
- If they've already reviewed 3 new cards and 4 review cards today, the endpoint will return at most 2 new cards and 6 review cards (8 total)
- If they've reached their daily limit for new cards but not for review cards, the endpoint will only return review cards
- If they've reached both limits, the endpoint will return an "all caught up" response

**Request:**
```http
GET /api/decks/slug/javascript-basics/review
Authorization: Bearer <jwt-token>
```

**Response (Cards Available):**
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
      "updatedAt": "2023-03-04T12:00:00Z",
      "newCards": 2,
      "dueCards": 3,
      "totalCards": 20,
      "remainingReviews": 3
    },
    "cards": [
      {
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
        "deckName": "JavaScript Basics",
        "deckSlug": "javascript-basics",
        "reviewMetrics": {
          "again": "2023-03-05T12:30:00Z",
          "hard": "2023-03-07T12:30:00Z",
          "good": "2023-03-11T12:30:00Z",
          "easy": "2023-03-18T12:30:00Z"
        }
      },
      {
        "id": "card-uuid-2",
        "userId": "user-uuid",
        "deckId": "uuid-1",
        "front": "What is hoisting in JavaScript?",
        "back": "Hoisting is JavaScript's default behavior of moving declarations to the top of the current scope.",
        "state": 1,
        "due": "2023-03-05T12:30:00Z",
        "stability": 2.5,
        "difficulty": 0.3,
        "elapsedDays": 1,
        "scheduledDays": 1,
        "reps": 1,
        "lapses": 0,
        "lastReview": "2023-03-04T12:30:00Z",
        "createdAt": "2023-03-03T12:30:00Z",
        "updatedAt": "2023-03-04T12:30:00Z",
        "deckName": "JavaScript Basics",
        "deckSlug": "javascript-basics",
        "reviewMetrics": {
          "again": "2023-03-06T12:30:00Z",
          "hard": "2023-03-08T12:30:00Z",
          "good": "2023-03-12T12:30:00Z",
          "easy": "2023-03-19T12:30:00Z"
        }
      }
    ],
    "dailyProgress": {
      "newCardsSeen": 3,
      "newCardsLimit": 5,
      "reviewCardsSeen": 8,
      "reviewCardsLimit": 15,
      "totalRemaining": 9
    }
  }
}
```

**Response (All Caught Up / Daily Limit Reached):**
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
      "updatedAt": "2023-03-04T12:00:00Z",
      "newCards": 2,
      "dueCards": 3,
      "totalCards": 20,
      "remainingReviews": 3
    },
    "cards": [],
    "allCaughtUp": true,
    "message": "Great job! You've completed all your reviews for now. Check back later for more.",
    "totalCards": 25,
    "dailyProgress": {
      "newCardsSeen": 5,
      "newCardsLimit": 5,
      "reviewCardsSeen": 10,
      "reviewCardsLimit": 15,
      "totalRemaining": 0
    }
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
      "updatedAt": "2023-03-04T12:00:00Z",
      "newCards": 2,
      "dueCards": 3,
      "totalCards": 20,
      "remainingReviews": 3
    },
    "cards": [],
    "emptyDeck": true,
    "message": "This deck doesn't have any cards yet. Add some cards to start reviewing!",
    "dailyProgress": {
      "newCardsSeen": 0,
      "newCardsLimit": 5,
      "reviewCardsSeen": 0,
      "reviewCardsLimit": 15,
      "totalRemaining": 20
    }
  }
}
```

The `dailyProgress` object provides information about the user's progress toward their daily limits:

- `newCardsSeen`: Number of new cards reviewed in the last 24 hours
- `newCardsLimit`: Maximum number of new cards allowed per day (from user settings)
- `reviewCardsSeen`: Number of review cards reviewed in the last 24 hours
- `reviewCardsLimit`: Maximum number of review cards allowed per day (from user settings)
- `totalRemaining`: Total number of cards remaining before reaching daily limits

The response also includes `reviewMetrics` for each card in the array, which provides predicted due dates based on different review ratings:

- `again`: When the card should be reviewed if rated "Again" (typically the next day)
- `hard`: When the card should be reviewed if rated "Hard" (typically a few days later)
- `good`: When the card should be reviewed if rated "Good" (typically a week later)
- `easy`: When the card should be reviewed if rated "Easy" (typically two weeks later)

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
PATCH /api/decks/uuid-1
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "JavaScript Fundamentals",
  "description": "Updated description for JavaScript fundamentals",
  "slug": "js-fundamentals"
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
      "slug": "js-fundamentals",
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
- Deck slugs must be unique per user (different users can have decks with the same slug)
- Slugs are automatically generated from the deck name when a deck is created
- Slugs can be manually updated when updating a deck
- The `updated_at` timestamp is automatically updated when a deck is modified
- API responses use camelCase for property names (JavaScript convention)
- Database uses snake_case for column names (PostgreSQL convention)

The `newCards` property indicates how many cards in the deck are new (state = 0).
The `dueCards` property indicates how many cards in the deck are NOT new and have a due date in the past (state > 0 and due <= now).
The `totalCards` property shows the total number of cards in the deck.
The `remainingReviews` property shows how many more cards the user can review today, taking into account both the user's daily limits and the actual availability of cards in the deck. 