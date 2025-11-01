/**
 * Security utilities for booking system
 */

import type { CorsConfig } from '@kev1nramos/booking-core';

/**
 * Rate limiting state (in-memory)
 * For production, use a distributed cache like Redis or KV
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiter
 * @param identifier Unique identifier (IP, user ID, etc.)
 * @param limit Maximum requests allowed
 * @param windowMs Time window in milliseconds
 * @returns true if rate limit exceeded, false otherwise
 */
export function isRateLimited(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!record || record.resetTime < now) {
    // Create new record
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  // Increment count
  record.count++;

  // Check if limit exceeded
  return record.count > limit;
}

/**
 * Get CORS headers for a request
 * @param request Request object
 * @param config CORS configuration
 * @returns CORS headers object
 */
export function getCorsHeaders(
  request: Request,
  config?: CorsConfig
): Record<string, string> {
  const origin = request.headers.get('Origin');

  // Default allowed origins for development
  const defaultOrigins = ['http://localhost:3000'];

  const allowedOrigins = config?.allowedOrigins || defaultOrigins;

  // Check if origin is allowed
  const allowedOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Get security headers to prevent common attacks
 * @returns Security headers object
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent XSS attacks
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',

    // HTTPS enforcement
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

    // Content Security Policy
    'Content-Security-Policy': "default-src 'self'",

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
}

/**
 * Sanitize input to prevent injection attacks
 * Already exported from core, but adding enhanced version here
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  // Trim and limit length
  let sanitized = input.trim().substring(0, maxLength);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validate and extract client IP from request
 * @param request Request object
 * @returns Client IP address or null
 */
export function getClientIp(request: Request): string | null {
  // Check common headers set by proxies/load balancers
  const headers = [
    'CF-Connecting-IP', // Cloudflare
    'X-Real-IP',
    'X-Forwarded-For',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return value.split(',')[0]?.trim() || null;
    }
  }

  return null;
}

/**
 * Create a cache key for responses
 * @param request Request object
 * @param ttl Time to live in seconds
 * @returns Cache control header value
 */
export function getCacheControl(ttl: number): string {
  if (ttl === 0) {
    return 'no-store, no-cache, must-revalidate';
  }

  return `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 5}`;
}

/**
 * Validate request origin to prevent CSRF
 * @param request Request object
 * @param allowedOrigins List of allowed origins
 * @returns true if origin is valid, false otherwise
 */
export function isValidOrigin(
  request: Request,
  allowedOrigins: string[]
): boolean {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');

  // For same-origin requests, origin might be null
  if (!origin && !referer) {
    return true; // Allow same-origin
  }

  // Check origin
  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  // Check referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      return allowedOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  }

  return false;
}
