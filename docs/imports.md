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

**Response with Validation Errors:**
```json
{
  "status": "success",
  "data": {
    "import": {
      "id": "import-uuid",
      "deckId": "deck-uuid",
      "status": "pending",
      "summary": {
        "totalRows": 3,
        "validRows": 1,
        "invalidRows": 2,
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

**Response with Partial Success:**
```json
{
  "status": "success",
  "data": {
    "importId": "import-uuid",
    "status": "failed",
    "summary": {
      "totalRows": 3,
      "validRows": 1,
      "invalidRows": 2,
      "errors": [
        {
          "row": 2,
          "message": "Error creating card: Database constraint violation"
        },
        {
          "row": 3,
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

## Implementation Notes

- Import previews expire after 30 minutes
- The system automatically cleans up expired imports
- CSV data is validated before being stored
- Only the first 10 rows are returned in the preview
- The import process is transactional, ensuring data consistency
- Errors during import are tracked and reported in detail 