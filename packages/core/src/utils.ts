/**
 * Google Calendar booking system - Utility functions
 */

/**
 * Validates an email address using RFC 5321 compliant checks
 * SECURITY: Enhanced validation to prevent injection attacks and malformed emails
 * @param email Email address to validate
 * @returns true if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  // Length check first (RFC 5321) - prevents DoS via memory exhaustion
  if (!email || email.length > 254 || email.length < 3) {
    return false;
  }

  // More robust regex that follows RFC 5321 more closely
  // Allows: letters, numbers, and common special characters in local part
  // Requires: proper domain structure with TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Split and validate parts
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return false;
  }

  // Local part (before @) validation
  if (local.length > 64) {
    return false; // RFC 5321 limit
  }

  // Domain validation
  if (domain.includes('..')) {
    return false; // No consecutive dots
  }

  if (domain.startsWith('.') || domain.endsWith('.')) {
    return false; // No leading/trailing dots
  }

  // Validate TLD exists and is at least 2 characters
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return false; // Must have at least one dot in domain
  }

  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    return false; // TLD must be at least 2 chars
  }

  // Check for null bytes (injection attack)
  if (email.includes('\0') || email.includes('\x00')) {
    return false;
  }

  return true;
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
 * SECURITY: Added length checks before regex to prevent ReDoS attacks
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

  // Length validation BEFORE regex checks (prevents ReDoS)
  if (name.length > 200) {
    return 'Name is too long (max 200 characters)';
  }

  if (date.length > 10) {
    return 'Invalid date format (expected YYYY-MM-DD)';
  }

  if (startTime.length > 5 || endTime.length > 5) {
    return 'Invalid time format (expected HH:mm)';
  }

  if (clientTimezone.length > 100) {
    return 'Timezone name is too long';
  }

  // Email validation (includes length check internally)
  if (!isValidEmail(email)) {
    return 'Invalid email format';
  }

  // Validate date format (YYYY-MM-DD) - safe now with length check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 'Invalid date format (expected YYYY-MM-DD)';
  }

  // Validate time format (HH:mm) - safe now with length check
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return 'Invalid time format (expected HH:mm)';
  }

  // Validate date components are valid numbers
  const dateParts = date.split('-');
  const year = parseInt(dateParts[0] || '');
  const month = parseInt(dateParts[1] || '');
  const day = parseInt(dateParts[2] || '');

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return 'Invalid date values';
  }

  if (month < 1 || month > 12) {
    return 'Invalid month (must be 1-12)';
  }

  if (day < 1 || day > 31) {
    return 'Invalid day (must be 1-31)';
  }

  if (year < 2000 || year > 2100) {
    return 'Invalid year (must be between 2000-2100)';
  }

  // Validate time components
  const startParts = startTime.split(':');
  const endParts = endTime.split(':');

  const startHour = parseInt(startParts[0] || '');
  const startMinute = parseInt(startParts[1] || '');
  const endHour = parseInt(endParts[0] || '');
  const endMinute = parseInt(endParts[1] || '');

  if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
    return 'Invalid time values';
  }

  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
    return 'Invalid hour (must be 0-23)';
  }

  if (startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) {
    return 'Invalid minute (must be 0-59)';
  }

  // Validate end time is after start time
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (endMinutes <= startMinutes) {
    return 'End time must be after start time';
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
 * FIXED: Removed dangerous non-null assertions for type safety
 * @param date Date string in YYYY-MM-DD format
 * @param time Time string in HH:mm format
 * @returns Date object or null if invalid
 */
export function parseDateTime(date: string, time: string): Date | null {
  const dateParts = date.split('-').map(Number);
  const timeParts = time.split(':').map(Number);

  // Validate we have the right number of parts
  if (dateParts.length !== 3 || timeParts.length !== 2) {
    return null;
  }

  const [year, month, day] = dateParts as [number, number, number];
  const [hours, minutes] = timeParts as [number, number];

  // Validate all parts are numbers
  if (dateParts.some(isNaN) || timeParts.some(isNaN)) {
    return null;
  }

  // Create date object
  const result = new Date(year, month - 1, day, hours, minutes);

  // Validate the date is valid (catches Feb 30, etc.)
  if (isNaN(result.getTime())) {
    return null;
  }

  // Validate the date components match (catches rollover dates)
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day ||
    result.getHours() !== hours ||
    result.getMinutes() !== minutes
  ) {
    return null;
  }

  return result;
}

/**
 * Adds minutes to a time string
 * FIXED: Removed non-null assertions
 * @param time Time string in HH:mm format
 * @param minutes Minutes to add
 * @returns New time string in HH:mm format
 */
export function addMinutes(time: string, minutes: number): string {
  const timeParts = time.split(':').map(Number);

  if (timeParts.length !== 2 || timeParts.some(isNaN)) {
    return time; // Return original if invalid
  }

  const [hours, mins] = timeParts as [number, number];
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
