document.addEventListener('DOMContentLoaded', () => {
  // Create hour marks for 24-hour clock
  createHourMarks();
  
  // Initialize the clock
  updateClock();
  
  // Update every second
  setInterval(updateClock, 1000);
  
  // Get user's location (if permitted)
  getUserLocation();
  
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
    hourMark.style.transform = `rotate(${rotation}deg) translateX(-50%)`;
    hourMark.style.transformOrigin = '50% 50%';
    
    // Position at the edge of the clock
    hourMark.style.top = '0';
    hourMark.style.height = '10px';
    
    hourMarksContainer.appendChild(hourMark);
  }
}

// Store the real time and user-adjusted time separately
let userAdjustedTime = null;
let springBackAnimation = null;
let isAnimatingSpringBack = false;

function updateClock() {
  const now = new Date();
  
  // Determine which time to use - real time or user-adjusted time
  const displayTime = userAdjustedTime || now;
  
  // Update Zulu (GMT/UTC) time display
  const zuluHours = String(displayTime.getUTCHours()).padStart(2, '0');
  const zuluMinutes = String(displayTime.getUTCMinutes()).padStart(2, '0');
  const zuluSeconds = String(displayTime.getUTCSeconds()).padStart(2, '0');
  document.getElementById('zulu-time').textContent = `${zuluHours}:${zuluMinutes}:${zuluSeconds}Z`;
  
  // Update local time display
  // First get the offset between local time and UTC
  const userTimezoneOffset = new Date().getTimezoneOffset(); // in minutes
  
  // Create a new date that's adjusted for both UTC and the user's selected time (if any)
  let localDisplayTime;
  if (userAdjustedTime) {
    // When user has dragged the sun, adjust the local time accordingly
    localDisplayTime = new Date(userAdjustedTime);
    localDisplayTime.setMinutes(localDisplayTime.getMinutes() - userTimezoneOffset);
  } else {
    localDisplayTime = new Date();
  }
  
  const localHours = String(localDisplayTime.getHours()).padStart(2, '0');
  const localMinutes = String(localDisplayTime.getMinutes()).padStart(2, '0');
  const timeZoneAbbr = getTimeZoneAbbreviation();
  
  // Get or create the local time element
  let localTimeElement = document.getElementById('local-time');
  if (!localTimeElement) {
    localTimeElement = document.createElement('div');
    localTimeElement.id = 'local-time';
    localTimeElement.className = 'time-display';
    document.getElementById('clock').appendChild(localTimeElement);
  }
  
  localTimeElement.textContent = `${localHours}:${localMinutes} ${timeZoneAbbr}`;
  
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
  
  const terminatorAngle = (utcTimeForTerminator * 15) + 180; // +180 to align with the correct sun position
  
  document.getElementById('terminator').style.transform = `rotate(${terminatorAngle}deg)`;
  
  // Update sun position
  if (!isAnimatingSpringBack) {
    updateSunPosition(terminatorAngle);
  }
}

function updateSunPosition(terminatorAngle) {
  // Skip updating if we're currently animating spring back
  if (isAnimatingSpringBack) return;
  
  const sunElement = document.getElementById('sun-position');
  const clockElement = document.getElementById('clock');
  const radius = clockElement.offsetWidth / 2;
  
  // Place sun at the edge of the clock face
  // The sun should be on the opposite side from the dark part of the terminator
  // Adjust by 90 degrees to position correctly relative to terminator
  const sunAngle = (terminatorAngle - 90) * (Math.PI / 180); // Convert to radians and adjust
  
  // Calculate position using trigonometry 
  // Position the sun just at the edge of the Earth image
  const sunRadius = radius * 0.95; // Position at 95% of radius to ensure visibility
  const x = Math.cos(sunAngle) * sunRadius + radius;
  const y = Math.sin(sunAngle) * sunRadius + radius;
  
  // Store the current position in a data attribute for the drag functionality
  sunElement.dataset.angle = terminatorAngle - 90;
  
  // Make sure the sun is visible by setting explicit z-index and visibility
  sunElement.style.left = `${x}px`;
  sunElement.style.top = `${y}px`;
  sunElement.style.visibility = 'visible';
  sunElement.style.zIndex = '30'; // Ensure it's on top of everything
}

function getUserLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;
      updateUserLocationPin(latitude, longitude);
    }, error => {
      console.error('Error getting user location:', error);
      // Set a default position if location access is denied
      updateUserLocationPin(0, 0); // Default to center (equator at Greenwich)
    });
  } else {
    console.log('Geolocation not supported');
    updateUserLocationPin(0, 0); // Default to center
  }
}

function updateUserLocationPin(latitude, longitude) {
  const pinElement = document.getElementById('user-location-pin');
  const localTimeElement = document.getElementById('local-time');
  const clockElement = document.getElementById('clock');
  const radius = clockElement.offsetWidth / 2;
  
  // Convert geographic coordinates to position on the clock face
  // For a north-pole view:
  // - Latitude determines distance from center (90° at center, 0° at edge)
  // - Longitude determines the angle (0° at top, increasing clockwise)
  
  // Calculate distance from center (latitude)
  // Map latitude from 90 (center) to 0 (edge)
  const distanceFromCenter = (90 - latitude) / 90;
  
  // Account for the map rotation of -135 degrees
  // So 0° longitude is at the top (Greenwich)
  // This means we need to adjust our angle calculation
  
  // Calculate angle (longitude)
  // Map longitude from -180 to 180 to 0 to 360
  let angle = longitude + 180;
  angle = (angle + 270) % 360; // Adjust so 0° longitude is at the top
  angle = angle * (Math.PI / 180); // Convert to radians
  
  // Calculate position for pin
  const x = Math.cos(angle) * (radius * distanceFromCenter) + radius;
  const y = Math.sin(angle) * (radius * distanceFromCenter) + radius;
  
  pinElement.style.left = `${x}px`;
  pinElement.style.top = `${y}px`;
  
  // Position local time display radially outside the clock face
  if (localTimeElement) {
    // Calculate position for local time text - further out from the center
    const textDistanceFactor = 1.3; // Position 30% outside the clock radius
    const textX = Math.cos(angle) * (radius * textDistanceFactor) + radius;
    const textY = Math.sin(angle) * (radius * textDistanceFactor) + radius;
    
    localTimeElement.style.left = `${textX}px`;
    localTimeElement.style.top = `${textY}px`;
  }
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
    let angle = Math.atan2(y - clockCenterY, x - clockCenterX) * (180 / Math.PI);
    
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
      hours = hoursPart + 1;
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
        const sunRadius = radius * 0.95;
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
  
  // Get available space (accounting for the time displays)
  const availableHeight = window.innerHeight - 150; // Subtract space for time displays
  const availableWidth = window.innerWidth - 40; // Account for padding
  
  // Determine the maximum size that fits the available space
  const maxSize = Math.min(availableHeight, availableWidth, 600); // Cap at 600px
  
  // Apply the new size
  clockElement.style.width = `${maxSize}px`;
  clockElement.style.height = `${maxSize}px`;
  
  // Ensure our clock's positioning context is correct
  clockElement.style.position = 'relative';
  
  // Update sun and pin positions after resize
  // We need to update the getUserLocation to reflect the new size
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      updateUserLocationPin(position.coords.latitude, position.coords.longitude);
    }, error => {
      updateUserLocationPin(0, 0); // Default to center on error
    });
  }
  
  updateClock();
}