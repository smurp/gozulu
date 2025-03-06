let sunScale = 0.91;
let mapOffsetToGreenwichDegrees = 135;
function positionLocalTimeByTimezone() {
  const localTimeElement = document.getElementById('local-time');
  if (!localTimeElement || userTimezoneOffsetHours === null) return;
  
  const clockElement = document.getElementById('clock');
  const radius = clockElement.offsetWidth / 2;
  
  // Position local time based on timezone offset
  // Convert the offset hours to degrees (each hour is 15 degrees)
  // 0 (GMT) is at top (0 degrees), positive offsets go clockwise
  let angleDegrees = -userTimezoneOffsetHours * 15; // Negative because hours increase clockwise
  
  // Ensure the angle is between 0 and 360
  angleDegrees = (angleDegrees + 270) % 360;
  
  // Convert to radians
  const radians = angleDegrees * (Math.PI / 180);
  
  // Position local time outside the clock face
  const textDistanceFactor = 1.3; // Position 30% outside the clock radius
  const textX = Math.cos(radians) * (radius * textDistanceFactor) + radius;
  const textY = Math.sin(radians) * (radius * textDistanceFactor) + radius;
  
  localTimeElement.style.left = `${textX}px`;
  localTimeElement.style.top = `${textY}px`;
}

// Store the real time and user-adjusted time separately
let userAdjustedTime = null;
let springBackAnimation = null;
let isAnimatingSpringBack = false;
let isDraggingSun = false;

// Global variables to track user's location and timezone
let userLocation = null;
let userTimezoneOffsetHours = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check for URL parameter override for timezone immediately
  const urlParams = new URLSearchParams(window.location.search);
  let overrideTimezone = urlParams.get('local');
  
  if (overrideTimezone) {
    // Update the page title to reflect the custom timezone
    document.title = `GoZulu - ${overrideTimezone} Time`;
    
    // Optional: Add a visual indicator that we're using a custom timezone
    const container = document.querySelector('.container');
    const timezoneIndicator = document.createElement('div');
    timezoneIndicator.className = 'timezone-indicator';
    timezoneIndicator.textContent = `Using ${overrideTimezone} timezone`;
    timezoneIndicator.style.position = 'absolute';
    timezoneIndicator.style.top = '5px';
    timezoneIndicator.style.right = '10px';
    timezoneIndicator.style.fontSize = '12px';
    timezoneIndicator.style.color = '#90EE90';
    container.appendChild(timezoneIndicator);
  }
  
  // Create hour marks for 24-hour clock
  createHourMarks();
  
  // Initialize the clock
  updateClock();
  
  // Update every second
  setInterval(updateClock, 1000);

  // Still position local time based on timezone
  userTimezoneOffsetHours = -new Date().getTimezoneOffset() / 60;
  positionLocalTimeByTimezone();
  
  // Get user's location (if permitted)
  //getAndShowUserLocation();
  
  // Setup draggable sun
  setupDraggableSun();
  
  // Handle window resize
  window.addEventListener('resize', adjustClockSize);
  adjustClockSize();
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

function updateClock() {
  const now = new Date();
  
  // Check for URL parameter override for timezone
  const urlParams = new URLSearchParams(window.location.search);
  let overrideTimezone = urlParams.get('local');
  let customTimezoneOffset = null;
  
  // Handle different formats of timezone parameter
  if (overrideTimezone) {
    // Check if it's a number like +8 or -8
    if (/^[+-]\d+$/.test(overrideTimezone)) {
      // Convert to hours
      customTimezoneOffset = -parseInt(overrideTimezone) * 60; // Negative because getTimezoneOffset returns opposite sign
      overrideTimezone = `GMT${overrideTimezone.startsWith('+') ? overrideTimezone : overrideTimezone}`;
    } else {
      // Try to handle named timezones - this is a simplification
      const timezoneMap = {
        'PST': -8*60, 'PDT': -7*60, 'MST': -7*60, 'MDT': -6*60,
        'CST': -6*60, 'CDT': -5*60, 'EST': -5*60, 'EDT': -4*60,
        'UTC': 0, 'GMT': 0, 'BST': 1*60, 'CET': 1*60,
        'CEST': 2*60, 'EET': 2*60, 'EEST': 3*60, 'MSK': 3*60,
        'IST': 5.5*60, 'CST_ASIA': 8*60, 'JST': 9*60, 'AEST': 10*60,
        'NZST': 12*60
      };
      
      // Handle CST ambiguity (could be Central US or China)
      if (overrideTimezone === 'CST_ASIA') {
        overrideTimezone = 'CST';
      }
      
      if (timezoneMap[overrideTimezone] !== undefined) {
        customTimezoneOffset = -timezoneMap[overrideTimezone]; // Negative because getTimezoneOffset returns opposite sign
      }
    }
    
    // Update userTimezoneOffsetHours if we have a custom timezone
    if (customTimezoneOffset !== null) {
      userTimezoneOffsetHours = -customTimezoneOffset / 60;
    }
  }
  
  // Determine which time to use - real time or user-adjusted time
  const displayTime = userAdjustedTime || now;
  
  // Update Zulu (GMT/UTC) time display
  const zuluHours = String(displayTime.getUTCHours()).padStart(2, '0');
  const zuluMinutes = String(displayTime.getUTCMinutes()).padStart(2, '0');
  const zuluSeconds = String(displayTime.getUTCSeconds()).padStart(2, '0');
  document.getElementById('zulu-time').textContent = `${zuluHours}:${zuluMinutes}:${zuluSeconds}Z`;
  
  // Update local time display based on user's timezone or override
  const userTimezoneOffset = customTimezoneOffset !== null ? customTimezoneOffset : now.getTimezoneOffset();
  
  // Create a new date for local time display
  let localDisplayTime;
  if (userAdjustedTime) {
    // When user has dragged the sun, we need to calculate what the local time would be
    // based on their timezone offset and the adjusted UTC time
    localDisplayTime = new Date(userAdjustedTime.getTime());
    // The getTimezoneOffset returns minutes WEST of UTC, so we need to add (not subtract)
    // For GMT+8, the offset would be -480 minutes (8 hours west of UTC)
    localDisplayTime.setMinutes(localDisplayTime.getMinutes() + userTimezoneOffset);
    
    // Now manually add the timezone offset since the user is in GMT+8
    // The direct timezone adjustment in minutes (for GMT+8, that's +480 minutes)
    const timezoneOffsetHours = Math.abs(Math.floor(userTimezoneOffset / 60));
    
    if (userTimezoneOffset < 0) {
      // For locations east of GMT (positive offset like GMT+8)
      localDisplayTime.setHours(localDisplayTime.getHours() + timezoneOffsetHours);
    } else {
      // For locations west of GMT (negative offset like GMT-5)
      localDisplayTime.setHours(localDisplayTime.getHours() - timezoneOffsetHours);
    }
  } else {
    // For real time, we can just use the current local time
    localDisplayTime = new Date();
    
    // If we have a custom timezone, adjust the time
    if (customTimezoneOffset !== null) {
      const localOffsetMinutes = now.getTimezoneOffset();
      const offsetDifference = localOffsetMinutes - customTimezoneOffset;
      localDisplayTime = new Date(localDisplayTime.getTime() + offsetDifference * 60000);
    }
  }
  
  const localHours = String(localDisplayTime.getHours()); //.padStart(2, '0');
  const localMinutes = String(localDisplayTime.getMinutes()).padStart(2, '0');
  const localSeconds = String(localDisplayTime.getSeconds()).padStart(2, '0');
  
  // Get timezone abbreviation - either from override or system
  const timeZoneAbbr = overrideTimezone || getTimeZoneAbbreviation();
  
  // Get or create the local time element
  let localTimeElement = document.getElementById('local-time');
  if (!localTimeElement) {
    localTimeElement = document.createElement('div');
    localTimeElement.id = 'local-time';
    localTimeElement.className = 'time-display';
    document.getElementById('clock').appendChild(localTimeElement);
  }
  
  // Update with seconds
  localTimeElement.textContent = `${localHours}:${localMinutes} ${timeZoneAbbr}`;
  
  // Update local time position if we have a timezone offset
  if (userTimezoneOffsetHours !== null) {
    positionLocalTimeByTimezone();
  }
  
  // Update terminator rotation based on the display time
  const utcHours = displayTime.getUTCHours();
  const utcMinutes = displayTime.getUTCMinutes();
  
  // Snap to 15-minute intervals if user is dragging
  let utcTimeForTerminator = utcHours + (utcMinutes / 60);
  if (userAdjustedTime && !isAnimatingSpringBack) {
    // Snap to quarters of an hour (0, 15, 30, 45 minutes)
    const snappedMinutes = Math.round(utcMinutes / 15) * 15;
    utcTimeForTerminator = utcHours + (snappedMinutes / 60);
  }
  
  // Convert hours to clock degrees
  const sunDegrees = hoursToClockDegrees(utcTimeForTerminator);
  const terminatorDegrees = (sunDegrees) % 360; // Add 180° because terminator is opposite the sun
  
  document.getElementById('terminator').style.transform = `rotate(${terminatorDegrees}deg)`;
  
  // Update sun position - but not if user is actively dragging it
  if (!isDraggingSun && !isAnimatingSpringBack) {
    updateSunPosition(terminatorDegrees);
  }
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
    
    // Store the current real time before user adjustment
    currentRealTime = new Date();
    
    // Get current real time UTC
    const utcHours = currentRealTime.getUTCHours();
    const utcMinutes = currentRealTime.getUTCMinutes();
    const utcTime = utcHours + (utcMinutes / 60);
    
    // Initialize userAdjustedTime to the current time to prevent jumping
    userAdjustedTime = new Date(currentRealTime);
    
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
    
    // Create a new adjusted time
    const adjustedTime = new Date(currentRealTime);
    adjustedTime.setUTCHours(hours);
    adjustedTime.setUTCMinutes(minutesPart * 60);
    adjustedTime.setUTCSeconds(0);
    
    // Update global adjusted time
    userAdjustedTime = adjustedTime;
    
    // Update clock
    updateClock();
  }
  
  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    
    // Remove dragging class
    sunElement.classList.remove('dragging');
    
    // Create spring-back animation
    isAnimatingSpringBack = true;
    
    // Get current position and real time position
    const adjustedTerminatorAngle = (userAdjustedTime.getUTCHours() + (userAdjustedTime.getUTCMinutes() / 60)) * 15 + 180;
    const realTerminatorAngle = (new Date().getUTCHours() + (new Date().getUTCMinutes() / 60)) * 15 + 180;
    
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
        
        // Update clock with real time
        updateClock();
      }
    }
    
    // Start animation
    if (springBackAnimation) {
      cancelAnimationFrame(springBackAnimation);
    }
    springBackAnimation = requestAnimationFrame(animateSpringBack);
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
  
  if (userTimezoneOffsetHours !== null) {
    positionLocalTimeByTimezone();
  }
  
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
  // Existing code...
  
  // Update version display
  updateVersionDisplay();
});
