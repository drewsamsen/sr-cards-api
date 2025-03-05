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
  "status": "new | learning | review",
  "reviewAt": "timestamp | null",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "deckName": "string"
}
```

## Card Status

Cards have three possible status values:
- `new`: Cards that have never been reviewed
- `learning`: Cards that are currently being learned
- `review`: Cards that have been learned and are in the review cycle

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
        "status": "new",
        "reviewAt": null,
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
        "status": "new",
        "reviewAt": null,
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
      "status": "new",
      "reviewAt": null,
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
  "back": "A closure is a function that has access to its own scope, the scope of the outer function, and the global scope.",
  "status": "new",  // Optional, defaults to "new"
  "reviewAt": null  // Optional, defaults to null
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
      "status": "new",
      "reviewAt": null,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "deckName": "JavaScript Fundamentals"
    }
  }
}
```

### Update a Card

```
PUT /api/cards/:id
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
  "back": "Updated back content",    // Optional
  "status": "learning",              // Optional
  "reviewAt": "2023-01-02T00:00:00.000Z"  // Optional
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
      "status": "learning",
      "reviewAt": "2023-01-02T00:00:00.000Z",
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

### Get Cards Due for Review

```
GET /api/cards/review
```

This endpoint returns cards that are due for review, including:
- Cards with status "new"
- Cards with status "review" and a reviewAt date in the past

#### Request

Headers:
```
Authorization: Bearer <token>
```

Query Parameters:
```
limit: number (optional, default: 20) - Maximum number of cards to return
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
        "status": "new",
        "reviewAt": null,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z",
        "deckName": "JavaScript Fundamentals"
      },
      // More cards...
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

## Implementation Notes

- Cards are always associated with both a user and a deck
- The status field helps implement a spaced repetition system
- The reviewAt field determines when a card should be reviewed next
- Row Level Security (RLS) ensures users can only access their own cards
- The deckName field is included in all card responses for convenience 