/**
 * Google Calendar REST API Service
 *
 * Runtime-agnostic service that uses native fetch() to interact with Google Calendar API.
 * Compatible with Cloudflare Workers, Vercel Edge, AWS Lambda (Node 18+), Deno, Bun, and any
 * platform supporting standard Web APIs.
 */

import type {
  CalendarEvent,
  TimeSlot,
  GoogleCalendarConfig,
  GoogleTokenResponse,
  GoogleCalendarEventResource,
  GoogleCalendarListResponse,
  GoogleCalendarResource,
  BusinessHoursConfig,
  SlotConfig,
  DateRangeConfig,
} from '@kev1nramos/booking-core';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  businessHours: {
    start: 9,
    end: 20,
  } as BusinessHoursConfig,
  slots: {
    interval: 30,
    durations: [30, 45, 60, 90, 120],
  } as SlotConfig,
  dateRange: {
    minDays: 0,
    maxDays: 30,
  } as DateRangeConfig,
};

export class GoogleCalendarService {
  private config: GoogleCalendarConfig;
  private calendarId: string;
  private accessToken: string;
  private businessHours: BusinessHoursConfig;
  private slotConfig: SlotConfig;
  private dateRangeConfig: DateRangeConfig;

  private readonly CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
  private readonly TOKEN_URL = 'https://oauth2.googleapis.com/token';

  constructor(config: GoogleCalendarConfig) {
    // Validate required environment variables
    this.validateConfig(config);

    this.config = config;
    this.calendarId = config.env.GOOGLE_CALENDAR_ID || 'primary';
    this.accessToken = config.env.GOOGLE_ACCESS_TOKEN;

    // Apply configuration with defaults
    this.businessHours = config.businessHours || DEFAULT_CONFIG.businessHours;
    this.slotConfig = config.slots || DEFAULT_CONFIG.slots;
    this.dateRangeConfig = config.dateRange || DEFAULT_CONFIG.dateRange;
  }

  /**
   * Validate configuration to prevent accidental misconfiguration
   */
  private validateConfig(config: GoogleCalendarConfig): void {
    const required = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REFRESH_TOKEN',
    ] as const;

    const missing = required.filter(key => !config.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}. ` +
        'Please check your configuration and ensure all required variables are set.'
      );
    }

    // Warn about placeholder values (common mistake)
    const placeholderPatterns = [
      'your-',
      'example',
      'placeholder',
      'todo',
      'changeme',
    ];

    Object.entries(config.env).forEach(([key, value]) => {
      if (value && placeholderPatterns.some(pattern =>
        value.toLowerCase().includes(pattern)
      )) {
        console.warn(
          `⚠️  WARNING: ${key} appears to contain a placeholder value. ` +
          'Please replace it with your actual credentials.'
        );
      }
    });
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.env.GOOGLE_CLIENT_ID &&
      this.config.env.GOOGLE_CLIENT_SECRET &&
      this.config.env.GOOGLE_REFRESH_TOKEN
    );
  }

  /**
   * Get the current configuration
   */
  getConfig(): GoogleCalendarConfig {
    return this.config;
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.env.GOOGLE_CLIENT_ID,
          client_secret: this.config.env.GOOGLE_CLIENT_SECRET,
          refresh_token: this.config.env.GOOGLE_REFRESH_TOKEN,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Token refresh failed:', error);
        throw new Error(`Failed to refresh token: ${response.status}`);
      }

      const data: GoogleTokenResponse = await response.json();
      this.accessToken = data.access_token;

      return data.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Make an authenticated request to Google Calendar API
   */
  private async makeCalendarRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure we have a fresh token
    if (!this.accessToken) {
      await this.refreshAccessToken();
    }

    const url = `${this.CALENDAR_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // If unauthorized, refresh token and retry once
    if (response.status === 401) {
      await this.refreshAccessToken();

      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.text();
        throw new Error(`Calendar API error: ${retryResponse.status} - ${error}`);
      }

      return await retryResponse.json();
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Calendar API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Get the calendar's timezone
   */
  async getCalendarTimezone(): Promise<string> {
    if (!this.isConfigured()) {
      return 'UTC';
    }

    try {
      const calendar = await this.makeCalendarRequest<GoogleCalendarResource>(
        `/calendars/${encodeURIComponent(this.calendarId)}`
      );

      return calendar.timeZone || 'UTC';
    } catch (error) {
      console.error('Error getting calendar timezone:', error);
      return 'UTC';
    }
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableSlots(date: string): Promise<TimeSlot[]> {
    if (!this.isConfigured()) {
      throw new Error('Google Calendar API not configured');
    }

    try {
      // Parse the date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get events for the specified date
      const params = new URLSearchParams({
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100',
      });

      const response = await this.makeCalendarRequest<GoogleCalendarListResponse>(
        `/calendars/${encodeURIComponent(this.calendarId)}/events?${params.toString()}`
      );

      const events = response.items || [];

      // Filter out events where the primary attendee (you) has declined
      const confirmedEvents = events.filter((event) => {
        // Skip cancelled events
        if (event.status === 'cancelled') {
          return false;
        }

        // If no attendees, consider it confirmed
        if (!event.attendees || event.attendees.length === 0) {
          return true;
        }

        // Check if the primary attendee (you) has declined
        const primaryAttendee = event.attendees.find(attendee =>
          attendee.email === this.config.env.MY_EMAIL ||
          attendee.email === this.calendarId
        );

        // If primary attendee declined, exclude this event
        if (primaryAttendee && primaryAttendee.responseStatus === 'declined') {
          return false;
        }

        // If primary attendee accepted or no response, include this event
        return true;
      });

      // Generate all possible time slots based on configured interval
      const slots: TimeSlot[] = [];
      for (let hour = this.businessHours.start; hour < this.businessHours.end; hour++) {
        // Generate slots based on interval
        for (let minute = 0; minute < 60; minute += this.slotConfig.interval) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push({
            id: `${date}-${time}`,
            time,
            available: true
          });
        }
      }

      // Mark slots as unavailable if they conflict with confirmed events
      confirmedEvents.forEach((event) => {
        if (!event.start || !event.end) return;

        const eventStart = new Date(event.start.dateTime || event.start.date || '');
        const eventEnd = new Date(event.end.dateTime || event.end.date || '');

        slots.forEach(slot => {
          const slotTime = new Date(`${date}T${slot.time}:00`);
          const slotEndTime = new Date(slotTime.getTime() + this.slotConfig.interval * 60 * 1000);

          // Check if slot overlaps with event
          if (slotTime < eventEnd && slotEndTime > eventStart) {
            slot.available = false;
          }
        });
      });

      return slots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Check if a specific time slot is available
   */
  async isSlotAvailable(date: string, startTime: string, endTime: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return true; // Default to available if not configured
    }

    try {
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);

      const params = new URLSearchParams({
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        singleEvents: 'true',
        maxResults: '10',
      });

      const response = await this.makeCalendarRequest<GoogleCalendarListResponse>(
        `/calendars/${encodeURIComponent(this.calendarId)}/events?${params.toString()}`
      );

      const events = response.items || [];

      // Filter out events where the primary attendee (you) has declined
      const confirmedEvents = events.filter((event) => {
        // Skip cancelled events
        if (event.status === 'cancelled') {
          return false;
        }

        // If no attendees, consider it confirmed
        if (!event.attendees || event.attendees.length === 0) {
          return true;
        }

        // Check if the primary attendee (you) has declined
        const primaryAttendee = event.attendees.find(attendee =>
          attendee.email === this.config.env.MY_EMAIL ||
          attendee.email === this.calendarId
        );

        // If primary attendee declined, exclude this event
        if (primaryAttendee && primaryAttendee.responseStatus === 'declined') {
          return false;
        }

        // If primary attendee accepted or no response, include this event
        return true;
      });

      // Check if there are any confirmed events that overlap with the requested time slot
      const hasConflict = confirmedEvents.some((event) => {
        if (!event.start || !event.end) return false;

        const eventStart = new Date(event.start.dateTime || event.start.date || '');
        const eventEnd = new Date(event.end.dateTime || event.end.date || '');

        return startDateTime < eventEnd && endDateTime > eventStart;
      });

      return !hasConflict;
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return false; // Default to unavailable on error
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(event: CalendarEvent): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google Calendar API not configured');
    }

    try {
      const eventResource = {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start.dateTime,
          timeZone: event.start.timeZone
        },
        end: {
          dateTime: event.end.dateTime,
          timeZone: event.end.timeZone
        },
        attendees: event.attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      const params = new URLSearchParams({
        sendUpdates: 'all',
        conferenceDataVersion: '1',
      });

      const response = await this.makeCalendarRequest<GoogleCalendarEventResource>(
        `/calendars/${encodeURIComponent(this.calendarId)}/events?${params.toString()}`,
        {
          method: 'POST',
          body: JSON.stringify(eventResource),
        }
      );

      return response.id || '';
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Convert time from client timezone to calendar timezone
   */
  async convertTimeToCalendarTimezone(
    date: string,
    time: string,
    clientTimezone: string
  ): Promise<{ date: string; time: string }> {
    try {
      const calendarTimezone = await this.getCalendarTimezone();

      // If timezones are the same, no conversion needed
      if (calendarTimezone === clientTimezone) {
        return { date, time };
      }

      // Validate input parameters
      if (!date || !time || !clientTimezone) {
        console.error('Invalid input parameters:', { date, time, clientTimezone });
        return { date, time };
      }

      // Parse date and time components
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);

      // Validate parsed values
      if (isNaN(year!) || isNaN(month!) || isNaN(day!) || isNaN(hours!) || isNaN(minutes!)) {
        console.error('Invalid date/time components:', { year, month, day, hours, minutes });
        return { date, time };
      }

      // Create a date object representing the time in the client timezone
      const clientDate = new Date(year!, (month ?? 1) - 1, day!, hours!, minutes!);

      // Validate the created date
      if (isNaN(clientDate.getTime())) {
        console.error('Invalid date object created:', clientDate);
        return { date, time };
      }

      // Convert to the calendar timezone
      const calendarDate = new Date(clientDate.toLocaleString('en-US', { timeZone: calendarTimezone }));

      // Validate the converted date
      if (isNaN(calendarDate.getTime())) {
        console.error('Invalid calendar date after conversion:', calendarDate);
        return { date, time };
      }

      // Format the result
      const adjustedYear = calendarDate.getFullYear();
      const adjustedMonth = String(calendarDate.getMonth() + 1).padStart(2, '0');
      const adjustedDay = String(calendarDate.getDate()).padStart(2, '0');
      const adjustedHours = String(calendarDate.getHours()).padStart(2, '0');
      const adjustedMinutes = String(calendarDate.getMinutes()).padStart(2, '0');

      return {
        date: `${adjustedYear}-${adjustedMonth}-${adjustedDay}`,
        time: `${adjustedHours}:${adjustedMinutes}`
      };
    } catch (error) {
      console.error('Error converting to calendar timezone:', error, { date, time, clientTimezone });
      // Fallback to original date/time
      return { date, time };
    }
  }

  /**
   * Convert time from calendar timezone to client timezone
   */
  async convertTimeFromCalendarTimezone(
    date: string,
    time: string,
    clientTimezone: string
  ): Promise<{ date: string; time: string }> {
    try {
      const calendarTimezone = await this.getCalendarTimezone();

      // If timezones are the same, no conversion needed
      if (calendarTimezone === clientTimezone) {
        return { date, time };
      }

      // Create a date string that represents the time in the calendar timezone
      const calendarDateTime = `${date}T${time}:00`;

      // Create a date object and format it in the client timezone
      const dateObj = new Date(calendarDateTime);

      // Format the date in the client timezone
      const clientDate = new Date(dateObj.toLocaleString('en-US', { timeZone: clientTimezone }));

      // Extract the date and time components
      const year = clientDate.getFullYear();
      const month = String(clientDate.getMonth() + 1).padStart(2, '0');
      const day = String(clientDate.getDate()).padStart(2, '0');
      const hours = String(clientDate.getHours()).padStart(2, '0');
      const minutes = String(clientDate.getMinutes()).padStart(2, '0');

      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`
      };
    } catch (error) {
      console.error('Error converting from calendar timezone:', error, { date, time, clientTimezone });
      // Fallback to original date/time
      return { date, time };
    }
  }

  /**
   * Get available slots converted to client timezone
   */
  async getAvailableSlotsInTimezone(date: string, clientTimezone: string): Promise<TimeSlot[]> {
    try {
      const slots = await this.getAvailableSlots(date);
      const calendarTimezone = await this.getCalendarTimezone();

      // If timezones are the same, return as is
      if (calendarTimezone === clientTimezone) {
        return slots;
      }

      // Convert each slot to client timezone
      const convertedSlots: TimeSlot[] = [];

      for (const slot of slots) {
        try {
          const converted = await this.convertTimeFromCalendarTimezone(date, slot.time, clientTimezone);
          convertedSlots.push({
            ...slot,
            id: `${converted.date}-${converted.time}`,
            time: converted.time,
            originalDate: date,
            originalTime: slot.time
          });
        } catch (error) {
          console.error('Error converting slot:', slot, error);
          // Keep original slot if conversion fails
          convertedSlots.push(slot);
        }
      }

      return convertedSlots;
    } catch (error) {
      console.error('Error getting slots in timezone:', error);
      // Fallback to original slots
      return await this.getAvailableSlots(date);
    }
  }

  /**
   * Get business hours configuration
   */
  getBusinessHours(): BusinessHoursConfig {
    return this.businessHours;
  }

  /**
   * Get slot configuration
   */
  getSlotConfig(): SlotConfig {
    return this.slotConfig;
  }

  /**
   * Get date range configuration
   */
  getDateRangeConfig(): DateRangeConfig {
    return this.dateRangeConfig;
  }
}
