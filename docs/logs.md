# Logs API

This document describes the Logs API endpoints for tracking card review history.

## Log Model

A log represents a record of a card review, capturing the state of the card at the time of review and the user's rating.

```json
{
  "id": "uuid",
  "cardId": "uuid",
  "userId": "uuid",
  "rating": 3, // 1=Again, 2=Hard, 3=Good, 4=Easy
  "state": 0, // 0=New, 1=Learning, 2=Review, 3=Relearning
  "due": "timestamp | null",
  "stability": 0.5,
  "difficulty": 0.3,
  "elapsedDays": 0,
  "lastElapsedDays": 0,
  "scheduledDays": 1,
  "review": "timestamp",
  "createdAt": "timestamp"
}
```

## Log Fields

- `id`: Unique identifier for the log
- `cardId`: ID of the card being reviewed
- `userId`: ID of the user who performed the review
- `rating`: The rating given by the user (1=Again, 2=Hard, 3=Good, 4=Easy)
- `state`: The state of the card at the time of review (0=New, 1=Learning, 2=Review, 3=Relearning)
- `due`: The due date of the card at the time of review
- `stability`: The stability of the card at the time of review
- `difficulty`: The difficulty of the card at the time of review
- `elapsedDays`: The number of days elapsed since the last review
- `lastElapsedDays`: The number of days between the previous two reviews
- `scheduledDays`: The number of days until the next review
- `review`: The timestamp when the review was performed
- `createdAt`: The timestamp when the log was created

## API Endpoints

All log endpoints require authentication.

### Get Logs for a Card

```
GET /api/cards/:id/logs
```

This endpoint returns all review logs for a specific card.

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
      // More logs...
    ]
  }
}
```

## Error Responses

### Card Not Found

```json
{
  "status": "error",
  "message": "Card not found"
}
```

## Implementation Details

Logs are automatically created when a user submits a review for a card. They provide a historical record of all reviews and can be used for analytics, debugging, and providing users with insights into their learning progress.

The logs table is designed to be immutable - logs cannot be updated or deleted once created. This ensures the integrity of the review history. 