# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by emailing the maintainer directly. **Do not** open a public GitHub issue.

We will respond to security reports within 48 hours and work with you to address the issue promptly.

## Security Features

This library implements multiple layers of security:

### 1. Environment Variable Protection

- **Never commit credentials**: `.gitignore` blocks all `.env*` files, credentials, and keys
- **Validation on startup**: Service validates all required environment variables
- **Placeholder detection**: Warns if placeholder values are detected in configuration

### 2. Input Validation & Sanitization

- **Email validation**: Regex-based validation for all email inputs
- **HTML escaping**: All user-provided content is escaped to prevent XSS
- **Input length limits**: All inputs are truncated to prevent buffer overflow attacks
- **Control character removal**: Null bytes and control characters are filtered
- **Date/time format validation**: Strict format checking for all date/time inputs

### 3. Rate Limiting

- **GET requests**: Default 20 requests per minute per IP
- **POST requests**: Default 10 requests per minute per IP (stricter for booking creation)
- **Configurable limits**: Adjust rate limits per your needs
- **IP-based tracking**: Uses CF-Connecting-IP, X-Real-IP, or X-Forwarded-For headers

### 4. CORS Protection

- **Origin validation**: Only configured origins are allowed
- **Referer checking**: Fallback validation using Referer header
- **Preflight handling**: Proper OPTIONS request handling
- **Configurable origins**: Easy whitelist management

### 5. Security Headers

All responses include:
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS filter
- `Strict-Transport-Security` - Forces HTTPS
- `Content-Security-Policy` - CSP to prevent various attacks
- `Referrer-Policy` - Controls referer information
- `Permissions-Policy` - Restricts browser features

### 6. Error Handling

- **No sensitive data in errors**: Internal errors are sanitized before sending to clients
- **Development vs Production**: Detailed errors only in development mode
- **Structured logging**: Errors logged server-side with full context

### 7. OAuth Token Management

- **Automatic token refresh**: Handles token expiration automatically
- **Retry logic**: Retries failed requests with fresh tokens
- **No token exposure**: Tokens never exposed in client responses

## Best Practices

### Environment Variables

```bash
# ❌ DON'T commit this
.env

# ✅ DO use strong, unique values
GOOGLE_CLIENT_SECRET=actual-secret-value-here
GOOGLE_REFRESH_TOKEN=actual-token-here
```

### CORS Configuration

```typescript
// ❌ DON'T allow all origins
cors: {
  allowedOrigins: ['*']  // NEVER do this
}

// ✅ DO whitelist specific domains
cors: {
  allowedOrigins: [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
  ].filter(Boolean)
}
```

### Rate Limiting

```typescript
// ✅ Adjust based on your traffic
rateLimit: {
  max: 10,           // Max 10 requests
  windowMs: 60000    // Per minute
}

// For high-traffic sites, consider using:
// - Cloudflare Rate Limiting
// - Redis-based distributed rate limiting
// - KV storage for persistent tracking
```

### Input Validation

```typescript
// ✅ Always validate on the server
const validationError = validateBookingRequest(body);
if (validationError) {
  return errorResponse(validationError);
}

// ✅ Sanitize all user inputs
const sanitizedName = sanitizeInput(body.name, 100);
const sanitizedMessage = escapeHtml(sanitizeInput(body.message, 1000));
```

## Known Limitations

### 1. In-Memory Rate Limiting

The current rate limiting implementation uses in-memory storage, which has limitations:

- **Not distributed**: Each instance has its own counter
- **Resets on restart**: Counters are lost when the service restarts
- **Memory usage**: Grows with unique IPs (has cleanup logic, but not perfect)

**For production with high traffic**, consider:
- Cloudflare Rate Limiting (built-in for Workers/Pages)
- Redis-based rate limiting
- KV storage (Cloudflare KV, Vercel KV, etc.)

### 2. CSRF Protection

Currently relies on:
- CORS origin checking
- Referer validation

**For enhanced protection**, consider adding:
- CSRF tokens for form submissions
- SameSite cookies
- Double-submit cookie pattern

### 3. API Key Authentication

This library doesn't implement API key authentication. The Google Calendar API handles authentication via OAuth2.

**If exposing to third parties**, add:
- API key validation
- Per-key rate limiting
- Usage tracking

## Security Checklist

Before deploying to production:

- [ ] All environment variables are set with real values (no placeholders)
- [ ] `.env` files are in `.gitignore` and never committed
- [ ] CORS is configured with specific origins (not `*`)
- [ ] Rate limiting is configured appropriately for your traffic
- [ ] HTTPS is enforced (Strict-Transport-Security header)
- [ ] Error messages don't expose sensitive information
- [ ] Google OAuth credentials are properly secured
- [ ] Calendar access is limited to necessary scopes
- [ ] Logging doesn't include sensitive data (tokens, passwords)
- [ ] Dependencies are up to date (run `pnpm audit`)

## Updates

This project follows semantic versioning. Security updates will be released as:
- **Patch** versions for security fixes (e.g., 1.0.1)
- **Minor** versions for security enhancements (e.g., 1.1.0)

Subscribe to releases to stay informed about security updates.
