# GoZulu - Earth Clock

A Progressive Web App featuring a 24-hour clock with Earth viewed from the North pole, designed to make it easier to think in Zulu time and coordinate across time zones.

## Features

- Earth visualization with realistic day/night terminator
- Greenwich meridian at the top (prime meridian aligned vertically)
- Zulu time (GMT/UTC) display in 23:59:59Z format
- Local time display with timezone abbreviation
- Draggable sun that allows time adjustment (with spring-back animation)
- Support for custom timezones via URL parameters
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

### Interactive Features

- **Draggable Sun**: Click and drag the sun to adjust the displayed time. The sun will snap to 15-minute intervals.
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
│   └── earth-north-pole.png  # Earth image
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

- 0.2.0 - Added timezone URL parameter support and seconds to local time display
- 0.1.0 - Initial release

## Credits

Developed by [Your Name/Organization]