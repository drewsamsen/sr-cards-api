# CSV Import

This document outlines the CSV import functionality in the Card API, which allows users to bulk import flashcards from CSV data.

## Overview

The CSV import feature provides a two-step process:
1. **Preview**: Submit CSV data and get a preview of what will be imported
2. **Confirm/Cancel**: Decide whether to proceed with the import or cancel it

This approach allows users to validate their data before committing to the import, reducing errors and improving the user experience.

## CSV Format

The system supports both comma-delimited (CSV) and tab-delimited (TSV) formats. The file should have the following structure:
- Required columns: `front` and `back` (or alternative names like `question` and `answer`)
- Optional columns: `tags`, `state`, `due`
- First row should be a header row with column names
- Text fields may contain commas or tabs (depending on the delimiter) if properly quoted

### Intelligent Header Detection

The system automatically detects and skips rows that appear to be duplicate headers. This is useful for imports from applications that include title-cased headers or metadata rows at the top of the file.

For example, if your data looks like this:
```
question	answer	tags
Question	Answer	Tags
"What is JavaScript?"	"A programming language"	"javascript"
```

The system will recognize that the second row (`Question	Answer	Tags`) is likely a duplicate header and will skip it during import.

### Supported Column Names

The system recognizes various alternative column names:

| Standard Field | Alternative Names                      |
|----------------|----------------------------------------|
| front          | front, question, prompt, term          |
| back           | back, answer, response, definition     |
| tags           | tags, categories, labels               |
| state          | state, status                          |
| due            | due, duedate, due_date                 |

### Comma-Delimited Example (CSV):
```
front,back,tags
"What is JavaScript?","A programming language for the web","javascript,basics"
"What is a closure?","A function that has access to its outer scope","javascript,advanced"
```

### Tab-Delimited Example (TSV):
```
question	answer	categories
"What is JavaScript?"	"A programming language for the web"	"javascript,basics"
"What is a closure?"	"A function that has access to its outer scope"	"javascript,advanced"
```

The system will automatically detect whether your data is comma-delimited or tab-delimited, and will recognize alternative column names.

### CSV Formatting Best Practices

To avoid common parsing errors:

1. **Quotes**: If a field contains delimiters (commas or tabs), quotes, or line breaks, enclose it in double quotes.
   - Correct: `"This field, has a comma"`
   - Incorrect: `This field, has a comma`

2. **Escaping Quotes**: If a field contains double quotes, escape them by doubling them.
   - Correct: `"This field has ""quotes"" in it"`
   - Incorrect: `"This field has "quotes" in it"`

3. **Line Breaks**: Avoid line breaks within fields if possible. If needed, ensure the field is properly quoted.
   - Correct: `"This field has a
   line break"`
   - Incorrect: `This field has a
   line break`

4. **Empty Fields**: Leave empty fields as empty strings between delimiters.
   - Correct: `field1,,field3` or `field1	field3`
   - Also correct: `field1,"",field3` or `field1	""	field3`

5. **Special Characters**: The system handles most special characters, but avoid control characters.

6. **File Encoding**: Use UTF-8 encoding for best compatibility.

## Formatting Tips

### Line Breaks in Card Content

When importing cards with multi-line content in the back field, you have two options:

1. **Triple Spaces**: You can use three or more consecutive spaces to indicate a line break. The import process will automatically convert these to actual line breaks.

   Example CSV:
   ```
   front,back
   "What is verisimilitude?","VER-i-si-MIL-i-tude   noun. the appearance of being true or real   ""the detail gives the novel some verisimilitude"""
   ```

   This will be imported as:
   ```
   VER-i-si-MIL-i-tude
   noun. the appearance of being true or real
   "the detail gives the novel some verisimilitude"
   ```

   Note that the import process also:
   - Removes unnecessary leading and trailing quotes
   - Converts doubled quotes (`""`) to single quotes (`"`)
   - This ensures proper formatting of your card content

2. **Markdown Line Breaks**: You can also use Markdown line break syntax (two spaces at the end of a line or backslash+n) which will be preserved in the raw text and can be rendered by Markdown-aware clients.

### Duplicate Card Detection

During import, the system checks each card against existing cards in the target deck to prevent duplicates. The duplicate detection is:

- **Case-insensitive**: "What is JavaScript?" and "what is javascript?" are considered duplicates
- **Punctuation-agnostic**: "What is JavaScript?" and "What is JavaScript" are considered duplicates

**Duplicates in Preview Phase:**
Duplicate cards are detected during both the preview and confirmation phases:

1. In the preview phase, potential duplicates are identified and marked as invalid with a specific error message
2. The preview response includes a `duplicateCards` count and `duplicateDetails` array in the summary
3. Duplicate cards are **omitted** from the preview array to focus on valid cards and other types of errors
4. This allows you to see which cards would be imported and which have validation issues, without cluttering the preview with duplicates

The `duplicateDetails` array in the summary provides complete information about all detected duplicates, including:
- The row number in the original CSV
- The card front text from the CSV
- The existing card front text it matched with

**Example Preview Response with Duplicates:**
```json
{
  "status": "success",
  "data": {
    "import": {
      "id": "import-uuid",
      "deckId": "deck-uuid",
      "status": "pending",
      "summary": {
        "totalRows": 10,
        "validRows": 7,
        "invalidRows": 1,
        "duplicateCards": 2,
        "duplicateDetails": [
          {
            "row": 3,
            "cardFront": "What is JavaScript?",
            "existingCardFront": "What is JavaScript?"
          },
          {
            "row": 5,
            "cardFront": "What is a variable?",
            "existingCardFront": "What is a Variable?"
          }
        ]
      },
      "expiresAt": "2023-06-01T12:30:00Z"
    },
    "preview": [
      {
        "front": "What is HTML?",
        "back": "HyperText Markup Language",
        "status": "valid"
      },
      {
        "front": "What is CSS?",
        "back": "Cascading Style Sheets",
        "status": "valid"
      },
      {
        "front": "What is React?",
        "back": "A JavaScript library for building user interfaces",
        "status": "valid"
      }
    ]
  }
}
```

If duplicates are found during import:

1. They are counted separately from other errors in the `duplicateCards` field
2. Detailed information is provided in the `duplicateDetails` array, including:
   - The row number in the original CSV
   - The card front text from the CSV
   - The existing card front text it matched with

This allows you to:
- See exactly how many duplicates were detected
- Identify which rows contained duplicates
- Understand why they were considered duplicates (by comparing the front text)

The rest of the import will continue even if duplicates are found, allowing you to import large sets of cards while still getting a detailed report of any issues. 

## API Endpoints

### Create Import Preview

This endpoint parses the CSV data, validates it, and returns a preview of what will be imported.

**Request:**
```http
POST /api/imports/preview
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "deckId": "uuid-of-deck",
  "csvData": "front,back\n\"What is JavaScript?\",\"A programming language\"\n\"What is a closure?\",\"A function with access to outer scope\""
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "import": {
      "id": "import-uuid",
      "deckId": "deck-uuid",
      "status": "pending",
      "summary": {
        "totalRows": 2,
        "validRows": 2,
        "invalidRows": 0
      },
      "expiresAt": "2023-06-01T12:30:00Z"
    },
    "preview": [
      {
        "front": "What is JavaScript?",
        "back": "A programming language",
        "status": "valid"
      },
      {
        "front": "What is a closure?",
        "back": "A function with access to outer scope",
        "status": "valid"
      }
    ]
  }
}
```

**Response with Validation Errors and Duplicates:**
```json
{
  "status": "success",
  "data": {
    "import": {
      "id": "import-uuid",
      "deckId": "deck-uuid",
      "status": "pending",
      "summary": {
        "totalRows": 5,
        "validRows": 2,
        "invalidRows": 2,
        "duplicateCards": 1,
        "duplicateDetails": [
          {
            "row": 5,
            "cardFront": "What is CSS?",
            "existingCardFront": "What is CSS?"
          }
        ],
        "errors": [
          {
            "row": 2,
            "message": "Front side cannot be empty"
          },
          {
            "row": 3,
            "message": "Back side cannot be empty"
          }
        ]
      },
      "expiresAt": "2023-06-01T12:30:00Z"
    },
    "preview": [
      {
        "front": "What is JavaScript?",
        "back": "A programming language",
        "status": "valid"
      },
      {
        "front": "What is HTML?",
        "back": "HyperText Markup Language",
        "status": "valid"
      },
      {
        "front": "",
        "back": "Missing front content",
        "status": "invalid",
        "error": "Front side cannot be empty"
      },
      {
        "front": "What is a variable?",
        "back": "",
        "status": "invalid",
        "error": "Back side cannot be empty"
      }
    ]
  }
}
```

### Confirm Import

This endpoint confirms the import and creates the cards in the specified deck.

**Request:**
```http
POST /api/imports/confirm
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "importId": "import-uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "importId": "import-uuid",
    "status": "completed",
    "summary": {
      "totalRows": 2,
      "validRows": 2,
      "invalidRows": 0
    }
  }
}
```

**Response with Partial Success and Duplicates:**
```json
{
  "status": "success",
  "data": {
    "importId": "import-uuid",
    "status": "completed",
    "summary": {
      "totalRows": 10,
      "validRows": 7,
      "invalidRows": 1,
      "duplicateCards": 2,
      "duplicateDetails": [
        {
          "row": 3,
          "cardFront": "What is JavaScript?",
          "existingCardFront": "What is JavaScript?"
        },
        {
          "row": 5,
          "cardFront": "What is a variable?",
          "existingCardFront": "What is a Variable?"
        }
      ],
      "errors": [
        {
          "row": 8,
          "message": "Error creating card: Invalid data format"
        }
      ]
    }
  }
}
```

### Cancel Import

This endpoint cancels a pending import.

**Request:**
```http
POST /api/imports/cancel
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "importId": "import-uuid"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Import cancelled successfully"
  }
}
```

### Get Import History

This endpoint retrieves the user's recent import history.

**Request:**
```http
GET /api/imports/history?limit=10
Authorization: Bearer <jwt-token>
```

**Parameters:**
- `limit` (optional): Maximum number of imports to return (default: 10, max: 50)

**Response:**
```json
{
  "status": "success",
  "data": {
    "imports": [
      {
        "id": "import-uuid-1",
        "deckId": "deck-uuid-1",
        "status": "completed",
        "summary": {
          "totalRows": 10,
          "validRows": 10,
          "invalidRows": 0,
          "skippedHeaderRows": [2]
        },
        "createdAt": "2023-06-01T12:00:00Z",
        "expiresAt": "2023-06-01T12:30:00Z"
      },
      {
        "id": "import-uuid-2",
        "deckId": "deck-uuid-2",
        "status": "failed",
        "summary": {
          "totalRows": 5,
          "validRows": 3,
          "invalidRows": 2,
          "errors": [
            {
              "row": 3,
              "message": "Front side cannot be empty"
            },
            {
              "row": 5,
              "message": "Back side cannot be empty"
            }
          ]
        },
        "createdAt": "2023-05-30T15:45:00Z",
        "expiresAt": "2023-05-30T16:15:00Z"
      }
    ]
  }
}
```

## Implementation Notes

- Import previews expire after 30 minutes
- The system automatically cleans up expired imports
- CSV data is validated before being stored
- Only the first 10 rows are returned in the preview
- The import process is transactional, ensuring data consistency
- Errors during import are tracked and reported in detail
- Duplicate card detection prevents creating cards that are too similar to existing ones

### Duplicate Card Detection

During import, the system checks each card against existing cards in the target deck to prevent duplicates. The duplicate detection is:

- **Case-insensitive**: "What is JavaScript?" and "what is javascript?" are considered duplicates
- **Punctuation-agnostic**: "What is JavaScript?" and "What is JavaScript" are considered duplicates

**Duplicates in Preview Phase:**
Duplicate cards are detected during both the preview and confirmation phases:

1. In the preview phase, potential duplicates are identified and marked as invalid with a specific error message
2. The preview response includes a `duplicateCards` count and `duplicateDetails` array in the summary
3. Duplicate cards are **omitted** from the preview array to focus on valid cards and other types of errors
4. This allows you to see which cards would be imported and which have validation issues, without cluttering the preview with duplicates

The `duplicateDetails` array in the summary provides complete information about all detected duplicates, including:
- The row number in the original CSV
- The card front text from the CSV
- The existing card front text it matched with

**Example Preview Response with Duplicates:**
```json
{
  "status": "success",
  "data": {
    "import": {
      "id": "import-uuid",
      "deckId": "deck-uuid",
      "status": "pending",
      "summary": {
        "totalRows": 10,
        "validRows": 7,
        "invalidRows": 1,
        "duplicateCards": 2,
        "duplicateDetails": [
          {
            "row": 3,
            "cardFront": "What is JavaScript?",
            "existingCardFront": "What is JavaScript?"
          },
          {
            "row": 5,
            "cardFront": "What is a variable?",
            "existingCardFront": "What is a Variable?"
          }
        ]
      },
      "expiresAt": "2023-06-01T12:30:00Z"
    },
    "preview": [
      {
        "front": "What is HTML?",
        "back": "HyperText Markup Language",
        "status": "valid"
      },
      {
        "front": "What is CSS?",
        "back": "Cascading Style Sheets",
        "status": "valid"
      },
      {
        "front": "What is React?",
        "back": "A JavaScript library for building user interfaces",
        "status": "valid"
      }
    ]
  }
}
```

If duplicates are found during import:

1. They are counted separately from other errors in the `duplicateCards` field
2. Detailed information is provided in the `duplicateDetails` array, including:
   - The row number in the original CSV
   - The card front text from the CSV
   - The existing card front text it matched with

This allows you to:
- See exactly how many duplicates were detected
- Identify which rows contained duplicates
- Understand why they were considered duplicates (by comparing the front text)

The rest of the import will continue even if duplicates are found, allowing you to import large sets of cards while still getting a detailed report of any issues. 