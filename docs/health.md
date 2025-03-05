# Health Check Endpoint

The health check endpoint provides a simple way to verify that the API is running and responding to requests.

## Endpoint

- `GET /api/health`

## Authentication

This endpoint does not require authentication.

## Response

### Success Response

```json
{
  "status": "ok",
  "message": "API is running"
}
```

### Status Code

- `200 OK`: The API is running correctly

## Usage Examples

### cURL

```bash
curl http://localhost:3000/api/health
```

### JavaScript (Fetch)

```javascript
fetch('http://localhost:3000/api/health')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Python (Requests)

```python
import requests

response = requests.get('http://localhost:3000/api/health')
print(response.json())
```

## Implementation Details

The health check endpoint is implemented in `src/routes/index.ts` and provides a simple response to indicate that the API server is running. This endpoint is useful for:

1. Monitoring systems to check if the API is available
2. Load balancers to determine if the API instance is healthy
3. Developers to quickly verify that the API is running during development

## Related Information

For more information about the API, refer to:
- [API Overview](./api-overview.md)
- [Project Structure](./project-structure.md) 