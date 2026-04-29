let sunScale = 0.91;
let mapOffsetToGreenwichDegrees = 135;

// Global state variables
let currentTime = null;      // The main time reference - could be system time, fixed time, or adjusted time
let systemTime = null;       // The actual system time, updated every second
let userAdjustedTime = null; // Temporary time when sun is being dragged
let fixedTime = null;        // For 'as-of' parameter - when not null, currentTime is fixed
let useFixedTime = false;    // Flag to indicate we're using fixed time

let springBackAnimation = null;
let isAnimatingSpringBack = false;
let isDraggingSun = false;

// Global variables to track user's location and timezone
let userLocation = null;
let userTimezoneOffsetHours = null;
let customTimezoneOffset = null;  // Set when 'local' parameter is present

// Function to parse ISO8601 date strings with enhanced timezone support
function parseISO8601(dateString) {
  try {
    // Check if we have a NATO one-letter timezone code instead of Z
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[A-IK-Z]$/)) {
      // Extract the NATO code
      const natoCode = dateString.charAt(dateString.length - 1);
      
      // Map of NATO timezone codes to UTC offsets in minutes
      const natoOffsetMap = {
        'Y': -12*60, // Yankee Time Zone (UTC-12)
        'X': -11*60, // X-ray Time Zone (UTC-11)
        'W': -10*60, // Whiskey Time Zone (UTC-10)
        'V': -9*60,  // Victor Time Zone (UTC-9)
        'U': -8*60,  // Uniform Time Zone (UTC-8)
        'T': -7*60,  // Tango Time Zone (UTC-7)
        'S': -6*60,  // Sierra Time Zone (UTC-6)
        'R': -5*60,  // Romeo Time Zone (UTC-5)
        'Q': -4*60,  // Quebec Time Zone (UTC-4)
        'P': -3*60,  // Papa Time Zone (UTC-3)
        'O': -2*60,  // Oscar Time Zone (UTC-2)
        'N': -1*60,  // November Time Zone (UTC-1)
        'Z': 0,      // Zulu Time Zone (UTC/GMT)
        'A': 1*60,   // Alpha Time Zone (UTC+1)
        'B': 2*60,   // Bravo Time Zone (UTC+2)
        'C': 3*60,   // Charlie Time Zone (UTC+3)
        'D': 4*60,   // Delta Time Zone (UTC+4)
        'E': 5*60,   // Echo Time Zone (UTC+5)
        'F': 6*60,   // Foxtrot Time Zone (UTC+6)
        'G': 7*60,   // Golf Time Zone (UTC+7)
        'H': 8*60,   // Hotel Time Zone (UTC+8)
        'I': 9*60,   // India Time Zone (UTC+9)
        'K': 10*60,  // Kilo Time Zone (UTC+10)
        'L': 11*60,  // Lima Time Zone (UTC+11)
        'M': 12*60   // Mike Time Zone (UTC+12)
      };
      
      if (natoOffsetMap[natoCode]) {
        // Convert to ISO8601 with UTC offset
        const offsetMinutes = natoOffsetMap[natoCode];
        const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
        const remainingMinutes = Math.abs(offsetMinutes % 60);
        
        const sign = offsetMinutes >= 0 ? '+' : '-';
        const offsetString = `${sign}${String(offsetHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
        
        // Replace NATO code with standard offset
        const timeWithoutNato = dateString.substring(0, dateString.length - 1);
        return new Date(`${timeWithoutNato}${offsetString}`);
      }
    }
    
    // Handle ISO8601 dates without timezone by adding local timezone
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)) {
      return new Date(dateString); // Local timezone will be applied
    }
    
    // Standard ISO8601 with timezone
    return new Date(dateString);
  } catch (error) {
    console.error('Invalid date format:', error);
    return null;
  }
}

// Process timezone parameter and set customTimezoneOffset
function processTimezoneParameter(overrideTimezone) {
  // Use TeeZee to parse the timezone
  const hourOffset = TeeZee.parseTimezone(overrideTimezone);
  
  // Set the custom timezone offset in minutes (negative because getTimezoneOffset returns opposite sign)
  customTimezoneOffset = -hourOffset * 60;
  
  // Update userTimezoneOffsetHours
  userTimezoneOffsetHours = hourOffset;
  
  // Format the timezone for display
  let displayTimezone;
  
  if (overrideTimezone.length === 1) {
    // If it's a NATO code
    displayTimezone = `${overrideTimezone.toUpperCase()}`;
  } else if (/^[+-]\d+$/.test(overrideTimezone)) {
    // If it's a numeric offset
    displayTimezone = `GMT${overrideTimezone}`;
  } else {
    // For standard abbreviations or unknown formats, use what was provided
    // TeeZee can also provide a formatted version
    const abbr = TeeZee.getAbbreviation(hourOffset);
    if (abbr && abbr !== 'GMT') {
      displayTimezone = abbr;
    } else {
      displayTimezone = TeeZee.formatOffset(hourOffset, 'offset');
    }
  }
  
  return displayTimezone;
}

// Function to update current time based on fixed time, user adjusted time, or system time
function updateCurrentTime() {
  if (userAdjustedTime) {
    // When user is dragging the sun
    currentTime = new Date(userAdjustedTime);
  } else if (useFixedTime && fixedTime) {
    // When using a fixed time from the as-of parameter
    currentTime = new Date(fixedTime);
  } else {
    // Default: use system time
    currentTime = new Date(systemTime);
  }
}

// Function to update all time displays
function updateAllTimeDisplays() {
  // Update Zulu time
  updateZuluTimeDisplay();

  // Update local time
  updateLocalTimeDisplay();

  // Update terminator and sun position
  updateTerminatorAndSun();

  // Update any toggled-on per-timezone clocks attached to hour triangles
  updateToggledTimezoneDisplays();
}

// Format the given UTC Date as HH:MM (no padding on hours, to match local-time)
// at a fixed hour offset from UTC. Whole-hour offsets only — half-hour zones
// (e.g. India +5:30) are handled separately by their own row in TeeZee.
function formatTimeAtOffset(date, hourOffset) {
  const shifted = new Date(date.getTime() + hourOffset * 3600 * 1000);
  const h = shifted.getUTCHours();
  const m = shifted.getUTCMinutes();
  return `${h}:${String(m).padStart(2, '0')}`;
}

// Walk every outboard time label (including .tz-local) and refresh its text.
// The local label uses the precise userTimezoneOffsetHours (which may be
// fractional, e.g. India +5:30); other labels use their integer data offset.
function updateToggledTimezoneDisplays() {
  document.querySelectorAll('.tz-outboard-time[data-hour-offset]').forEach(el => {
    const isLocal = el.classList.contains('tz-local');
    const offset = isLocal && userTimezoneOffsetHours !== null
      ? userTimezoneOffsetHours
      : parseFloat(el.dataset.hourOffset);
    el.textContent = `${formatTimeAtOffset(currentTime, offset)} ${TeeZee.getAbbreviation(offset)}`;
  });
}

// Map a 0-23 hour-mark index to its UTC hour offset.
// Top of clock (0) is GMT+0; clockwise 1-12 → -1..-12; 13-23 → +11..+1.
function hourIndexToOffset(hourIndex) {
  if (hourIndex === 0) return 0;
  if (hourIndex <= 12) return -hourIndex;
  return 24 - hourIndex;
}

// Inverse of hourIndexToOffset. Fractional offsets (half-hour zones) are
// rounded to the nearest whole hour for hour-mark association only — the
// label's displayed time still uses the precise offset.
function offsetToHourIndex(offset) {
  const o = Math.round(offset);
  if (o === 0) return 0;
  if (o < 0) return -o;
  if (o === 12) return 12;
  return 24 - o;
}

// Outboard time label — sits beyond the clock rim at the angular position
// for this offset. If the offset matches the user's local timezone, the
// element is also marked .tz-local and made draggable.
function addOutboardTimeLabel(offset) {
  const isLocal = userTimezoneOffsetHours !== null
    && Math.round(userTimezoneOffsetHours) === offset;
  const displayOffset = isLocal ? userTimezoneOffsetHours : offset;

  const clockElement = document.getElementById('clock');
  const radius = clockElement.offsetWidth / 2;
  const angleDegrees = TeeZee.getClockPositionAngle(displayOffset);
  const radians = angleDegrees * (Math.PI / 180);
  const distanceFactor = 1.3;
  const x = Math.cos(radians) * (radius * distanceFactor) + radius;
  const y = Math.sin(radians) * (radius * distanceFactor) + radius;

  const el = document.createElement('div');
  el.className = 'tz-outboard-time' + (isLocal ? ' tz-local' : '');
  el.dataset.hourOffset = offset;
  if (isLocal) {
    el.title = 'Drag to adjust timezone';
    attachLocalDragMousedown(el);
  }
  el.textContent = `${formatTimeAtOffset(currentTime, displayOffset)} ${TeeZee.getAbbreviation(displayOffset)}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  clockElement.appendChild(el);
}

// Inboard city label — extracted verbatim from the original click handler so
// existing rotation/positioning math is preserved.
function addInboardCityLabel(hourIndex, offset) {
  const place = TeeZee.getPlaceName(offset);
  const isLeftSide = hourIndex >= 12 && hourIndex <= 23;

  const placeNameEl = document.createElement('div');
  placeNameEl.className = 'place-name';
  placeNameEl.dataset.hourIndex = hourIndex;
  placeNameEl.dataset.hourOffset = offset;
  placeNameEl.textContent = place;
  if (isLeftSide) {
    placeNameEl.dataset.leftSide = 'true';
  }

  const angleDegrees = hourIndex * 15;
  const angleRadians = angleDegrees * (Math.PI / 180);
  const clockElement = document.getElementById('clock');
  const clockRadius = clockElement.offsetWidth / 2;

  Object.assign(placeNameEl.style, {
    position: 'absolute',
    transformOrigin: 'center',
    color: '#90EE90',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    textShadow: '0 0 3px #000, 0 0 5px #000',
    padding: '3px 6px',
    backgroundColor: 'rgba(0, 0, 30, 0.6)',
    borderRadius: '4px',
    userSelect: 'none',
    visibility: 'hidden'
  });
  clockElement.appendChild(placeNameEl);

  const textWidth = placeNameEl.offsetWidth;
  const targetDistance = clockRadius * 0.81;
  const adjustedDistance = targetDistance - textWidth / 2;
  const offsetX = Math.sin(angleRadians) * adjustedDistance;
  const offsetY = -Math.cos(angleRadians) * adjustedDistance;

  placeNameEl.style.left = `calc(50% + ${offsetX}px)`;
  placeNameEl.style.top = `calc(50% + ${offsetY}px)`;
  const flip = isLeftSide ? 180 : 0;
  placeNameEl.style.transform = `translate(-50%, -50%) rotate(${angleDegrees + 270 + flip}deg)`;
  placeNameEl.style.visibility = 'visible';
  placeNameEl.style.zIndex = '100';
  placeNameEl.style.cursor = 'pointer';

  placeNameEl.addEventListener('click', e => e.stopPropagation());
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize system time
  systemTime = new Date();
  
  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  let overrideTimezone = urlParams.get('local');
  const asOfParam = urlParams.get('as-of');
  
  // Process timezone parameter first
  if (overrideTimezone) {
    // Process timezone parameter - this function will set customTimezoneOffset
    overrideTimezone = processTimezoneParameter(overrideTimezone);
    
    // Update the page title to reflect the custom timezone
    document.title = `GoZulu - ${overrideTimezone} Time`;
    
    // Add a visual indicator that we're using a custom timezone
    const container = document.querySelector('.container');
    const timezoneIndicator = document.createElement('div');
    timezoneIndicator.className = 'timezone-indicator';
    timezoneIndicator.textContent = `Using ${overrideTimezone} timezone`;
    timezoneIndicator.style.position = 'absolute';
    timezoneIndicator.style.top = asOfParam ? '30px' : '10px'; // Position below fixed time if it exists
    timezoneIndicator.style.left = '50%';
    timezoneIndicator.style.transform = 'translateX(-50%)';
    timezoneIndicator.style.fontSize = '12px';
    timezoneIndicator.style.color = '#90EE90';
    timezoneIndicator.style.textAlign = 'center';
    timezoneIndicator.style.fontWeight = 'bold';
    timezoneIndicator.style.zIndex = '100';
    container.appendChild(timezoneIndicator);
  } else {
    // Use system timezone if no override
    userTimezoneOffsetHours = -systemTime.getTimezoneOffset() / 60;
  }
  
  // Handle as-of parameter
  if (asOfParam) {
    fixedTime = parseISO8601(asOfParam);
    if (fixedTime) {
      useFixedTime = true;
      
      // Format the display time keeping seconds but removing milliseconds
      let displayAsOf = asOfParam;
      
      // If it's a full ISO string, strip the milliseconds but keep seconds
      if (asOfParam.includes('.')) {
        // Remove the millisecond part
        const parts = asOfParam.split('.');
        if (parts.length === 2) {
          // Keep everything before the decimal point
          const timezonePart = parts[1].match(/[Z]|[+-]\d\d:\d\d/);
          displayAsOf = parts[0] + (timezonePart ? timezonePart[0] : '');
        }
      }
      
      // Add visual indicator for fixed time
      const container = document.querySelector('.container');
      const fixedTimeIndicator = document.createElement('div');
      fixedTimeIndicator.className = 'fixed-time-indicator';
      fixedTimeIndicator.textContent = `Fixed time: ${displayAsOf}`;
      fixedTimeIndicator.style.position = 'absolute';
      fixedTimeIndicator.style.top = '10px';
      fixedTimeIndicator.style.left = '50%';
      fixedTimeIndicator.style.transform = 'translateX(-50%)';
      fixedTimeIndicator.style.fontSize = '12px';
      fixedTimeIndicator.style.color = '#FF9090';
      fixedTimeIndicator.style.textAlign = 'center';
      fixedTimeIndicator.style.fontWeight = 'bold';
      fixedTimeIndicator.style.zIndex = '100';
      container.appendChild(fixedTimeIndicator);
    } else {
      console.error('Invalid as-of date format:', asOfParam);
    }
  }
  
  // Initialize current time based on fixed time or system time
  updateCurrentTime();
  
  // Create hour marks for 24-hour clock
  createHourMarks();
  
  // Initialize the clock
  updateClock();
  
  // Update every second - only if not using fixed time
  if (!useFixedTime) {
    setInterval(() => {
      systemTime = new Date(); // Update system time
      updateCurrentTime();     // Update current time
      updateClock();           // Update the clock display
    }, 1000);
  }

  // Wire global drag handlers for the (yet-to-be-created) .tz-local label
  setupGlobalLocalDragHandlers();

  // Initialize the user's local timezone display: default state is TIME-ONLY.
  // Click on the corresponding hour-mark cycles through off → time → time-city.
  if (userTimezoneOffsetHours !== null) {
    const idx = offsetToHourIndex(userTimezoneOffsetHours);
    const marks = document.querySelectorAll('.hour-mark');
    if (marks[idx]) {
      marks[idx].dataset.displayState = 'time';
      addOutboardTimeLabel(Math.round(userTimezoneOffsetHours));
    }
  }

  // Setup draggable sun
  setupDraggableSun();

  // Handle window resize
  window.addEventListener('resize', adjustClockSize);
  adjustClockSize();

  // Initial update of all time displays
  updateAllTimeDisplays();
});

function createHourMarks() {
  const hourMarksContainer = document.getElementById('hour-marks');
  
  // Create 24 hour marks without numbers
  for (let i = 0; i < 24; i++) {
    const hourMark = document.createElement('div');
    hourMark.className = 'hour-mark';
    
    // Calculate rotation (15 degrees per hour, with 0/24 at the top)
    const rotation = i * 15;
    const radians = rotation * (Math.PI / 180);
    
    // Calculate position slightly beyond the circle's edge
    // Use 50% as the center point, then calculate the position beyond the edge
    const radius = 50.5; // 50.5% of the container width/height (slightly outside)
    
    // Calculate x and y position (in percentage)
    const x = 50 + radius * Math.sin(radians);
    const y = 49 - radius * Math.cos(radians); // unclear why this 49 hack needed
    
    // Position the mark
    hourMark.style.position = 'absolute';
    hourMark.style.top = `${y}%`;
    hourMark.style.left = `${x}%`;
    
    // Rotate the triangle to point toward the center (inward)
    hourMark.style.transform = `translate(-50%, 0) rotate(${rotation+180}deg)`;
    
    // Use TeeZee to calculate the hour offset from the hour position
    // For a 24-hour clock, each hour mark is 15 degrees (360/24)
    // Hour 0 (midnight UTC) is at the top, Hour 12 (noon UTC) is at the bottom
    // Hours increase clockwise
    
    // Convert hour position to degrees (for calculation, not for display)
    // Each hour is 15 degrees
    const angleDegrees = i * 15;
    
    // Calculate the hour offset using TeeZee
    // This makes sure we get the proper -12 to +12 range
    const hourOffset = TeeZee.getOffsetFromClockPosition(angleDegrees);
    
    // Store the hour offset and index as data attributes
    hourMark.dataset.hourOffset = hourOffset;
    hourMark.dataset.index = i;
    
    // Get timezone information from TeeZee for the tooltip
    const natoCode = TeeZee.getNatoCode(hourOffset);
    const placeName = TeeZee.getPlaceName(hourOffset);
    const abbr = TeeZee.getAbbreviation(hourOffset);
    
    // Format the tooltip with comprehensive information
    const timezoneName = `${abbr} - ${hourOffset >= 0 ? '+' : ''}${hourOffset} (${natoCode}) - ${placeName}`;
    hourMark.title = timezoneName;
    
    // Tri-state click cycle: off → time → time-city → off
    hourMark.addEventListener('click', function(e) {
      const hourIndex = parseInt(this.dataset.index);
      const offset = hourIndexToOffset(hourIndex);

      const states = ['off', 'time', 'time-city'];
      const current = this.dataset.displayState || 'off';
      const next = states[(states.indexOf(current) + 1) % states.length];
      this.dataset.displayState = next;

      // Tear down any existing labels for this offset before re-rendering
      document.querySelectorAll(`.tz-outboard-time[data-hour-offset="${offset}"]`).forEach(el => el.remove());
      document.querySelectorAll(`.place-name[data-hour-offset="${offset}"]`).forEach(el => el.remove());

      if (next === 'time' || next === 'time-city') {
        addOutboardTimeLabel(offset);
      }
      if (next === 'time-city') {
        addInboardCityLabel(hourIndex, offset);
      }

      e.stopPropagation();
    });
    
    hourMarksContainer.appendChild(hourMark);
  }
}

// Coordinate system conversion utilities
// These make our angle calculations more explicit and maintainable

// Convert from mouse/screen position to canonical angle
// Given mouse coordinates relative to clock center, calculate angle
// Returns angle in degrees where:
// - 0° is at the top (12 o'clock)
// - 90° is at the right (3 o'clock)
// - 180° is at the bottom (6 o'clock)
// - 270° is at the left (9 o'clock)
// - Angles increase clockwise (like a standard clock)
function pointToClockwiseDegrees(x, y) {
  // Calculate angle using Math.atan2 and add 180 degrees
  // This directly gives us the correct orientation for our clock face
  return 180 + (Math.atan2(y, x) * (180 / Math.PI));
}

// Convert canonical clock degrees to UTC hours
function clockDegreesToHours(degrees) {
  // Clock has 360 degrees, 24 hours
  // 0 degrees (top) = 00:00 midnight at Greenwich
  // 180 degrees (bottom) = 12:00 noon at Greenwich
  // 90 degrees (right) = 06:00 (6 AM) at Greenwich
  // 270 degrees (left) = 18:00 (6 PM) at Greenwich
  
  return (((degrees + 180) / 15)) % 24;
}

// Convert UTC hours to canonical clock degrees
function hoursToClockDegrees(hours) {
  // Each hour is 15 degrees
  // 00:00 midnight = 0 degrees (top)
  // 12:00 noon = 180 degrees (bottom)
  // 06:00 (6 AM) = 90 degrees (right)
  // 18:00 (6 PM) = 270 degrees (left)
  
  return ((hours * 15) + 180) % 360;
}

// Convert hours to sun position angle (in radians for cos/sin)
function hoursToSunPositionRadians(hours) {
  // Convert hours to degrees
  const degrees = hoursToClockDegrees(hours);
  // Convert to radians and adjust by 90° counterclockwise
  // (needed because the angle is from east in CSS while our
  // canonical angle is from north)
  return (degrees - 90) * (Math.PI / 180);
}

// Function to update the Zulu time display
function updateZuluTimeDisplay() {
  const zuluHours = String(currentTime.getUTCHours()).padStart(2, '0');
  const zuluMinutes = String(currentTime.getUTCMinutes()).padStart(2, '0');
  const zuluSeconds = String(currentTime.getUTCSeconds()).padStart(2, '0');
  document.getElementById('zulu-time').textContent = `${zuluHours}:${zuluMinutes}:${zuluSeconds}Z`;
}

// The local timezone label is now part of the unified .tz-outboard-time set;
// updateToggledTimezoneDisplays() handles refreshing its text. This stub is
// kept because drag/title-update sites still call it.
function updateLocalTimeDisplay() {
  updateToggledTimezoneDisplays();
}

// Function to get timezone display text
function getTimeZoneDisplay() {
  // Get URL parameter for local timezone (if any)
  const urlParams = new URLSearchParams(window.location.search);
  const overrideTimezone = urlParams.get('local');
  
  // If we have a timezone parameter, use it
  if (overrideTimezone) {
    // Parse the timezone to get the offset
    const offset = TeeZee.parseTimezone(overrideTimezone);
    
    // For one-letter NATO codes, show the letter + "Time"
    /*
    if (overrideTimezone.length === 1) {
      return `${overrideTimezone.toUpperCase()}`;
    } else if (/^[+-]\d+$/.test(overrideTimezone)) {
      // For numeric offsets, format as GMT+X
      return `GMT${overrideTimezone}`;
    }
    */
    // For other formats, use the formatted name based on the parsed offset
    return TeeZee.getAbbreviation(offset);
  }
  
  // Otherwise use system timezone
  return getTimeZoneAbbreviation();
}

// Function to update the terminator and sun position
function updateTerminatorAndSun() {
  // Get UTC hours and minutes from current time
  const utcHours = currentTime.getUTCHours();
  const utcMinutes = currentTime.getUTCMinutes();
  
  // Snap to 15-minute intervals if user is dragging
  let utcTimeForTerminator = utcHours + (utcMinutes / 60);
  if (userAdjustedTime && !isAnimatingSpringBack) {
    // Snap to quarters of an hour (0, 15, 30, 45 minutes)
    const snappedMinutes = Math.round(utcMinutes / 15) * 15;
    utcTimeForTerminator = utcHours + (snappedMinutes / 60);
  }
  
  // Convert hours to clock degrees
  const sunDegrees = hoursToClockDegrees(utcTimeForTerminator);
  const terminatorDegrees = (sunDegrees) % 360;
  
  // Update terminator rotation
  document.getElementById('terminator').style.transform = `rotate(${terminatorDegrees}deg)`;
  
  // Update sun position - but not if user is actively dragging it
  if (!isDraggingSun && !isAnimatingSpringBack) {
    updateSunPosition(terminatorDegrees);
  }
}

// Main function to update the clock display
function updateClock() {
  // First update the current time (based on fixed, adjusted, or system time)
  updateCurrentTime();
  
  // Then update all displays
  updateAllTimeDisplays();
}

// Function to position the sun based on UTC time
function updateSunPosition(terminatorAngle) {
  // Skip updating if we're currently animating spring back or dragging
  if (isAnimatingSpringBack || isDraggingSun) return;
  
  const sunElement = document.getElementById('sun-position');
  const clockElement = document.getElementById('clock');
  const radius = clockElement.offsetWidth / 2;
  
  // Convert terminator angle to UTC hours
  // Terminator angle is in clock degrees where 0° is at 12 o'clock
  const terminatorDegrees = terminatorAngle % 360; 
  
  // The sun is opposite to the terminator (180 degrees difference)
  const sunDegrees = (terminatorDegrees) % 360;
  const hours = clockDegreesToHours(sunDegrees);
  
  // Position sun based on hours
  const sunRadius = radius * sunScale;
  const radians = hoursToSunPositionRadians(hours);
  const x = Math.cos(radians) * sunRadius + radius;
  const y = Math.sin(radians) * sunRadius + radius;
  
  // Make sure the sun is visible
  sunElement.style.left = `${x}px`;
  sunElement.style.top = `${y}px`;
  sunElement.style.visibility = 'visible';
  sunElement.style.zIndex = '30';
}

function getAndShowUserLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;
      // Store the user's location globally
      userLocation = { latitude, longitude };
      
      // Calculate and store the user's timezone offset in hours
      const offsetMinutes = new Date().getTimezoneOffset();
      userTimezoneOffsetHours = -offsetMinutes / 60; // Negate because getTimezoneOffset returns minutes west of UTC
      
      // Now that we have location, show the pin and update local time position
      // updateUserLocationPin(latitude, longitude); // Not calling this as requested
      
      // Make pin visible now that we have a location
      const pinElement = document.getElementById('user-location-pin');
      if (pinElement) {
        pinElement.style.display = 'block';
      }
      
    }, error => {
      console.error('Error getting user location:', error);
      
      // Hide the pin if location access is denied
      const pinElement = document.getElementById('user-location-pin');
      if (pinElement) {
        pinElement.style.display = 'none';
      }
    });
  } else {
    console.log('Geolocation not supported');
    
    // Hide the pin if geolocation is not supported
    const pinElement = document.getElementById('user-location-pin');
    if (pinElement) {
      pinElement.style.display = 'none';
    }
  }
}

function updateUserLocationPin(latitude, longitude) {
  if (!userLocation) return; // Don't update if location isn't available
  
  const pinElement = document.getElementById('user-location-pin');
  const clockElement = document.getElementById('clock');
  const radius = clockElement.offsetWidth / 2;
  
  // Convert geographic coordinates to position on the clock face
  // For a north-pole view:
  // - Latitude determines distance from center (90° at center, 0° at edge)
  // - Longitude determines the angle (0° at top, increasing clockwise)
  
  // Calculate distance from center (latitude)
  // Map latitude from 90 (center) to 0 (edge)
  const distanceFromCenter = (90 - latitude) / 90;
  
  // Calculate angle based on longitude
  // Map longitude from -180 to 180 to a clockwise angle
  // With 0° longitude at the top
  // Remember the map is rotated 135 degrees counterclockwise
  let angle = (longitude + 180 - mapOffsetToGreenwichDegrees) % 360;
  
  // Convert to radians
  const radians = angle * (Math.PI / 180);
  
  // Calculate position
  const x = Math.cos(radians) * (radius * distanceFromCenter) + radius;
  const y = Math.sin(radians) * (radius * distanceFromCenter) + radius;
  
  pinElement.style.left = `${x}px`;
  pinElement.style.top = `${y}px`;
}

function getTimeZoneAbbreviation() {
  const options = { timeZoneName: 'short' };
  const timeZoneString = new Intl.DateTimeFormat('en-US', options).format(new Date());
  
  // Extract the abbreviation from the formatted string
  const timeZoneAbbr = timeZoneString.split(' ').pop();
  
  // If we got GMT+X or GMT-X format, convert to NATO code if possible
  if (timeZoneAbbr.startsWith('GMT+') || timeZoneAbbr.startsWith('GMT-')) {
    // Extract the offset hours
    const offsetMatch = timeZoneAbbr.match(/GMT([+-])(\d+)/);
    if (offsetMatch) {
      const sign = offsetMatch[1];
      const hours = parseInt(offsetMatch[2]);
      const offset = sign === '-' ? -hours : hours;
      
      // Get the NATO code using TeeZee
      const natoCode = TeeZee.getNatoCode(offset);
      if (natoCode) {
        return natoCode;
      }
    }
  }
  
  return timeZoneAbbr;
}

function setupDraggableSun() {
  const sunElement = document.getElementById('sun-position');
  const clockElement = document.getElementById('clock');
  
  let isDragging = false;
  let startAngle;
  let currentRealTime;
  
  // Mouse/Touch down event
  sunElement.addEventListener('mousedown', startDrag);
  sunElement.addEventListener('touchstart', startDrag);
  
  // Mouse/Touch move events
  document.addEventListener('mousemove', drag);
  document.addEventListener('touchmove', drag);
  
  // Mouse/Touch up events
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);
  
function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    
    // Store the starting state - needed for calculations during drag
    // userAdjustedTime is a copy of currentTime when drag starts
    userAdjustedTime = new Date(currentTime);
    
    const clockRect = clockElement.getBoundingClientRect();
    const clockCenterX = clockRect.left + clockRect.width / 2;
    const clockCenterY = clockRect.top + clockRect.height / 2;
    
    // Get current position
    const x = e.clientX || e.touches[0].clientX;
    const y = e.clientY || e.touches[0].clientY;
    
    // Calculate starting angle
    startAngle = Math.atan2(y - clockCenterY, x - clockCenterX) * (180 / Math.PI);
    
    // Add "dragging" class to the sun
    sunElement.classList.add('dragging');
}
  
function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    const clockRect = clockElement.getBoundingClientRect();
    const clockRadius = clockRect.width / 2;
    const clockCenterX = clockRect.left + clockRect.width / 2;
    const clockCenterY = clockRect.top + clockRect.height / 2;
    
    // Get current position
    const x = e.clientX || e.touches[0].clientX;
    const y = e.clientY || e.touches[0].clientY;
    
    // Calculate new angle
    let angle = 180 + (Math.atan2(y - clockCenterY, x - clockCenterX) * (180 / Math.PI));
    
    // Convert angle to hours
    // Angle increases clockwise from right (3 o'clock position)
    // Convert to hours format where 0 is at top (12 o'clock position)
    let hours = ((angle + 90) / 15) % 24;
    if (hours < 0) hours += 24;
    
    // Snap to 15-minute intervals (0, 15, 30, 45 minutes)
    const hoursPart = Math.floor(hours);
    let minutesPart = Math.round((hours - hoursPart) * 4) / 4; // Snap to quarters
    if (minutesPart === 1) {
      minutesPart = 0;
      hours = (hoursPart + 1) % 24; // Ensure we wrap around at 24
    } else {
      hours = hoursPart + minutesPart;
    }
    
    // Start with base time (either fixed or current)
    const baseTime = new Date(userAdjustedTime);
    
    // Set the new UTC time based on the dragged position
    userAdjustedTime.setUTCHours(hours);
    userAdjustedTime.setUTCMinutes(minutesPart * 60);
    userAdjustedTime.setUTCSeconds(0);
    
    // Update the display
    updateCurrentTime();
    updateAllTimeDisplays();
  }
  
  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    
    // Remove dragging class
    sunElement.classList.remove('dragging');
    
    if (useFixedTime) {
      // In fixed time mode, update the URL with new as-of parameter
      let formattedTime;
      
      // Check if we're using a non-UTC timezone from the 'local' parameter
      const urlParams = new URLSearchParams(window.location.search);
      const localParam = urlParams.get('local');
      let useNatoCode = false;
      let natoCode = '';
      
      if (localParam && localParam.length === 1 && /^[A-IK-Z]$/i.test(localParam)) {
        // Using a NATO one-letter code
        natoCode = localParam.toUpperCase();
        useNatoCode = true;
      }
      
      if (useNatoCode && natoCode) {
        // Format with NATO code
        const year = userAdjustedTime.getUTCFullYear();
        const month = String(userAdjustedTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(userAdjustedTime.getUTCDate()).padStart(2, '0');
        const hours = String(userAdjustedTime.getUTCHours()).padStart(2, '0');
        const minutes = String(userAdjustedTime.getUTCMinutes()).padStart(2, '0');
        const seconds = String(userAdjustedTime.getUTCSeconds()).padStart(2, '0');
        
        // Format as YYYY-MM-DDThh:mm:ss with NATO code
        formattedTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${natoCode}`;
      } else {
        // Format with UTC (Z)
        const year = userAdjustedTime.getUTCFullYear();
        const month = String(userAdjustedTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(userAdjustedTime.getUTCDate()).padStart(2, '0');
        const hours = String(userAdjustedTime.getUTCHours()).padStart(2, '0');
        const minutes = String(userAdjustedTime.getUTCMinutes()).padStart(2, '0');
        const seconds = String(userAdjustedTime.getUTCSeconds()).padStart(2, '0');
        
        // Format as YYYY-MM-DDThh:mm:ssZ
        formattedTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
      }
      
      // Create URL manually to avoid encoding colons
      urlParams.delete('as-of'); // Remove existing as-of parameter
      
      let newUrl = window.location.pathname;
      if (urlParams.toString()) {
        newUrl += '?' + urlParams.toString() + '&as-of=' + formattedTime;
      } else {
        newUrl += '?as-of=' + formattedTime;
      }
      
      window.history.pushState({ path: newUrl }, '', newUrl);
      
      // Update the fixed time
      fixedTime = new Date(userAdjustedTime);
      
      // Continue using the adjusted time (no spring back)
      isAnimatingSpringBack = false;
    } else {
      // In normal mode, create spring-back animation
      isAnimatingSpringBack = true;
      
      // Get current position and real time position
      const adjustedTerminatorAngle = (userAdjustedTime.getUTCHours() + (userAdjustedTime.getUTCMinutes() / 60)) * 15 + 180;
      const realTerminatorAngle = (systemTime.getUTCHours() + (systemTime.getUTCMinutes() / 60)) * 15 + 180;
      
      // Calculate difference
      let angleDiff = (realTerminatorAngle - adjustedTerminatorAngle);
      // Ensure we go the shortest distance (handling the day boundary)
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;
      
      // Animation variables
      const startTime = Date.now();
      const duration = 800; // milliseconds
      const startAngle = adjustedTerminatorAngle;
      
      // Spring animation effect using elastic easing
      function elasticOut(t) {
        return Math.sin(-13 * Math.PI/2 * (t + 1)) * Math.pow(2, -10 * t) + 1;
      }
      
      function animateSpringBack() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
          // Calculate current angle using elastic easing
          const currentAngle = startAngle + (angleDiff * elasticOut(progress));
          
          // Update position
          const clockElement = document.getElementById('clock');
          const radius = clockElement.offsetWidth / 2;
          const sunElement = document.getElementById('sun-position');
          
          const sunAngle = (currentAngle - 90) * (Math.PI / 180);
          const sunRadius = radius * sunScale;
          const x = Math.cos(sunAngle) * sunRadius + radius;
          const y = Math.sin(sunAngle) * sunRadius + radius;
          
          sunElement.style.left = `${x}px`;
          sunElement.style.top = `${y}px`;
          
          // Also rotate the terminator
          document.getElementById('terminator').style.transform = `rotate(${currentAngle}deg)`;
          
          // Continue animation
          springBackAnimation = requestAnimationFrame(animateSpringBack);
        } else {
          // Animation complete
          springBackAnimation = null;
          isAnimatingSpringBack = false;
          userAdjustedTime = null;
          
          // Update the time to system time
          updateCurrentTime();
          updateAllTimeDisplays();
        }
      }
      
      // Start the spring back animation
      if (springBackAnimation) {
        cancelAnimationFrame(springBackAnimation);
      }
      springBackAnimation = requestAnimationFrame(animateSpringBack);
    }
  }
}

// Drag state for the .tz-local label.
let isDraggingLocal = false;
let dragStartHourIndex = null;

// Wire global mouse/touch listeners once. The mousedown listener is attached
// per-element by attachLocalDragMousedown(), which is called every time a
// .tz-local element is created.
function setupGlobalLocalDragHandlers() {
  document.addEventListener('mousemove', dragLocal);
  document.addEventListener('touchmove', dragLocal);
  document.addEventListener('mouseup', endDragLocal);
  document.addEventListener('touchend', endDragLocal);
}

function attachLocalDragMousedown(el) {
  el.addEventListener('mousedown', startDragLocal);
  el.addEventListener('touchstart', startDragLocal);
}

function startDragLocal(e) {
  e.preventDefault();
  const el = document.querySelector('.tz-local');
  if (!el) return;
  isDraggingLocal = true;
  dragStartHourIndex = offsetToHourIndex(parseFloat(el.dataset.hourOffset));
  el.classList.add('dragging');
}

function dragLocal(e) {
  if (!isDraggingLocal) return;
  e.preventDefault();

  const clockElement = document.getElementById('clock');
  const clockRect = clockElement.getBoundingClientRect();
  const cx = clockRect.left + clockRect.width / 2;
  const cy = clockRect.top + clockRect.height / 2;
  const x = e.clientX !== undefined ? e.clientX : e.touches[0].clientX;
  const y = e.clientY !== undefined ? e.clientY : e.touches[0].clientY;

  let angleDegrees = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
  if (angleDegrees < 0) angleDegrees += 360;

  const newOffset = Math.round(TeeZee.getOffsetFromClockPosition(angleDegrees));
  if (newOffset !== userTimezoneOffsetHours) {
    userTimezoneOffsetHours = newOffset;

    // Move the .tz-local element to the new angle. We don't tear down/rebuild
    // mid-drag — that would unbind the in-flight mousedown.
    const el = document.querySelector('.tz-local');
    if (el) {
      const radius = clockElement.offsetWidth / 2;
      const a = TeeZee.getClockPositionAngle(newOffset) * (Math.PI / 180);
      el.style.left = `${Math.cos(a) * (radius * 1.3) + radius}px`;
      el.style.top = `${Math.sin(a) * (radius * 1.3) + radius}px`;
      el.dataset.hourOffset = newOffset;
    }

    // If the new position already had a non-local toggled label, drop it
    // so we don't end up with duplicates.
    document.querySelectorAll(
      `.tz-outboard-time[data-hour-offset="${newOffset}"]:not(.tz-local)`
    ).forEach(other => other.remove());
  }

  updateToggledTimezoneDisplays();
  updateTimezoneIndicatorOnly(userTimezoneOffsetHours);
}

function endDragLocal() {
  if (!isDraggingLocal) return;
  isDraggingLocal = false;

  const el = document.querySelector('.tz-local');
  if (el) el.classList.remove('dragging');

  // Reconcile hour-mark displayState. Old mark is reset to 'off' (we don't
  // remember a prior user-toggled state; that's a known limitation).
  const newHourIndex = offsetToHourIndex(userTimezoneOffsetHours);
  if (dragStartHourIndex !== null && dragStartHourIndex !== newHourIndex) {
    const marks = document.querySelectorAll('.hour-mark');
    if (marks[dragStartHourIndex]) marks[dragStartHourIndex].dataset.displayState = 'off';
    if (marks[newHourIndex]) marks[newHourIndex].dataset.displayState = 'time';
  }
  dragStartHourIndex = null;

  updateTimezoneQueryString(userTimezoneOffsetHours);
  updateTimezoneIndicatorOnly(userTimezoneOffsetHours);
}

// Update the page title and the timezone indicator banner without touching
// the URL or the label position.
function updateTimezoneIndicatorOnly(offsetHours) {
  const abbr = TeeZee.getAbbreviation(offsetHours);
  const natoCode = TeeZee.getNatoCode(offsetHours);
  const displayTimezone = abbr ? `${abbr} (${natoCode} NATO)` : `GMT`;
  document.title = `GoZulu - ${displayTimezone}`;
  const indicator = document.querySelector('.timezone-indicator');
  if (indicator) indicator.textContent = `Using ${displayTimezone}`;
  updateToggledTimezoneDisplays();
}

function updateTimezoneQueryString(offsetHours) {
  // Get the current URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // Format the offset for the URL
  const formattedOffset = formatTimezoneOffset(offsetHours);
  
  // Update or add the local parameter
  urlParams.set('local', formattedOffset);
  
  // Create new URL and update browser history
  const newURL = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.pushState({ path: newURL }, '', newURL);
  
  // Update page title and timezone indicator
  updateTimezoneIndicator(formattedOffset);
}

// Helper function to format timezone offset as NATO code or +/- format
function formatTimezoneOffset(offsetHours) {
  // Use TeeZee to format the offset
  return TeeZee.formatOffset(offsetHours);
}

function updateTimezoneIndicator(timezone) {
  let displayTimezone = timezone;
  
  // If it's a NATO code or numeric offset, format it properly for display
  if (timezone.length === 1) {
    // It's a NATO code, get additional info from TeeZee
    const offset = TeeZee.parseTimezone(timezone);
    const place = TeeZee.getPlaceName(offset);
    const abbr = TeeZee.getAbbreviation(offset);
    
    if (abbr && abbr !== 'GMT') {
      displayTimezone = `${abbr} (${timezone})`;
    } else {
      displayTimezone = `${timezone} Time (${place})`;
    }
  } else if (timezone.startsWith('+') || timezone.startsWith('-') || timezone === '0') {
    // It's a numeric offset
    const offset = parseInt(timezone);
    const abbr = TeeZee.getAbbreviation(offset);
    const natoCode = TeeZee.getNatoCode(offset);
    
    if (abbr && abbr !== 'GMT') {
      displayTimezone = `${abbr} (${natoCode})`;
    } else {
      displayTimezone = `GMT${offset === 0 ? '' : timezone} (${natoCode})`;
    }
  }
  
  // Update page title
  document.title = `GoZulu - ${displayTimezone}`;
  
  // Update timezone indicator if it exists
  const indicator = document.querySelector('.timezone-indicator');
  if (indicator) {
    indicator.textContent = `Using ${displayTimezone}`;
  }
}

function adjustClockSize() {
  const container = document.querySelector('.container');
  const clockElement = document.getElementById('clock');
  
  // Get the container size (already set to minimum 500px in CSS)
  const containerSize = Math.max(
    500,
    Math.min(
      window.innerHeight - 40, 
      window.innerWidth - 40,
      Math.min(window.innerHeight, window.innerWidth) * 0.9
    )
  );
  
  // For very small screens, we rely on CSS media queries
  if (window.innerWidth > 550) {
    container.style.width = `${containerSize}px`;
    container.style.height = `${containerSize}px`;
  }
  
  // Update positioning of elements
  if (userLocation) {
    // Do not call updateUserLocationPin as requested
    // updateUserLocationPin(userLocation.latitude, userLocation.longitude);
  }
  
  // Reposition all outboard time labels (.tz-local + toggled). The local
  // label uses the precise (possibly fractional) userTimezoneOffsetHours.
  document.querySelectorAll('.tz-outboard-time[data-hour-offset]').forEach(el => {
    const isLocal = el.classList.contains('tz-local');
    const offset = isLocal && userTimezoneOffsetHours !== null
      ? userTimezoneOffsetHours
      : parseFloat(el.dataset.hourOffset);
    const radius = clockElement.offsetWidth / 2;
    const angleDegrees = TeeZee.getClockPositionAngle(offset);
    const radians = angleDegrees * (Math.PI / 180);
    el.style.left = `${Math.cos(radians) * (radius * 1.3) + radius}px`;
    el.style.top = `${Math.sin(radians) * (radius * 1.3) + radius}px`;
  });

  updateClock();
}

// Add this function to the app.js file
async function updateVersionDisplay() {
  try {
    // Fetch the manifest.json file
    const response = await fetch('manifest.json');
    if (!response.ok) {
      console.error('Failed to fetch manifest.json:', response.statusText);
      return;
    }
    
    const manifestData = await response.json();
    
    // Get the version element
    const versionElement = document.getElementById('version-display');
    
    // Update the version display if we have version info
    if (manifestData && manifestData.version) {
      versionElement.textContent = `v${manifestData.version}`;
    }
  } catch (error) {
    console.error('Error fetching version from manifest:', error);
  }
}

// Add this to the DOMContentLoaded event listener in app.js
document.addEventListener('DOMContentLoaded', () => {
  // Update version display
  updateVersionDisplay();
});
