/**
 * Google Calendar booking system - Core types
 */

/**
 * Time slot representation for available booking times
 */
export interface TimeSlot {
  /** Unique identifier for the slot (format: "YYYY-MM-DD-HH:mm") */
  id: string;
  /** Time in HH:mm format */
  time: string;
  /** Whether this slot is available for booking */
  available: boolean;
  /** Original date before timezone conversion (if converted) */
  originalDate?: string;
  /** Original time before timezone conversion (if converted) */
  originalTime?: string;
}

/**
 * Calendar event data structure
 */
export interface CalendarEvent {
  /** Event title/summary */
  summary: string;
  /** Detailed event description */
  description?: string;
  /** Event start time */
  start: {
    /** ISO 8601 datetime string */
    dateTime: string;
    /** IANA timezone (e.g., "America/New_York") */
    timeZone: string;
  };
  /** Event end time */
  end: {
    /** ISO 8601 datetime string */
    dateTime: string;
    /** IANA timezone (e.g., "America/New_York") */
    timeZone: string;
  };
  /** List of attendee emails */
  attendees?: Array<{
    email: string;
  }>;
}

/**
 * Booking request from client
 */
export interface BookingRequest {
  /** Client's full name */
  name: string;
  /** Client's email address */
  email: string;
  /** Client's company (optional) */
  company?: string;
  /** Additional message from client (optional) */
  message?: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
  /** Meeting duration in minutes */
  duration: number;
  /** Client's IANA timezone */
  clientTimezone: string;
}

/**
 * Booking response after successful creation
 */
export interface BookingResponse {
  /** Whether the booking was successful */
  success: boolean;
  /** User-friendly message */
  message: string;
  /** Google Calendar event ID */
  eventId?: string;
  /** Booking details */
  details?: {
    name: string;
    email: string;
    company?: string;
    date: string;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

/**
 * Business hours configuration
 */
export interface BusinessHoursConfig {
  /** Start hour (0-23) */
  start: number;
  /** End hour (0-23) */
  end: number;
}

/**
 * Slot configuration
 */
export interface SlotConfig {
  /** Interval between slots in minutes */
  interval: number;
  /** Available meeting durations in minutes */
  durations: number[];
}

/**
 * Date range configuration for bookings
 */
export interface DateRangeConfig {
  /** Minimum days from today (0 = today) */
  minDays: number;
  /** Maximum days from today */
  maxDays: number;
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  /** Allowed origin URLs */
  allowedOrigins: string[];
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Custom email validator */
  emailValidator?: (email: string) => boolean;
  /** Custom HTML sanitizer */
  sanitizer?: (input: string) => string;
}

/**
 * Google Calendar environment configuration
 */
export interface GoogleCalendarEnv {
  /** Google OAuth client secret */
  GOOGLE_CLIENT_SECRET: string;
  /** Google OAuth client ID */
  GOOGLE_CLIENT_ID: string;
  /** OAuth redirect URI */
  GOOGLE_REDIRECT_URI: string;
  /** Google Calendar ID (e.g., "primary" or email) */
  GOOGLE_CALENDAR_ID: string;
  /** Calendar owner's email */
  MY_EMAIL: string;
  /** Google OAuth access token */
  GOOGLE_ACCESS_TOKEN: string;
  /** Google OAuth refresh token */
  GOOGLE_REFRESH_TOKEN: string;
}

/**
 * Complete Google Calendar service configuration
 */
export interface GoogleCalendarConfig {
  /** Google Calendar environment variables */
  env: GoogleCalendarEnv;
  /** Business hours configuration (default: 9-20) */
  businessHours?: BusinessHoursConfig;
  /** Slot configuration (default: 30min intervals, [30, 45, 60, 90, 120]min durations) */
  slots?: SlotConfig;
  /** Date range configuration (default: 0-30 days) */
  dateRange?: DateRangeConfig;
  /** CORS configuration (default: production domain only) */
  cors?: CorsConfig;
  /** Validation configuration (default: built-in validators) */
  validation?: ValidationConfig;
}

/**
 * Internal Google API types
 */

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  refresh_token?: string;
}

export interface GoogleCalendarEventResource {
  id?: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
  }>;
  status?: string;
}

export interface GoogleCalendarListResponse {
  items?: GoogleCalendarEventResource[];
  nextPageToken?: string;
}

export interface GoogleCalendarResource {
  id?: string;
  summary?: string;
  timeZone?: string;
  description?: string;
}
