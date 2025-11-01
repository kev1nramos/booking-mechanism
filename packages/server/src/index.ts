/**
 * @kev1nramos/booking-server
 * Google Calendar booking service with platform adapters
 */

// Export main service
export { GoogleCalendarService } from './GoogleCalendarService.js';

// Export security utilities
export {
  getCorsHeaders,
  getSecurityHeaders,
  getCacheControl,
  isRateLimited,
  getClientIp,
  isValidOrigin,
  sanitizeInput,
} from './security.js';

// Re-export types from core for convenience
export type {
  GoogleCalendarConfig,
  GoogleCalendarEnv,
  CalendarEvent,
  TimeSlot,
  BookingRequest,
  BookingResponse,
  BusinessHoursConfig,
  SlotConfig,
  DateRangeConfig,
  CorsConfig,
  ValidationConfig,
} from '@kev1nramos/booking-core';
