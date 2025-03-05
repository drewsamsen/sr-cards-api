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
- `POST /api/decks`: Create a new deck
- `PUT /api/decks/:id`: Update a deck
- `DELETE /api/decks/:id`: Delete a deck

## Request and Response Examples

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

## Implementation Notes

- Deck names must be unique per user
- Slugs are automatically generated from the deck name
- The `updated_at` timestamp is automatically updated when a deck is modified
- API responses use camelCase for property names (JavaScript convention)
- Database uses snake_case for column names (PostgreSQL convention) 