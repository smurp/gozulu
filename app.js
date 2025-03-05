document.addEventListener('DOMContentLoaded', () => {
  // Create hour marks for 24-hour clock
  createHourMarks();
  
  // Initialize the clock
  updateClock();
  
  // Update every second
  setInterval(updateClock, 1000);
  
  // Get user's location (if permitted)
  getUserLocation();
  
  // Handle window resize
  window.addEventListener('resize', adjustClockSize);
  adjustClockSize();
});

function createHourMarks() {
  const hourMarksContainer = document.getElementById('hour-marks');
  
  // Create 24 hour marks
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
    
    // Add hour numbers for every 3 hours
    if (i % 3 === 0 || i === 0) {
      const hourNumber = document.createElement('div');
      hourNumber.className = 'hour-number';
      hourNumber.textContent = i === 0 ? '24' : i;
      hourNumber.style.position = 'absolute';
      hourNumber.style.color = 'white';
      hourNumber.style.fontSize = '12px';
      
      // Position the number outside the hour mark
      const numberDistance = 15; // Distance from the edge of the clock
      const angle = rotation * (Math.PI / 180);
      const clockRadius = 150; // Half of the clock's width/height
      
      // Calculate position using trigonometry
      const x = Math.sin(angle) * (clockRadius - numberDistance);
      const y = -Math.cos(angle) * (clockRadius - numberDistance);
      
      hourNumber.style.top = `calc(50% + ${y}px)`;
      hourNumber.style.left = `calc(50% + ${x}px)`;
      hourNumber.style.transform = 'translate(-50%, -50%)';
      
      hourMarksContainer.appendChild(hourNumber);
    }
  }
}

function updateClock() {
  const now = new Date();
  
  // Update Zulu (GMT/UTC) time display
  const zuluHours = String(now.getUTCHours()).padStart(2, '0');
  const zuluMinutes = String(now.getUTCMinutes()).padStart(2, '0');
  const zuluSeconds = String(now.getUTCSeconds()).padStart(2, '0');
  document.getElementById('zulu-time').textContent = `${zuluHours}:${zuluMinutes}:${zuluSeconds}Z`;
  
  // Update local time display
  const localHours = String(now.getHours()).padStart(2, '0');
  const localMinutes = String(now.getMinutes()).padStart(2, '0');
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
  
  // Update terminator rotation
  // The terminator rotates once every 24 hours (15 degrees per hour)
  // We compute the angle based on UTC hours and minutes
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcTime = utcHours + (utcMinutes / 60);
  const terminatorAngle = (utcTime * 15) + 180; // +180 to align with the correct sun position
  
  document.getElementById('terminator').style.transform = `rotate(${terminatorAngle}deg)`;
  
  // Update sun position
  updateSunPosition(terminatorAngle);
}

function updateSunPosition(terminatorAngle) {
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