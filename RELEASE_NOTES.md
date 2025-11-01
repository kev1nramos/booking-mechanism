# Release Notes v0.1.0

## 🎉 Initial Release

This is the first public release of the Google Calendar Booking System library!

## 📦 Published Packages

- **@kev1nramos/booking-core** `v0.1.0` - Core types and utilities
- **@kev1nramos/booking-server** `v0.1.0` - Google Calendar service with platform adapters

## ✨ Features

### Core Package
- ✅ Complete TypeScript type definitions
- ✅ Email validation and HTML escaping utilities
- ✅ Date/time helper functions
- ✅ Zero external dependencies

### Server Package
- ✅ Runtime-agnostic Google Calendar service (uses Web Standard APIs)
- ✅ **Cloudflare Pages Functions** adapter
- ✅ **Next.js App Router** adapter
- ✅ Automatic OAuth token refresh
- ✅ Timezone conversion utilities
- ✅ Google Meet integration

### Security
- ✅ Rate limiting (IP-based, configurable)
- ✅ CORS protection with origin validation
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Input sanitization and XSS prevention
- ✅ Environment variable validation

### Performance
- ✅ Response caching (timezone: 1hr, slots: 1min)
- ✅ Efficient algorithms
- ✅ Memory-safe rate limiter
- ✅ Minimal bundle size

## 🚀 Platform Support

- ✅ Cloudflare Workers/Pages Functions
- ✅ Vercel Edge Runtime
- ✅ AWS Lambda (Node.js 18+)
- ✅ Node.js 18+
- ✅ Deno
- ✅ Bun
- ✅ Netlify Edge Functions

## 📚 Quick Start

### Installation

```bash
pnpm add @kev1nramos/booking-core @kev1nramos/booking-server
# or
npm install @kev1nramos/booking-core @kev1nramos/booking-server
```

### Cloudflare Example

```typescript
import { createCloudflareHandler } from '@kev1nramos/booking-server/adapters/cloudflare';

const handler = createCloudflareHandler({
  cors: {
    allowedOrigins: ['https://yourdomain.com']
  },
  businessHours: { start: 9, end: 20 },
});

export const { onRequestGet, onRequestPost, onRequestOptions } = handler;
```

### Next.js Example

```typescript
import { createNextHandler } from '@kev1nramos/booking-server/adapters/nextjs';

const handler = createNextHandler({
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    // ... other env vars
  },
  cors: {
    allowedOrigins: ['https://yourdomain.com']
  }
});

export const GET = handler.GET;
export const POST = handler.POST;
export const OPTIONS = handler.OPTIONS;
```

## 📖 Documentation

- [README](https://github.com/kev1nramos/booking-mechanism#readme)
- [Security Guidelines](https://github.com/kev1nramos/booking-mechanism/blob/main/SECURITY.md)
- [Contributing](https://github.com/kev1nramos/booking-mechanism/blob/main/CONTRIBUTING.md)

## 🔐 Security

This library follows security best practices:
- No hardcoded credentials
- Comprehensive input validation
- Rate limiting and CORS protection
- See [SECURITY.md](https://github.com/kev1nramos/booking-mechanism/blob/main/SECURITY.md) for details

## 🙏 Acknowledgments

Built with security and performance in mind. Uses only Web Standard APIs for maximum compatibility.

---

**Full Changelog**: https://github.com/kev1nramos/booking-mechanism/blob/main/CHANGELOG.md
