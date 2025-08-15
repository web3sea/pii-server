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

## License

MIT
