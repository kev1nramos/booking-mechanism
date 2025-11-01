/**
 * Google Calendar booking system - Utility functions
 */

/**
 * Validates an email address using a simple regex pattern
 * @param email Email address to validate
 * @returns true if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param str String to escape
 * @returns HTML-escaped string
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates a booking request
 * @param request Booking request to validate
 * @returns Error message if invalid, null if valid
 */
export function validateBookingRequest(request: {
  name?: string;
  email?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  clientTimezone?: string;
}): string | null {
  const { name, email, date, startTime, endTime, clientTimezone } = request;

  if (!name || !email || !date || !startTime || !endTime || !clientTimezone) {
    return 'Missing required fields';
  }

  if (!isValidEmail(email)) {
    return 'Invalid email format';
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 'Invalid date format (expected YYYY-MM-DD)';
  }

  // Validate time format (HH:mm)
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return 'Invalid time format (expected HH:mm)';
  }

  return null;
}

/**
 * Formats a date string in YYYY-MM-DD format
 * @param date Date object or string to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a time string in HH:mm format
 * @param date Date object to extract time from
 * @returns Formatted time string
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Parses a date and time string into a Date object
 * @param date Date string in YYYY-MM-DD format
 * @param time Time string in HH:mm format
 * @returns Date object
 */
export function parseDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Adds minutes to a time string
 * @param time Time string in HH:mm format
 * @param minutes Minutes to add
 * @returns New time string in HH:mm format
 */
export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes);
  return formatTime(date);
}

/**
 * Checks if a date is within the allowed range
 * @param date Date string in YYYY-MM-DD format
 * @param minDays Minimum days from today
 * @param maxDays Maximum days from today
 * @returns true if date is within range, false otherwise
 */
export function isDateInRange(
  date: string,
  minDays: number = 0,
  maxDays: number = 30
): boolean {
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + minDays);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxDays);

  return targetDate >= minDate && targetDate <= maxDate;
}
