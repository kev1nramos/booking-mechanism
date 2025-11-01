# Google Calendar Booking System

A secure, performant, and platform-agnostic booking system for Google Calendar. Built for Next.js + Cloudflare Pages Functions, but works anywhere that supports standard Web APIs.

## Features

✅ **Runtime-Agnostic** - Works on Cloudflare Workers, Vercel Edge, AWS Lambda, Node.js 18+, Deno, and Bun
✅ **Zero Dependencies** - Core service uses only Web Standard APIs (fetch, URL, etc.)
✅ **Fully Type-Safe** - Complete TypeScript support with strict type checking
✅ **Secure by Default** - Rate limiting, CORS, input validation, XSS prevention, security headers
✅ **Performance Optimized** - Response caching, token refresh handling, efficient slot calculation
✅ **Highly Configurable** - Business hours, slot intervals, CORS, rate limits all customizable
✅ **Platform Adapters** - Ready-to-use adapters for Cloudflare and Next.js

## Packages

This monorepo contains three packages:

- **[@kev1nramos/booking-core](./packages/core)** - Core types and utilities
- **[@kev1nramos/booking-server](./packages/server)** - Google Calendar service + platform adapters
- **[@kev1nramos/booking-react](./packages/react)** - React components and hooks _(coming soon)_

## Quick Start

### 1. Installation

```bash
# Install the packages you need
pnpm add @kev1nramos/booking-core @kev1nramos/booking-server

# Or using npm
npm install @kev1nramos/booking-core @kev1nramos/booking-server
```

### 2. Setup Environment Variables

Create a `.env` file (see `.env.example` for reference):

```bash
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/oauth/callback

# Google Calendar Configuration
GOOGLE_CALENDAR_ID=primary
MY_EMAIL=your-email@gmail.com

# OAuth Tokens (obtain via OAuth flow)
GOOGLE_ACCESS_TOKEN=your-access-token
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

> **⚠️ IMPORTANT**: Never commit your `.env` file! It's already in `.gitignore`.

### 3. Usage Examples

#### Cloudflare Pages Functions

```typescript
// functions/api/book/[[path]].ts
import { createCloudflareHandler } from '@kev1nramos/booking-server/adapters/cloudflare';

const handler = createCloudflareHandler({
  cors: {
    allowedOrigins: [
      'https://yourdomain.com',
      'https://www.yourdomain.com',
      'http://localhost:3000',
    ],
  },
  businessHours: {
    start: 9,  // 9 AM
    end: 20,   // 8 PM
  },
  slots: {
    interval: 30,  // 30-minute slots
    durations: [30, 45, 60, 90, 120],  // Available meeting durations
  },
  rateLimit: {
    max: 10,
    windowMs: 60000, // 1 minute
  },
});

export const onRequestGet = handler.GET;
export const onRequestPost = handler.POST;
export const onRequestOptions = handler.OPTIONS;
```

#### Next.js App Router

```typescript
// app/api/book/route.ts
import { createNextHandler } from '@kev1nramos/booking-server/adapters/nextjs';

const handler = createNextHandler({
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI!,
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID!,
    MY_EMAIL: process.env.MY_EMAIL!,
    GOOGLE_ACCESS_TOKEN: process.env.GOOGLE_ACCESS_TOKEN!,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN!,
  },
  cors: {
    allowedOrigins: ['https://yourdomain.com', 'http://localhost:3000'],
  },
  businessHours: {
    start: 9,
    end: 20,
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
export const OPTIONS = handler.OPTIONS;
```

#### Custom Implementation (Any Platform)

```typescript
import { GoogleCalendarService } from '@kev1nramos/booking-server';

const service = new GoogleCalendarService({
  env: {
    GOOGLE_CLIENT_ID: 'your-client-id',
    GOOGLE_CLIENT_SECRET: 'your-client-secret',
    // ... other env vars
  },
  businessHours: { start: 9, end: 20 },
  slots: { interval: 30, durations: [30, 60, 90] },
});

// Get available slots
const slots = await service.getAvailableSlots('2025-11-15');

// Create a booking
const eventId = await service.createEvent({
  summary: 'Meeting with John Doe',
  start: { dateTime: '2025-11-15T10:00:00', timeZone: 'America/New_York' },
  end: { dateTime: '2025-11-15T11:00:00', timeZone: 'America/New_York' },
  attendees: [{ email: 'john@example.com' }],
});
```

## API Reference

### GET /api/book?timezone=true

Get the calendar's timezone.

**Response:**
```json
{
  "timezone": "America/New_York"
}
```

### GET /api/book?date=YYYY-MM-DD&clientTimezone=...

Get available time slots for a specific date.

**Query Parameters:**
- `date` (required): Date in YYYY-MM-DD format
- `clientTimezone` (optional): IANA timezone for conversion

**Response:**
```json
{
  "slots": [
    {
      "id": "2025-11-15-09:00",
      "time": "09:00",
      "available": true
    },
    {
      "id": "2025-11-15-09:30",
      "time": "09:30",
      "available": false
    }
  ]
}
```

### POST /api/book

Create a new booking.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Inc",
  "message": "Looking forward to our meeting",
  "date": "2025-11-15",
  "startTime": "10:00",
  "endTime": "11:00",
  "duration": 60,
  "clientTimezone": "America/New_York"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking confirmed! You will receive a calendar invitation via email.",
  "eventId": "abc123xyz",
  "details": {
    "name": "John Doe",
    "email": "john@example.com",
    "date": "2025-11-15",
    "startTime": "10:00",
    "endTime": "11:00",
    "timezone": "America/New_York"
  }
}
```

## Configuration

### Business Hours

```typescript
businessHours: {
  start: 9,   // Start hour (0-23)
  end: 20,    // End hour (0-23)
}
```

### Slot Configuration

```typescript
slots: {
  interval: 30,                      // Minutes between slots
  durations: [30, 45, 60, 90, 120],  // Available meeting durations
}
```

### CORS

```typescript
cors: {
  allowedOrigins: [
    'https://yourdomain.com',
    'http://localhost:3000',
  ],
}
```

### Rate Limiting

```typescript
rateLimit: {
  max: 10,       // Maximum requests
  windowMs: 60000, // Per time window (milliseconds)
}
```

## Security

This library implements multiple security layers:

- ✅ Input validation and sanitization
- ✅ Rate limiting (IP-based)
- ✅ CORS protection
- ✅ XSS prevention (HTML escaping)
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Environment variable validation
- ✅ No sensitive data exposure in errors

See [SECURITY.md](./SECURITY.md) for detailed security documentation.

## Development

### Install Dependencies

```bash
pnpm install
```

### Build All Packages

```bash
pnpm build
```

### Development Mode

```bash
pnpm dev
```

### Type Checking

```bash
pnpm typecheck
```

## Platform Compatibility

| Platform | Status | Notes |
|----------|--------|-------|
| Cloudflare Workers/Pages | ✅ Fully Supported | Native runtime |
| Vercel Edge Runtime | ✅ Fully Supported | Web Standard APIs |
| AWS Lambda (Node 18+) | ✅ Fully Supported | Native fetch support |
| Node.js 18+ | ✅ Fully Supported | Native fetch support |
| Node.js < 18 | ⚠️ Requires Polyfill | Use `node-fetch` |
| Deno | ✅ Fully Supported | Web Standard APIs |
| Bun | ✅ Fully Supported | Web Standard APIs |
| Netlify Edge | ✅ Fully Supported | Deno-based runtime |

## License

MIT

## Author

Kevin Ramos

## Contributing

This is a private repository. For issues or suggestions, contact the maintainer directly.
