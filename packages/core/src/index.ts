/**
 * @kev1nramos/booking-core
 * Core types and utilities for Google Calendar booking system
 */

// Export all types
export type {
  TimeSlot,
  CalendarEvent,
  BookingRequest,
  BookingResponse,
  BusinessHoursConfig,
  SlotConfig,
  DateRangeConfig,
  CorsConfig,
  ValidationConfig,
  GoogleCalendarEnv,
  GoogleCalendarConfig,
  GoogleTokenResponse,
  GoogleCalendarEventResource,
  GoogleCalendarListResponse,
  GoogleCalendarResource,
} from './types.js';

// Export all utilities
export {
  isValidEmail,
  escapeHtml,
  validateBookingRequest,
  formatDate,
  formatTime,
  parseDateTime,
  addMinutes,
  isDateInRange,
} from './utils.js';
