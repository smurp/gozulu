document.addEventListener('DOMContentLoaded', () => {
  // Create hour marks
  const hourMarksContainer = document.getElementById('hour-marks');
  for (let i = 0; i < 24; i++) {
    const hourMark = document.createElement('div');
    hourMark.className = 'hour-mark';
    hourMark.style.transform = `rotate(${i * 15}deg) translateX(-50%)`;
    hourMarksContainer.appendChild(hourMark);
    
    // Add hour numbers (optional)
    if (i % 3 === 0) {
      const hourNumber = document.createElement('div');
      hourNumber.className = 'hour-number';
      hourNumber.textContent = i === 0 ? '24' : i;
      hourNumber.style.position = 'absolute';
      hourNumber.style.fontSize = '14px';
      hourNumber.style.transform = `rotate(${i * 15}deg) translateY(-130px) rotate(${-i * 15}deg)`;
      hourNumber.style.left = '50%';
      hourNumber.style.top = '50%';
      hourMarksContainer.appendChild(hourNumber);
    }
  }

  // Start the clock
  updateClock();
  setInterval(updateClock, 1000);
});

function updateClock() {
  const now = new Date();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const seconds = now.getUTCSeconds();
  
  // Calculate angles for analog clock hands (24-hour format)
  // In a 24-hour clock, each hour represents 15 degrees (360 / 24)
  const hourAngle = (hours * 15) + (minutes / 4);
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;
  
  // Update clock hands
  document.getElementById('hour-hand').style.transform = `rotate(${hourAngle}deg)`;
  document.getElementById('minute-hand').style.transform = `rotate(${minuteAngle}deg)`;
  document.getElementById('second-hand').style.transform = `rotate(${secondAngle}deg)`;
  
  // Update sunlight position
  // The sunlight rotates once every 24 hours, but in the opposite direction
  // of the hour hand since we're viewing from the North pole
  const sunlightAngle = 360 - hourAngle;
  document.getElementById('sunlight').style.transform = `rotate(${sunlightAngle}deg)`;
}

// Function to get user's current time
function getCurrentTime() {
  const now = new Date();
  return {
    hours: now.getUTCHours(),
    minutes: now.getUTCMinutes(),
    seconds: now.getUTCSeconds()
  };
}

// Additional functionality for offline capabilities
window.addEventListener('online', () => {
  console.log('App is online');
  // You could add functionality to sync any saved data here
});

window.addEventListener('offline', () => {
  console.log('App is offline');
  // You could add functionality to notify the user they're offline
});

// Handle screen size changes
window.addEventListener('resize', () => {
  const clockElement = document.getElementById('clock');
  const minSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
  
  // Adjust clock size based on screen size, with a maximum
  const newSize = Math.min(minSize, 600);
  clockElement.style.width = `${newSize}px`;
  clockElement.style.height = `${newSize}px`;
});

// Initial size adjustment
window.dispatchEvent(new Event('resize'));