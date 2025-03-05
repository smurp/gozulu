# Earth Clock PWA

A Progressive Web App featuring a 24-hour analog clock with the sunlit Earth viewed from the North pole.

## Features

- 24-hour analog clock displaying UTC time
- Visual representation of Earth from the North pole
- Simulated sunlight position based on the current time
- Fully responsive design
- Works offline as a Progressive Web App
- Installable on desktop and mobile devices

## Setup Instructions

### Prerequisites

- Node.js and npm (for development server)
- An image of Earth from the North pole perspective

### Installation

1. Clone this repository or download the files
2. Create the following directory structure:
   ```
   earth-clock/
   ├── index.html
   ├── styles.css
   ├── app.js
   ├── service-worker.js
   ├── manifest.json
   ├── favicon.ico
   ├── images/
   │   └── earth-north-pole.png
   └── icons/
       ├── icon-192x192.png
       └── icon-512x512.png
   ```

3. Add the Earth image:
   - Place an image of Earth viewed from the North pole in the `images` directory
   - Name it `earth-north-pole.png`
   - For best results, use a high-resolution image with transparent background

4. Add app icons:
   - Create two square PNG icons for your app (192×192 and 512×512 pixels)
   - Place them in the `icons` directory

### Running Locally

For development, you can use a simple HTTP server:

```bash
# Using npm to install a simple server
npm install -g http-server

# Navigate to your project directory
cd earth-clock

# Start the server
http-server -p 8080
```

Then open your browser to `http://localhost:8080`

### Deployment

To deploy to your Ubuntu 24 LTS server:

1. Set up a web server (Nginx or Apache)
2. Copy all files to your web server's document root
3. Ensure proper HTTPS is configured (required for PWA features)

Example Nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/earth-clock;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Add caching for static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000";
    }
}
```

## Customization

### Changing Colors

Edit the `styles.css` file to customize the appearance:

- Background color: Change `background-color: #000033;` to your preferred color
- Clock hands: Modify the CSS for `#hour-hand`, `#minute-hand`, and `#second-hand`

### Adding Features

Some ideas for extending the app:

- Add digital time display
- Include timezone selection
- Add animation for Earth rotation
- Implement day/night cycle visualization
- Add seasonal changes to Earth's tilt

## License

This project is available under the MIT License.

## Credits

- Earth imagery source: [NASA Visible Earth](https://visibleearth.nasa.gov/)