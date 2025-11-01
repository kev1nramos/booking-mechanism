/**
 * Next.js App Router adapter
 *
 * This adapter provides a secure, performant handler for Next.js Route Handlers.
 * Compatible with Next.js 13+ App Router and Vercel Edge Runtime.
 *
 * Features:
 * - Rate limiting
 * - CORS handling
 * - Security headers
 * - Input validation and sanitization
 * - Request caching
 */

import type {
  GoogleCalendarConfig,
  BookingRequest,
  BookingResponse,
} from '@kev1nramos/booking-core';
import { validateBookingRequest, escapeHtml } from '@kev1nramos/booking-core';
import { GoogleCalendarService } from '../GoogleCalendarService.js';
import {
  getCorsHeaders,
  getSecurityHeaders,
  getCacheControl,
  isRateLimited,
  getClientIp,
  isValidOrigin,
  sanitizeInput,
} from '../security.js';

/**
 * Next.js adapter configuration
 */
export interface NextJSAdapterConfig extends GoogleCalendarConfig {
  /** Rate limiting configuration */
  rateLimit?: {
    /** Maximum requests per window */
    max: number;
    /** Time window in milliseconds */
    windowMs: number;
  };
  /** Cache TTL for timezone endpoint (seconds) */
  timezoneCacheTtl?: number;
  /** Cache TTL for slots endpoint (seconds) */
  slotsCacheTtl?: number;
}

/**
 * Create Next.js Route Handlers
 *
 * @example
 * ```typescript
 * // app/api/book/route.ts
 * import { createNextHandler } from '@kev1nramos/booking-server/adapters/nextjs';
 *
 * const handler = createNextHandler({
 *   env: {
 *     GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
 *     GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
 *     // ... other env vars
 *   },
 *   cors: {
 *     allowedOrigins: ['https://yourdomain.com', 'http://localhost:3000'],
 *   },
 *   rateLimit: {
 *     max: 10,
 *     windowMs: 60000, // 1 minute
 *   },
 * });
 *
 * export const GET = handler.GET;
 * export const POST = handler.POST;
 * export const OPTIONS = handler.OPTIONS;
 * ```
 */
export function createNextHandler(config: NextJSAdapterConfig) {
  // Default configuration
  const rateLimitConfig = config.rateLimit || { max: 20, windowMs: 60000 };
  const timezoneCacheTtl = config.timezoneCacheTtl ?? 3600; // 1 hour
  const slotsCacheTtl = config.slotsCacheTtl ?? 60; // 1 minute

  /**
   * OPTIONS handler for CORS preflight
   */
  const OPTIONS = async (request: Request): Promise<Response> => {
    return new Response(null, {
      status: 204,
      headers: {
        ...getCorsHeaders(request, config.cors),
        ...getSecurityHeaders(),
      },
    });
  };

  /**
   * GET handler for fetching timezone and available slots
   */
  const GET = async (request: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(request, config.cors);
    const securityHeaders = getSecurityHeaders();

    try {
      // Validate origin
      if (config.cors?.allowedOrigins &&
          !isValidOrigin(request, config.cors.allowedOrigins)) {
        return new Response(
          JSON.stringify({ error: 'Invalid origin' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
              ...securityHeaders,
            },
          }
        );
      }

      // Rate limiting
      const clientIp = getClientIp(request) || 'unknown';
      if (isRateLimited(clientIp, rateLimitConfig.max, rateLimitConfig.windowMs)) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil(rateLimitConfig.windowMs / 1000)),
              ...corsHeaders,
              ...securityHeaders,
            },
          }
        );
      }

      const url = new URL(request.url);
      const timezone = url.searchParams.get('timezone');
      const date = url.searchParams.get('date');
      const clientTimezone = url.searchParams.get('clientTimezone');

      // Initialize the Google Calendar service
      const calendarService = new GoogleCalendarService(config);

      // Get calendar timezone
      if (timezone === 'true') {
        const calendarTimezone = await calendarService.getCalendarTimezone();

        return new Response(
          JSON.stringify({ timezone: calendarTimezone }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': getCacheControl(timezoneCacheTtl),
              ...corsHeaders,
              ...securityHeaders,
            },
          }
        );
      }

      // Get available slots for a date
      if (!date) {
        return new Response(
          JSON.stringify({ error: 'Date parameter is required' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
              ...securityHeaders,
            },
          }
        );
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response(
          JSON.stringify({ error: 'Invalid date format. Expected YYYY-MM-DD' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
              ...securityHeaders,
            },
          }
        );
      }

      // Get slots with timezone conversion if needed
      let slots;
      if (clientTimezone) {
        // Sanitize timezone input
        const sanitizedTimezone = sanitizeInput(clientTimezone, 100);
        slots = await calendarService.getAvailableSlotsInTimezone(date, sanitizedTimezone);
      } else {
        slots = await calendarService.getAvailableSlots(date);
      }

      return new Response(
        JSON.stringify({ slots }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': getCacheControl(slotsCacheTtl),
            ...corsHeaders,
            ...securityHeaders,
          },
        }
      );
    } catch (error) {
      console.error('GET /api/book error:', error);

      // Don't expose internal errors to clients
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const statusCode = errorMessage.includes('not configured') ? 503 : 500;

      return new Response(
        JSON.stringify({
          error: statusCode === 503 ? 'Service temporarily unavailable' : 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        }),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            ...corsHeaders,
            ...securityHeaders,
          },
        }
      );
    }
  };

  /**
   * POST handler for creating bookings
   */
  const POST = async (request: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(request, config.cors);
    const securityHeaders = getSecurityHeaders();

    try {
      // Validate origin
      if (config.cors?.allowedOrigins &&
          !isValidOrigin(request, config.cors.allowedOrigins)) {
        return new Response(
          JSON.stringify({ error: 'Invalid origin', success: false }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
              ...securityHeaders,
            },
          }
        );
      }

      // Rate limiting (stricter for POST)
      const clientIp = getClientIp(request) || 'unknown';
      if (isRateLimited(`post:${clientIp}`, Math.floor(rateLimitConfig.max / 2), rateLimitConfig.windowMs)) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many booking attempts. Please try again later.',
            success: false,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil(rateLimitConfig.windowMs / 1000)),
              ...corsHeaders,
              ...securityHeaders,
            },
          }
        );
      }

      // Parse and validate request body
      let body: BookingRequest;
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body', success: false }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
              ...securityHeaders,
            },
          }
        );
      }

      // Validate booking request
      const validationError = validateBookingRequest(body);
      if (validationError) {
        return new Response(
          JSON.stringify({ error: validationError, success: false }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
              ...securityHeaders,
            },
          }
        );
      }

      // Sanitize inputs
      const sanitizedName = sanitizeInput(body.name, 100);
      const sanitizedEmail = sanitizeInput(body.email, 100);
      const sanitizedCompany = body.company ? sanitizeInput(body.company, 100) : '';
      const sanitizedMessage = body.message ? escapeHtml(sanitizeInput(body.message, 1000)) : '';
      const sanitizedTimezone = sanitizeInput(body.clientTimezone, 100);

      // Initialize the Google Calendar service
      const calendarService = new GoogleCalendarService(config);

      // Convert client timezone to calendar timezone for availability check
      const converted = await calendarService.convertTimeToCalendarTimezone(
        body.date,
        body.startTime,
        sanitizedTimezone
      );

      // Check if the slot is still available
      const isAvailable = await calendarService.isSlotAvailable(
        converted.date,
        converted.time,
        body.endTime
      );

      if (!isAvailable) {
        return new Response(
          JSON.stringify({
            error: 'This time slot is no longer available',
            success: false,
          }),
          {
            status: 409,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
              ...securityHeaders,
            },
          }
        );
      }

      // Create the calendar event
      const eventStartDateTime = `${body.date}T${body.startTime}:00`;
      const eventEndDateTime = `${body.date}T${body.endTime}:00`;

      const eventDescription = `
Booking Details:
- Name: ${sanitizedName}
- Email: ${sanitizedEmail}
${sanitizedCompany ? `- Company: ${sanitizedCompany}` : ''}
${sanitizedMessage ? `- Message: ${sanitizedMessage}` : ''}
- Timezone: ${sanitizedTimezone}
      `.trim();

      const eventId = await calendarService.createEvent({
        summary: `Meeting with ${sanitizedName}${sanitizedCompany ? ` (${sanitizedCompany})` : ''}`,
        description: eventDescription,
        start: {
          dateTime: eventStartDateTime,
          timeZone: sanitizedTimezone,
        },
        end: {
          dateTime: eventEndDateTime,
          timeZone: sanitizedTimezone,
        },
        attendees: [
          { email: sanitizedEmail },
          { email: config.env.MY_EMAIL! },
        ],
      });

      const response: BookingResponse = {
        success: true,
        message: 'Booking confirmed! You will receive a calendar invitation via email.',
        eventId,
        details: {
          name: sanitizedName,
          email: sanitizedEmail,
          company: sanitizedCompany || undefined,
          date: body.date,
          startTime: body.startTime,
          endTime: body.endTime,
          timezone: sanitizedTimezone,
        },
      };

      return new Response(
        JSON.stringify(response),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            ...corsHeaders,
            ...securityHeaders,
          },
        }
      );
    } catch (error) {
      console.error('POST /api/book error:', error);

      // Don't expose internal errors to clients
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return new Response(
        JSON.stringify({
          error: 'Failed to create booking',
          message: process.env.NODE_ENV === 'development' ? errorMessage : 'Please try again later',
          success: false,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            ...corsHeaders,
            ...securityHeaders,
          },
        }
      );
    }
  };

  return {
    GET,
    POST,
    OPTIONS,
  };
}
