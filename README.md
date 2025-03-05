# Earth Clock PWA

A Progressive Web App featuring a 24-hour clock with Earth viewed from the North pole, showing the day/night terminator, Zulu time, local time, and user's location.

## Features

- Earth visualization with realistic day/night terminator
- Greenwich meridian at the top (prime meridian aligned vertically)
- Zulu time (GMT/UTC) display in 23:59:59Z format
- Local time display with timezone abbreviation
- User location pin based on geolocation
- Visual representation of the sun position
- Fully responsive design
- Works offline as a Progressive Web App
- Installable on desktop and mobile devices

## Setup Instructions

### Prerequisites

- Node.js (for development server)
- A high-quality image of Earth from the North pole perspective

### Project Structure

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

### Earth Image

For best results, you need a high-quality image of Earth from the North pole perspective. The image should:
- Be square in dimensions (1:1 aspect ratio)
- Have a transparent background if possible
- Show all continents clearly
- Have sufficient resolution (at least 1000x1000 pixels recommended)

Sources for Earth images:
1. NASA's Visible Earth (https://visibleearth.nasa.gov/)
2. NASA Blue Marble collection
3. NOAA's satellite imagery repositories

Save your image as `earth-north-pole.png` in the `images` directory.

### App Icons

You'll need two app icons for your PWA:
- `icon-192x192.png` (192×192 pixels)
- `icon-512x512.png` (512×512 pixels)

Place these in the `icons` directory.

### Running Locally

For development, you can use a simple HTTP server:

```bash
# Install a simple HTTP server globally
npm install -g http-server

# Navigate to your project directory
cd earth-clock

# Start the server
http-server -p 8080
```

Then open your browser to `http://localhost:8080`

### Deployment to Ubuntu 24 LTS

To deploy to your Ubuntu 24 LTS server:

1. Install and configure Nginx:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. Create a configuration file for your site:
   ```bash
   sudo nano /etc/nginx/sites-available/earth-clock
   ```

3. Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

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

4. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/earth-clock /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. Upload your files:
   ```bash
   # Create directory
   sudo mkdir -p /var/www/earth-clock
   
   # Set permissions
   sudo chown -R $USER:$USER /var/www/earth-clock
   
   # Copy files (from your local machine)
   scp -r earth-clock/* username@your-server:/var/www/earth-clock/
   ```

6. Set up HTTPS (recommended for PWAs):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Using the App

The Earth Clock shows:
1. The Earth from the North pole view, with Greenwich at the top
2. The day/night terminator showing which parts of Earth are in daylight
3. Zulu time (GMT/UTC) display at the top
4. Your local time with timezone abbreviation at the bottom
5. A pin showing your location (requires permission to access your location)
6. A yellow circle representing the sun's position

The app will work offline after the first load and can be installed on supported devices by clicking the install prompt in your browser.

## Customization

### Appearance

To customize the appearance, modify the `styles.css` file:
- Change background colors
- Adjust the size and appearance of elements
- Modify the time display format

### Functionality

Possible modifications to `app.js`:
- Change the refresh rate (currently set to 1 second)
- Modify how the terminator is displayed
- Add features like clicking on locations to see their local time

## License

This project is available under the MIT License.