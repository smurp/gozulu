# GoZulu - Earth Clock

A Progressive Web App featuring a 24-hour clock with Earth viewed from the North pole, designed to make it easier to think in Zulu time and coordinate across time zones.

## Features

- Earth visualization with realistic day/night terminator
- Greenwich meridian at the top (prime meridian aligned vertically)
- Zulu time (GMT/UTC) display in 23:59:59Z format
- Local time display with timezone abbreviation
- Draggable sun that allows time adjustment (with spring-back animation)
- Support for custom timezones via URL parameters
- Fixed time mode to set the clock to a specific date and time
- Fully responsive design
- Works offline as a Progressive Web App
- Installable on desktop and mobile devices

## Usage

### Basic Usage

Visit [https://gozulu.app](https://gozulu.app) to use the app. The clock shows:

1. The current Zulu (UTC/GMT) time at the top
2. Your local time positioned around the Earth clock based on your timezone
3. Earth viewed from the North pole with the current day/night terminator
4. A draggable sun that lets you see what time it would be around the world at different times

### Custom Timezones

You can specify a custom timezone with the `local` URL parameter:

- `https://gozulu.app/?local=PDT` - Display Pacific Daylight Time
- `https://gozulu.app/?local=+8` - Display GMT+8 time (e.g., Beijing, Singapore)
- `https://gozulu.app/?local=-5` - Display GMT-5 time (e.g., Eastern Time)

Supported named timezones include: PST, PDT, MST, MDT, CST, CDT, EST, EDT, UTC, GMT, BST, CET, CEST, IST, JST, AEST, and others.

NATO one-letter timezone codes are also supported:
- `https://gozulu.app/?local=Z` - Zulu Time (UTC)
- `https://gozulu.app/?local=R` - Romeo Time (UTC-5)
- `https://gozulu.app/?local=H` - Hotel Time (UTC+8)

The NATO military timezone codes run from A to M (UTC+1 to UTC+12) and N to Y (UTC-1 to UTC-12), with Z representing UTC/GMT. These single-letter codes will also be shown as fallbacks when standard three-letter timezone abbreviations aren't available.

### Fixed Time Mode

You can set the clock to a specific fixed time using the `as-of` URL parameter:

- `https://gozulu.app/?as-of=2025-03-06T12:00:00Z` - Set clock to noon UTC on March 6, 2025
- `https://gozulu.app/?as-of=2025-03-06T18:30:00-05:00` - Set clock to 6:30 PM Eastern Time on March 6, 2025
- `https://gozulu.app/?as-of=2025-03-06T12:00:00` - Set clock to noon local time on March 6, 2025
- `https://gozulu.app/?as-of=2025-03-06T12:00:00R` - Set clock to noon Romeo Time (UTC-5) on March 6, 2025

NATO one-letter timezone codes can be used in the `as-of` parameter instead of Z or offset notation. Examples:
- `https://gozulu.app/?as-of=2025-03-06T08:00:00H` - 8 AM Hotel Time (UTC+8)
- `https://gozulu.app/?as-of=2025-03-06T17:30:00A` - 5:30 PM Alpha Time (UTC+1)

In fixed time mode:
- The clock stops ticking and displays the specified time
- You can still drag the sun to adjust the time 
- Dragging the sun will update the URL with the new time
- Both `local` and `as-of` parameters can be combined

### Interactive Features

- **Draggable Sun**: Click and drag the sun to adjust the displayed time. The sun will snap to 15-minute intervals.
- **Draggable Local Time**: Click and drag the local time display to adjust your timezone. The display snaps to whole hour increments, updates in real-time, and updates the URL with the new timezone.
- **Interactive Hour Markers**: Click on any hour marker around the clock to display the place name and timezone information for that location. Click again to hide the information.
- **Spring-Back Animation**: When you release the sun, it will animate back to the current real time with a spring-like motion.
- **Time Adjustment**: All times update as you drag the sun, allowing you to see what time it would be anywhere in the world at different times of day.

## Technical Details

### Project Structure

```
goZulu/
├── index.html        # Main HTML structure
├── styles.css        # Styling for the application
├── app.js            # Core application logic
├── service-worker.js # For offline functionality
├── manifest.json     # PWA configuration
├── favicon.ico       # Site favicon
├── images/
│   └── earth-north-pole.jpg  # Earth image
└── icons/
    ├── icon-192x192.png      # App icons
    └── icon-512x512.png
```

### Dependencies

The application is built with vanilla JavaScript and has no external dependencies.

### Installation

To run the application locally:

1. Clone the repository
2. Host it with a simple HTTP server:
   ```bash
   # Using Python
   python3 -m http.server 8080
   
   # Or using Node.js
   npx http-server
   ```
3. Visit `http://localhost:8080` in your browser

### Earth Image

The application uses an image of Earth viewed from the North pole. For best results, the image should:
- Be square in dimensions (1:1 aspect ratio)
- Show the complete Earth with the North pole at the center
- Have sufficient resolution (at least 1000x1000 pixels recommended)

## Deployment

To deploy to a production server:

1. Set up a web server (Nginx or Apache)
2. Configure HTTPS (essential for PWA features)
3. Set proper cache headers for static assets
4. Upload the files to your web server

## Browser Compatibility

The application works on all modern browsers including:
- Chrome (desktop and mobile)
- Safari (desktop and mobile)
- Firefox
- Edge

## License

This project is available under the MIT License.

## Version History

- 0.5.3 - Made text unselectable and improved Help
- 0.5.2 - Added left/right text formatting for place names
- 0.5.1 - Clicking hour markers now toggles place names display
- 0.5.0 - Added draggable local time label to adjust timezone with whole-hour increments and clickable hour markers
- 0.4.5 - Major refactoring for time model and timezone handling
- 0.4.4 - Fixed bug with local timezone display
- 0.4.3 - Added NATO one-letter timezone code support in as-of parameter
- 0.4.2 - Added NATO one-letter timezone code support for local parameter
- 0.4.1 - Added fixed time mode with `as-of` URL parameter
- 0.4.0 - Added animated GoZulu link
- 0.3.0 - Improved responsive design and sun dragging
- 0.2.0 - Added timezone URL parameter support and seconds to local time display
- 0.1.0 - Initial release

## Credits

Developed by [Shawn Murphy](https://smurp.com) / https://noosphere.org
