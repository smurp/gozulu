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
  document.getElementById('local-time').textContent = `Local: ${localHours}:${localMinutes} ${timeZoneAbbr}`;
  
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
  const sunAngle = (terminatorAngle - 90) * (Math.PI / 180); // Convert to radians and adjust
  
  // Calculate position using trigonometry 
  // Radius is slightly larger than the clock radius to position outside the Earth
  const sunRadius = radius * 1.1;
  const x = Math.cos(sunAngle) * sunRadius + radius;
  const y = Math.sin(sunAngle) * sunRadius + radius;
  
  sunElement.style.left = `${x}px`;
  sunElement.style.top = `${y}px`;
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
  const clockElement = document.getElementById('clock');
  const radius = clockElement.offsetWidth / 2;
  
  // Convert geographic coordinates to position on the clock face
  // For a north-pole view:
  // - Latitude determines distance from center (90° at center, 0° at edge)
  // - Longitude determines the angle (0° at top, increasing clockwise)
  
  // Calculate distance from center (latitude)
  // Map latitude from 90 (center) to 0 (edge)
  const distanceFromCenter = (90 - latitude) / 90;
  
  // Calculate angle (longitude)
  // Map longitude from -180 to 180 to 0 to 360, with 0 at the top
  let angle = longitude + 180;
  angle = (angle + 270) % 360; // Adjust so 0° longitude is at the top
  angle = angle * (Math.PI / 180); // Convert to radians
  
  // Calculate position
  const x = Math.cos(angle) * (radius * distanceFromCenter) + radius;
  const y = Math.sin(angle) * (radius * distanceFromCenter) + radius;
  
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
  
  // Update sun and pin positions after resize
  updateClock();
}