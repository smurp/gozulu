/**
 * teezee.js - Timezone utilities for GoZulu
 * 
 * A library for handling timezones, offsets, NATO codes, and formatting.
 */

// Create a global TeeZee object
const TeeZee = {
  // Timezone data indexed by offset in minutes from GMT
  timezones: {
    '-720': { abbr: 'IDLW', nato: 'Y', place: 'International Date Line West' },
    '-660': { abbr: 'SST', nato: 'X', place: 'Samoa, Midway Island' },
    '-600': { abbr: 'HST', nato: 'W', place: 'Hawaii' },
    '-540': { abbr: 'AKST', nato: 'V', place: 'Alaska' },
    '-480': { abbr: 'PST', nato: 'U', place: 'Los Angeles, Vancouver' },
    '-420': { abbr: 'MST', nato: 'T', place: 'Denver, Phoenix' },
    '-360': { abbr: 'CST', nato: 'S', place: 'Chicago, Mexico City' },
    '-300': { abbr: 'EST', nato: 'R', place: 'New York, Toronto' },
    '-240': { abbr: 'AST', nato: 'Q', place: 'Halifax, San Juan' },
    '-180': { abbr: 'ADT', nato: 'P', place: 'São Paulo, Buenos Aires' },
    '-120': { abbr: 'GST', nato: 'O', place: 'South Georgia' },
    '-60': { abbr: 'CVT', nato: 'N', place: 'Cape Verde' },
    '0': { abbr: 'GMT', nato: 'Z', place: 'London, Reykjavik' },
    '60': { abbr: 'CET', nato: 'A', place: 'Paris, Rome, Berlin' },
    '120': { abbr: 'EET', nato: 'B', place: 'Athens, Cairo, Istanbul' },
    '180': { abbr: 'MSK', nato: 'C', place: 'Moscow, Riyadh' },
    '240': { abbr: 'GST', nato: 'D', place: 'Dubai, Baku' },
    '300': { abbr: 'PKT', nato: 'E', place: 'Karachi, Tashkent' },
    '330': { abbr: 'IST', nato: 'E+', place: 'New Delhi, Mumbai' },
    '360': { abbr: 'BDT', nato: 'F', place: 'Dhaka, Almaty' },
    '420': { abbr: 'ICT', nato: 'G', place: 'Bangkok, Jakarta' },
    '480': { abbr: 'CST', nato: 'H', place: 'Beijing, Singapore' },
    '540': { abbr: 'JST', nato: 'I', place: 'Tokyo, Seoul' },
    '600': { abbr: 'AEST', nato: 'K', place: 'Sydney, Melbourne' },
    '660': { abbr: 'AEDT', nato: 'L', place: 'Solomon Islands' },
    '720': { abbr: 'NZST', nato: 'M', place: 'Auckland, Fiji' }
  },

  /**
   * Normalizes an hour offset to be within the -12 to +12 range
   * @param {number} hourOffset - The hour offset to normalize
   * @returns {number} - The normalized hour offset
   */
  normalizeHourOffset: function(hourOffset) {
    // Ensure we're working with whole hours
    let normalized = Math.round(hourOffset);
    
    // Apply modulo 24 and ensure the result is in range -12 to +12
    normalized = ((normalized % 24) + 24) % 24;
    if (normalized > 12) {
      normalized -= 24;
    }
    
    return normalized;
  },

  /**
   * Gets the NATO code for a given hour offset
   * @param {number} hourOffset - The hour offset (will be normalized)
   * @returns {string} - The NATO code
   */
  getNatoCode: function(hourOffset) {
    const normalized = this.normalizeHourOffset(hourOffset);
    const minutesOffset = normalized * 60;
    return this.timezones[minutesOffset.toString()]?.nato || '';
  },

  /**
   * Gets the timezone abbreviation for a given hour offset
   * @param {number} hourOffset - The hour offset (will be normalized)
   * @returns {string} - The timezone abbreviation
   */
  getAbbreviation: function(hourOffset) {
    const normalized = this.normalizeHourOffset(hourOffset);
    const minutesOffset = normalized * 60;
    return this.timezones[minutesOffset.toString()]?.abbr || '';
  },

  /**
   * Gets a representative place name for a given hour offset
   * @param {number} hourOffset - The hour offset (will be normalized)
   * @returns {string} - The place name
   */
  getPlaceName: function(hourOffset) {
    const normalized = this.normalizeHourOffset(hourOffset);
    const minutesOffset = normalized * 60;
    return this.timezones[minutesOffset.toString()]?.place || '';
  },

  /**
   * Formats a timezone offset for display or URL
   * @param {number} hourOffset - The hour offset
   * @param {string} format - Format type: 'nato', 'abbr', 'offset', or 'auto'
   * @returns {string} - Formatted timezone string
   */
  formatOffset: function(hourOffset, format = 'auto') {
    // Normalize the offset
    const normalized = this.normalizeHourOffset(hourOffset);
    const minutesOffset = normalized * 60;
    const tzData = this.timezones[minutesOffset.toString()] || {};
    
    switch (format) {
      case 'nato':
        return tzData.nato || 'Z';
      case 'abbr':
        return tzData.abbr || 'GMT';
      case 'offset':
        return normalized === 0 ? 'GMT' : 
               normalized > 0 ? `GMT+${normalized}` : `GMT${normalized}`;
      case 'auto':
      default:
        // For URL parameter, prefer NATO code if available
        return tzData.nato || 
              (normalized === 0 ? '0' : 
               normalized > 0 ? `+${normalized}` : `${normalized}`);
    }
  },

  /**
   * Parses a timezone string (NATO code or offset) to get the hour offset
   * @param {string} timezoneStr - The timezone string
   * @returns {number} - The hour offset
   */
  parseTimezone: function(timezoneStr) {
    // Check if it's a NATO code (single letter)
    if (timezoneStr?.length === 1) {
      // Find the entry with this NATO code
      for (const [minutes, data] of Object.entries(this.timezones)) {
        if (data.nato === timezoneStr.toUpperCase()) {
          return parseInt(minutes) / 60;
        }
      }
    }
    
    // Otherwise, try to parse it as an offset
    if (/^[+-]?\d+$/.test(timezoneStr)) {
      return parseInt(timezoneStr);
    }
    
    // If we can't parse it, return 0 (GMT/UTC)
    return 0;
  },

  /**
   * Calculates the angle in degrees for a given hour offset
   * Used for positioning the local time label around the clock
   * @param {number} hourOffset - The hour offset
   * @returns {number} - The angle in degrees (0-360)
   */
  getClockPositionAngle: function(hourOffset) {
    // Each hour is 15 degrees on the 24-hour clock
    // The angle formula is from the positionLocalTimeByTimezone function
    // Negative sign because hours increase clockwise but angle increases counterclockwise
    let angleDegrees = -hourOffset * 15 + 270;
    
    // Ensure the angle is between 0 and 360
    angleDegrees = angleDegrees % 360;
    if (angleDegrees < 0) angleDegrees += 360;
    
    return angleDegrees;
  },

  /**
   * Calculates the hour offset from a clock position angle
   * Used for drag operations on the local time label
   * @param {number} angleDegrees - The angle in degrees (0-360)
   * @returns {number} - The hour offset
   */
  getOffsetFromClockPosition: function(angleDegrees) {
    // Reverse of the getClockPositionAngle calculation
    // If angleDegrees = -hourOffset * 15 + 270
    // Then hourOffset = (270 - angleDegrees) / 15
    const offset = (270 - angleDegrees) / 15;
    
    // Normalize the result
    return this.normalizeHourOffset(offset);
  }
};

// Make TeeZee available globally
window.TeeZee = TeeZee;