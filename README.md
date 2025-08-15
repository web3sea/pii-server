# PII Redaction API

A Node.js/Express API for redacting Personally Identifiable Information (PII) from text using natural language processing.

## Features

- **Text-based PII Redaction**: Redact sensitive information from text input
- **NLP-powered Detection**: Uses the `compromise` library for intelligent entity recognition
- **Property Management Focus**: Optimized for property management documents
- **High Accuracy**: Combines NLP with custom patterns for better detection
- **Fast Processing**: Sub-second response times

## Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Start production server
yarn start
```

## API Endpoints

### POST `/api/pii/redact`

Redact PII from text input.

**Request Body:**

```json
{
  "text": "Your text containing PII here"
}
```

**Error Responses:**

**Invalid JSON:**

```json
{
  "error": "Bad Request",
  "message": "Invalid JSON format in request body",
  "details": "Please check your JSON syntax and ensure all quotes are properly escaped"
}
```

**Missing Text:**

```json
{
  "error": "Bad Request",
  "message": "Text field is required and must be a string"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "originalText": "Original text with PII",
    "redactedText": "Text with [REDACTED] placeholders",
    "redactedFields": [
      {
        "type": "propertyName",
        "original": "JDW Management",
        "redacted": "[PROPERTY_NAME]",
        "confidence": 0.8
      }
    ],
    "confidence": 0.73,
    "totalMatches": 3
  }
}
```

### GET `/health`

Health check endpoint.

**Response:**

```json
{
  "status": "OK",
  "message": "PII Redaction API is running"
}
```

## Supported PII Types

- **Property Names**: Company names, management companies
- **Property Addresses**: Street addresses, company addresses
- **Phone Numbers**: Various phone number formats
- **Email Addresses**: Standard email format detection
- **Account Numbers**: Financial account numbers
- **Invoice Numbers**: Invoice and receipt numbers

## Testing

```bash
# Run tests
yarn test

# Run example
yarn example
```

## Environment Variables

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development
```

## Dependencies

- **express**: Web framework
- **compromise**: Natural language processing
- **helmet**: Security headers
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management

## Troubleshooting

### JSON Parsing Errors

If you encounter JSON parsing errors, ensure:

1. **Proper JSON Format**: All quotes are properly escaped
2. **Content-Type Header**: Set to `application/json`
3. **Valid JSON Structure**: Use proper JSON syntax

**Example of correct request:**

```bash
curl -X POST http://localhost:3000/api/pii/redact \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text here"}'
```

### Common Issues

- **Port Already in Use**: Change the PORT environment variable
- **Memory Issues**: Ensure sufficient memory for large text processing
- **Network Errors**: Check if the server is running and accessible

## License

MIT
