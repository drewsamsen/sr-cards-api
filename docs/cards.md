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

### Get Cards

```
GET /api/cards
```

This endpoint returns cards belonging to the current user, with optional filtering by deck and pagination support.

#### Request

Headers:
```
Authorization: Bearer <token>
```

Query Parameters:
```
deckId: Optional deck ID to filter cards by deck
limit: Maximum number of cards to return (default: 20, max: 100)
offset: Number of cards to skip (default: 0)
```

Examples:
```
GET /api/cards                                                 # Get all cards
GET /api/cards?limit=10&offset=20                              # Get all cards with pagination
GET /api/cards?deckId=123e4567-e89b-12d3-a456-426614174002    # Get cards for a specific deck
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
        "elapsedDays": 0,
        "scheduledDays": 0,
        "reps": 0,
        "lapses": 0,
        "lastReview": null,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "deckName": "JavaScript Fundamentals"
      },
      // More cards...
    ],
    "pagination": {
      "total": 45,
      "limit": 10,
      "offset": 20,
      "hasMore": true
    },
    "deckId": "123e4567-e89b-12d3-a456-426614174002" // Only present when filtering by deck
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
      "elapsedDays": 0,
      "scheduledDays": 0,
      "reps": 0,
      "lapses": 0,
      "lastReview": null,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "deckName": "JavaScript Fundamentals",
      "deckSlug": "javascript-fundamentals"
    }
  }
}
```

### Create a Card

```
POST /api/decks/:deckId/cards
```

This endpoint creates a new card in the specified deck.

#### Request

Headers:
```
Authorization: Bearer <token>
Content-Type: application/json
```

Body:
```json
{
  "front": "What is JavaScript?",
  "back": "A programming language for the web"
}
```

#### Response (Success)

```json
{
  "status": "success",
  "data": {
    "card": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "userId": "123e4567-e89b-12d3-a456-426614174001",
      "deckId": "123e4567-e89b-12d3-a456-426614174002",
      "front": "What is JavaScript?",
      "back": "A programming language for the web",
      "state": 0,
      "due": null,
      "stability": 0,
      "difficulty": 0,
      "elapsedDays": 0,
      "scheduledDays": 0,
      "reps": 0,
      "lapses": 0,
      "lastReview": null,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

#### Response (Duplicate Card)

If a similar card already exists in the deck, the API will return a 409 Conflict response:

```json
{
  "status": "error",
  "message": "A similar card already exists in this deck: \"What is JavaScript?\"",
  "code": "DUPLICATE_CARD"
}
```

The duplicate detection is case-insensitive and uses fuzzy matching to catch cards that are very similar but not identical. It checks for:

1. Exact matches (ignoring case)
2. Matches after removing punctuation and normalizing whitespace
3. Very similar text using Levenshtein distance (for typos and minor differences)

This helps prevent accidental duplicate cards in your decks.

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
POST /api/cards/:cardId/review
```

This endpoint processes a card review and updates the FSRS parameters accordingly. It respects the user's daily limits for new cards and reviews per deck.

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

#### Response (Success)

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
      "deckName": "JavaScript Fundamentals",
      "deckSlug": "javascript-fundamentals"
    }
  }
}
```

#### Response (Daily Limit Reached)

```json
{
  "status": "success",
  "data": {
    "dailyLimitReached": true,
    "message": "You've reached your daily limit for new cards. Come back later!",
    "dailyProgress": {
      "newCardsSeen": 5,
      "newCardsLimit": 5,
      "reviewCardsSeen": 10,
      "reviewCardsLimit": 15,
      "totalRemaining": 5
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

### Get Expanded Explanation for a Card

```
POST /api/cards/:cardId/expound
```

This endpoint uses AI to generate a detailed explanation of a card's content, providing additional context, examples, and related information to help with understanding the topic.

#### Request

Headers:
```
Authorization: Bearer <token>
```

No request body is required as the endpoint uses the front and back content of the specified card to generate the explanation.

#### Response

```json
{
  "status": "success",
  "data": {
    "cardId": "123e4567-e89b-12d3-a456-426614174000",
    "front": "What is a closure in JavaScript?",
    "back": "A closure is a function that has access to its own scope, the scope of the outer function, and the global scope.",
    "explanation": "A closure in JavaScript is a fundamental concept that provides a way for functions to 'remember' and access their lexical scope even when executed outside that scope.\n\nLet's break this down with an example:\n\n```javascript\nfunction createCounter() {\n  let count = 0;  // Private variable\n  \n  return function() {\n    return ++count;  // Accessing the outer function's variable\n  };\n}\n\nconst counter = createCounter();\nconsole.log(counter()); // 1\nconsole.log(counter()); // 2\nconsole.log(counter()); // 3\n```\n\nIn this example:\n\n1. The `createCounter` function creates a variable `count`\n2. It returns an inner function that can access and modify this `count` variable\n3. Even after `createCounter` has finished executing, the returned function still has access to the `count` variable\n\nThis is possible because:\n\n- When a function is created in JavaScript, it forms a closure over the current scope\n- The function maintains a reference to its entire lexical environment\n- Variables in that environment aren't garbage-collected as long as the function exists\n\nClosures are widely used in JavaScript for:\n\n- Data encapsulation and private variables (as shown in the example)\n- Creating function factories\n- Implementing module patterns\n- Handling callbacks and event handlers\n- Managing asynchronous operations\n\nThey're particularly important in functional programming patterns and are one of JavaScript's most powerful features that allow for elegant and maintainable code design."
  }
}
```

#### Error Responses

##### Card Not Found

```json
{
  "status": "error",
  "message": "Card not found or does not belong to the user",
  "statusCode": 404
}
```

##### Authentication Error

```json
{
  "status": "error",
  "message": "Authentication required",
  "statusCode": 401
}
```

##### AI Service Error

```json
{
  "status": "error",
  "message": "Failed to generate explanation",
  "statusCode": 500
}
```

### Search Cards

```
GET /api/cards/search
```

This endpoint allows searching for cards by their content (front or back text), with optional filtering by deck.

#### Request

Headers:
```
Authorization: Bearer <token>
```

Query Parameters:
```
q: Search query (required)
deckId: Optional deck ID to filter results
limit: Maximum number of cards to return (default: 20, max: 100)
offset: Number of cards to skip (default: 0)
```

Example:
```
GET /api/cards/search?q=javascript&deckId=123e4567-e89b-12d3-a456-426614174002&limit=10&offset=0
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
        "front": "What is JavaScript?",
        "back": "A programming language for the web.",
        "state": 0,
        "due": null,
        "stability": 0,
        "difficulty": 0,
        "elapsedDays": 0,
        "scheduledDays": 0,
        "reps": 0,
        "lapses": 0,
        "lastReview": null,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "deckName": "Programming Languages"
      },
      // More cards...
    ],
    "pagination": {
      "total": 15,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    },
    "query": "javascript",
    "deckId": "123e4567-e89b-12d3-a456-426614174002"
  }
}
```

#### Error Response (Missing Query)

```json
{
  "status": "error",
  "message": "Search query is required"
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
