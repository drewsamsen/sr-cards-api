# User Settings

This document outlines the user settings functionality in the Card API.

## Overview

The User Settings API allows users to retrieve and update their personal settings, including theme preferences, notification settings, and FSRS parameters. Settings are stored in a dedicated table and are automatically created with default values when a user first accesses them.

## Database Schema

### User Settings Table

The `user_settings` table stores user preferences and settings:

```sql
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Key features:
- Each user has a single settings record (enforced by the `UNIQUE` constraint on `user_id`)
- Settings are stored as a JSONB object, allowing for flexible schema
- Timestamps track creation and update times

## Settings Structure

The settings object has the following structure:

```typescript
{
  theme: string;              // "light" or "dark"
  showAnswerTimer: boolean;   // Whether to show a timer when reviewing cards
  notifications: {
    enabled: boolean;         // Whether notifications are enabled
    reminderTime: string;     // Time for daily reminders (format: "HH:MM")
    reminderDays: string[];   // Days of the week for reminders
  };
  fsrsParams: {
    requestRetention: number; // Target retention rate (0.0 to 1.0)
    maximumInterval: number;  // Maximum interval in days
    w: number[];              // FSRS algorithm weights
    enableFuzz: boolean;      // Whether to randomize intervals slightly
    enableShortTerm: boolean; // Whether to use short-term memory model
  };
}
```

## Default Settings

When a user is created or when settings are requested for the first time, default settings are automatically created with the following values:

```json
{
  "theme": "light",
  "showAnswerTimer": false,
  "notifications": {
    "enabled": true,
    "reminderTime": "18:00",
    "reminderDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  },
  "fsrsParams": {
    "requestRetention": 0.9,
    "maximumInterval": 365,
    "w": [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621],
    "enableFuzz": false,
    "enableShortTerm": true
  }
}
```

## API Endpoints

### Get User Settings

```
GET /api/user-settings
```

Retrieves the current user's settings. If the user doesn't have settings yet, default settings will be created automatically.

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
    "settings": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "settings": {
        "theme": "light",
        "showAnswerTimer": false,
        "notifications": {
          "enabled": true,
          "reminderTime": "18:00",
          "reminderDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        },
        "fsrsParams": {
          "requestRetention": 0.9,
          "maximumInterval": 365,
          "w": [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621],
          "enableFuzz": false,
          "enableShortTerm": true
        }
      },
      "createdAt": "2023-03-06T18:00:00.000Z",
      "updatedAt": "2023-03-06T18:00:00.000Z"
    }
  }
}
```

#### Error Responses

**401 Unauthorized**: User is not authenticated
```json
{
  "status": "error",
  "message": "Not authenticated"
}
```

**500 Internal Server Error**: Failed to create default settings
```json
{
  "status": "error",
  "message": "Failed to create default settings"
}
```

### Update User Settings

```
PUT /api/user-settings
```

Updates the current user's settings. If the user doesn't have settings yet, default settings will be created first and then updated.

#### Request

Headers:
```
Authorization: Bearer <token>
Content-Type: application/json
```

Body:
```json
{
  "settings": {
    "theme": "dark",
    "notifications": {
      "enabled": false
    }
  }
}
```

Note: You can include any subset of the settings object for partial updates.

#### Response

```json
{
  "status": "success",
  "data": {
    "settings": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "settings": {
        "theme": "dark",
        "showAnswerTimer": false,
        "notifications": {
          "enabled": false,
          "reminderTime": "18:00",
          "reminderDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        },
        "fsrsParams": {
          "requestRetention": 0.9,
          "maximumInterval": 365,
          "w": [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621],
          "enableFuzz": false,
          "enableShortTerm": true
        }
      },
      "createdAt": "2023-03-06T18:00:00.000Z",
      "updatedAt": "2023-03-06T18:30:00.000Z"
    }
  }
}
```

#### Error Responses

**400 Bad Request**: Settings object is missing or invalid
```json
{
  "status": "error",
  "message": "Settings object is required"
}
```

**401 Unauthorized**: User is not authenticated
```json
{
  "status": "error",
  "message": "Not authenticated"
}
```

**500 Internal Server Error**: Failed to update settings
```json
{
  "status": "error",
  "message": "Failed to update settings"
}
```

## Implementation Details

The user settings are managed by the `userSettingsService` which provides methods for:

1. Creating default settings for a user
2. Retrieving a user's settings
3. Updating a user's settings

Default settings are defined in a configuration file at `src/config/default-settings.json`, making it easy to modify the defaults without changing code. 