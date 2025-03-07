# Cards API

This document describes the Cards API endpoints for managing flashcards within decks.

## Card Model

A card represents a flashcard with front and back content, belonging to a specific deck.

```json
{
  "id": "uuid",
  "userId": "uuid",
  "deckId": "uuid",
  "front": "string",
  "back": "string",
  "state": 0,
  "due": "timestamp | null",
  "stability": 0,
  "difficulty": 0,
  "elapsedDays": 0,
  "scheduledDays": 0,
  "reps": 0,
  "lapses": 0,
  "lastReview": "timestamp | null",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "deckName": "string"
}
```

## Card State

Cards have four possible state values:
- `0`: New - Cards that have never been reviewed
- `1`: Learning - Cards that are currently being learned
- `2`: Review - Cards that have been learned and are in the review cycle
- `3`: Relearning - Cards that were previously learned but have been forgotten and are being relearned

## FSRS Algorithm

This API implements the Free Spaced Repetition Scheduler (FSRS) algorithm for optimizing review intervals. The following fields are used by the algorithm:

- `stability`: A measure of how well the information is retained
- `difficulty`: Reflects the inherent difficulty of the card content
- `elapsedDays`: Days since the card was last reviewed
- `scheduledDays`: The interval at which the card is next scheduled
- `reps`: Total number of times the card has been reviewed
- `lapses`: Times the card was forgotten or remembered incorrectly
- `lastReview`: The most recent review date, if applicable
- `due`: Date when the card is next due for review (null for new cards)

> **Note**: While the API returns camelCase property names (`elapsedDays`, `scheduledDays`, `lastReview`), the FSRS service internally supports both snake_case (`elapsed_days`, `scheduled_days`, `last_review`) and camelCase naming conventions for compatibility with different client implementations and the underlying ts-fsrs package.

## API Endpoints

All card endpoints require authentication.

### Get All Cards for Current User

```
GET /api/cards
```

This endpoint returns all cards belonging to the current user across all decks.

#### Request

Headers:
```
Authorization: Bearer <token>
```

#### Response

```json
{
  "status": "success",
  "data": {
    "cards": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "userId": "123e4567-e89b-12d3-a456-426614174001",
        "deckId": "123e4567-e89b-12d3-a456-426614174002",
        "front": "What is a closure in JavaScript?",
        "back": "A closure is a function that has access to its own scope, the scope of the outer function, and the global scope.",
        "state": 0,
        "due": null,
        "stability": 0,
        "difficulty": 0,
        "elapsed_days": 0,
        "scheduled_days": 0,
        "reps": 0,
        "lapses": 0,
        "last_review": null,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "deckName": "JavaScript Fundamentals"
      },
      // More cards...
    ]
  }
}
```

### Get All Cards for a Deck

```
GET /api/decks/:deckId/cards
```

#### Request

Headers:
```
Authorization: Bearer <token>
```

#### Response

```json
{
  "status": "success",
  "data": {
    "cards": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "userId": "123e4567-e89b-12d3-a456-426614174001",
        "deckId": "123e4567-e89b-12d3-a456-426614174002",
        "front": "What is a closure in JavaScript?",
        "back": "A closure is a function that has access to its own scope, the scope of the outer function, and the global scope.",
        "state": 0,
        "due": null,
        "stability": 0,
        "difficulty": 0,
        "elapsed_days": 0,
        "scheduled_days": 0,
        "reps": 0,
        "lapses": 0,
        "last_review": null,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "deckName": "JavaScript Fundamentals"
      },
      // More cards...
    ]
  }
}
```

### Get a Card by ID

```
GET /api/cards/:id
```

#### Request

Headers:
```
Authorization: Bearer <token>
```

#### Response

```json
{
  "status": "success",
  "data": {
    "card": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "userId": "123e4567-e89b-12d3-a456-426614174001",
      "deckId": "123e4567-e89b-12d3-a456-426614174002",
      "front": "What is a closure in JavaScript?",
      "back": "A closure is a function that has access to its own scope, the scope of the outer function, and the global scope.",
      "state": 0,
      "due": null,
      "stability": 0,
      "difficulty": 0,
      "elapsed_days": 0,
      "scheduled_days": 0,
      "reps": 0,
      "lapses": 0,
      "last_review": null,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "deckName": "JavaScript Fundamentals"
    }
  }
}
```

### Create a Card

```
POST /api/decks/:deckId/cards
```

#### Request

Headers:
```
Authorization: Bearer <token>
Content-Type: application/json
```

Body:
```json
{
  "front": "What is a closure in JavaScript?",
  "back": "A closure is a function that has access to its own scope, the scope of the outer function, and the global scope."
  // FSRS fields are automatically initialized with default values
}
```

#### Response

```json
{
  "status": "success",
  "data": {
    "card": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "userId": "123e4567-e89b-12d3-a456-426614174001",
      "deckId": "123e4567-e89b-12d3-a456-426614174002",
      "front": "What is a closure in JavaScript?",
      "back": "A closure is a function that has access to its own scope, the scope of the outer function, and the global scope.",
      "state": 0,
      "due": null,
      "stability": 0,
      "difficulty": 0,
      "elapsed_days": 0,
      "scheduled_days": 0,
      "reps": 0,
      "lapses": 0,
      "last_review": null,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "deckName": "JavaScript Fundamentals"
    }
  }
}
```

### Update a Card

```
PATCH /api/cards/:id
```

#### Request

Headers:
```
Authorization: Bearer <token>
Content-Type: application/json
```

Body:
```json
{
  "front": "Updated front content",  // Optional
  "back": "Updated back content"     // Optional
  // FSRS fields are typically updated by the review endpoint, not directly
}
```

#### Response

```json
{
  "status": "success",
  "data": {
    "card": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "userId": "123e4567-e89b-12d3-a456-426614174001",
      "deckId": "123e4567-e89b-12d3-a456-426614174002",
      "front": "Updated front content",
      "back": "Updated back content",
      "state": 0,
      "due": null,
      "stability": 0,
      "difficulty": 0,
      "elapsed_days": 0,
      "scheduled_days": 0,
      "reps": 0,
      "lapses": 0,
      "last_review": null,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T01:00:00.000Z",
      "deckName": "JavaScript Fundamentals"
    }
  }
}
```

### Delete a Card

```
DELETE /api/cards/:id
```

#### Request

Headers:
```
Authorization: Bearer <token>
```

#### Response

```json
{
  "status": "success",
  "data": null
}
```

### Submit Card Review

```
POST /api/cards/:id/review
```

This endpoint processes a card review and updates the FSRS parameters accordingly.

#### Request

Headers:
```
Authorization: Bearer <token>
Content-Type: application/json
```

Body:
```json
{
  "rating": 3, // Rating from 1-4: 1=Again, 2=Hard, 3=Good, 4=Easy
  "reviewedAt": "2023-01-01T00:00:00.000Z" // Optional, defaults to current time
}
```

#### Response

```json
{
  "status": "success",
  "data": {
    "card": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "userId": "123e4567-e89b-12d3-a456-426614174001",
      "deckId": "123e4567-e89b-12d3-a456-426614174002",
      "front": "What is a closure in JavaScript?",
      "back": "A closure is a function that has access to its own scope, the scope of the outer function, and the global scope.",
      "state": 2,
      "due": "2023-01-05T00:00:00.000Z",
      "stability": 4.93,
      "difficulty": 0.3,
      "elapsedDays": 0,
      "scheduledDays": 4,
      "reps": 1,
      "lapses": 0,
      "lastReview": "2023-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "deckName": "JavaScript Fundamentals"
    }
  }
}
```

### Get Review Logs for a Card

```
GET /api/cards/:id/logs
```

This endpoint returns the review history logs for a specific card.

#### Request

Headers:
```
Authorization: Bearer <token>
```

#### Response

```json
{
  "status": "success",
  "data": {
    "logs": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174003",
        "cardId": "123e4567-e89b-12d3-a456-426614174000",
        "userId": "123e4567-e89b-12d3-a456-426614174001",
        "rating": 3,
        "state": 0,
        "due": null,
        "stability": 0,
        "difficulty": 0,
        "elapsedDays": 0,
        "lastElapsedDays": 0,
        "scheduledDays": 1,
        "review": "2023-01-01T00:00:00.000Z",
        "createdAt": "2023-01-01T00:00:00.000Z"
      },
      {
        "id": "123e4567-e89b-12d3-a456-426614174004",
        "cardId": "123e4567-e89b-12d3-a456-426614174000",
        "userId": "123e4567-e89b-12d3-a456-426614174001",
        "rating": 4,
        "state": 1,
        "due": "2023-01-02T00:00:00.000Z",
        "stability": 1.5,
        "difficulty": 0.3,
        "elapsedDays": 1,
        "lastElapsedDays": 0,
        "scheduledDays": 7,
        "review": "2023-01-02T00:00:00.000Z",
        "createdAt": "2023-01-02T00:00:00.000Z"
      }
    ]
  }
}
```

## Error Responses

### Card Not Found

```json
{
  "status": "error",
  "message": "Card not found",
  "statusCode": 404
}
```

### Unauthorized Access

```json
{
  "status": "error",
  "message": "You do not have permission to access this card",
  "statusCode": 403
}
```

### Validation Error

```json
{
  "status": "error",
  "message": "Validation error",
  "statusCode": 400,
  "errors": [
    {
      "field": "front",
      "message": "Front content is required"
    }
  ]
}
```

### Invalid Rating

```json
{
  "status": "error",
  "message": "Valid rating (1-4) is required"
}
```

### Missing Required Fields

```json
{
  "status": "error",
  "message": "Front and back content are required"
}
```

## Implementation Notes

- Cards are always associated with both a user and a deck
- The FSRS algorithm is used to implement an optimized spaced repetition system
- The due field determines when a card should be reviewed next (null for new cards)
- Row Level Security (RLS) ensures users can only access their own cards
- The deckName field is included in all card responses for convenience
