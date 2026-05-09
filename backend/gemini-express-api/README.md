# PlanSync Gemini Express API

Minimal Node.js Express backend for:

- `POST /chat`
- `POST /analyze-pdf`

Gemini model used:

- primary: `gemini-2.5-flash-lite`

## Setup

```bash
npm install
npm start
```

Server default port: `3000`

## Environment

Create `.env` from `.env.example`:

```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODEL=
```

## Endpoints

### `POST /chat`

Request:

```json
{
  "message": "Estimate the cost of a cloud migration project"
}
```

Response:

```json
{
  "reply": "AI response here",
  "source": "gemini",
  "model": "gemini-2.5-flash-lite"
}
```

### `POST /analyze-pdf`

Form data:

- `file`: PDF file

Response:

```json
{
  "fileName": "report.pdf",
  "status": "ACCEPTABLE",
  "analysis": "ACCEPTABLE - short explanation here",
  "source": "gemini",
  "model": "gemini-2.5-flash-lite"
}
```
